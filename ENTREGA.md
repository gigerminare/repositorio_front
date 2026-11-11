# Entrega da prática SDD — Verificador de specs

Este relatório integrado deve permanecer idêntico em `ENTREGA.md` nos dois
repositórios Git. Os caminhos da tabela são relativos ao repositório indicado.
O escopo implementado nesta etapa é a Entrega 1; a spec ampla da prática
abrange também outras entregas.

## Decisões e implementação

- O verificador permanece read-only, conforme decisão registrada em
  `repositorio_front/docs/specs/pratica-sdd-subagentes.md`; a exceção proposta
  pelo tech lead não foi adotada e as rules globais não foram alteradas.
- O agente principal analisa e corrige falhas após as aprovações exigidas; uma
  nova rodada independente verifica a correção.
- Os agentes dos dois repositórios têm ferramentas de leitura e busca, sem
  edição ou execução.
- Os gates `tools/spec_verification_gate.py`, os testes do gate e os agentes
  são byte a byte idênticos nos dois repositórios.
- O gate bloqueia relatório ausente/inválido/incompleto, evidência inválida e
  qualquer FAIL. Não há integração determinística que impeça uma conclusão
  conversacional se o gate for omitido; o acionamento obrigatório é regra de
  processo, não enforcement automático.

## Evidências e resultados

| Repositório | Evidência (caminho relativo ao repositório) | Resultado |
|---|---|---|
| Backend | `verification/specs/dados-iniciais.verificacao-independente.json` | Rodada independente inicial: CA-01 e CA-09 FAIL. O gate rejeitou o formato do campo `criterion`. |
| Backend | `verification/specs/dados-iniciais.rodada-2.json` | Rodada independente seguinte: CA-01 FAIL, 8 PASS. O gate rejeitou uma referência de linhas fora do arquivo. |
| Backend | `verification/specs/dados-iniciais.rodada-3.json` | Relatório independente com referências corrigidas; gate: 1 FAIL, 8 PASS. Evidenciou TI-0006 indevidamente em manutenção. |
| Backend | `src/modules/initial-data/catalog.ts` | Agente principal alterou TI-0006 para `disponivel`; TI-0004 e TI-0007 permanecem em manutenção, conforme a spec. |
| Backend | `verification/specs/dados-iniciais.rodada-4-original.json` | JSON bruto da verificação após correção: 9 PASS, 0 FAIL. O gate identificou incompatibilidade no texto CA-05 e intervalo de evidência além do arquivo. |
| Backend | `verification/specs/dados-iniciais.rodada-4.json` | Cópia normalizada para diagnosticar os dois problemas do gate; não é apresentada como JSON original do agente. |
| Backend | `verification/specs/dados-iniciais.rodada-5.json` | Nova rodada independente após a correção: 9 PASS, 0 FAIL; gate retornou código 0. |
| Backend | `verification/specs/dados-iniciais.erro-plantado.json` | Relatório preexistente relacionado à fixture de erro plantado; não substitui prova de commits do ciclo. |
| Frontend | `verification/specs/pratica-sdd-subagentes.verificacao-independente.json` | Rodada independente da spec ampla: 38 critérios, 19 PASS e 19 FAIL; o gate retornou código 1. CA-07 a CA-12 passaram; os FAILs abrangem outras entregas. |
| Frontend | `verification/specs/pratica-sdd-subagentes.rodada-final.json` | Relatório bruto da rodada posterior: 24 PASS e 14 FAIL; CA-06 a CA-12 passaram. O gate bloqueou com código 2 por intervalos inválidos em quatro critérios. |
| Frontend | `verification/specs/pratica-sdd-subagentes.rodada-final-2.json` | Reemissão do verificador com referências de linha revistas: 24 PASS e 14 FAIL; gate retornou código 1. CA-06 a CA-12 passaram. |
| Ambos | `tests/test_spec_verification_gate.py` | Casos para relatório aprovado, JSON/schema inválidos, critérios ausentes, evidência inexistente, FAIL, erro plantado e read-only. |

O ciclo de TI-0006 teve uma falha observada, correção pelo agente principal,
nova verificação independente e confirmação pelo gate: CA-01 passou e o
relatório da rodada 5 obteve código de saída 0. O ciclo não tem commits
separados de erro/correção/aprovação; essa evidência histórica permanece
pendente.

## Testes e equivalência

- Backend: `python -m unittest discover -s repositorio-back/tests -v` —
  última linha: `OK` (16 testes).
- Frontend: `python -m unittest discover -s repositorio_front/tests -v` —
  última linha: `OK` (16 testes).
- `fc /b` confirmou igualdade dos gates, testes do gate e agentes nos dois
  repositórios.
- O teste Jest do backend não iniciou porque `npm`/Node.js não estão
  disponíveis neste ambiente; a suíte TypeScript não está validada.
- `git diff --check` passou nos dois repositórios.

## Pendências e autorização humana

- A spec ampla da prática continua não aprovada: a rodada final válida tem
  14 FAILs fora do escopo de Entrega 1 e o gate retornou código 1.
- Os testes Jest do backend dependem de Node.js/npm disponíveis.
- Não foram criados commits, tags, push ou deploy. O histórico de commits
  exigido para erro plantado/correção e a tag `entrega-pratica` aguardam
  autorização explícita; publicação/push exige autorização separada.

## Atualização — 11/11/2026

- Node.js 22.23.4 e npm 10.9.9 foram disponibilizados em modo portátil, sem
  instalação administrativa e fora dos repositórios.
- Verificações executadas nesta atualização: os testes Python do gate
  passaram (16 testes em cada repositório); `npm run build` passou no
  backend; Jest passou com 17 testes. Nenhum teste da funcionalidade de
  empréstimos foi executado porque ela ainda não foi implementada.
- Baseline independente da spec `solicitar-emprestimo.md`: 12 FAILs
  (CA-27–CA-38) em cada repositório. O gate frontend retornou código 1
  (12 FAILs); o gate backend retornou código 2 por referências de linhas
  fora dos arquivos no relatório original. Esses resultados não aprovam a
  entrega.
- Não houve migration, acesso a `.env`, escrita em produção ou deploy.
- A publicação agora está autorizada pelo usuário apesar dos gates
  reprovados; a implementação funcional, a verificação final aprovada e a
  tag `entrega-pratica` permanecem pendentes.
