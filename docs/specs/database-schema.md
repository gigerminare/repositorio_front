# Spec: schema inicial do banco

- Escopo: backend
- Status: aprovado para implementação pelo pedido do usuário

## Contexto e objetivo

O sistema precisa substituir a planilha de controle de equipamentos por um
modelo persistente para tenants, usuários, equipamentos, empréstimos e
auditoria.

## Fora de escopo

- autenticação e criação de usuários no Supabase Auth;
- endpoints da API;
- reservas futuras, notificações e importação de planilha;
- aplicação de migration em banco remoto.

## Regras

- toda tabela de domínio possui `tenant_id`;
- equipamentos têm situação disponível ou em manutenção;
- cada equipamento pode ter no máximo um empréstimo ativo;
- empréstimos encerrados preservam `returned_at` e `returned_by`;
- acesso SQL é protegido por RLS e policies explícitas;
- o seed cria ou atualiza o tenant `suporte_ti` sem duplicação.

## Critérios de aceitação

- CA-01: Prisma valida o schema sem erros.
- CA-02: A migration cria tenants, memberships, equipment, loans e audit_logs.
- CA-03: Todas as tabelas têm RLS habilitado e policy explícita por tenant.
- CA-04: Um equipamento não aceita dois empréstimos ativos simultâneos.
- CA-05: O seed pode ser executado repetidamente sem duplicar o tenant inicial.
- CA-06: A migration pode ser aplicada em banco local limpo sem intervenção manual.

## Dependências e riscos

O banco precisa ser PostgreSQL com as funções `auth.uid()` e `auth.jwt()` do
Supabase disponíveis. As regras de máximo de três empréstimos e bloqueio por
atraso dependem da transação da camada de aplicação.
