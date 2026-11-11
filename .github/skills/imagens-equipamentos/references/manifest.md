# Manifesto e comandos locais

## Pré-requisitos

- Node.js 20 ou superior e dependências da pasta da skill instaladas.
- `PEXELS_API_KEY` definida no ambiente local. Não a passe como argumento e
  não a grave em arquivos versionados ou logs.
- Revisão humana real de cada foto candidata antes de registrar aprovação.

## Buscar candidatos

Execute da pasta `.github/skills/imagens-equipamentos`:

```text
node scripts/prepare-images.mjs search --equipment TI-0001 --query "laptop on white desk"
```

O comando consulta exclusivamente `https://api.pexels.com/v1/search` e
imprime candidatos retornados pela API, com IDs, páginas de foto,
fotógrafos e URLs de imagem. Abra visualmente as páginas/imagens para
selecionar e revisar uma candidata. Uma busca retornada não significa que a
foto esteja aprovada.

## Formato de entrada

Grave localmente um JSON com uma entrada para cada equipamento a preparar:

```json
{
  "images": [
    {
      "equipment": {
        "patrimonio": "TI-0001",
        "nome": "Notebook 14 polegadas",
        "categoria": "notebook",
        "query": "laptop on white desk"
      },
      "photoId": 123456789,
      "review": {
        "reviewedBy": "identificador do revisor",
        "reviewedAt": "2026-11-11T12:00:00.000Z",
        "approved": true,
        "people": false,
        "brandsOrLogos": false,
        "readableText": false,
        "screenContent": false
      }
    }
  ]
}
```

O valor ilustrativo de `photoId` deve ser substituído por um ID visto na
resposta Pexels da busca. Todos os quatro itens visuais devem estar
explicitamente `false`, e `approved` só pode ser verdadeiro depois da
inspeção humana. Campos de fotografia, URLs e licença são recuperados da
API pelo script, não aceitos como origem confiável a partir do manifesto.

## Preparar imagens

```text
node scripts/prepare-images.mjs prepare --manifest ./reviewed-images.json --output ./prepared
```

O script refaz a busca para cada equipamento e só aceita o `photoId` se ele
aparecer na resposta da API para aquele termo. Baixa apenas a URL de imagem
Pexels dessa resposta e escreve localmente:

```text
prepared/
  images/TI-0001.jpg
  manifest.json
```

O manifesto inclui os metadados e o caminho determinístico
`equipment/TI-0001.jpg` destinado à futura carga no bucket. Repetir a mesma
entrada sobrescreve os mesmos caminhos locais e o mesmo manifesto; nenhuma
duplicata é criada. O script não faz upload nem acessa Supabase.
