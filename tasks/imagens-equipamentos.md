# Tasks — skill `imagens-equipamentos`

## T-01 — Registrar spec, plano e tasks

- Descrição: registrar requisitos, limites e critérios verificáveis da
  Entrega 2 e este plano de execução.
- Arquivos: `docs/specs/pratica-sdd-subagentes.md`,
  `plans/imagens-equipamentos.md`, `tasks/imagens-equipamentos.md`.
- Critérios: CA-13–CA-19.
- Verificação: conferir alinhamento com a seção Entrega 2 do HTML oficial.
- Estado: concluída.

## T-02 — Documentar a skill

- Descrição: criar `SKILL.md` e referências da API, revisão visual e crédito.
- Arquivos: `.github/skills/imagens-equipamentos/SKILL.md`,
  `.github/skills/imagens-equipamentos/references/`.
- Critérios: CA-13, CA-14, CA-16, CA-18.
- Verificação: validar frontmatter e instruções contra a spec.
- Estado: concluída.

## T-03 — Implementar preparação local

- Descrição: implementar validação, revisão/aprovação, unicidade,
  idempotência e normalização JPEG com `sharp`.
- Arquivos: `.github/skills/imagens-equipamentos/scripts/` e
  `.github/skills/imagens-equipamentos/package.json`.
- Critérios: CA-13–CA-18.
- Verificação: executar script em fixtures locais; confirmar ausência de
  integração de escrita remota.
- Estado: concluída (smoke local com Pexels e imagem mockados; JPEG 800×600
  e metadados confirmados).

## T-04 — Testar e validar a entrega

- Descrição: testar dimensão 800×600, rejeição de revisão incompleta/reprovada,
  unicidade e idempotência.
- Arquivos: `.github/skills/imagens-equipamentos/tests/`.
- Critérios: CA-14, CA-15, CA-17–CA-19.
- Verificação: `npm test` — 6 testes aprovados, 0 falhas; `git diff --check`
  sem erros.
- Estado: concluída.
