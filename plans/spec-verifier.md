# Plano: subagente verificador de specs

## Arquivos

- `AGENTS.md`: acionamento obrigatório e regra de conclusão.
- `.github/agents/spec-verifier.agent.md`: persona read-only e formato de saída.
- `docs/spec-verifier.md`: uso, relatório e gate.
- `docs/specs/pratica-sdd-subagentes.md`: requisitos e critérios da Entrega 1.
- `tools/spec_verification_gate.py`: validação fail-closed do relatório.
- `tests/`: testes do gate e da configuração do agente.
- `README.md`: descoberta da documentação.

O mesmo harness e documentação de uso serão disponibilizados no backend para
que cada repositório possa verificar specs mesmo quando aberto sozinho.

## Abordagem

1. Registrar na spec específica da prática a decisão de rejeitar a exceção
   proposta pelo tech lead e manter o verificador read-only.
2. Alinhar agente, instruções, documentação e testes nos dois repositórios.
3. Ampliar testes negativos do gate e demonstrar equivalência byte a byte e
   comportamental.
4. Documentar que o gate CLI é obrigatório por processo, mas não impede
   deterministicamente uma conclusão conversacional omitida.
5. Executar rodadas reais e independentes do agente em ambos os repositórios,
   preservar os JSONs retornados e executar os gates.
6. Usar a divergência já observada de TI-0006 como condição de erro, obter
   reprovação independente, corrigir pelo agente principal segundo a decisão
   registrada na spec de dados iniciais e solicitar nova verificação
   independente.
7. Registrar resultados reais e limitações no `ENTREGA.md` de ambos; não
   criar commits, tags, push ou deploy.

## Verificação

- Testes unitários com `python -m unittest` nos dois repositórios, incluindo
  JSON inválido, schema inválido, relatório incompleto e erro plantado.
- Comparar os gates com `fc /b` e executar os testes correspondentes em ambos.
- Executar cada rodada independente do agente e seu gate com o JSON original.
- Confirmar, por leitura do catálogo e nova verificação, a remoção da
  divergência de TI-0006.
- `git diff --check` e `git status --short` nos dois repositórios.
- Não apresentar hashes de commits, tags ou evidências de histórico que não
  existam.

## Rastreabilidade

- CA-07 a CA-12: agente, gate, evidências, independência e testes desta
  implementação.
- CA-01 a CA-06: requisitos das demais entregas; permanecem fora do escopo de
  implementação desta task.
- CA-07: documentar como limitação a ausência de bloqueio determinístico da
  conclusão conversacional; o gate só garante resultado quando executado.
- A decisão sobre o tech lead é específica desta prática e não altera as
  rules globais.
