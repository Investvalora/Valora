# Valora

Plataforma de análise e gestão de investimentos para investidores brasileiros.

## Stack Técnica

- **Frontend:** Vite 5.x, React 18.3.x, TypeScript 5.5.x
- **Styling:** TailwindCSS 3.4.x (tema dark-only)
- **Routing:** React Router 6.x
- **State:** Zustand 4.5.x
- **Data Fetching:** TanStack Query 5.x
- **Backend:** Supabase (Postgres 15, Auth, Edge Functions)
- **Charts:** Recharts 2.12.x
- **Forms:** React Hook Form 7.x + Zod
- **Package Manager:** pnpm 9.x

## Setup de Desenvolvimento

### 1. Instalar Dependências

```bash
pnpm install
```

### 2. Configurar Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Copie `.env.example` para `.env.local`
3. Adicione suas credenciais:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Rodar Migrations

Execute as migrations SQL no Supabase Dashboard (SQL Editor):

```bash
# No SQL Editor do Supabase, execute em ordem:
# 1. supabase/migrations/001_create_users_table.sql
```

Ou use a Supabase CLI:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

Ver detalhes em `supabase/migrations/README.md`

### 4. Rodar o Projeto

```bash
pnpm dev
```

O app estará disponível em `http://localhost:5173`

### PWA

Para testar a aparência e a instalação no próprio computador, rode `pnpm dev` e
abra `http://localhost:5173`. O service worker é registrado nesse modo; ele não
guarda os módulos de desenvolvimento, preservando o hot reload do Vite.

Para testar no celular pela rede local:

1. Com OpenSSL instalado, rode `pnpm pwa:cert`. O comando cria uma autoridade
   local e um certificado para `localhost` e os IPs atuais da máquina. Se o IP
   mudar, rode-o novamente;
   a autoridade é reaproveitada.
2. Confie no arquivo `.local-pwa/ca.crt` **no computador e no celular**. Esse
   passo é manual nas configurações do sistema. A chave `.local-pwa/ca.key` é
   privada e não deve ser compartilhada.
3. Rode `pnpm dev:pwa` e abra a URL `https://<IP-da-máquina>:5443` no celular,
   usando a mesma rede. No computador, use `https://localhost:5443`.

O navegador só libera o service worker depois de confiar no certificado. Para
testar a interface offline, execute `pnpm build` e depois `pnpm preview`, abrindo
`http://localhost:4173`. O build inclui o manifesto, os ícones e todos os
arquivos da interface no cache; os dados das carteiras continuam dependendo da
conexão com o Supabase. No site publicado, sirva `dist` por HTTPS e configure o
servidor para retornar `index.html` nas rotas da aplicação, como `/carteira`.

## Estrutura do Projeto

```
src/
├── modules/          # Módulos de domínio
│   ├── auth/        # Autenticação
│   ├── portfolio/   # Gestão de carteira
│   ├── wealth/      # Análise de patrimônio
│   ├── dividends/   # Proventos
│   ├── performance/ # Rentabilidade
│   ├── score/       # Score fundamentalista
│   ├── valuation/   # Preço-teto e valuation
│   ├── alerts/      # Sistema de alertas
│   └── assets/      # Detalhes de ativos
├── shared/          # Código compartilhado
│   ├── components/  # Componentes UI reutilizáveis
│   ├── hooks/       # Hooks customizados
│   ├── services/    # Serviços (Supabase, Query Client)
│   ├── types/       # Tipos TypeScript
│   └── utils/       # Utilitários
└── App.tsx          # Componente raiz
```

## Scripts Disponíveis

- `pnpm dev` - Inicia servidor de desenvolvimento
- `pnpm build` - Build de produção
- `pnpm lint` - Roda ESLint
- `pnpm preview` - Preview do build de produção

## Documentação

- [PRD](\_bmad-output/planning-artifacts/prds/prd-Valora-2026-08-15/prd.md)
- [Arquitetura](\_bmad-output/planning-artifacts/architecture/architecture-Valora-2026-08-15/ARCHITECTURE-SPINE.md)
- [Épicos e Stories](\_bmad-output/planning-artifacts/epics.md)
