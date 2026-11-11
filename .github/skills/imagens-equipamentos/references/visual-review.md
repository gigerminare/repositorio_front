# Revisão visual obrigatória

Uma pessoa deve abrir e inspecionar cada candidata em tamanho suficiente
antes de aprová-la. A API, os metadados e os testes técnicos não comprovam o
conteúdo visual da imagem.

## Registrar por candidata

- patrimônio e `id` da foto no Pexels;
- `reviewedBy` (identificador do revisor) e `reviewedAt` (data/hora ISO);
- aprovação explícita (`approved: true` ou `approved: false`);
- respostas explícitas para todos os itens abaixo;
- motivo quando reprovada.

| Item proibido | Resposta exigida para aprovar |
|---|---|
| Pessoa, rosto, mão ou parte identificável de pessoa | `false` |
| Marca ou logo legível | `false` |
| Texto legível | `false` |
| Tela ou conteúdo de tela visível | `false` |

Os campos correspondentes são `people`, `brandsOrLogos`, `readableText` e
`screenContent`. Cada resposta deve ser booleana e estar presente. Campo
faltando, desconhecido, indefinido ou marcado como verdadeiro bloqueia a
preparação. Todos os itens devem estar falsos e `approved` deve ser
verdadeiro.

## Reprovação

Rejeite a candidata se algum item proibido estiver presente, se não puder
avaliá-lo com segurança ou se houver qualquer dúvida. Não tente remover
pessoas, marcas, texto ou telas com edição: escolha outra imagem retornada
pela API Pexels. Uma imagem rejeitada não entra no conjunto final de fotos.

## Limite da automação

Os testes podem confirmar que revisão incompleta ou reprovada bloqueia o
processamento. Eles não podem certificar que uma foto real está livre de
conteúdo proibido. Não registre resultado visual como aprovado sem inspeção
humana real.
