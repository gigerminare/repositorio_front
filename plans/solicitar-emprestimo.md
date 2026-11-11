# Plano — Entrega 4: solicitar empréstimo

## Escopo e referências

Implementação coordenada entre `repositorio_front/` e `repositorio-back/`.
A fonte de requisitos é `docs/specs/solicitar-emprestimo.md`, baseada na
seção Entrega 4 de `pratica-sdd-subagentes.html`. A atividade substitui,
somente nesta entrega, o limite 3 e o prazo de 14 dias corridos do PRD e as
premissas antigas da ADR-002/layout.

Não alterar `styles.css` preexistente. Não carregar os dados reais, acessar
ou escrever em produção, fazer upload, migration remota, deploy, push ou
commit.

## Arquivos e áreas previstos

### Frontend

- `repositorio_front/package.json`, TypeScript estrito e configuração
  Vite/React: scaffold SPA conforme ADR-001, hoje ausente.
- `repositorio_front/index.html`: preservar metadados, título, fontes e link
  para `styles.css`; montar a aplicação React sem reconstruir o shell visual.
- Novo `repositorio_front/src/`: migrar para componentes React apenas a tela
  de login existente e acrescentar catálogo e “Meus empréstimos”.
- `repositorio_front/src/services/`: cliente gerado do OpenAPI e integração
  Supabase Auth; o frontend não acessa Prisma/PostgreSQL diretamente.
- Reutilizar marca, conteúdo introdutório, composição, classes e identidade
  visual existentes. Não editar nem substituir `styles.css`; componentes
  novos usam estilos locais novos, com mudanças limitadas aos cartões e
  estados requeridos.
- Substituir o timeout/mensagem demonstrativa do formulário por autenticação
  real. Ajustar o indicador de 03 para 05 e identificar 14 dias úteis.
  Nenhuma tela, papel ou fluxo de Operações será implementado.
- Manter o botão atual “Entrar como Operações” sem comportamento de login
  enquanto a decisão de removê-lo ou identificá-lo como indisponível não for
  aprovada.
- `repositorio_front/src/**/*.test.*` e testes Playwright: fixtures e fluxos
  sem dependência de produção.

### Backend

- `repositorio-back/src/modules/auth/`: validação de JWT/JWKS e contexto
  autenticado de usuário/tenant, conforme ADR-001.
- `repositorio-back/src/modules/equipment/`: controller, service e
  repository do catálogo, com situação efetiva derivada.
- `repositorio-back/src/modules/loans/`: DTOs, Controller → Service →
  Repository, regra de elegibilidade, calendário e consulta dos empréstimos
  próprios.
- `repositorio-back/prisma/schema.prisma` e uma nova migration Prisma:
  armazenamento dos conjuntos de feriados nacionais por ano e metadados de
  fonte/versão/hash; função versionada de vencimento; trigger de validação e
  serialização. Preservar o índice parcial existente. O DDL completo precisa
  de aprovação antes da migration.
- `repositorio-back/src/modules/loans/calendar/` ou caminho equivalente:
  material local versionado por ano com datas de feriados nacionais legais.
  Cada conjunto identifica a fonte federal, a publicação/consulta, sua
  versão e hash. Pontos facultativos e feriados estaduais/municipais não
  entram. Sem conjunto para um ano de cálculo, falhar explicitamente.
- `repositorio-back/src/**/*.spec.ts` e `test/`: testes unitários, HTTP e
  PostgreSQL/Testcontainers para regras, trigger e corrida.
- Tabela `audit_logs`: registrar criação do empréstimo na mesma transação,
  conforme a decisão de auditoria da ADR-001.

Os caminhos internos de módulos são propostos; devem seguir os padrões
existentes do NestJS e Prisma quando a implementação começar.

## Abordagem técnica

1. **Autenticação e tenant:** front autentica com Supabase Auth; backend
   valida JWT/JWKS, resolve membership e coloca user/tenant no contexto.
   Nenhuma rota aceita `userId` ou `tenantId` como autoridade do cliente.
   Essa é a implementação da autenticação ainda ausente, não uma presunção
   de que o login estático atual já funcione.
2. **Catálogo:** consultar equipamentos do tenant e empréstimos abertos;
   derivar situação como manutenção, emprestado ou disponível. Não duplicar
   `emprestado` em `equipment.status`.
3. **Pedido e relógio:** `POST /v1/loans` recebe o equipamento. Em transação
   `READ COMMITTED`, uma primeira instrução adquire locks transacionais por
   tenant/colaborador e depois pelo equipamento, sempre na mesma ordem; a
   instrução aguarda até obter ambos. Uma instrução de criação separada,
   iniciada após os locks, tem snapshot novo e chama a função PostgreSQL de
   criação. Essa função captura uma vez `clock_timestamp()` e usa o mesmo
   instante para elegibilidade, data local do pedido, vencimento, atraso e
   timestamps gravados; a trigger valida a integridade. O backend não envia
   relógio nem vencimento próprios e usa os valores retornados pelo banco.
   Assim, após esperar pelo lock do usuário, o segundo pedido vê o empréstimo
   confirmado pelo primeiro e decide com uma nova referência temporal.
   Conflitos viram erro de negócio documentado.
4. **Calendário:** dados locais imutáveis e versionados por ano. A fonte
   primária são as normas federais vigentes que instituem feriados nacionais;
   publicações oficiais federais anuais são registradas como conferência,
   descartando pontos facultativos. Cada conjunto registra ano, autoridade,
   título/identificação e URL oficial, datas de publicação/verificação,
   versão e SHA-256 das datas. Não incluir feriados estaduais/municipais nem
   fazer chamadas em runtime. A função PostgreSQL calcula os 14 dias úteis
   começando no próximo dia útil e falha para ano sem calendário aprovado.
   `due_at` é a meia-noite exclusiva seguinte à data civil de vencimento, em
   `America/Sao_Paulo`; atraso começa quando
   `reference_instant >= due_at`.
5. **Banco:** antes da migration, apresentar o DDL completo em resposta e
   aguardar aprovação escrita conforme `rules/migration.md`. A migration
   será local e gerada por Prisma. Definir no DDL a função de criação
   PostgreSQL, trigger de integridade, acesso de escrita compatível com a
   ADR, armazenamento dos conjuntos anuais e locks. Preservar o índice único
   parcial. Nenhum DDL será executado antes da aprovação.
6. **Consulta própria:** `GET /v1/me/loans` filtra no backend por user e
   tenant autenticados e retorna somente abertos, expondo a data civil de
   vencimento correspondente ao limite exclusivo armazenado.
7. **Interface:** após autenticação, apresentar catálogo com cards e estados,
   feedback de bloqueio e ação para itens disponíveis; incluir “Meus
   empréstimos”. Migrar a tela atual sem redesenho amplo, reaproveitar os
   elementos visuais/classes existentes e não tocar em `styles.css`.
   Não implementar Operações; tratar o atalho atual somente após decisão.

## Ordem de execução

1. Verificar a spec e o baseline por subagente independente; arquivar o JSON
   original e executar o gate. Antes da implementação, o gate confirma a
   correspondência dos critérios, a estrutura e as evidências do relatório;
   os FAILs do baseline são esperados porque a funcionalidade ainda não foi
   implementada. O gate precisa retornar PASS após T-07 e a nova verificação
   independente em T-08 para liberar a conclusão.
2. Apresentar DDL planejado para trigger/funções/índices e obter aprovação
   separada, sem executar migration antes dela.
3. Implementar migration local e testes de banco para o calendário
   versionado, a trigger, os locks e a captura temporal única.
4. Implementar autenticação/contexto de tenant e módulos de equipamento e
   empréstimo no backend.
5. Migrar o login existente para React/Vite, preservando sua identidade e
   `styles.css`, e integrar catálogo, solicitação e “Meus empréstimos”.
6. Executar suites unitárias, integração/concorrência, HTTP, frontend e build;
   corrigir somente conforme o fluxo de aprovação em `rules/check.md`.
7. Rodar verificações finais, validar escopo/Git e submeter a spec ao
   verificador; qualquer FAIL bloqueia conclusão.

## Rastreabilidade

| Etapa | Critérios |
|---|---|
| Autenticação, usuário e tenant | CA-27, CA-36, CA-38 |
| Catálogo e estado efetivo | CA-28, CA-29, CA-30, CA-34 |
| Serviço, prazo e API | CA-30–CA-37 |
| Calendário, trigger, índice, locks e relógio | CA-31–CA-35, CA-38 |
| Frontend incremental e autenticação | CA-27–CA-33, CA-35–CA-38 |
| Testes e gate | CA-27–CA-38 |

## Dados, segurança e operação

- Testes usam fixtures locais de 12 equipamentos; nenhuma fixture afirma que
  os dados foram carregados em produção.
- A autenticação usa JWT validado no backend; escopo de tenant e usuário
  sempre vem da sessão validada.
- O PostgreSQL é a única fonte de tempo para cada pedido. Adquirir locks em
  comando anterior ao comando de criação; sob `READ COMMITTED`, o comando
  posterior começa com snapshot novo após qualquer espera. A função de
  criação captura `clock_timestamp()` uma única vez e aplica a referência a
  todas as verificações e gravações. Não usar `transaction_timestamp()`
  capturado antes de esperar nem relógio de aplicação.
- Calendários anuais são dados versionados e imutáveis, não baixados durante
  runtime. Atualizações são revisadas e registradas; anos sem conjunto
  disponível falham de forma explícita.
- Evitar credenciais em código, docs, testes, logs ou histórico Git. Não ler
  nem revelar `.env`.
- Serviço e PostgreSQL impõem as regras; o frontend só reflete o resultado.
- Migration apenas local após aprovação explícita do DDL. Nenhuma escrita
  remota, upload, publicação, deploy, push ou commit.

## Verificação planejada

- Backend: Jest unitário; Supertest HTTP; PostgreSQL 16 em Testcontainers;
  duas corridas separadas: (1) mesmo equipamento solicitado por usuários
  diferentes, no máximo um sucesso; (2) mesmo usuário com quatro abertos
  pedindo dois equipamentos diferentes, exatamente um sucesso e uma recusa.
- Frontend: Vitest e Playwright, segundo o scaffold ADR-001; validar
  migração visual mínima, autenticação, catálogo e “Meus empréstimos”.
- Calendário: testes de conteúdo e metadados para ano/autoridade/fonte
  oficial/versão/hash, feriados nacionais, exclusão de facultativos e
  feriados locais e falha explícita sem dados do ano; verificar ausência de
  requisições HTTP de calendário.
- Cobrir datas em fim de semana, feriado nacional, exclusão de facultativos
  e feriados locais, mudança de mês/ano, início da contagem, instante exato
  de meia-noite e conversão `America/Sao_Paulo`.
- Build/typecheck do backend e build do frontend.
- `git diff --check`, revisão de `git status --short`, e validação final por
  `rules/check.md`.

O workspace não tem suite/build configurados no frontend raiz no momento.
O scaffold exigido pela ADR é uma mudança delimitada de estrutura e runtime,
não uma reconstrução visual: manter `index.html` como shell/metadata,
reaproveitar o visual e classes atuais, preservar `styles.css` sem alteração
e acrescentar só as telas desta entrega. O botão de Operações fica
pendente de decisão e nenhuma implementação pode ultrapassar o escopo.
