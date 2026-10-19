# Spec: sistema completo EMPREST.AI

- Escopo: frontend e backend
- Status: aprovado para implementação pelo pedido do usuário

## Contexto e problema

O sistema precisa substituir a planilha compartilhada por uma aplicação funcional para gestão de empréstimo de equipamentos internos. O fluxo deve cobrir login, catálogo de equipamentos, empréstimos do colaborador, devolução, painel operacional e cadastro de itens.

## Objetivo

Entregar uma aplicação localmente executável, com backend de API e frontend visualmente alinhado ao layout definido em `layout.md`, cobrindo os casos principais do PRD.

## Fora de escopo

- autenticação real via Supabase;
- integração com banco externo em produção;
- envio de e-mail;
- reserva futura;
- exportação/importação massiva.

## Usuários envolvidos

- Colaborador: consulta catálogo, solicita itens e devolve equipamentos próprios;
- Operações: cadastra itens, acompanha empréstimos e registra devolução no balcão;
- Sistema: expõe API e mantém estado em memória para a demonstração local.

## Comportamento esperado

- A tela de login oferece acesso de colaborador e atalho para operações.
- Após autenticar, o usuário navega por abas de catálogo, meus empréstimos e, para Operações, também operações e equipamentos.
- O catálogo mostra itens disponíveis, emprestados e em manutenção.
- O colaborador só consegue ver e interagir com os itens próprios e com itens disponíveis.
- Operações tem visão completa do inventário e pode cadastrar novos equipamentos.
- A API expõe endpoints de autenticação, catálogo, empréstimos e cadastro de itens.
- O front usa os dados retornados pela API para renderizar estado de carregamento, sucesso e erro.

## Regras de negócio

- Cada pessoa pode ter no máximo 3 itens emprestados simultaneamente.
- O prazo padrão de devolução é de 14 dias.
- Quem está com item em atraso não pode pegar outro empréstimo.
- Equipamentos em manutenção não são disponibilizados.
- O item com o usuário não pode ser solicitado novamente.
- O cadastro de equipamento exige nome e cria patrimônio padrão quando necessário.
- Cada usuário vê apenas os próprios empréstimos; a visão completa fica em Operações.

## Critérios de aceitação

- CA-01: O sistema inicia com login e permite autenticar como colaborador e como operações.
- CA-02: O catálogo exibe equipamentos filtráveis por situação e por busca textual.
- CA-03: O colaborador consegue solicitar um item disponível e o status muda imediatamente para emprestado.
- CA-04: O colaborador consegue devolver um item próprio e o equipamento volta a ficar disponível.
- CA-05: Operações consegue cadastrar um equipamento novo e vê o item na tabela de operações.
- CA-06: A operação de devolução em balcão registra a devolução para qualquer item em aberto.
- CA-07: O frontend e o backend funcionam juntos em ambiente local e usam a mesma fonte de dados.
- CA-08: O sistema respeita o limite de 3 itens e o bloqueio por atraso.

## Dependências e riscos

- A solução será executada localmente em um ambiente sem Supabase ou Vercel.
- A persistência será em memória para manter a entrega funcional e executável no mesmo repositório.
- A interface visual deve manter o padrão definido em `layout.md` e evitar regressão de legibilidade.
