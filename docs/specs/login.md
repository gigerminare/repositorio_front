# Spec: primeira tela de login

- Escopo: frontend
- Status: aprovado para implementação pelo pedido do usuário

## Contexto e problema

O frontend precisa de uma primeira tela para iniciar o fluxo do sistema de empréstimo de equipamentos internos.

## Objetivo

Entregar uma tela de login visualmente fiel ao layout definido em `layout.md`, com acesso de colaborador e atalho para Operações.

## Fora de escopo

- autenticação real;
- integração com Supabase ou API;
- roteamento para telas internas;
- catálogo, empréstimos e operações.

## Comportamento esperado

- A página apresenta a marca EMPREST.AI, a proposta do sistema e as três estatísticas do layout.
- A página apresenta campos de e-mail e senha.
- O botão `Entrar` valida que os dois campos foram preenchidos e mostra estado de processamento local.
- O botão `Entrar como Operações` altera o contexto textual do formulário para operações.
- A página funciona em desktop e em telas menores.
- A interface usa português do Brasil, Raleway e os tokens visuais definidos em `layout.md`.

## Critérios de aceitação

- CA-01: A tela exibe a composição em duas colunas do login em viewport desktop.
- CA-02: A tela exibe marca, título, lead, estatísticas e rodapé operacional.
- CA-03: O formulário contém e-mail, senha, `Entrar` e `Entrar como Operações`.
- CA-04: O envio sem e-mail ou senha informa que os campos precisam ser preenchidos.
- CA-05: O atalho de Operações atualiza o título, o texto de apoio e a nota do formulário.
- CA-06: A composição se reorganiza para uma coluna em viewport menor sem sobreposição.
- CA-07: A tela não declara autenticação concluída nem simula integração com backend.

## Dependências e riscos

- A implementação é estática porque o frontend ainda não possui scaffold React/Vite.
- A fonte visual é `layout.md`; a migração para React/Vite deverá preservar este comportamento.
