# Tasks: subagente verificador de specs

- [x] T-01 | Implementar agente read-only e gate de relatório | `AGENTS.md`, `.github/agents/`, `tools/`, `docs/`, `README.md` | CA-07 a CA-11 | `python -m unittest discover -s repositorio_front/tests -v` e `git diff --check` | concluída
- [x] T-02 | Testar bloqueios, evidências, erro plantado e independência | `tests/` | CA-08 a CA-12 | `python -m unittest discover -s repositorio_front/tests -v` | concluída
- [x] T-03 | Validar gate sem relatório e revisar os dois worktrees | frontend e backend | CA-11 | gate deve bloquear; `git status --short` em ambos | concluída
