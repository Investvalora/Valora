---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-create-stories", "step-04-final-validation"]
inputDocuments: 
  - "_bmad-output/planning-artifacts/prds/prd-Valora-2026-08-15/prd.md"
  - "_bmad-output/planning-artifacts/architecture/architecture-Valora-2026-08-15/ARCHITECTURE-SPINE.md"
---

# Valora - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Valora, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**FR-1: Cadastro de Novo Usuário**
Visitante não autenticado pode criar conta fornecendo email, senha, nome completo e telefone.

**FR-2: Login de Usuário Existente**
Usuário registrado pode fazer login com email e senha.

**FR-3: Logout e Gestão de Sessão**
Usuário autenticado pode fazer logout. Sessão expira após período configurável (padrão 7 dias).

**FR-4: Recuperação de Senha**
Usuário pode solicitar recuperação de senha via email.

**FR-5: Adicionar Posição Manual**
Usuário autenticado pode adicionar Posição fornecendo ticker, quantidade, preço médio de compra, data de aquisição.

**FR-6: Importar Transações via CSV**
Usuário pode fazer upload de arquivo CSV com colunas: data, ticker, tipo, quantidade, preço, corretagem. Sistema valida, exibe preview, e permite correção inline antes de confirmar importação.

**FR-7: Visualizar Lista de Posições**
Tela Carteira exibe todas as Posições do usuário: ticker, nome do ativo, quantidade, preço médio, cotação atual, valor de mercado, peso relativo (%), variação %.

**FR-8: Consolidação por Tipo de Ativo**
Tela Carteira exibe card de composição: gráfico de pizza com % por classe de ativo e exposição internacional.

**FR-9: Alertas de Inconsistências na Carteira**
Sistema detecta e exibe Alertas: "Posição sem transações cadastradas", "Dividendo esperado não recebido", "Ativo sem cotação recente (>7 dias)".

**FR-10: Evolução do Patrimônio Líquido**
Usuário visualiza gráfico de linha mostrando valor total da carteira ao longo do tempo.

**FR-11: Composição e Exposição Internacional**
Card de composição exibe % por classe de ativo. Card de exposição internacional exibe % de ativos estrangeiros vs BR.

**FR-12: Histórico Mensal de Dividendos**
Usuário visualiza timeline de proventos recebidos, agrupados por mês.

**FR-13: Proventos por Ativo**
Tabela detalhada exibe: ticker, tipo, data COM, data de pagamento, valor por cota, quantidade de cotas, valor total recebido.

**FR-14: Retorno Total e Comparação com Benchmarks**
Usuário visualiza rentabilidade % da carteira em período selecionado e comparação com CDI, IBOV, IFIX.

**FR-15: Rentabilidade por Ativo (Ganho de Capital vs Proventos)**
Tabela exibe: ticker, retorno total %, ganho de capital %, proventos recebidos (R$), proventos %.

**FR-16: Criar e Editar Regras de Score**
Usuário cria Score customizado definindo nome e conjunto de regras. Cada regra: métrica, operador, limiar(s), e pontos atribuídos.

**FR-17: Aplicar Score na Carteira**
Lista de Posições na tela Carteira exibe pontuação de Score ao lado de cada ticker quando Score ativo está selecionado.

**FR-18: Calcular Preço-Teto por Método Bazin**
Usuário seleciona método de valuation Bazin e define DY mínimo desejado. Sistema calcula Preço-teto = Dividendo anual por ação / DY mínimo.

**FR-19: Identificar Oportunidades e Alertas de Valuation**
Sistema gera Alertas automáticos quando ativo está >15% abaixo do Preço-Teto (oportunidade) ou >20% acima (sobrevalorizado).

**FR-20: Lista de Alertas e Badge Numérico**
Tela de Alertas exibe lista cronológica: tipo, descrição, data de criação, status (novo|lido|ignorado).

**FR-21: Geração Automática de Alertas**
Sistema roda job diário (ou on-demand) que varre Posições, Transações, Dividendos e Preço-Teto, e cria novos Alertas conforme regras.

**FR-22: Catálogo de Ativos com Dados Seed**
Sistema possui tabela assets pré-populada com ~50 ativos representativos: ações BR, FIIs, BDRs, alguns stocks US, REITs, cryptos.

**FR-23: Histórico de Preços Seed**
Tabela price_history contém série diária simulada (últimos 12 meses) para ativos seed.

**FR-24: Dividendos e Indicadores Fundamentalistas Seed**
Tabelas dividends e fundamentals contêm histórico trimestral simulado de dividendos e indicadores para ativos seed.

**FR-25: Exibir Origem e Atualização de Dados**
Tooltip ou modal de "info" em cotação, dividendo ou indicador fundamentalista mostra: fonte (seed|api|manual|csv), data de atualização.

**FR-26: Visualizar Detalhe de Ativo**
Usuário pode clicar em qualquer ticker na Carteira para abrir tela de detalhe do Ativo com histórico, fundamentals, dividendos, Score, Preço-Teto e posição do usuário.

**FR-27: Menu Lateral e Navegação Entre Telas**
Usuário navega entre telas via menu lateral fixo à esquerda.

**FR-28: Ações de Suporte (Exportar, Sincronizar, Insights)**
Cada tela relevante oferece botões de ação: Exportar relatório (CSV ou PDF futuro), Sincronizar dados (futuro), Gerar insights (futuro).

### Non-Functional Requirements

**NFR-1: Performance - Tela Carteira**
Tela Carteira (FR-7) carrega e renderiza lista de 50 posições em ≤2s (p95).

**NFR-2: Performance - Cálculo de Score**
Cálculo de Score para 50 ativos (FR-17) em ≤1s.

**NFR-3: Performance - Evolução de Patrimônio**
Evolução de Patrimônio para 1 ano de histórico (FR-10) carrega gráfico em ≤3s.

**NFR-4: Performance - Importação CSV**
Preview inline de CSV renderiza em <2s para arquivos de até 500 linhas. Importação CSV suporta até 1000 transações por arquivo.

**NFR-5: Performance - Histórico de Proventos**
Histórico de proventos carrega em <2s para até 500 registros.

**NFR-6: Performance - Cálculo de Rentabilidade**
Cálculo de rentabilidade para carteira de 50 ativos e 1 ano de histórico em <3s.

**NFR-7: Performance - Preço-Teto**
Cálculo de Preço-Teto para 50 ativos em <2s.

**NFR-8: Performance - Job de Alertas**
Job de alertas processa carteira de 50 ativos em <5s.

**NFR-9: Performance - Seed Scripts**
Seed scripts rodam em <30s para popular banco de dados inicial.

**NFR-10: Performance - Tela de Detalhe**
Tela de detalhe carrega em <2s para ativo com 12 meses de histórico.

**NFR-11: Performance - Transição entre Telas**
Transição entre telas em <500ms.

**NFR-12: Performance - Exportar CSV**
Exportar CSV de até 1000 linhas em <2s.

**NFR-13: Segurança - RLS**
RLS (Row Level Security) do Supabase em todas as tabelas de dados de usuário (positions, transactions, alerts, score_rules, etc.) — apenas o user_id dono acessa suas linhas.

**NFR-14: Segurança - JWT**
Tokens JWT verificados em Route Handlers sensíveis (cálculos server-side, importação CSV).

**NFR-15: Segurança - Service Role Key**
SUPABASE_SERVICE_ROLE_KEY nunca exposta ao frontend; apenas em variáveis de ambiente server-side.

**NFR-16: Segurança - Senhas**
Senhas armazenadas com hash bcrypt (gerenciado por Supabase Auth).

**NFR-17: Acessibilidade - Navegação por Teclado**
Navegação por teclado funcional (Tab, Enter, Esc).

**NFR-18: Acessibilidade - Contraste**
Contraste de cores do tema dark atende WCAG 2.1 AA para texto normal e grande.

**NFR-19: Observabilidade - Logs**
Logs estruturados (JSON) para erros de backend (Supabase Edge Functions).

**NFR-20: Compatibilidade - Navegadores**
Suporte a navegadores modernos: Chrome, Firefox, Safari, Edge (últimas 2 versões).

**NFR-21: Compatibilidade - Responsividade**
Interface responsiva: desktop ≥1280px (otimizado), tablet 768-1279px (funcional), mobile 375-767px (funcional mas não otimizado).

### Additional Requirements

**AR-1: Stack Técnica**
Frontend: Vite 5.x, React 18.3.x, TypeScript 5.5.x, Zustand 4.5.x, TanStack Query 5.x, React Router 6.x, TailwindCSS 3.4.x, Recharts 2.12.x, React Hook Form 7.x + Zod, date-fns 3.x
Backend: Supabase (Postgres 15, Auth, Edge Functions Deno, Realtime, Storage), @supabase/supabase-js 2.45.x
Package Manager: pnpm 9.x
Tooling: ESLint 9.x + Prettier, Vitest (unit) + Playwright (E2E)

**AR-2: Estrutura de Módulos**
Estrutura frontend modular conforme AD-7: src/modules/{domain}/ contém components/, hooks/, services/, types/ para cada domínio (auth, portfolio, wealth, dividends, performance, score, valuation, alerts, assets, preferences). src/shared/ para componentes reutilizáveis, hooks globais, services e utils.

**AR-3: State Management - Zustand**
Zustand como store global (AD-2). Slices separadas por domínio (auth, portfolio, preferences). API minimalista sem boilerplate. Stores em src/modules/{domain}/store.ts.

**AR-4: Data Fetching - TanStack Query + Supabase**
TanStack Query v5 para queries e mutations (AD-3). Supabase Client JS para todas as chamadas ao backend. Todo acesso a dados via hooks useQuery/useMutation. Services de módulo encapsulam chamadas Supabase. Query keys estruturadas: ['domain', 'resource', ...params].

**AR-5: Realtime Seletivo**
Realtime subscriptions apenas para casos de alta prioridade UX (AD-4): novos alertas (alerts table), updates críticos de posições compartilhadas (futuro multi-user). Para dados modificados pelo próprio usuário: invalidar query cache via queryClient.invalidateQueries() — não usar Realtime.

**AR-6: Cálculos Híbridos Cliente-Servidor**
Client-side (apresentacional): Soma de patrimônio, ordenação de tabelas, filtros de UI, agrupamento por classe de ativo, cálculos de % de peso relativo.
Server-side (lógica de negócio): Score Fundamentalista, Preço-Teto (Bazin), preço médio ponderado de transações → posições, geração de alertas, validações complexas (AD-5).

**AR-7: RLS Strategy**
Tabelas privadas (RLS ativo): users, positions, transactions, score_rules, alerts, user_preferences. Policy: user_id = auth.uid().
Tabelas públicas (sem RLS): assets, price_history, dividends, fundamentals, benchmarks. Dados de mercado compartilhados (AD-6).

**AR-8: Posições Independentes + Transações Opcionais**
positions tabela independente — usuário pode cadastrar posição diretamente. transactions tabela opcional — quando existe, recalcula preço médio ponderado e quantidade líquida via trigger Postgres ou Edge Function (AD-8).

**AR-9: Score e Preço-Teto On-Demand**
Score Fundamentalista e Preço-Teto calculados on-demand quando usuário acessa tela. Regras de score (score_rules table) persistidas. Resultado de score e teto NÃO persistidos — calculados a cada request (AD-9).

**AR-10: Deploy**
Frontend (Vite build) + eventual backend Node/workers em Railway ou Render. Supabase Cloud para database Postgres, Auth, Edge Functions, Realtime. CI/CD via GitHub Actions. Ambientes: production (main branch) + staging (feature branches preview) (AD-10).

**AR-11: Performance Strategy**
Postgres indexes em (user_id, ticker, created_at), queries limitadas a 50 posições no MVP, lazy-load de gráficos com React.lazy(), TanStack Query staleTime 5min para dados low-churn (fundamentals, dividends) (AD-11).

**AR-12: AwesomeAPI Integration**
Client-side fetch de https://economia.awesomeapi.com.br/json/last/USD-BRL via TanStack Query. staleTime 1h. Fallback para taxa fixa R$5,00 se API falhar ou timeout >2s (AD-12).

**AR-13: Local Dev Setup**
Supabase Cloud projeto dev separado de production. Vite dev server local (npm run dev). .env.local com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. Seed scripts SQL (supabase/seed.sql) (AD-13).

**AR-14: Alertas On-Demand (MVP)**
Botão "Atualizar Alertas" na tela /alertas dispara Supabase Edge Function POST /functions/v1/generate-alerts. Function varre positions e transactions do user_id, detecta inconsistências, insere/atualiza tabela alerts (AD-14).

**AR-15: Database Schema**
Implementar schema completo conforme Architecture Spine: tabelas users, positions, transactions, score_rules, alerts, user_preferences (privadas com RLS), assets, price_history, dividends, fundamentals, benchmarks (públicas sem RLS). Tipos ENUM: transaction_type, score_metric, score_operator, alert_type, alert_status, asset_type.

### UX Design Requirements

Nenhum documento UX foi fornecido. A UX será baseada nos protótipos HTML existentes mencionados no PRD: valora_cadastro.html, valora_login.html, valora_carteira.html, valora_patrimonio.html, valora_proventos.html, valora_rentabilidade.html, valora_score.html, valora_estrategias.html, valora_preco_teto.html, valora_ativo.html.

### FR Coverage Map

FR-1: Epic 1 - Cadastro de novo usuário
FR-2: Epic 1 - Login de usuário existente
FR-3: Epic 1 - Logout e gestão de sessão
FR-4: Epic 1 - Recuperação de senha
FR-5: Epic 2 - Adicionar posição manual
FR-6: Epic 2 - Importar transações via CSV
FR-7: Epic 2 - Visualizar lista de posições
FR-8: Epic 2 - Consolidação por tipo de ativo
FR-9: Epic 2 - Alertas de inconsistências na carteira
FR-10: Epic 3 - Evolução do patrimônio líquido
FR-11: Epic 3 - Composição e exposição internacional
FR-12: Epic 3 - Histórico mensal de dividendos
FR-13: Epic 3 - Proventos por ativo
FR-14: Epic 4 - Retorno total e comparação com benchmarks
FR-15: Epic 4 - Rentabilidade por ativo
FR-16: Epic 5 - Criar e editar regras de score
FR-17: Epic 5 - Aplicar score na carteira
FR-18: Epic 6 - Calcular preço-teto por método Bazin
FR-19: Epic 6 - Identificar oportunidades e alertas de valuation
FR-20: Epic 2 - Lista de alertas e badge numérico
FR-21: Epic 2 - Geração automática de alertas
FR-22: Epic 2 - Catálogo de ativos com dados seed
FR-23: Epic 2 - Histórico de preços seed
FR-24: Epic 3 + Epic 5 - Dividendos e indicadores fundamentalistas seed
FR-25: Epic 2 - Exibir origem e atualização de dados
FR-26: Epic 6 - Visualizar detalhe de ativo
FR-27: Epic 1 - Menu lateral e navegação entre telas
FR-28: Epic 2 - Ações de suporte (exportar)

## Epic List

### Epic 1: Fundação - Autenticação e Acesso
Usuários podem criar conta, fazer login seguro, recuperar senha e acessar a plataforma com navegação estruturada.

**FRs cobertos:** FR-1, FR-2, FR-3, FR-4, FR-27

**Notas de implementação:**
- Setup inicial do projeto (Vite, React, TypeScript, Supabase)
- Módulo auth/ completo com Supabase Auth
- Layout base com menu lateral para navegação entre telas
- RLS policies para tabela users

### Epic 2: Gestão Completa de Carteira
Usuários podem cadastrar suas posições manualmente ou via CSV, visualizar a carteira consolidada com composição por tipo de ativo, e receber alertas de inconsistências.

**FRs cobertos:** FR-5, FR-6, FR-7, FR-8, FR-9, FR-20, FR-21, FR-22, FR-23, FR-25, FR-28

**Notas de implementação:**
- Módulo portfolio/ completo
- Tabelas: positions, transactions, alerts, assets, price_history
- Importação CSV com validação e preview
- Geração de alertas (inconsistências)
- Seed de 50 ativos
- Exportar CSV
- Rastreabilidade de dados

### Epic 3: Análise de Patrimônio e Proventos
Usuários visualizam a evolução do patrimônio ao longo do tempo, composição por classe de ativo, e histórico completo de dividendos recebidos.

**FRs cobertos:** FR-10, FR-11, FR-12, FR-13, FR-24

**Notas de implementação:**
- Módulos wealth/ e dividends/
- Gráfico de evolução de patrimônio (Recharts)
- Composição e exposição internacional
- Timeline de proventos mensais e por ativo
- Tabela dividends com seed

### Epic 4: Rentabilidade e Benchmarks
Usuários comparam o desempenho de sua carteira com benchmarks do mercado (CDI, IBOV, IFIX) e entendem a rentabilidade detalhada por ativo.

**FRs cobertos:** FR-14, FR-15

**Notas de implementação:**
- Módulo performance/
- Gráfico comparativo com benchmarks
- Tabela de rentabilidade por ativo (ganho de capital vs proventos)
- Tabela benchmarks com seed

### Epic 5: Score Fundamentalista Customizável
Usuários criam regras personalizadas de análise fundamentalista e aplicam scores na carteira para identificar ativos alinhados com sua estratégia.

**FRs cobertos:** FR-16, FR-17, FR-24

**Notas de implementação:**
- Módulo score/
- Tabelas: score_rules, fundamentals (seed)
- Cálculo on-demand de score
- Integração com tela Carteira para exibir scores

### Epic 6: Preço-Teto e Detalhe de Ativos
Usuários calculam o preço justo de ativos pelo método Bazin, identificam oportunidades de compra/sobrevalorização, e acessam análise detalhada de qualquer ativo.

**FRs cobertos:** FR-18, FR-19, FR-26

**Notas de implementação:**
- Módulos valuation/ e assets/
- Cálculo de Preço-Teto Bazin (on-demand)
- Alertas de oportunidade/sobrevalorização
- Tela de detalhe do ativo (histórico, fundamentals, dividendos, score, preço-teto, posição)
- Integração AwesomeAPI para USD

## Epic 1: Fundação - Autenticação e Acesso

Usuários podem criar conta, fazer login seguro, recuperar senha e acessar a plataforma com navegação estruturada.

**FRs cobertos:** FR-1, FR-2, FR-3, FR-4, FR-27

### Story 1.1: Setup do Projeto e Layout Base

As a desenvolvedor,
I want o projeto inicializado com a stack, a estrutura de módulos e o layout de navegação,
So that as próximas stories tenham uma base funcional para construir telas autenticadas.

**Acceptance Criteria:**

**Given** um repositório sem aplicação Vite configurada
**When** o setup do projeto é concluído
**Then** o app usa Vite 5, React 18, TypeScript 5, TailwindCSS 3 (tema dark-only), React Router 6, Zustand, TanStack Query e pnpm
**And** a estrutura `src/modules/` e `src/shared/` existe conforme AD-7, com `supabaseClient` e `queryClient` em `src/shared/services/`
**And** o menu lateral fixo (FR-27) exibe os itens: Carteira, Patrimônio, Proventos, Rentabilidade, Score, Estratégias, Alertas
**And** cada item navega para uma rota placeholder e o item ativo fica visualmente destacado
**And** variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` são lidas de `.env.local`
**And** o README documenta criar projeto Supabase dev, rodar migrations e copiar as keys (AR-13)
**And** `pnpm dev` sobe o app e a transição entre rotas ocorre em <500ms (NFR-11)

### Story 1.2: Cadastro de Novo Usuário

As a visitante,
I want criar uma conta com email, senha, nome completo e telefone,
So that eu possa acessar a plataforma Valora.

**Acceptance Criteria:**

**Given** um visitante não autenticado na tela `/cadastro`
**When** ele preenche email válido, senha com no mínimo 8 caracteres, nome completo e telefone (opcional) e confirma
**Then** o Supabase Auth cria a conta e uma linha é inserida na tabela `users` com o mesmo `id` (FR-1)
**And** a tabela `users` tem RLS: o usuário só lê/atualiza o próprio perfil (NFR-13, AR-7)
**And** senha inválida (menos de 8 caracteres) ou email malformado bloqueia o submit com mensagem visível
**And** email já cadastrado exibe o erro retornado pelo Supabase Auth
**And** após cadastro bem-sucedido o usuário é autenticado e redirecionado para `/carteira`
**And** `SUPABASE_SERVICE_ROLE_KEY` não aparece em nenhum bundle frontend (NFR-15)

### Story 1.3: Login de Usuário Existente

As a usuário registrado,
I want entrar com email e senha,
So that eu acesse minha carteira.

**Acceptance Criteria:**

**Given** um usuário já cadastrado na tela `/login`
**When** ele informa email e senha corretos
**Then** o Supabase Auth devolve sessão JWT e o app redireciona para `/carteira` (FR-2)
**And** credenciais inválidas exibem "Email ou senha incorretos" sem revelar qual campo falhou
**And** a sessão fica disponível via store Zustand do módulo `auth` e hook `useAuth`

### Story 1.4: Logout e Proteção de Rotas

As a usuário autenticado,
I want encerrar a sessão e ter minhas telas protegidas,
So that ninguém acesse meus dados se eu sair ou se a sessão expirar.

**Acceptance Criteria:**

**Given** um usuário autenticado em qualquer rota interna
**When** ele aciona logout
**Then** o token local é limpo e ele é redirecionado para `/login` (FR-3)
**And** acessar rota protegida (`/carteira`, `/patrimonio`, `/proventos`, `/rentabilidade`, `/score`, `/estrategias`, `/alertas`) sem sessão redireciona para `/login`
**And** sessão expirada (padrão 7 dias) exige novo login

### Story 1.5: Recuperação de Senha

As a usuário que esqueceu a senha,
I want solicitar um link de redefinição por email,
So that eu recupere o acesso à conta.

**Acceptance Criteria:**

**Given** um usuário na tela `/login`
**When** ele clica em "Esqueci minha senha", informa o email e confirma
**Then** o fluxo de reset do Supabase Auth envia email com link (TTL 1 hora) (FR-4)
**And** ao clicar no link válido o usuário define nova senha e é redirecionado para `/login`
**And** link expirado exibe erro com opção de solicitar novo link

---

## Epic 2: Gestão Completa de Carteira

Usuários podem cadastrar suas posições manualmente ou via CSV, visualizar a carteira consolidada com composição por tipo de ativo, e receber alertas de inconsistências.

**FRs cobertos:** FR-5, FR-6, FR-7, FR-8, FR-9, FR-20, FR-21, FR-22, FR-23, FR-25, FR-28

### Story 2.1: Catálogo de Ativos e Histórico de Preços Seed

As a usuário autenticado,
I want um catálogo de ativos com cotações históricas,
So that eu possa cadastrar posições em tickers reconhecidos e ver valor de mercado.

**Acceptance Criteria:**

**Given** o banco de dados do ambiente de desenvolvimento
**When** as migrations e o `supabase/seed.sql` são executados
**Then** a tabela pública `assets` contém ~50 ativos seed (ações BR, FIIs, BDRs, stocks US, REITs, cryptos) com ticker, nome, tipo e moeda (FR-22)
**And** a tabela pública `price_history` contém série diária simulada dos últimos 12 meses por ticker seed, com `source = 'seed'` (FR-23)
**And** as tabelas públicas não têm RLS e são legíveis por role `authenticated` (AR-7)
**And** o usuário consegue buscar ativo por ticker ou nome
**And** o seed completa em <30s (NFR-9)

### Story 2.2: Adicionar Posição Manual

As a usuário autenticado,
I want cadastrar uma posição informando ticker, quantidade, preço médio e data de aquisição,
So that minha carteira passe a refletir o que eu possuo.

**Acceptance Criteria:**

**Given** um usuário autenticado na tela Carteira
**When** ele abre "Adicionar Posição", escolhe um ticker existente, informa quantidade > 0, preço médio ≥ 0 e data, e confirma
**Then** uma linha é criada em `positions` com o `user_id` da sessão (FR-5)
**And** RLS impede ler/editar/apagar posição de outro usuário (NFR-13)
**And** ticker inexistente no catálogo exibe "Ativo não encontrado" e oferece busca
**And** o par `(user_id, ticker)` é único — tentar duplicar retorna erro claro
**And** a posição pode existir sem transações (AD-8)

### Story 2.3: Visualizar Lista de Posições com Rastreabilidade

As a usuário autenticado,
I want ver todas as minhas posições com valor de mercado e origem da cotação,
So that eu saiba quanto tenho e de onde veio cada número.

**Acceptance Criteria:**

**Given** um usuário com uma ou mais posições cadastradas
**When** ele acessa a tela Carteira
**Then** a lista exibe ticker, nome, quantidade, preço médio, cotação atual (último `price_history.close`), valor de mercado (`cotação × quantidade`), peso relativo % e variação % desde a aquisição (FR-7)
**And** a ordenação padrão é por peso decrescente, com opções por ticker e por variação %
**And** cotação com `updated_at` > 1 dia exibe flag "⚠️ Cotação antiga"
**And** tooltip/ícone de info na cotação mostra `source` e `updated_at` (FR-25)
**And** posições em moeda USD convertem valor via AwesomeAPI (`useUSDRate`), com fallback R$5,00 e badge "taxa USD aproximada" se a API falhar (AR-12)
**And** a lista de até 50 posições renderiza em ≤2s p95 (NFR-1)

### Story 2.4: Composição por Classe e Exposição Internacional

As a usuário autenticado,
I want ver a composição da carteira por classe de ativo e a exposição internacional,
So that eu entenda a diversificação do meu patrimônio.

**Acceptance Criteria:**

**Given** um usuário com posições de diferentes `asset.type`
**When** ele visualiza o card de composição na tela Carteira
**Then** um gráfico de pizza mostra % por classe: Ações BR, FIIs, BDRs, Stocks US, REITs, Cryptos (FR-8)
**And** a exposição internacional = soma (BDR + stocks US + REITs + crypto) / patrimônio total
**And** o card destaca o valor total da carteira
**And** tooltip de cada fatia mostra valor em R$ e o ticker principal da classe

### Story 2.5: Importar Transações via CSV

As a usuário autenticado,
I want importar um CSV de transações com preview e correção inline,
So that o preço médio e a quantidade da posição sejam calculados a partir do histórico real.

**Acceptance Criteria:**

**Given** um usuário autenticado na tela Carteira
**When** ele faz upload de CSV com colunas `data, ticker, tipo, quantidade, preço, corretagem`
**Then** o sistema valida o arquivo, exibe preview e permite correção inline antes de confirmar (FR-6)
**And** formato inválido retorna erro com linha/coluna/problema e exemplo do formato esperado
**And** ticker desconhecido marca a linha no preview; o usuário corrige ou pula
**And** após confirmar, as linhas viram registros em `transactions` (tipos `buy|sell|dividend|jcp|bonus`) com RLS por `user_id`
**And** para cada ticker importado, preço médio ponderado e quantidade líquida da `positions` correspondente são recalculados no servidor (AR-6, AR-8)
**And** arquivos de até 500 linhas geram preview em <2s; o limite do MVP é 1000 transações (NFR-4)

### Story 2.6: Lista de Alertas, Badge e Geração On-Demand

As a usuário autenticado,
I want ver e atualizar alertas de inconsistência da carteira,
So that eu saiba o que está faltando ou desatualizado nos meus dados.

**Acceptance Criteria:**

**Given** um usuário com posições e/ou transações
**When** ele acessa `/alertas` ou clica em "Atualizar Alertas"
**Then** a tabela `alerts` existe com RLS por `user_id` (fields: id, user_id, alert_type, ticker, description, status, created_at)
**And** a Supabase Edge Function `generate-alerts` é criada em `supabase/functions/generate-alerts/index.ts` e varre as posições do `user_id` criando alertas de inconsistência (FR-9, FR-21, AR-14):
  - posição sem transações
  - dividendo esperado não recebido (>95 dias desde o último dividendo de ativo pagador)
  - ativo sem cotação recente (>7 dias)
**And** alertas duplicados (mesmo tipo + ticker + user) não são recriados se o anterior ainda está ativo
**And** a tela lista alertas cronologicamente com tipo, descrição, data e status `novo|lido|ignorado` (FR-20)
**And** badge no menu lateral mostra a contagem de alertas `novo`
**And** o usuário pode marcar alerta como lido ou ignorar
**And** o job processa 50 ativos em <5s (NFR-8)

### Story 2.7: Exportar Relatórios em CSV

As a usuário autenticado,
I want exportar as tabelas da Carteira em CSV,
So that eu analise os dados fora da plataforma.

**Acceptance Criteria:**

**Given** um usuário na tela Carteira com posições visíveis
**When** ele clica em "Exportar relatório"
**Then** um CSV é baixado com as colunas da tabela exibida (FR-28)
**And** até 1000 linhas exportam em <2s (NFR-12)
**And** os botões "Sincronizar dados" e "Gerar insights" exibem "Em breve"

---

## Epic 3: Análise de Patrimônio e Proventos

Usuários visualizam a evolução do patrimônio ao longo do tempo, composição por classe de ativo, e histórico completo de dividendos recebidos.

**FRs cobertos:** FR-10, FR-11, FR-12, FR-13, FR-24

### Story 3.1: Seed de Dividendos e Indicadores Fundamentalistas

As a usuário autenticado,
I want dados seed de dividendos e fundamentals dos ativos,
So that as telas de proventos, score e preço-teto tenham números para calcular.

**Acceptance Criteria:**

**Given** o banco já possui `assets` seed
**When** o seed de `dividends` e `fundamentals` é executado
**Then** `dividends` contém histórico trimestral simulado com `ex_date`, `payment_date`, `value_per_share`, `type` e `source = 'seed'` (FR-24)
**And** `fundamentals` contém indicadores trimestrais (P/L, P/VP, ROE, DY, Dívida/PL, Margem Líquida, LPA, VPA) com `source = 'seed'`
**And** ambas as tabelas são públicas (sem RLS, SELECT autenticado)

### Story 3.2: Tela Patrimônio — Evolução, Composição e Exposição

As a usuário autenticado,
I want ver a evolução do meu patrimônio e a composição atual,
So that eu acompanhe o crescimento e a diversificação ao longo do tempo.

**Acceptance Criteria:**

**Given** um usuário com posições e `price_history` suficiente
**When** ele acessa a tela Patrimônio
**Then** um gráfico de linha mostra patrimônio diário = `Σ (cotação do dia × quantidade)` com períodos 1M, 3M, 6M, 1A, Tudo (FR-10)
**And** dados históricos incompletos aparecem como lacuna ou linha pontilhada
**And** cards de composição e exposição internacional repetem as regras de classe da Carteira, com tooltip de valor R$ e ticker principal (FR-11)
**And** o gráfico de até 365 pontos carrega em ≤3s (NFR-3)
**And** o gráfico é lazy-loaded (AR-11)

### Story 3.3: Tela Proventos — Timeline Mensal e Tabela por Ativo

As a usuário autenticado,
I want ver os proventos que recebi por mês e por ativo,
So that eu saiba quanto a carteira gera de renda.

**Acceptance Criteria:**

**Given** um usuário com transações do tipo `dividend|jcp` e/ou histórico em `dividends` associado às posições
**When** ele acessa a tela Proventos
**Then** um gráfico de barras agrupa o valor total recebido por mês, com períodos 6M, 1A, Tudo (FR-12)
**And** a tabela detalha ticker, tipo, data COM, data de pagamento, valor por cota, quantidade e valor total, ordenável por data (padrão), valor ou ticker (FR-13)
**And** filtros por ticker e por tipo funcionam, e a soma do período aparece em destaque
**And** até 500 registros carregam em <2s (NFR-5)
**And** a tela oferece exportar CSV no mesmo padrão da Carteira (FR-28)

---

## Epic 4: Rentabilidade e Benchmarks

Usuários comparam o desempenho de sua carteira com benchmarks do mercado (CDI, IBOV, IFIX) e entendem a rentabilidade detalhada por ativo.

**FRs cobertos:** FR-14, FR-15

### Story 4.1: Retorno Total e Comparação com Benchmarks

As a usuário autenticado,
I want comparar a rentabilidade da minha carteira com CDI, IBOV e IFIX,
So that eu saiba se estou batendo o mercado.

**Acceptance Criteria:**

**Given** um usuário com posições, histórico de preços e seed da tabela pública `benchmarks` (CDI, IBOV, IFIX)
**When** ele acessa a tela Rentabilidade e escolhe um período (1M, 3M, 6M, 1A, Tudo)
**Then** a rentabilidade da carteira é `((Patrimônio final + Proventos recebidos − Aportes) / Patrimônio inicial) − 1` (FR-14)
**And** um gráfico de linhas compara carteira vs CDI vs IBOV vs IFIX no mesmo eixo
**And** o card de resumo mostra os três percentuais e a diferença em pontos percentuais vs CDI
**And** o cálculo para 50 ativos e 1 ano completa em <3s (NFR-6)

### Story 4.2: Rentabilidade por Ativo (Ganho de Capital vs Proventos)

As a usuário autenticado,
I want ver o retorno de cada ativo separado em ganho de capital e proventos,
So that eu entenda o que realmente gerou resultado.

**Acceptance Criteria:**

**Given** um usuário na tela Rentabilidade com posições
**When** a tabela por ativo é renderizada
**Then** cada linha exibe ticker, retorno total %, ganho de capital %, proventos recebidos (R$) e proventos % (FR-15)
**And** ganho de capital = `((cotação atual − preço médio) / preço médio) × 100`
**And** proventos % = `(Σ dividendos recebidos / (preço médio × quantidade)) × 100`
**And** retorno total % = ganho de capital % + proventos %
**And** a ordenação padrão é por retorno total decrescente, com opção por ticker
**And** a tabela oferece exportar CSV (FR-28)

---

## Epic 5: Score Fundamentalista Customizável

Usuários criam regras personalizadas de análise fundamentalista e aplicam scores na carteira para identificar ativos alinhados com sua estratégia.

**FRs cobertos:** FR-16, FR-17, FR-24

### Story 5.1: Criar e Editar Regras de Score

As a usuário autenticado,
I want criar um score com regras sobre P/L, ROE, DY e outras métricas,
So that eu avalie a carteira com o meu próprio critério.

**Acceptance Criteria:**

**Given** um usuário autenticado na tela Score
**When** ele cria um score com nome e uma ou mais regras (métrica, operador `< > entre`, limiar(es), pontos inteiros)
**Then** a tabela `score_rules` existe com RLS por `user_id` (fields: id, user_id, name, metric, operator, threshold_min, threshold_max, points, created_at)
**And** a tabela `user_preferences` existe com RLS por `user_id` (fields: user_id, default_score_rule_id, created_at, updated_at) para armazenar o score ativo
**And** as regras são persistidas em `score_rules` com RLS por `user_id` (FR-16)
**And** métricas do MVP: P/L, P/VP, ROE, DY, Dívida/Patrimônio, Margem Líquida
**And** limiar não numérico ou pontos não inteiros bloqueiam o save
**And** o usuário pode ter múltiplos scores e escolher um como ativo em `user_preferences.default_score_rule_id`
**And** o usuário pode editar e excluir regras existentes

### Story 5.2: Aplicar Score na Carteira

As a usuário autenticado,
I want ver a pontuação de cada ativo da carteira segundo o score ativo,
So that eu identifique os papéis desalinhados com a minha tese.

**Acceptance Criteria:**

**Given** um usuário com score ativo e posições cujos tickers têm `fundamentals`
**When** ele seleciona o score na tela Carteira
**Then** o sistema calcula Score total = soma dos pontos das regras aplicáveis, on-demand, sem persistir o resultado (FR-17, AR-9)
**And** ativo sem fundamentals exibe "N/A"
**And** fundamentals com `updated_at` > 90 dias exibem flag "⚠️ Dados antigos"
**And** a lista pode ser ordenada por score crescente/decrescente
**And** o cálculo para 50 ativos completa em ≤1s (NFR-2)

---

## Epic 6: Preço-Teto e Detalhe de Ativos

Usuários calculam o preço justo de ativos pelo método Bazin, identificam oportunidades de compra/sobrevalorização, e acessam análise detalhada de qualquer ativo.

**FRs cobertos:** FR-18, FR-19, FR-26

### Story 6.1: Calcular Preço-Teto pelo Método Bazin

As a usuário autenticado,
I want calcular o preço-teto Bazin da carteira com um DY mínimo que eu defino,
So that eu veja quais ativos estão baratos ou caros segundo esse critério.

**Acceptance Criteria:**

**Given** um usuário autenticado na tela Estratégias/Preço-Teto com posições que têm histórico de dividendos
**When** ele seleciona método Bazin e informa o DY mínimo desejado
**Then** o sistema calcula `Preço-teto = Dividendo anual por ação / DY mínimo` on-demand, sem persistir o resultado (FR-18, AR-9)
**And** a tabela exibe ticker, cotação atual, teto, margem `((teto − cotação) / cotação)` e indicador verde (cotação < teto) ou vermelho (cotação > teto)
**And** ativo sem histórico de dividendos consistente exibe "N/A" com tooltip explicando o dado faltante
**And** o cálculo para 50 ativos completa em <2s (NFR-7)

### Story 6.2: Alertas de Oportunidade e Sobrevalorização

As a usuário autenticado,
I want ser alertado quando um ativo está bem abaixo ou bem acima do preço-teto,
So that eu não perca oportunidade nem ignore risco de preço.

**Acceptance Criteria:**

**Given** um usuário com preço-teto Bazin calculável para suas posições
**When** a geração de alertas roda (mesmo fluxo on-demand da Story 2.6)
**Then** um alerta de oportunidade é criado se a cotação está >15% abaixo do teto (FR-19)
**And** um alerta de sobrevalorização é criado se a cotação está >20% acima do teto
**And** o usuário pode configurar esses percentuais de disparo
**And** os alertas aparecem na lista/badge da Story 2.6 com tipo `opportunity`
**And** duplicatas (mesmo tipo + ticker + user) não são recriadas enquanto o alerta anterior está ativo

### Story 6.3: Tela de Detalhe do Ativo

As a usuário autenticado,
I want abrir o detalhe de qualquer ticker da carteira,
So that eu veja cotação, fundamentals, dividendos, score, preço-teto e a minha posição num só lugar.

**Acceptance Criteria:**

**Given** um usuário na tela Carteira (ou busca de ativo)
**When** ele clica em um ticker
**Then** a tela de detalhe exibe nome, ticker, tipo, cotação, variação % do dia, moeda (FR-26)
**And** o gráfico de preços cobre 12 meses com períodos 1M, 3M, 6M, 1A e tooltip por data
**And** o card de fundamentals lista P/L, P/VP, ROE, DY, Dívida/PL, Margem Líquida quando existirem
**And** a seção de dividendos mostra histórico trimestral (data COM, valor por cota, yield)
**And** score e preço-teto aparecem se o usuário tiver score/método ativos
**And** se houver posição: quantidade, preço médio, valor de mercado, variação %
**And** o CTA é "Adicionar à Carteira" ou "Editar Posição" conforme o contexto
**And** origem/`updated_at` de cotação, dividendo e fundamentals seguem o padrão da Story 2.3 (FR-25)
**And** a tela carrega em <2s para ativo com 12 meses de histórico (NFR-10)

