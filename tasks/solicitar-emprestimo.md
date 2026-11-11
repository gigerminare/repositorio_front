# Tasks — Entrega 4: solicitar empréstimo

Os critérios referem-se a
[`docs/specs/solicitar-emprestimo.md`](../docs/specs/solicitar-emprestimo.md).
Não iniciar implementação sem aprovação da spec/plano e, para schema,
aprovação separada do DDL. Não alterar `styles.css`.

## T-01 — Registrar e verificar spec, plano e tasks

- Descrição: formalizar decisões, critérios de aceitação, estratégia de
  teste, arquivos e dependências da Entrega 4.
- Arquivos: `docs/specs/pratica-sdd-subagentes.md`,
  `docs/specs/solicitar-emprestimo.md`, `plans/solicitar-emprestimo.md`,
  `tasks/solicitar-emprestimo.md`.
- Critérios: CA-27–CA-38.
- Verificação: revisão contra HTML/ADR/rules; execução real e independente
  do `spec-verifier`; persistir sem alteração o relatório JSON e executar
  `python tools/spec_verification_gate.py`.
- Estado: documentação revisada; bloqueada até verificação real e gate
  aprovado. Não iniciar implementação nem declarar spec aprovada antes disso.

## T-02 — Aprovar proposta de DDL

- Descrição: apresentar SQL proposto para dados anuais versionados de
  feriados, função de vencimento, trigger, locks em ordem fixa, captura
  única do instante e validações antes de gerar migration.
- Arquivos: nenhum até a aprovação; a proposta será apresentada em resposta
  conforme `rules/migration.md`.
- Critérios: CA-31–CA-35.
- Verificação: aprovação explícita do DDL e revisão do impacto em dados.
- Estado: pendente. Dependência: T-01.

## T-03 — Criar enforcement local no PostgreSQL

- Descrição: somente após aprovação do DDL, criar migration Prisma local
  com calendário nacional anual versionado, função determinística de
  vencimento e operação PostgreSQL de criação. Adquirir locks em instrução
  anterior, capturar um único instante no comando de criação posterior e
  aplicar as validações; a trigger garante integridade.
- Arquivos: `repositorio-back/prisma/schema.prisma`,
  `repositorio-back/prisma/migrations/`, arquivos/metadados locais do
  calendário e testes de persistência.
- Critérios: CA-31–CA-35, CA-38.
- Verificação: `prisma validate`, migration/reset apenas local; verificar
  fontes/versões/hash e ausência de chamadas externas; PostgreSQL/Testcontainers
  com tentativas diretas e os cenários concorrentes separados de CA-32/CA-35.
  Confirmar `READ COMMITTED`, snapshot novo após espera, e único instante
  gerado pelo PostgreSQL depois da aquisição de locks.
- Estado: pendente. Dependências: T-01 e T-02.

## T-04 — Implementar autenticação e tenant no backend

- Descrição: validar JWT/JWKS e obter user/tenant exclusivamente do
  membership/contexto confiável, conforme ADR-001; não aceitar identidade
  enviada pelo cliente como autoridade.
- Arquivos: `repositorio-back/src/modules/auth/`,
  `repositorio-back/src/main.ts`, configuração e testes.
- Critérios: CA-27, CA-36, CA-38.
- Verificação: testes unitários e HTTP para token inválido, membership,
  isolamento de tenant e ausência de autoridade em IDs enviados pelo cliente.
- Estado: pendente. Dependência: T-01; pode avançar sem T-03, mas apenas
  depois da aprovação da spec/plano e da liberação do gate.

## T-05 — Implementar catálogo e solicitação de empréstimo

- Descrição: criar módulos equipment/loans em camadas Controller → Service
  → Repository, leitura do calendário local no PostgreSQL, transação,
  registro de auditoria e consultas próprias. O backend envia a intenção do
  pedido e usa os timestamps retornados pelo banco; não usa relógio local
  para elegibilidade, vencimento ou atraso.
- Arquivos: `repositorio-back/src/modules/equipment/`,
  `repositorio-back/src/modules/loans/`, Prisma e testes.
- Critérios: CA-28, CA-30–CA-37.
- Verificação: Jest, Supertest e testes com PostgreSQL para regras,
  vencimento, motivo de recusa e duas corridas separadas: mesmo equipamento
  (CA-35) e mesmo colaborador com quatro empréstimos pedindo dois
  equipamentos diferentes (CA-32).
- Estado: pendente. Dependências: T-01, T-03 e T-04.

## T-06 — Integrar login, catálogo e “Meus empréstimos” no frontend

- Descrição: introduzir o scaffold React/Vite e TypeScript strict da
  ADR-001, migrar incrementalmente o login estático para React e integrar
  autenticação Supabase e endpoints da API. Preservar marca, conteúdo
  introdutório, composição, classes visuais e `styles.css` sem alteração;
  corrigir apenas textos/regras da atividade e acrescentar catálogo e “Meus
  empréstimos”. Não reconstruir o design inteiro nem implementar
  autenticação/telas de Operações.
- Arquivos: `repositorio_front/package.json`, configuração Vite/TypeScript,
  `index.html`, novo `src/`, cliente OpenAPI e folhas de estilo novas
  estritamente necessárias; manter `styles.css` inalterado. A decisão sobre
  o atalho “Entrar como Operações” deve estar resolvida antes desta task.
- Critérios: CA-27–CA-33, CA-35–CA-38.
- Verificação: Vitest, Playwright e build; validar login real, preservação
  visual delimitada, catálogo, somente disponíveis solicitáveis, mensagens
  de bloqueio e empréstimos próprios/data civil correta.
- Estado: pendente. Dependências: T-01 e T-05.

## T-07 — Verificar regras e concorrência integradas

- Descrição: executar matriz unitária, banco, API e interface com fixtures
  locais e cobrir corridas e limites. Garantir que o teste de mesmo
  equipamento e o teste de limite por colaborador não sejam combinados em
  um único cenário.
- Arquivos: suites `repositorio-back/src/`, `repositorio-back/test/` e
  testes do `repositorio_front/src/`.
- Critérios: CA-27–CA-38.
- Verificação: suites Jest/Testcontainers/Supertest, Vitest/Playwright,
  typecheck, builds e `git diff --check`. CA-32: com quatro empréstimos
  abertos, dois pedidos simultâneos do mesmo usuário para equipamentos
  distintos: exatamente um sucesso e uma recusa. CA-35: usuários diferentes
  pedem o mesmo equipamento simultaneamente: no máximo um sucesso.
- Estado: pendente. Dependências: T-01 e T-03–T-06.

## T-08 — Verificar independentemente e liberar conclusão

- Descrição: delegar spec e evidências ao subagente independente; salvar o
  JSON original e rodar o gate sem alterar seu resultado.
- Arquivos: `verification/specs/solicitar-emprestimo.json` e evidências
  previstas em cada repositório, sem inventar relatórios.
- Critérios: CA-27–CA-38.
- Verificação: execução real do agente `spec-verifier` e gate com código 0.
- Estado: pendente. Dependência: T-07 e disponibilidade real do subagente;
  qualquer FAIL mantém a entrega bloqueada.
