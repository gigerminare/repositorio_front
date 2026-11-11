# Metadados, licença e crédito visual

## Metadados por imagem

O registro de cada arquivo aprovado deve conter:

```json
{
  "patrimonio": "TI-0001",
  "photoId": 123456,
  "source": "Pexels",
  "sourceUrl": "URL url retornada pela API Pexels",
  "imageUrl": "URL src retornada pela API Pexels",
  "photographer": "Nome retornado pela API",
  "photographerUrl": "URL photographer_url retornada pela API",
  "license": "Pexels License",
  "licenseUrl": "https://www.pexels.com/license/",
  "creditText": "Fotos: Pexels",
  "creditUrl": "URL url retornada pela API Pexels"
}
```

Os valores de URL e fotógrafo devem vir da resposta da API para a foto
escolhida. O identificador de patrimônio define o nome local estável
`equipment/<patrimonio>.jpg` e o futuro caminho de objeto dentro do bucket;
isso é apenas preparação, não uma instrução de upload.

## Crédito exibido

O crédito deve ficar junto à imagem no componente que a exibir, com link
para a página `sourceUrl` daquela foto. Não colocar créditos num rodapé
global. Forma semântica esperada:

```html
<a href="URL url retornada pela API Pexels">Fotos: Pexels</a>
```

Ao integrar futuramente, validar/escapar a URL antes de inseri-la em HTML e
preservar acessibilidade. Esta entrega documenta o contrato, mas não
implementa o catálogo.

## Idempotência e unicidade

Uma foto aprovada deve aparecer uma única vez no conjunto, indexada pelo
`photoId`, e cada patrimônio deve possuir exatamente um arquivo final. O
mesmo conjunto de patrimônio e foto deve reutilizar `equipment/<patrimonio>.jpg`
e o mesmo registro de metadados em execuções repetidas.
