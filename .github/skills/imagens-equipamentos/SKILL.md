---
name: imagens-equipamentos
description: "Use para buscar, revisar e preparar imagens de equipamentos com a API oficial do Pexels, gerar arquivos 800x600 com sharp e registrar créditos; nunca envia imagens ao Supabase."
---

# Skill imagens-equipamentos

Prepara uma foto licenciada do Pexels por equipamento para futura carga no
bucket público de imagens. Esta skill só obtém conteúdo pela API oficial do
Pexels e só grava artefatos locais.

## Quando usar

- Buscar uma foto para um equipamento usando o termo definido na spec da
  prática.
- Revisar visualmente uma candidata e registrar a decisão.
- Normalizar uma foto aprovada para JPEG 800×600 e gerar seus metadados e
  crédito.

Não use esta skill para outras imagens do produto, para cadastrar
equipamentos, para criar catálogo ou para operar banco, Storage ou produção.

## Procedimento

1. Leia `docs/specs/pratica-sdd-subagentes.md` e use o termo de busca exato da
   atividade para cada patrimônio. Não altere a situação nem os dados dos
   equipamentos nesta entrega.
2. Leia [a referência da API Pexels](./references/pexels-api.md). A chave
   deve estar disponível somente como `PEXELS_API_KEY` no ambiente local.
   Nunca a inclua em argumentos, arquivos, saída de terminal ou logs.
3. Use a busca oficial do Pexels, escolha uma foto retornada pela API e
   registre o identificador, URL da foto, URL da imagem fornecida pela API,
   fotógrafo, URL do fotógrafo e os dados da licença.
4. Execute a busca local para obter candidatos da API. Abra a página e a
   imagem do candidato escolhido e faça a revisão visual conforme
   [a lista de verificação](./references/visual-review.md). Não aprove uma
   foto com pessoa, marca/logo legível, texto legível ou tela com conteúdo.
   Se houver dúvida, rejeite a candidata e escolha outra.
5. Registre a revisão completa e a aprovação humana no manifesto descrito
   em [formato e comandos](./references/manifest.md). Uma revisão ausente,
   incompleta ou reprovada bloqueia o processamento.
6. Execute o preparo local do manifesto. O script confirma cada foto com
   uma nova busca na API Pexels e baixa somente a URL de imagem dessa
   resposta. Ele bloqueia patrimônio repetido e foto reutilizada.
7. O script gera JPEG de 800×600 com `sharp` e grava imagem e metadados em
   caminhos determinísticos. Não substitua o processador por outra
   biblioteca.
8. Confira no manifesto as URLs, fotógrafo, licença e o caminho de objeto
   destinado ao bucket público, sem se conectar a ele.
9. Associe a cada foto o crédito visual `Fotos: Pexels` com link para a
   página daquela foto. Siga
   [a referência de metadados e crédito](./references/credits.md); não use
   rodapé global.
10. Entregue os arquivos e metadados locais para revisão. Não configure ou
    use cliente Supabase, não faça upload, deploy, publicação ou escrita
    remota.

## Limites de segurança

- Não procure nem use imagens de outro provedor, busca web genérica ou
  arquivos de origem já existentes no projeto.
- Não revele a chave Pexels nem a inclua em Git.
- Não declare a revisão visual automatizada: a decisão de conteúdo é humana
  e precisa ficar registrada.
- Esta skill não tem etapa de upload. O usuário executará eventual operação
  remota, após revisão, fora deste fluxo.

## Artefatos

- [Busca e preparação local](./scripts/prepare-images.mjs)
- [Formato do manifesto e comandos](./references/manifest.md)
