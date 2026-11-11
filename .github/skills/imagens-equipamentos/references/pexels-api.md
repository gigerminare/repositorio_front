# Fonte de imagens: API Pexels

## Busca autorizada

Use somente o endpoint oficial `GET https://api.pexels.com/v1/search`.
Envie o termo de busca exato da atividade no parâmetro `query` e autentique a
requisição com o valor local de `PEXELS_API_KEY` no header `Authorization`.
Não passe a chave na URL nem em argumentos visíveis do comando.

A resposta da API contém a lista `photos`. Selecione candidatos somente dessa
lista e guarde os campos retornados pela API, incluindo `id`, `url`,
`photographer`, `photographer_url` e `src`. A imagem baixada deve vir de uma
URL `src` retornada para o candidato escolhido; não substitua por URL copiada
de busca, CDN não vinculada à resposta, imagem externa ou arquivo antigo.

## Seleção e revisão

Resultados da busca são apenas candidatos, não aprovação. Abra a imagem
retornada para revisão humana e aplique todos os itens de
`visual-review.md`. Se uma foto for reprovada, não a processe nem a associe a
um patrimônio. Busque outra candidata pela API e registre somente a
selecionada e aprovada no manifesto final.

## Metadados mínimos

Para cada foto aprovada, preserve:

- patrimônio do equipamento e `id` da foto no Pexels;
- `url` da página da foto e URL exata de imagem escolhida de `src`;
- `photographer` e `photographer_url`;
- nome da licença (`Pexels License`) e URL oficial
  `https://www.pexels.com/license/`;
- termo de busca e data/hora da consulta e da revisão;
- resultado da revisão humana e identificador do revisor.

Não armazene a chave ou o header de autenticação nos metadados. Não imprima
respostas que contenham segredos; a resposta da API não deve conter a chave.

## Não permitido

- Outra API, site, mecanismo de busca ou coleção local como fonte.
- Completar campos ausentes inventando dados ou afirmar licença que não foi
  verificada.
- Reutilizar o mesmo `id` do Pexels para mais de um patrimônio.
- Fazer upload dos resultados ao Supabase ou a qualquer destino remoto.
