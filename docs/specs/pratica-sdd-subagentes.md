# Spec: requisitos específicos da prática SDD

- Escopo: atividade com frontend e backend
- Fonte (fora dos repositórios): `..\..\..\..\ultima_pratica\pratica-sdd-subagentes.html`
- Status: regras explícitas registradas; dúvidas internas do briefing listadas ao final

## Precedência e limites

Esta spec traduz os requisitos da atividade para o projeto. Nos itens da
prática, ela prevalece sobre as regras divergentes do PRD e das specs
anteriores sem reescrever o PRD global. Para requisitos técnicos, permanecem
as ADRs, exceto quando o HTML trouxer uma exigência explícita; essas exceções
devem ser registradas.

As entregas são implementadas separadamente, conforme o escopo autorizado
em cada etapa. A Entrega 1 cobre o mecanismo e os testes do subagente
verificador. A Entrega 2 cobre somente a skill de preparação de imagens.
A Entrega 3 cobre exclusivamente a carga inicial local dos equipamentos,
metadados de imagens e conta de teste. A Entrega 4 cobre autenticação
necessária, catálogo e solicitação de empréstimos; não inclui as operações
remotas de carga, publicação ou deploy.

## Dados iniciais

- Usar os 12 equipamentos e os termos de busca exatamente como constam na
  lista do HTML.
- Para esta atividade, TI-0004 e TI-0007 ficam em manutenção; os outros dez,
  inclusive TI-0010, ficam disponíveis. Esta decisão segue a correção
  explícita do usuário para a divergência interna entre a lista do HTML e o
  briefing de dados.
- Cada imagem deve vir somente da API do Pexels, passar por revisão para
  remover pessoas, marcas/logos legíveis, texto ou telas com conteúdo, e
  ser normalizada para 800×600 com `sharp`.
- Registrar origem, fotógrafo e licença de cada imagem.
- Não repetir a mesma foto; o carregamento e o envio preparado devem ser
  idempotentes.
- Armazenar as imagens em bucket público do Supabase Storage. O agente pode
  preparar os arquivos localmente, mas nunca enviá-los ao Storage de
  produção; essa operação fica com o usuário.
- A conta de teste do professor deve existir com zero empréstimos. A senha
  é fornecida pelo usuário por mecanismo seguro definido em
  `rules/secrets.md`, nunca escrita em código ou Git.

## Subagente verificador

- Em contexto independente, lê a spec fornecida e confere cada critério de
  aceite individualmente, apontando evidência concreta e localizável.
- Retorna PASS ou FAIL por critério em relatório estruturado e comparável.
- Não altera código, testes ou documentação, inclusive quando a única falha
  for um teste quebrado. Devolve todas as falhas ao agente principal; esta
  instrução mais estrita prevalece sobre a exceção do pedido do tech lead no
  HTML para esta implementação.
- A verificação é obrigatória antes de declarar uma spec pronta e não pode
  depender de um pedido manual: as instruções do projeto exigem a chamada e
  um gate bloqueia a conclusão sem um relatório válido e aprovado.
- Não pode editar arquivos, executar comandos, publicar, migrar nem escrever
  no banco ou Storage de produção.
- O relatório estável inclui critérios, resultados, evidências e totais para
  comparar rodadas da mesma spec.
- Os testes incluem um erro plantado em fixture e verificam que o resultado
  FAIL impede a conclusão.

## Solicitar empréstimo

- A solicitação cria o empréstimo imediatamente, sem aprovação ou fila.
- Só equipamento disponível pode ser solicitado; equipamento em manutenção
  ou já emprestado é recusado.
- O limite específico da atividade é de 5 empréstimos em aberto por pessoa.
  A regra geral de 3 itens no PRD não se aplica a esta atividade.
- Uma pessoa com empréstimo em atraso não pode solicitar outro.
- A devolução prevista é 14 dias úteis após a solicitação. A contagem começa
  no próximo dia útil e exclui somente feriados nacionais oficiais do Brasil;
  pontos facultativos e feriados estaduais/municipais não são excluídos. O
  calendário é local, determinístico e versionado por ano, baseado no texto
  legal federal vigente em fonte oficial; publicação anual federal no DOU
  (incluindo eventual calendário do MGI) serve de conferência, filtrando
  pontos facultativos. Cada conjunto registra autoridade,
  identificação/URL oficial, datas de publicação/verificação, versão e
  SHA-256 das datas. Não há consulta externa durante runtime. Ano sem
  conjunto versionado falha explicitamente.
- O PostgreSQL é a fonte canônica do relógio. A transação adquire os locks
  em ordem fixa antes do comando de criação, sob `READ COMMITTED`; depois da
  espera, o comando autoritativo começa com snapshot novo. A função de
  criação captura um único `clock_timestamp()` e usa esse instante para
  solicitação, vencimento, atraso e gravação. O limite exclusivo `due_at` é
  00h do dia seguinte à data civil de vencimento em `America/Sao_Paulo`; o
  empréstimo permanece no prazo durante todo o dia civil de vencimento e
  fica atrasado quando `reference_instant >= due_at`.
- Solicitações concorrentes do mesmo equipamento devem resultar em no
  máximo um empréstimo.
- A pessoa colaboradora vê apenas seus empréstimos em aberto e as datas
  previstas.
- O estado efetivo “emprestado” é derivado da existência de empréstimo
  aberto (`returned_at IS NULL`); o estado persistido do equipamento
  continua distinguindo disponível de manutenção.
- O backend valida as regras e o PostgreSQL também impede inserções
  inválidas: função/trigger para disponibilidade, atraso e limite por
  colaborador, com serialização das verificações concorrentes, e índice
  único parcial para empréstimos abertos por equipamento. O quinto
  empréstimo é permitido; pedidos simultâneos do mesmo usuário por dois
  equipamentos distintos, quando já possui quatro empréstimos abertos,
  devem resultar em exatamente uma criação. A corrida pelo mesmo
  equipamento é um cenário separado.
- A apresentação do catálogo não terá rodapé de crédito. Para cumprir a
  exigência explícita do HTML, cada foto terá um link discreto e associado
  à imagem com o texto `Fotos: Pexels`; essa exceção limitada prevalece
  sobre o pedido genérico de catálogo sem texto de crédito.
- A interface que anunciar o limite da atividade deve refletir cinco itens;
  o login atualmente exibe três, valor oriundo do PRD geral.

## Entrega 2 — skill `imagens-equipamentos`

- A skill obtém resultados de imagem exclusivamente pela API de busca do
  Pexels e baixa apenas URLs de imagem devolvidas por essa API. A chave é lida
  de `PEXELS_API_KEY` no ambiente local e nunca é exibida ou persistida.
- Para cada equipamento, o processo prepara uma única foto. O operador deve
  registrar a revisão visual da imagem: ausência de pessoas, marcas/logos
  legíveis, texto legível e telas com conteúdo. A preparação é bloqueada se
  qualquer condição for marcada como presente, se algum item de revisão
  estiver ausente, ou se o revisor não aprovar explicitamente.
- O pipeline usa `sharp` (aprovado especificamente na ADR-001) para gerar
  JPEG de 800×600 com recorte cover. Dimensões diferentes, entradas inválidas
  e saídas com erro são rejeitadas; não há dependência de outro processador
  de imagens.
- Cada imagem aprovada registra patrimônio, identificador e URL de origem
  Pexels, fotógrafo, URL do fotógrafo, licença e URL da licença. A
  apresentação associada a cada foto contém o crédito `Fotos: Pexels` com
  link para a foto no Pexels; não se usa rodapé global.
- A chave de idempotência é o patrimônio e o identificador da foto. A
  unicidade da imagem é também aplicada globalmente ao conjunto de
  equipamentos. O mesmo insumo gera o mesmo caminho de objeto, sem criar
  duplicatas em execuções repetidas.
- A skill só prepara arquivos e metadados locais e indica o caminho
  determinístico destinado ao bucket público do Supabase Storage. Não inclui
  cliente, credenciais, comando ou função de upload/publicação.
- A revisão de conteúdo é uma decisão visual humana. Os testes podem provar
  que a ausência de aprovação ou uma reprovação explícita bloqueia a
  preparação; não provam automaticamente que uma imagem real não contém
  conteúdo proibido.

## Crédito, segredos e produção

- A skill deve garantir a fonte Pexels, dimensões, não repetição, créditos,
  revisão visual e idempotência; instruções sozinhas não substituem garantias
  verificáveis.
- Nenhuma senha, chave ou token pode aparecer em código, documentação
  versionada, logs ou histórico Git.
- O agente não publica, migra nem escreve no banco ou Storage de produção.
  O usuário executa manualmente operações remotas depois de revisar o plano.
- O relatório `ENTREGA.md` fica na raiz de cada repositório Git, conforme
  `rules/delivery.md`; os relatórios devem permanecer sincronizados.

## Entrega 3 — dados iniciais

- A carga é local e usa os 12 equipamentos e termos de busca exatos da
  atividade. Para a situação, a correção explícita do usuário prevalece sobre
  a linha contraditória do HTML: TI-0004 e TI-0007 ficam em manutenção; os
  outros dez, inclusive TI-0010, ficam disponíveis.
- Cada patrimônio é único e se associa a exatamente um arquivo JPEG 800×600
  preparado pela skill de imagens e a seus metadados Pexels. O seed consome
  o manifesto/arquivos preparados; não inventa imagens ou créditos e não faz
  upload.
- A carga inicial não cria empréstimos. A conta
  `marcelo.grilo@institutojef.org.br` é criada ou reutilizada no Supabase
  Auth local, com membership `colaborador` no tenant `suporte_ti`; esta
  escolha de menor privilégio foi confirmada pelo usuário. A senha é
  obrigatoriamente fornecida por `INITIAL_PROFESSOR_PASSWORD` em ambiente
  local seguro, nunca embutida no seed nem impressa. Reexecução não redefine
  senha existente.
- O seed exige um banco PostgreSQL local e um Supabase Auth local, verifica
  hosts loopback e falha antes de escrever se qualquer destino não for local.
  Também falha sem excluir dados quando encontra inconsistência, imagem
  ausente/inválida ou empréstimo já associado ao professor. O agente nunca
  executa escrita remota.

## Critérios verificáveis

- CA-01: A lista de equipamentos e os termos de busca correspondem aos 12 registros da atividade; TI-0004 e TI-0007 ficam em manutenção e os outros dez, inclusive TI-0010, disponíveis.
- CA-02: A regra de empréstimo usa limite 5, bloqueio por atraso, criação imediata, data prevista de 14 dias úteis e proteção contra concorrência.
- CA-03: Cada imagem processada tem 800×600, crédito Pexels com link, metadados de fotógrafo/licença e foto única por equipamento.
- CA-04: O processo de preparação não possui acesso que permita escrever no banco ou Storage de produção.
- CA-05: A conta do professor começa com zero empréstimos e sua senha não consta em arquivos versionados.
- CA-06: O relatório de entrega existe na raiz de ambos os repositórios e contém evidências verificáveis de cada decisão e rodada do verificador.
- CA-07: Há um agente verificador disponível em cada repositório, que recebe o caminho da spec e lê por conta própria a spec e seus critérios em contexto independente.
- CA-08: O agente retorna exatamente um resultado PASS ou FAIL por critério, com evidência concreta e localizável; critério sem evidência não pode passar.
- CA-09: O relatório segue um formato JSON estável, inclui os critérios na ordem da spec e totais PASS/FAIL que permitem comparar rodadas.
- CA-10: O verificador não dispõe de ferramentas para editar arquivos, executar comandos, fazer deploy ou acessar escrita em produção e devolve falhas sem corrigi-las.
- CA-11: O gate bloqueia a conclusão quando o relatório está ausente, inválido, incompleto, sem evidência ou contém qualquer FAIL.
- CA-12: Testes demonstram a independência read-only, a reprovação de um erro plantado e a ausência de alterações pelo verificador.
- CA-13: A skill obtém imagens somente a partir da API Pexels; credenciais são lidas de ambiente local e não aparecem em arquivos ou logs.
- CA-14: Cada imagem exige revisão humana completa e aprovação explícita; pessoas, marcas/logos legíveis, texto legível ou telas com conteúdo, bem como revisão incompleta/reprovada, bloqueiam a preparação.
- CA-15: O script usa `sharp` para produzir JPEG exatamente 800×600 e rejeita entradas ou saídas que não atendam a essa dimensão.
- CA-16: Cada imagem aprovada possui metadados de origem Pexels, fotógrafo, URLs de foto/perfil e licença, e o crédito visual `Fotos: Pexels` vinculado à foto, sem rodapé.
- CA-17: O processo permite uma foto por equipamento, não reutiliza o mesmo identificador de foto em equipamentos distintos e repetições da mesma entrada produzem o mesmo caminho/manifesto sem duplicar resultados.
- CA-18: O processo prepara os arquivos localmente para o bucket público, sem implementar ou invocar escrita, upload, deploy ou publicação no Supabase.
- CA-19: Testes locais cobrem dimensão 800×600, unicidade, idempotência e bloqueio das condições visuais proibidas ou sem aprovação.
- CA-20: O seed contém exatamente os 12 equipamentos e termos de busca da atividade, com TI-0004 e TI-0007 em manutenção e os outros dez, inclusive TI-0010, disponíveis.
- CA-21: Os 12 patrimônios são únicos e cada equipamento se associa a exatamente uma imagem preparada pela skill, com arquivo JPEG 800×600 e metadados Pexels completos.
- CA-22: A carga inicial não cria empréstimos; a conta de teste existe no Auth local, tem membership `colaborador` no tenant inicial e não possui empréstimos.
- CA-23: A senha do professor só é lida de configuração segura local, sem valor em código, fixture, seed, documentação ou saída; reexecução não redefine a senha existente.
- CA-24: O seed é idempotente para tenant, equipamentos, imagens, metadados e usuário; não cria duplicatas e não apaga registros para forçar a quantidade esperada.
- CA-25: O seed só permite escrita quando tanto banco quanto Supabase Auth apontam para hosts loopback; qualquer destino remoto ou configuração ambígua é rejeitada antes de escrever.
- CA-26: Testes locais verificam quantidade, situação, patrimônio, associação/dimensão das imagens, ausência de empréstimos, usuário sem empréstimos, idempotência e ausência de senha hardcoded, sem depender de serviços Pexels/Supabase reais.
- CA-27: A pessoa precisa estar autenticada como colaboradora no tenant ativo para acessar catálogo, solicitar empréstimo e consultar seus empréstimos; identidade e tenant vêm do contexto validado no backend, nunca de valores enviados pelo cliente.
- CA-28: O catálogo retorna os 12 equipamentos com imagem, nome, categoria e situação efetiva; equipamento em manutenção é indicado como tal, empréstimo aberto aparece como emprestado e somente item disponível habilita solicitação.
- CA-29: O crédito de cada imagem é apresentado como link `Fotos: Pexels` junto à imagem, sem rodapé global, conforme a decisão explícita anterior do usuário para compatibilizar as Entregas 2 e 4.
- CA-30: Solicitar um item disponível cria o empréstimo imediatamente, sem aprovação ou fila; manutenção ou empréstimo aberto impedem a criação.
- CA-31: O vencimento é calculado para 14 dias úteis após a solicitação, começando no próximo dia útil e excluindo somente feriados nacionais oficiais brasileiros. O calendário local é determinístico e versionado por ano, registra autoridade, identificação/URL oficial federal, datas de publicação/verificação, versão e SHA-256 das datas, exclui pontos facultativos e feriados estaduais/municipais, não consulta serviços externos em runtime e falha explicitamente se faltar o conjunto do ano. PostgreSQL é o relógio canônico; após locks, o comando de criação captura um único instante com snapshot novo. `due_at` é o limite exclusivo às 00h do dia seguinte à data civil de vencimento em `America/Sao_Paulo`.
- CA-32: O quinto empréstimo aberto é permitido e um sexto é recusado; empréstimos abertos são os que têm `returned_at IS NULL`. Com quatro empréstimos abertos não atrasados e dois equipamentos diferentes disponíveis, dois pedidos simultâneos do mesmo colaborador resultam exatamente em uma criação e uma recusa, após serialização por usuário no PostgreSQL.
- CA-33: A existência de qualquer empréstimo aberto atrasado bloqueia nova solicitação. O empréstimo permanece no prazo durante todo o dia de vencimento e fica atrasado precisamente quando `reference_instant >= due_at`, às 00h do dia seguinte em `America/Sao_Paulo`.
- CA-34: Serviço e PostgreSQL impedem empréstimo de equipamento em manutenção/emprestado, pedido acima do limite e solicitação por pessoa com atraso. Locks em ordem fixa são obtidos antes do comando separado de criação sob `READ COMMITTED`; esse comando começa com snapshot novo, captura uma única referência para regra, cálculo e gravação, e a trigger valida a integridade. O índice único parcial protege contra duplicidade por equipamento; o backend consome timestamps retornados pelo banco.
- CA-35: Pedidos simultâneos para o mesmo equipamento produzem no máximo um empréstimo aberto e a outra solicitação recebe uma recusa explícita, sem erro interno ou sucesso falso.
- CA-36: “Meus empréstimos” apresenta somente os empréstimos abertos do colaborador autenticado, com equipamento e data prevista de devolução; dados de outros usuários ou tenants não são retornados.
- CA-37: Quando a solicitação é recusada por atraso, limite, manutenção ou empréstimo existente, a interface informa o motivo ao colaborador; o frontend não é a única camada que aplica as regras.
- CA-38: Testes unitários verificam regras e calendário; testes com PostgreSQL verificam triggers, constraints, isolamento e duas corridas distintas (limite por usuário e mesmo equipamento); testes HTTP verificam autenticação/tenant e respostas; testes de frontend verificam migração visual delimitada, catálogo, bloqueios, motivo e “Meus empréstimos”.

## Dúvidas abertas do próprio briefing

- As decisões de contagem, conjunto de feriados, fuso, limite exclusivo de
  atraso, fonte canônica do relógio e estado “emprestado” estão registradas
  nesta spec. A seleção de cada fonte/versão oficial anual será documentada
  junto do calendário antes de ser habilitada. Antes de gerar a migration,
  a proposta de DDL ainda deverá ser apresentada e aprovada conforme
  `rules/migration.md`.
- O HTML pressupõe que login e landing já estão no ar. No workspace atual,
  o login é estático e não autentica, e o backend não valida JWT; portanto,
  autenticação e contexto de tenant são dependências explícitas da entrega,
  não funcionalidades já concluídas.
- O atalho “Entrar como Operações” existe na tela atual, mas Operações está
  fora do escopo. A decisão entre removê-lo ou mantê-lo desativado e
  identificado como indisponível permanece pendente; nenhum fluxo de
  Operações pode ser implementado nesta entrega.
- A revisão automática confiável de pessoas, marcas, texto e conteúdo de
  telas não foi definida pela atividade nem pela ADR. Nesta entrega, a
  aprovação visual humana é obrigatória e validada pelo script; a detecção
  semântica automática fica fora do escopo.
- Os arquivos de imagem finais e as credenciais de execução ainda dependem
  de o usuário executar a skill com uma chave Pexels segura, revisar as
  candidatas e configurar um ambiente local de PostgreSQL e Supabase Auth.
