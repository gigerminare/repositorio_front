# Subagente verificador de specs

O agente `spec-verifier` é uma etapa obrigatória do fluxo SDD descrito em
[`AGENTS.md`](../AGENTS.md). O mesmo agente e o mesmo gate existem no
repositório backend.

## Acionamento

Depois de implementar e testar uma spec, invoque `spec-verifier` como
subagente em contexto limpo, passando o caminho da spec. O agente relê a spec
e examina evidências por conta própria. Não forneça a ele um parecer do agente
implementador.

O relatório é devolvido em JSON na conversa. O agente principal o salva sem
alterações em `verification/specs/<nome-da-spec>.json` e executa o gate na
pasta que contém os dois repositórios:

```powershell
python repositorio_front/tools/spec_verification_gate.py `
  --spec repositorio_front/docs/specs/pratica-sdd-subagentes.md `
  --report repositorio_front/verification/specs/pratica-sdd-subagentes.json
```

Para outra spec, substitua `--spec` e `--report`. Os caminhos são relativos à
pasta comum dos repositórios. Relatórios de rodadas diferentes usam os mesmos
campos e a mesma ordem dos critérios, permitindo comparação direta.

## Regra de decisão

- Cada critério `CA-xx` deve ter exatamente um `PASS` ou `FAIL`.
- Um PASS exige referência a arquivo existente, linhas e observação objetiva.
- Ausência de artefato pode ser relatada como evidência `missing`, mas nunca
  aprova um critério.
- O gate bloqueia relatório ausente, esquema incorreto, critério faltante ou
  excedente, texto do critério divergente, evidência sem referência válida,
  totais incorretos ou qualquer FAIL.
- Código de saída `0` significa que todos os critérios têm evidência válida e
  passaram. Código `1` significa que existe FAIL. Código `2` significa
  relatório ausente ou inválido.
- O gate é somente leitura; ele não corrige nem altera arquivos.

O agente só dispõe de ferramentas de leitura e busca, sem edição, terminal,
subagentes, navegador ou ferramentas externas. A proibição também cobre
testes quebrados: o resultado volta ao agente principal, que decide a
correção e solicita uma nova rodada.

## Testes

Execute os testes do gate com a biblioteca padrão do Python:

```powershell
python -m unittest discover -s repositorio_front/tests -v
```

Os testes cobrem relatório aprovado, falhas e evidências inválidas, bloqueio
sem verificação, erro plantado e a configuração read-only do agente. Eles
validam o harness e o contrato do relatório; não substituem uma rodada real do
subagente sobre a spec que será concluída.
