# Plano — skill `imagens-equipamentos`

## Contexto

Implementar somente a Entrega 2 da atividade em `.github/skills/`, no
frontend. A fonte de requisitos é a seção “Entrega 2 · a skill
imagens-equipamentos” de `ultima_pratica/pratica-sdd-subagentes.html`;
exceções e limites desta prática estão registrados em
`docs/specs/pratica-sdd-subagentes.md`.

## Arquivos previstos

- `docs/specs/pratica-sdd-subagentes.md`: critérios CA-13–CA-19 e limites da
  revisão visual humana.
- `plans/imagens-equipamentos.md` e `tasks/imagens-equipamentos.md`:
  sequência de execução e rastreabilidade.
- `.github/skills/imagens-equipamentos/SKILL.md`: contrato e fluxo acionável.
- `.github/skills/imagens-equipamentos/references/`: API Pexels, revisão
  visual, metadados e crédito.
- `.github/skills/imagens-equipamentos/scripts/`: preparação local usando
  `sharp`; sem integração de upload.
- `.github/skills/imagens-equipamentos/tests/` e `package.json`: testes do
  pipeline com imagens sintéticas locais.

## Abordagem e ordem

1. Registrar critérios e decisões na spec e decompor as tasks.
2. Escrever a skill e referências, incluindo o fluxo de busca Pexels,
   revisão explícita, origem/crédito e limites de produção.
3. Implementar um script determinístico que valida o manifesto de entrada,
   aplica revisão/aprovação e unicidade, transforma para JPEG 800×600 com
   `sharp` e grava somente saídas locais em caminhos estáveis.
4. Adicionar testes locais com dados e imagens sintéticas para dimensões,
   bloqueios de revisão, unicidade e idempotência.
5. Executar os testes aplicáveis, revisar `git status --short` e atualizar os
   estados das tasks.

## Rastreabilidade

| Etapa | Critérios |
|---|---|
| Skill e referências | CA-13, CA-14, CA-16, CA-18 |
| Script e manifesto | CA-13–CA-18 |
| Testes | CA-14, CA-15, CA-17–CA-19 |

## Testes e build

- O pipeline e os testes serão executados dentro da pasta da skill com os
  scripts declarados no `package.json`, sem chamadas à API Pexels ou ao
  Supabase nos testes.
- Usar fixtures sintéticas locais; testes não necessitam de chave Pexels,
  credenciais Supabase, rede, banco ou Storage.
- `sharp` é a única biblioteca de processamento de imagem e está aprovada
  pela ADR-001.
- O runtime Node.js LTS portátil foi instalado fora do repositório, após
  autorização, e o SHA-256 foi conferido com o checksum oficial. A validação
  usa esse runtime sem alterar a instalação global.
- `sharp` é instalado como dependência local da skill e `node_modules` fica
  ignorado pelo Git; não substituir `sharp` por outra biblioteca.
- Validação executada: `node --check scripts/prepare-images.mjs`, smoke
  local com API/imagem mockadas e `npm test` (6 aprovados, 0 falhas).

## Segurança, dados e operação

- Nenhuma migration, alteração de banco, deploy ou acesso de escrita remota.
- Nenhum cliente Supabase nem caminho de upload na implementação.
- A chave `PEXELS_API_KEY` só será lida do ambiente no momento de busca; não
  será incluída em arquivos, logs ou histórico.
- A detecção de conteúdo visual proibido é revisão humana obrigatória. O
  script bloqueia revisão incompleta/reprovada, mas não alegará detecção
  semântica automática.
- Não alterar `styles.css`, PRD, catálogo, seed de equipamentos, conta do
  professor ou fluxo de empréstimo.
