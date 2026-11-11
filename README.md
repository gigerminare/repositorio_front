# EMPREST.AI — Frontend

## Estado atual

O frontend implementado é uma página estática de login, feita com HTML, CSS e
JavaScript sem framework. Ela valida campos vazios e oferece feedback local;
não autentica usuários, não chama a API e não carrega dados de empréstimos.
React e Vite aparecem como decisões para a arquitetura planejada na
[ADR-001](./docs/adr/001-stack.md), mas ainda não estão configurados neste
repositório.

## Estrutura

- `index.html`: estrutura da tela de login.
- `styles.css`: tokens visuais, composição responsiva e estados da interface.
- `script.js`: interações locais do formulário.
- `layout.md`: referência visual.
- `docs/PRD.md`: requisitos gerais do produto.
- `docs/adr/`: decisões de stack e design.
- `docs/specs/`: especificações do produto e da atividade.

## Pré-visualização local

Com Python instalado, execute na raiz deste repositório:

```powershell
python -m http.server 5173
```

Abra `http://localhost:5173`. Se o comando `python` não estiver disponível,
use `py -m http.server 5173`.

Não há `package.json`, scripts de teste ou build frontend neste estado do
projeto.

## API e configuração

O backend separado está em `../repositorio-back/`. A rota de diagnóstico
atual é `GET http://localhost:3000/v1`; as rotas do produto e a integração do
frontend ainda não existem.

`.env.example` documenta nomes de variáveis para a arquitetura planejada,
mas uma página HTML estática não lê variáveis `VITE_*`. Não coloque segredos
em variáveis `VITE_*`, pois valores de frontend podem ser expostos no
navegador. A orientação sobre segredos está em `rules/secrets.md`, na raiz
do workspace, fora deste repositório.

## Prática SDD

Os requisitos específicos da atividade estão em
[`docs/specs/pratica-sdd-subagentes.md`](./docs/specs/pratica-sdd-subagentes.md).
O agente verificador obrigatório, o formato do relatório e o gate de conclusão
estão descritos em [`docs/spec-verifier.md`](./docs/spec-verifier.md).
As regras de segredos e entrega ficam na pasta `rules/` da raiz do workspace
(`rules/secrets.md` e `rules/delivery.md`); essa pasta está fora deste
repositório Git.