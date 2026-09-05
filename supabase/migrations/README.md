# Supabase Migrations

Este diretório contém as migrations SQL do projeto Valora.

## Como executar as migrations

### Opção 1: Supabase Dashboard (Recomendado para dev)

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Vá em **SQL Editor**
3. Copie e cole o conteúdo de cada migration em ordem
4. Execute cada uma

### Opção 2: Supabase CLI

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link ao projeto
supabase link --project-ref your-project-ref

# Executar migrations
supabase db push
```

## Migrations

### 001_create_users_table.sql
- Cria tabela `users` para perfis de usuário
- Configura RLS (Row Level Security)
- Policies: usuário só acessa próprio perfil
- Trigger para updated_at automático

**Executar após:** Criar projeto Supabase
**Necessário para:** Story 1.2 (Cadastro de Usuário)
