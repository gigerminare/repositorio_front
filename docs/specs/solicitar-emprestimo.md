# Spec: Entrega 4 — solicitar empréstimo

## Contexto e fonte de verdade

A Entrega 4 da atividade `pratica-sdd-subagentes.html` define a primeira
regra de negócio integrada do catálogo. Esta spec detalha os critérios
CA-27–CA-38 da spec da prática. Quando o PRD ou uma spec anterior divergir,
vale o requisito da atividade nesta entrega, sem reescrever o PRD global.

O workspace tem dois repositórios Git independentes. Esta spec e seu plano
coordenam mudanças no frontend e no backend. O backend atual é um scaffold
NestJS com rota de diagnóstico; o frontend atual é HTML/CSS/JavaScript
estático, e seu formulário não autentica. Não há catálogo, API de empréstimo
ou integração frontend/backend concluída.

O schema Prisma já contém `equipment`, `loans`, `memberships` e `tenants`.
Empréstimo aberto é representado por `returned_at IS NULL`, e existe índice
único parcial para impedir mais de um empréstimo aberto por equipamento. O
estado persistido de equipamento possui `disponivel` e `manutencao`; não há
estado persistido `emprestado`. A carga real dos 12 equipamentos e imagens
continua pendente; os testes desta entrega usarão fixtures locais e não
representam carga de produção.

## Objetivo

Permitir que uma pessoa autenticada como colaboradora consulte os 12
equipamentos, solicite imediatamente um equipamento disponível e acompanhe
seus empréstimos abertos e vencimentos, com regras aplicadas no backend e
no PostgreSQL.

## Fora de escopo

- Devolução, renovação, reserva futura ou fila de espera.
- Tela de Operações, cadastro de equipamentos e notificações por e-mail.
- Carga ou correção dos dados reais, upload, publicação, deploy ou escrita
  em produção.
- Usar o frontend como única camada de autorização ou de validação.

## Decisões confirmadas

- **Limite:** até cinco empréstimos abertos por colaborador. Um quinto é
  permitido; um sexto é recusado. O limite três do PRD e da interface antiga
  não se aplica à prática.
- **Vencimento:** 14 dias úteis após a solicitação. A contagem começa no
  próximo dia útil. Excluem-se somente feriados nacionais oficiais do
  Brasil; feriados estaduais, municipais e pontos facultativos contam como
  dias úteis, se caírem de segunda a sexta.
- **Calendário:** conjunto local, versionado por ano e determinístico, baseado
  em legislação e publicações oficiais federais. Cada versão registra o ano,
  autoridade emissora, título/identificação e URL oficial da fonte, data de
  publicação e de verificação, versão do conjunto e SHA-256 da lista
  canônica de datas. Proposta de hierarquia: texto legal federal vigente em
  fonte oficial (por exemplo, Planalto/legislação federal) define o que é
  feriado nacional; publicação anual federal no Diário Oficial da União,
  incluindo eventual calendário do MGI, serve de conferência e os dias
  classificados somente como ponto facultativo são filtrados. Não consultar
  API externa em runtime. Excluir pontos facultativos e feriados
  estaduais/municipais. Acrescentar cada ano sem modificar conjuntos já
  usados.
- **Fuso e atraso:** usar `America/Sao_Paulo`. O empréstimo permanece no
  prazo durante todo o dia civil de vencimento e passa a atrasado às 00h do
  dia seguinte. Para eliminar ambiguidade de precisão, `due_at` armazena o
  limite exclusivo: o início do dia seguinte em `America/Sao_Paulo`; a regra
  de atraso é `reference_instant >= due_at`. A interface apresenta a data
  civil anterior como data prevista de devolução.
- **Relógio:** PostgreSQL é a fonte canônica para instante da solicitação,
  vencimento e atraso. A transação adquire os locks antes do comando de
  criação, em isolamento `READ COMMITTED`; depois da espera, o comando
  autoritativo usa um snapshot novo e vê commits liberados. A função de
  criação no PostgreSQL captura um único `clock_timestamp()` de referência
  e usa esse valor para todas as regras e gravações daquela solicitação.
- **Situação do equipamento:** derivar `emprestado` da existência de um
  empréstimo aberto; manter `equipment.status` para disponível/manutenção,
  sem duplicar o estado de empréstimo.
- **Persistência concorrente:** serviço aplica as regras e PostgreSQL protege
  inserções com trigger e índice único parcial. A trigger serializa
  verificações por colaborador/tenant e equipamento; o índice existente
  protege a unicidade do empréstimo aberto por equipamento.
- **Crédito de imagem:** exibir `Fotos: Pexels` como link discreto associado
  à imagem, sem rodapé global. Esta exceção atende à decisão explícita do
  usuário para compatibilizar o crédito obrigatório da Entrega 2 com a
  instrução genérica de catálogo limpo da Entrega 4.
- **Ambiente:** fixtures locais para testes. Não afirmar que os dados reais
  foram carregados e não acessar nem escrever em produção.

## Usuários e sistemas

- **Colaborador autenticado:** consulta o catálogo, solicita item disponível
  e consulta somente seus empréstimos abertos.
- **Frontend:** autentica, apresenta o catálogo e envia pedidos para a API;
  não decide disponibilidade, limite ou atraso por conta própria.
- **Backend NestJS:** valida JWT, resolve usuário e tenant do contexto
  autenticado e aplica os casos de uso em Controller → Service → Repository.
- **PostgreSQL/Prisma:** persiste equipamentos e empréstimos e impede
  violações de regras mesmo em pedidos concorrentes ou inserções fora do
  fluxo normal da API.

## Comportamento e regras

### Catálogo

1. Somente uma pessoa autenticada com membership `colaborador` no tenant
   ativo acessa o catálogo.
2. O catálogo apresenta todos os 12 equipamentos do tenant, cada um com
   imagem, nome, categoria e situação efetiva.
3. A situação efetiva é calculada nesta ordem: `manutencao` se o estado
   persistido indicar manutenção; `emprestado` se existir empréstimo aberto;
   caso contrário, `disponivel`.
4. O crédito `Fotos: Pexels` é um link junto à imagem, não um rodapé.
5. Solicitar fica habilitado somente para equipamentos disponíveis e quando
   o colaborador não estiver bloqueado por atraso ou pelo limite.

### Solicitação e vencimento

1. A API recebe a identidade do equipamento; user e tenant são obtidos do
   contexto autenticado, nunca de campos confiados do corpo da requisição.
2. Um pedido válido cria o empréstimo imediatamente, sem aprovação, fila ou
   reserva futura.
3. A data-base é a data local da solicitação em `America/Sao_Paulo`. A
   contagem inicia no próximo dia de segunda a sexta. O cálculo usa o
   conjunto local e versionado do ano correspondente. Excluem-se feriados
   nacionais oficiais; pontos facultativos, feriados estaduais e municipais
   não são excluídos.
4. O conjunto anual de feriados é material local versionado, sem chamada de
   rede em runtime. Cada versão inclui ano, autoridade emissora,
   título/identificação e URL oficial da fonte, datas de publicação e
   verificação, versão e SHA-256 da lista canônica de datas. A fonte primária
   é o texto legal federal vigente em fonte oficial; a publicação anual
   federal no Diário Oficial da União (incluindo eventual calendário do MGI)
   é referência de conferência, filtrando datas classificadas somente como
   ponto facultativo. Ano sem conjunto revisado e versionado deve falhar
   explicitamente, sem aproximação nem fallback silencioso.
5. `due_at` é o instante exclusivo correspondente a 00h do dia civil
   seguinte à data de vencimento, em `America/Sao_Paulo`. Assim, todos os
   instantes do dia de vencimento permanecem no prazo; a partir de
   `reference_instant >= due_at`, o empréstimo aberto está atrasado.
   `due_at` não é persistido como `23:59:59`, evitando ambiguidades de
   precisão de timestamp. A API/UI deve expor e mostrar a data civil de
   vencimento, não a data do limite exclusivo.
6. PostgreSQL é o relógio canônico. A transação usa `READ COMMITTED` e
   obtém primeiro, em um comando, o lock transacional do par
   tenant/colaborador e depois o lock do equipamento, sempre na mesma ordem.
   Após a aquisição terminar, um comando de criação separado começa com
   snapshot novo e vê commits liberados durante a espera. A função de criação
   no PostgreSQL captura uma única referência com `clock_timestamp()` e usa
   o mesmo valor para data local do pedido, vencimento, atraso e timestamps
   gravados; a trigger é a defesa de integridade no banco. O backend não
   calcula nem envia instante próprio e consome os timestamps retornados.

### Restrições de empréstimo e concorrência

1. Só se pode solicitar equipamento cujo estado persistido seja disponível
   e que não tenha empréstimo aberto.
2. O colaborador não pode solicitar se já tiver cinco empréstimos abertos
   no tenant ou pelo menos um empréstimo aberto atrasado.
3. Para serializar solicitações do mesmo colaborador, a transação adquire
   lock por tenant/colaborador e lock do equipamento em ordem fixa em um
   comando anterior à criação. O comando de criação subsequente, em
   `READ COMMITTED`, começa com snapshot posterior às esperas. Uma segunda
   solicitação concorrente do mesmo colaborador, inclusive para equipamento
   diferente, reavalia limite e atraso após a primeira concluir.
4. A função de criação PostgreSQL verifica disponibilidade, limite e atraso
   e define timestamps a partir de uma única referência; a trigger valida a
   integridade da inserção. A função de calendário consulta datas anuais
   versionadas e aprovadas. O backend envia a intenção da solicitação, não
   vencimento ou horário próprios, e consome os timestamps retornados pelo
   banco.
5. O índice único parcial existente para empréstimos abertos por
   equipamento permanece como defesa final contra dois empréstimos
   simultâneos do mesmo item, inclusive por usuários diferentes.
6. Conflitos esperados são retornados como recusas de negócio com motivo
   compreensível; não devem aparecer ao usuário como sucesso nem como erro
   interno genérico.

### “Meus empréstimos”

- A API retorna somente empréstimos com `returned_at IS NULL` do usuário e
  tenant autenticados.
- A interface exibe equipamento e data prevista de devolução.
- Pedidos negados por limite, atraso ou indisponibilidade mostram o motivo
  correspondente.

## Critérios de aceitação

Os IDs são compartilhados com a spec da prática para manter a
rastreabilidade:

- CA-27: Acesso ao catálogo, solicitação e “Meus empréstimos” exige
  autenticação de colaborador no tenant ativo; user/tenant vêm do contexto
  validado no backend.
- CA-28: O catálogo lista os 12 equipamentos com imagem, nome, categoria
  e situação efetiva; apenas disponíveis podem ser solicitados.
- CA-29: Cada imagem tem link `Fotos: Pexels` associado, sem rodapé.
- CA-30: Solicitar equipamento disponível cria empréstimo imediatamente;
  item em manutenção ou com empréstimo aberto é recusado.
- CA-31: O vencimento segue 14 dias úteis, contando do próximo dia útil,
  excluindo somente feriados nacionais oficiais brasileiros, por calendário
  local determinístico versionado anualmente com autoridade, identificação
  e URL oficial da fonte, datas de publicação/verificação, versão e SHA-256
  registrados; não há consulta externa em runtime. Pontos facultativos e
  feriados estaduais/municipais não são excluídos; ano sem calendário
  versionado falha explicitamente. O limite exclusivo `due_at` é 00h do dia
  seguinte ao vencimento em `America/Sao_Paulo`; o empréstimo passa a
  atrasado quando `reference_instant >= due_at`.
- CA-32: O quinto empréstimo aberto é permitido e o sexto é recusado.
  Com quatro empréstimos abertos não atrasados e dois equipamentos
  disponíveis diferentes, duas solicitações simultâneas do mesmo
  colaborador resultam exatamente em uma criação e uma recusa; a decisão é
  serializada no PostgreSQL e reavaliada após a espera pelo lock do
  colaborador.
- CA-33: Qualquer empréstimo aberto atrasado bloqueia novo pedido. O
  empréstimo permanece no prazo durante todo o dia da data prevista e passa
  a atrasado precisamente às 00h do dia seguinte em `America/Sao_Paulo`,
  conforme comparação `reference_instant >= due_at`.
- CA-34: Serviço e PostgreSQL impedem equipamento em
  manutenção/emprestado, pedido acima do limite e solicitação por pessoa com
  atraso. Locks de tenant/colaborador e equipamento são adquiridos em ordem
  fixa antes do comando separado de criação. Sob `READ COMMITTED`, a função
  de criação começa com snapshot posterior às esperas, captura uma única
  referência canônica e a usa para regra, cálculo e gravação; a trigger
  valida a integridade e o índice parcial protege a unicidade por
  equipamento. O backend consome os timestamps retornados sem criar outro
  instante.
- CA-35: Dois pedidos simultâneos para o mesmo equipamento produzem no
  máximo um empréstimo aberto, inclusive quando são feitos por
  colaboradores diferentes; o perdedor recebe recusa de negócio. Este teste
  é independente do cenário de concorrência por limite do CA-32.
- CA-36: “Meus empréstimos” mostra somente os empréstimos abertos do
  usuário autenticado, com equipamento e data de devolução.
- CA-37: Recusas por atraso, limite, manutenção ou empréstimo existente
  comunicam o motivo ao usuário, e a regra não depende do frontend.
- CA-38: Testes cobrem calendário/vencimento, regras de domínio,
  persistência/trigger, isolamento por tenant, concorrência, contrato HTTP e
  comportamento do frontend usando dados locais. O frontend adota React/Vite
  conforme ADR-001, preservando a identidade visual e os estilos existentes
  dentro do escopo descrito nesta spec.

## Testes e evidências esperadas

| Critério | Teste/evidência |
|---|---|
| CA-27 | Supertest: autenticação e membership válidos; rejeitar token inválido e identidade/tenant falsificados no corpo. |
| CA-28 | Integração com fixture de 12 equipamentos e Playwright: imagem, nome, categoria, situação derivada e ação habilitada só para disponíveis. |
| CA-29 | Vitest/Playwright: link `Fotos: Pexels` junto à imagem e sem rodapé global. |
| CA-30 | Supertest + PostgreSQL: criação imediata para disponível; recusa para manutenção e empréstimo aberto. |
| CA-31 | Testes de calendário e PostgreSQL: metadados da fonte oficial, versão/hash; feriados nacionais excluídos, facultativos e feriados locais não excluídos; contagem a partir do próximo dia útil; ano sem calendário falha; nenhuma rede em runtime; limite exclusivo `due_at`. |
| CA-32 | PostgreSQL/Testcontainers: preparar quatro empréstimos abertos não atrasados e dois equipamentos diferentes disponíveis; lançar simultaneamente os dois pedidos do mesmo colaborador; exigir exatamente uma criação e uma recusa por limite. Verificar serialização e que o comando após o lock vê o estado confirmado pelo primeiro. |
| CA-33 | Relógio de referência controlado no PostgreSQL: não atrasado antes do limite e durante todo o dia civil de vencimento; atrasado exatamente quando `reference_instant = due_at` (00h do dia seguinte em `America/Sao_Paulo`); nova solicitação bloqueada. |
| CA-34 | Testes unitários/PostgreSQL: tentativas de contornar o backend; locks antes da captura temporal; uso de uma única referência para regras e gravação; timestamps retornados pelo banco; índice parcial ativo. |
| CA-35 | Corrida independente em PostgreSQL/Testcontainers: usuários distintos, ambos elegíveis, solicitam ao mesmo tempo o mesmo equipamento disponível; no máximo uma criação e uma recusa de negócio. |
| CA-36 | Supertest com usuários/tenants e loans em estados diferentes: só retornar empréstimos abertos do usuário autenticado. |
| CA-37 | HTTP e Playwright: motivo visível para atraso, limite, manutenção e equipamento emprestado; confirmar que a API recusa mesmo se o cliente habilitar a ação. |
| CA-38 | Matriz integrada: testes unitários, calendário, PostgreSQL, as duas corridas, Supertest, Vitest/Playwright, typecheck e builds com fixtures locais. |

Fixtures contêm 12 equipamentos locais, imagens mockadas e empréstimos
determinísticos. Nenhum teste depende de Pexels, Supabase remoto ou banco de
produção.

## Riscos, dependências e limites

- Autenticação real e contexto de tenant ainda não existem no scaffold e
  precisam ser implementados conforme ADR-001.
- A aplicação local ainda não tem scaffold React/Vite, embora essa seja a
  stack decidida na ADR-001; a tela atual é estática.
- A adoção do scaffold deve ser incremental: preservar marca, conteúdo
  introdutório, composição do login, tipografia e classes visuais já
  existentes; reaproveitar os estilos em `styles.css` sem alterar esse
  arquivo; substituir apenas o comportamento de demonstração do formulário
  por autenticação real e adicionar componentes/telas estritamente
  necessários para catálogo e “Meus empréstimos”. React/Vite substitui o
  bootstrap do script estático, não exige redesenho completo nem migração
  visual geral. A contagem `03` deve refletir o limite 5 da atividade e o
  texto de prazo deve explicitar dias úteis.
- O atalho “Entrar como Operações” existe hoje na tela, mas a tela e o fluxo
  de Operações estão fora do escopo. A implementação não pode criar login
  ou telas de Operações; a disposição desse atalho precisa ser confirmada
  antes da implementação.
- A carga real dos equipamentos/imagens não está concluída. Testes usam
  fixtures e não provam catálogo de produção.
- O banco conecta com papel proprietário segundo a ADR; RLS não será tratado
  como substituto das verificações explícitas no backend.
- Alterações de schema exigem uma proposta de DDL apresentada e aprovada
  antes da geração/aplicação de migration, conforme `rules/migration.md`.
- Nenhuma migration, escrita remota, upload, publicação, deploy, push ou
  commit está autorizada por esta etapa documental.

## Questões abertas

- Confirmar, antes da implementação da tela de login, se o botão atual
  “Entrar como Operações” deve ser removido ou permanecer visível, desativado
  e claramente identificado como fora de escopo. Nenhuma opção implementa
  autenticação/telas de Operações nesta entrega.
- Confirmar aprovação final desta spec e do plano após esta revisão.
- Antes da migration, apresentar e obter aprovação do DDL concreto, incluindo
  armazenamento dos conjuntos anuais versionados, locks, trigger, função de
  vencimento e estratégia para atualizar fontes/versões.
- A conclusão continua bloqueada até existir relatório real aprovado do
  subagente independente `spec-verifier` e gate com código 0; esta edição
  documental não constitui verificação nem aprovação.
