# Verificação obrigatória de specs

Antes de declarar qualquer spec concluída:

1. Invoque o agente `spec-verifier` como subagente independente, em contexto
   limpo. Passe o caminho da spec e peça que ele próprio leia a spec completa,
   identifique todos os critérios e examine as evidências do repositório.
2. Não repasse conclusões nem evidências da implementação como substituto da
   leitura independente.
3. Persista sem alterar o conteúdo o JSON retornado pelo verificador em
   `verification/specs/<nome-da-spec>.json`.
4. Rode `python tools/spec_verification_gate.py --spec <caminho-da-spec> --report <caminho-do-relatorio>`.
   Execute o comando a partir da pasta que contém os dois repositórios e use
   caminhos relativos a ela.
5. Só conclua a spec quando o gate terminar com código 0. Qualquer FAIL,
   ausência de relatório, critério faltante ou evidência inválida mantém a
   spec bloqueada e as falhas devem ser devolvidas ao agente principal.

Essa é uma obrigação do processo, não um bloqueio técnico da conversa: o gate
somente valida quando invocado. Não afirme que o harness impede
deterministicamente uma conclusão se a etapa for omitida.

O verificador não pode editar código, testes ou documentação nem corrigir
falhas de teste. A correção e a nova rodada são responsabilidade do agente
principal. O agente verificador não tem ferramenta de execução ou acesso a
operações remotas.

Use `docs/spec-verifier.md` para o contrato do relatório e os comandos
completos.
