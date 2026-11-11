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

1. Usar agente customizado do VS Code com contexto independente, ferramentas
   limitadas a leitura e busca, sem execução ou delegação.
2. Exigir relatório JSON com um item por critério, evidência localizável e
   totais.
3. Validar o relatório e bloquear a conclusão se estiver ausente, inválido,
   sem evidência ou tiver qualquer FAIL.
4. Corrigir a situação de TI-0010 na spec conforme a decisão explícita do
   usuário, que resolve a contradição interna do HTML.
5. Não implementar catálogo, imagens, conta, empréstimos ou operações remotas.

## Verificação

- Testes unitários com `python -m unittest`.
- `git diff --check` no frontend e backend.
- Executar o gate sem relatório para confirmar bloqueio, sem tratar esse
  bloqueio esperado como aprovação da spec.

## Rastreabilidade

- CA-07 a CA-12: agente, gate, evidências, independência e testes desta
  implementação.
- CA-01 a CA-06: requisitos das demais entregas; permanecem fora do escopo de
  implementação desta task.
