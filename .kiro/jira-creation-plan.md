# Jira Creation Plan - Valora MVP

## Authentication Status
- Status: Pending user authorization
- URL: https://auth.atlassian.com/authorize?...
- Callback: Awaiting user to complete OAuth flow

## Epics to Create (7 total)

### Epic 1: Fundação e Autenticação
- **Type:** Epic
- **Label:** epic
- **Description:** Usuários podem criar conta, fazer login/logout, recuperar senha e acessar sistema protegido por autenticação.
- **FRs Covered:** FR-1, FR-2, FR-3, FR-4, FR-27
- **Estimate:** 3 days

### Epic 2: Gestão de Carteira e Posições
- **Type:** Epic
- **Label:** epic
- **Description:** Usuários cadastram posições manualmente ou via CSV, visualizam carteira consolidada com custo médio e quantidade atualizada.
- **FRs Covered:** FR-5, FR-6, FR-7, FR-8, FR-9
- **Estimate:** 5 days

### Epic 3: Análise de Portfolio
- **Type:** Epic
- **Label:** epic
- **Description:** Usuários visualizam evolução do patrimônio, composição da carteira, histórico de proventos recebidos e rentabilidade comparada com benchmarks.
- **FRs Covered:** FR-10, FR-11, FR-12, FR-13, FR-14, FR-15
- **Estimate:** 8 days

### Epic 4: Valuation e Scoring Engine
- **Type:** Epic
- **Label:** epic
- **Description:** Usuários criam regras de score fundamentalista customizáveis e calculam preço-teto método Bazin, ambos com cálculos server-side rápidos.
- **FRs Covered:** FR-16, FR-17, FR-18, FR-19
- **Estimate:** 6 days

### Epic 5: Sistema de Alertas Inteligentes
- **Type:** Epic
- **Label:** epic
- **Description:** Usuários recebem alertas instantâneos via Trigger Postgres + Realtime quando posições ficam sem transações ou eventos de valuation ocorrem.
- **FRs Covered:** FR-20, FR-21
- **Estimate:** 3 days

### Epic 6: Detalhe de Ativo e Rastreabilidade
- **Type:** Epic
- **Label:** epic
- **Description:** Usuários acessam tela detalhe do ativo com todas as informações consolidadas e veem tooltips rastreáveis mostrando origem dos dados calculados.
- **FRs Covered:** FR-25, FR-26
- **Estimate:** 3 days

### Epic 7: Dados de Mercado e Seed Incremental
- **Type:** Epic
- **Label:** epic
- **Description:** Popular base de dados com ativos, cotações, fundamentals, dividendos e benchmarks de forma incremental e idempotente, habilitando desenvolvimento paralelo dos épicos.
- **FRs Covered:** FR-22, FR-23, FR-24, FR-28
- **Estimate:** 4 days

---

## Stories to Create (27 total + 1 Spike)

### Story 0.1: Spike Técnico PL/pgSQL vs Edge Function (Spike)
- **Epic:** None (Spike)
- **Type:** Story
- **Title:** 0.1: Spike Técnico PL/pgSQL vs Edge Function
- **Estimate:** 2 days
- **Dependencies:** 🟡SOFT (Epic 1)
- **Labels:** Epic-0, 🟡SOFT, spike

### Epic 1 Stories (4)

#### Story 1.1: Setup Projeto e Autenticação Básica Supabase
- **Type:** Story
- **Title:** 1.1: Setup Projeto e Autenticação Básica Supabase
- **Epic:** Epic 1
- **Estimate:** 1 day
- **Dependencies:** 🔴BLOCKS
- **Labels:** Epic-1, 🔴BLOCKS
- **AC Count:** 4

#### Story 1.2: Estrutura Módulos + State Management + Routing
- **Type:** Story
- **Title:** 1.2: Estrutura Módulos + State Management + Routing
- **Epic:** Epic 1
- **Estimate:** 1 day
- **Dependencies:** 🟡SOFT (Story 1.1)
- **Labels:** Epic-1, 🟡SOFT

#### Story 1.3: Telas Login, Signup e Recuperação Senha
- **Type:** Story
- **Title:** 1.3: Telas Login, Signup e Recuperação Senha
- **Epic:** Epic 1
- **Estimate:** 0.5 day
- **Dependencies:** 🟡SOFT (Story 1.1 + 1.2)
- **Labels:** Epic-1, 🟡SOFT, edge-cases

#### Story 1.4: Banner "Dados Simulados" e Persistência Session
- **Type:** Story
- **Title:** 1.4: Banner "Dados Simulados" e Persistência Session
- **Epic:** Epic 1
- **Estimate:** 0.5 day
- **Dependencies:** 🟢INDEPENDENT
- **Labels:** Epic-1, 🟢INDEPENDENT

### Epic 2 Stories (5)

#### Story 2.1: Criar Tabelas Transactions e Positions com RLS
- **Type:** Story
- **Title:** 2.1: Criar Tabelas Transactions e Positions com RLS
- **Epic:** Epic 2
- **Estimate:** 1 day
- **Dependencies:** 🟡SOFT (Story 1.1)
- **Labels:** Epic-2, 🟡SOFT

#### Story 2.2: Cadastro Manual de Transação
- **Type:** Story
- **Title:** 2.2: Cadastro Manual de Transação
- **Epic:** Epic 2
- **Estimate:** 1 day
- **Dependencies:** 🟡SOFT (Story 2.1)
- **Labels:** Epic-2, 🟡SOFT

#### Story 2.3: Visualizar Lista Posições Consolidada
- **Type:** Story
- **Title:** 2.3: Visualizar Lista Posições Consolidada
- **Epic:** Epic 2
- **Estimate:** 0.5 day
- **Dependencies:** 🟡SOFT (Story 2.1 + 2.2)
- **Labels:** Epic-2, 🟡SOFT

#### Story 2.4: Importação CSV com Preview Paginado e Correção Inline
- **Type:** Story
- **Title:** 2.4: Importação CSV com Preview Paginado e Correção Inline
- **Epic:** Epic 2
- **Estimate:** 2 days
- **Dependencies:** 🟡SOFT (Story 2.1)
- **Labels:** Epic-2, 🟡SOFT, edge-cases

#### Story 2.5: Deletar Transação com Recalculo Automático Position
- **Type:** Story
- **Title:** 2.5: Deletar Transação com Recalculo Automático Position
- **Epic:** Epic 2
- **Estimate:** 0.5 day
- **Dependencies:** 🟢INDEPENDENT
- **Labels:** Epic-2, 🟢INDEPENDENT

### Epic 3 Stories (5)

#### Story 3.1: Criar Tabela Price History e Query Evolução Patrimônio
- **Type:** Story
- **Title:** 3.1: Criar Tabela Price History e Query Evolução Patrimônio
- **Epic:** Epic 3
- **Estimate:** 1.5 days
- **Dependencies:** 🟡SOFT (Story 2.1 + seed 7.1)
- **Labels:** Epic-3, 🟡SOFT

#### Story 3.2: Gráfico Evolução Patrimônio com Filtros Período
- **Type:** Story
- **Title:** 3.2: Gráfico Evolução Patrimônio com Filtros Período
- **Epic:** Epic 3
- **Estimate:** 1.5 days
- **Dependencies:** 🟡SOFT (Story 3.1)
- **Labels:** Epic-3, 🟡SOFT, edge-cases

#### Story 3.3: Composição e Exposição da Carteira
- **Type:** Story
- **Title:** 3.3: Composição e Exposição da Carteira
- **Epic:** Epic 3
- **Estimate:** 1.5 days
- **Dependencies:** 🟡SOFT (Story 2.3 + seed 7.1)
- **Labels:** Epic-3, 🟡SOFT

#### Story 3.4: Histórico de Proventos Recebidos
- **Type:** Story
- **Title:** 3.4: Histórico de Proventos Recebidos
- **Epic:** Epic 3
- **Estimate:** 2 days
- **Dependencies:** 🟡SOFT (Story 2.1 + seed 7.3)
- **Labels:** Epic-3, 🟡SOFT, edge-cases

#### Story 3.5: Rentabilidade e Comparação com Benchmarks
- **Type:** Story
- **Title:** 3.5: Rentabilidade e Comparação com Benchmarks
- **Epic:** Epic 3
- **Estimate:** 1.5 days
- **Dependencies:** 🟡SOFT (Story 3.1 + 3.4 + seed 7.3)
- **Labels:** Epic-3, 🟡SOFT

### Epic 4 Stories (4)

#### Story 4.1: Postgres Functions Engine (Score + Preço-Teto)
- **Type:** Story
- **Title:** 4.1: Postgres Functions Engine (Score + Preço-Teto)
- **Epic:** Epic 4
- **Estimate:** 2 days
- **Dependencies:** 🔴BLOCKS (4.2, 4.3, 4.4)
- **Labels:** Epic-4, 🔴BLOCKS, spike-dependent

#### Story 4.2: UI Score Fundamentalista com CRUD Regras
- **Type:** Story
- **Title:** 4.2: UI Score Fundamentalista com CRUD Regras
- **Epic:** Epic 4
- **Estimate:** 2 days
- **Dependencies:** 🟡SOFT (Story 4.1 + seed 7.2)
- **Labels:** Epic-4, 🟡SOFT

#### Story 4.3: UI Preço-Teto Bazin
- **Type:** Story
- **Title:** 4.3: UI Preço-Teto Bazin
- **Epic:** Epic 4
- **Estimate:** 1 day
- **Dependencies:** 🟡SOFT (Story 4.1 + seed 7.2)
- **Labels:** Epic-4, 🟡SOFT, edge-cases

#### Story 4.4: Alertas Valuation Integrados
- **Type:** Story
- **Title:** 4.4: Alertas Valuation Integrados
- **Epic:** Epic 4
- **Estimate:** 1 day
- **Dependencies:** 🟢INDEPENDENT (Story 4.1)
- **Labels:** Epic-4, 🟢INDEPENDENT

### Epic 5 Stories (2)

#### Story 5.1: Trigger Postgres + Realtime para Alertas Instantâneos
- **Type:** Story
- **Title:** 5.1: Trigger Postgres + Realtime para Alertas Instantâneos
- **Epic:** Epic 5
- **Estimate:** 2 days
- **Dependencies:** 🔴BLOCKS (5.2)
- **Labels:** Epic-5, 🔴BLOCKS, edge-cases

#### Story 5.2: Lista Alertas + Badge + Botão Manual Refresh
- **Type:** Story
- **Title:** 5.2: Lista Alertas + Badge + Botão Manual Refresh
- **Epic:** Epic 5
- **Estimate:** 1 day
- **Dependencies:** 🟡SOFT (Story 5.1)
- **Labels:** Epic-5, 🟡SOFT

### Epic 6 Stories (2)

#### Story 6.1: Tela Detalhe Ativo Consolidada
- **Type:** Story
- **Title:** 6.1: Tela Detalhe Ativo Consolidada
- **Epic:** Epic 6
- **Estimate:** 2 days
- **Dependencies:** 🟡SOFT (Epics 2, 3, 4)
- **Labels:** Epic-6, 🟡SOFT

#### Story 6.2: Tooltips Rastreabilidade de Cálculos
- **Type:** Story
- **Title:** 6.2: Tooltips Rastreabilidade de Cálculos
- **Epic:** Epic 6
- **Estimate:** 1 day
- **Dependencies:** 🟡SOFT (Story 6.1)
- **Labels:** Epic-6, 🟡SOFT

### Epic 7 Stories (4)

#### Story 7.1: Seed Mínimo (10 Ativos + Price History 3M)
- **Type:** Story
- **Title:** 7.1: Seed Mínimo (10 Ativos + Price History 3M)
- **Epic:** Epic 7
- **Estimate:** 1 day
- **Dependencies:** 🟡SOFT (Story 1.1)
- **Labels:** Epic-7, 🟡SOFT

#### Story 7.2: Seed Expand Fundamentals (30 Ativos)
- **Type:** Story
- **Title:** 7.2: Seed Expand Fundamentals (30 Ativos)
- **Epic:** Epic 7
- **Estimate:** 1 day
- **Dependencies:** 🟡SOFT (Story 7.1)
- **Labels:** Epic-7, 🟡SOFT

#### Story 7.3: Seed Full (50 Ativos + Dividends + Benchmarks + 12M)
- **Type:** Story
- **Title:** 7.3: Seed Full (50 Ativos + Dividends + Benchmarks + 12M)
- **Epic:** Epic 7
- **Estimate:** 1 day
- **Dependencies:** 🟡SOFT (Story 7.2)
- **Labels:** Epic-7, 🟡SOFT, edge-cases

#### Story 7.4: Validation Script Retroativo
- **Type:** Story
- **Title:** 7.4: Validation Script Retroativo
- **Epic:** Epic 7
- **Estimate:** 1 day
- **Dependencies:** 🟢INDEPENDENT
- **Labels:** Epic-7, 🟢INDEPENDENT

---

## Summary Statistics

### Total Counts
- **Epics:** 7
- **Stories:** 27
- **Spike Stories:** 1
- **Total Issues:** 35

### Estimate Breakdown
- **Epics:** 34 days total
- **Spike:** 2 days
- **Grand Total:** 36 days

### Dependency Breakdown
- 🔴 BLOCKS: 3 stories (1.1, 4.1, 5.1)
- 🟡 SOFT: 23 stories
- 🟢 INDEPENDENT: 2 stories (1.4, 2.5, 4.4, 7.4 = 4)

### Edge Cases
- Total with edge-cases label: 8 stories
- 1.3, 2.4, 3.2, 3.4, 4.3, 5.1, 7.3

### FRs Coverage
- All 28 FRs covered (FR-1 to FR-28)

---

## Next Steps (Awaiting Authorization)
1. ✅ Parse stories-detailed.md (DONE)
2. ⏳ User completes OAuth authorization
3. ⏳ Create 7 Epics in KAN project
4. ⏳ Create 27 Stories linked to Epics
5. ⏳ Move all to "To Do" column
6. ⏳ Generate final summary with links
