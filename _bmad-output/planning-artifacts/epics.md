---
stepsCompleted: 
  - step-01-validate-prerequisites
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-Valora-2026-08-15/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-Valora-2026-08-15/ARCHITECTURE-SPINE.md
  - valora_cadastro.html
  - valora_login.html
  - valora_ativo.html
  - valora_estrategias.html
  - valora_score.html
  - valora_estrategias (1).html
  - valora_preco_teto.html
  - valora_carteira.html
  - valora_patrimonio.html
  - valora_proventos.html
  - valora_rentabilidade.html
---

# Valora MVP - Epic Breakdown

## Overview

Este documento decompõe os requisitos do PRD, Architecture Spine e protótipos HTML em épicos e histórias implementáveis para o MVP Valora.

**Estratégia de Paralelização:**
- 🟢 **INDEPENDENT** — História pode ser desenvolvida em paralelo sem bloqueios
- 🟡 **SOFT DEPENDENCY** — Funciona com mocks, ideal com dependência completa
- 🔴 **BLOCKS** — Bloqueia outras histórias até conclusão

## Requirements Inventory

### Functional Requirements

**FR-1: Cadastro de Novo Usuário** — Visitante pode criar conta com email, senha, nome completo e telefone (opcional)  
**FR-2: Login de Usuário Existente** — Login com email/senha, redirect para /carteira  
**FR-3: Logout e Gestão de Sessão** — Logout limpa sessão, sessão expira em 7 dias  
**FR-4: Recuperação de Senha** — Link "Esqueci minha senha", email com link de reset (TTL 1h)  

**FR-5: Adicionar Posição Manual** — Cadastro manual com ticker, quantidade, preço médio, data aquisição  
**FR-6: Importar Transações via CSV** — Upload CSV (data, ticker, tipo, quantidade, preço, corretagem), preview com correção inline  
**FR-7: Visualizar Lista de Posições** — Carteira exibe posições com cotação atual, valor mercado, peso %, variação %, ordenação/agrupamento  
**FR-8: Consolidação por Tipo de Ativo** — Card composição gráfico pizza, exposição internacional %  
**FR-9: Alertas de Inconsistências na Carteira** — Alertas: posição sem transações, dividendo não recebido, cotação antiga >7 dias  

**FR-10: Evolução do Patrimônio Líquido** — Gráfico linha evolução patrimônio (períodos 1M/3M/6M/1A/Tudo)  
**FR-11: Composição e Exposição Internacional** — Card composição % por classe, exposição internacional %  

**FR-12: Histórico Mensal de Dividendos** — Timeline proventos agrupados por mês, gráfico barras  
**FR-13: Proventos por Ativo** — Tabela detalhada: ticker, tipo, data COM, valor, ordenação/filtros  

**FR-14: Retorno Total e Comparação com Benchmarks** — Rentabilidade carteira vs CDI/IBOV/IFIX, gráfico comparativo  
**FR-15: Rentabilidade por Ativo** — Tabela: retorno total %, ganho capital %, proventos recebidos  

**FR-16: Criar e Editar Regras de Score** — Score customizado com regras (métrica, operador, limiar, pontos)  
**FR-17: Aplicar Score na Carteira** — Score exibido ao lado de cada ticker, ordenação por score  

**FR-18: Calcular Preço-Teto por Método Bazin** — Bazin: Preço-teto = Dividendo anual / DY mínimo desejado  
**FR-19: Identificar Oportunidades e Alertas de Valuation** — Alertas quando ativo >15% abaixo teto ou >20% acima  

**FR-20: Lista de Alertas e Badge Numérico** — Lista alertas (inconsistência/oportunidade/evento), badge contador  
**FR-21: Geração Automática de Alertas** — Job/Edge Function gera alertas (posições, dividendos, preço-teto)  

**FR-22: Catálogo de Ativos com Dados Seed** — ~50 ativos seed (ações BR, FIIs, BDRs, stocks US, REITs, cryptos)  
**FR-23: Histórico de Preços Seed** — Série diária 12 meses simulada em `price_history`  
**FR-24: Dividendos e Indicadores Fundamentalistas Seed** — Histórico trimestral seed (P/L, ROE, DY, VPA, LPA, Dívida/PL, Margem Líquida)  

**FR-25: Exibir Origem e Atualização de Dados** — Tooltip com fonte (seed/api/manual/csv) e data atualização  

**FR-26: Visualizar Detalhe de Ativo** — Tela detalhe: cotação, histórico preços, fundamentals, dividendos, score, preço-teto, posição usuário  

**FR-27: Menu Lateral e Navegação Entre Telas** — Menu fixo: Carteira/Patrimônio/Proventos/Rentabilidade/Score/Estratégias/Alertas  
**FR-28: Ações de Suporte** — Exportar CSV (funcional), Sincronizar/Insights (placeholders)  

### Non-Functional Requirements

**NFR-Performance-1:** Carteira carrega lista 50 posições em ≤2s (p95)  
**NFR-Performance-2:** Cálculo Score 50 ativos em ≤1s  
**NFR-Performance-3:** Gráfico evolução patrimônio 1 ano em ≤3s  
**NFR-Performance-4:** Gráfico patrimônio <3s para histórico 1 ano (365 pontos)  
**NFR-Performance-5:** Histórico proventos <2s para 500 registros  
**NFR-Performance-6:** Cálculo rentabilidade carteira 50 ativos 1 ano em <3s  
**NFR-Performance-7:** Cálculo Preço-Teto 50 ativos em <2s  
**NFR-Performance-8:** Tela detalhe ativo carrega em <2s com 12 meses histórico  
**NFR-Performance-9:** Transição entre telas <500ms  
**NFR-Performance-10:** Exportar CSV até 1000 linhas em <2s  
**NFR-Performance-11:** Job alertas processa carteira 50 ativos em <5s  
**NFR-Performance-12:** Seed scripts populam banco em <30s  

**NFR-Security-1:** Senhas hash bcrypt (gerenciado Supabase Auth)  
**NFR-Security-2:** Tokens JWT assinados/verificados server-side  
**NFR-Security-3:** RLS ativo em tabelas privadas: users, positions, transactions, score_rules, alerts, user_preferences (policy: user_id = auth.uid())  
**NFR-Security-4:** Tabelas públicas sem RLS: assets, price_history, dividends, fundamentals, benchmarks (leitura autenticada)  

**NFR-Usability-1:** Importação CSV suporta até 1000 transações por arquivo  
**NFR-Usability-2:** Preview CSV inline renderiza <2s para arquivos 500 linhas  
**NFR-Usability-3:** Contraste cores WCAG 2.1 AA em tema dark  

**NFR-Reliability-1:** Fallback taxa USD fixa R$5,00 se AwesomeAPI falhar/timeout >2s  
**NFR-Reliability-2:** Badge "taxa USD aproximada" quando usar fallback  
**NFR-Reliability-3:** Flag "⚠️ Cotação antiga" quando >1 dia desatualizada  
**NFR-Reliability-4:** Flag "⚠️ Dados antigos" quando fundamentals >90 dias  

### Additional Requirements (Architecture)

**AD-1: Monolito Modular** — Estrutura src/modules/{domain}/, um build Vite, um deploy, módulos importam livremente  
**AD-2: Zustand State Management** — Store global com slices por domínio (auth, portfolio, preferences)  
**AD-3: TanStack Query + Supabase Client** — useQuery/useMutation para data fetching, cache automático  
**AD-4: Supabase Realtime Seletivo** — Realtime apenas para alertas novos e updates críticos multi-user  
**AD-5: Cálculos Híbridos** — Cliente: soma patrimônio, ordenação, filtros UI. Servidor: score, preço-teto, alertas, validações  
**AD-6: RLS Strategy** — Privadas com RLS (user_id = auth.uid()), públicas sem RLS (market data)  
**AD-7: Módulos Autocontidos** — Cada módulo: components/, hooks/, services/, types/. Shared para cross-cutting  
**AD-8: Posições Independentes** — Posição pode existir sem transações. Transações recalculam preço médio ponderado via trigger  
**AD-9: Score/Preço-Teto On-Demand** — Cálculo on-demand sem persistir resultado. Cache TanStack Query staleTime 5min  
**AD-10: Deploy Railway/Render** — Frontend SPA Railway/Render. Supabase Cloud: Postgres, Auth, Edge Functions, Realtime  
**AD-11: Performance Strategy** — Indexes (user_id, ticker, date), lazy-load charts, staleTime por tipo dado  
**AD-12: AwesomeAPI Integration** — Client-side fetch USD-BRL, staleTime 1h, fallback R$5,00, localStorage secondary fallback  
**AD-13: Local Dev Setup** — Supabase Cloud projeto dev separado, .env.local, seed scripts SQL  
**AD-14: Alertas On-Demand** — Botão "Atualizar Alertas" dispara Edge Function, idempotente, v2 migrar para cron diário  

### UX Design Requirements (Protótipos HTML)

**UX-DR-1: valora_cadastro.html** — Form cadastro com campos: email, senha, confirmar senha, nome completo, telefone (opcional)  
**UX-DR-2: valora_login.html** — Form login email/senha, link "Esqueci minha senha"  
**UX-DR-3: valora_carteira.html** — Lista posições em tabela, cards composição/patrimônio total, alertas badge/lista, botão adicionar/importar  
**UX-DR-4: valora_patrimonio.html** — Gráfico linha evolução patrimônio, cards composição classe ativo/exposição internacional, seletor período  
**UX-DR-5: valora_proventos.html** — Gráfico barras timeline mensal, tabela detalhada proventos por ativo, filtros ticker/tipo  
**UX-DR-6: valora_rentabilidade.html** — Gráfico linhas carteira vs benchmarks, tabela rentabilidade por ativo (ganho capital + proventos), seletor período  
**UX-DR-7: valora_score.html** — Builder regras score (métrica/operador/limiar/pontos), lista scores salvos, aplicar score ativo  
**UX-DR-8: valora_estrategias.html** — Seletor método valuation Bazin, campo DY mínimo, tabela preço-teto (ticker/cotação/teto/margem)  
**UX-DR-9: valora_estrategias (1).html** — Versão alternativa estratégias (conteúdo diferente conforme decisão usuário)  
**UX-DR-10: valora_preco_teto.html** — Tabela preço-teto consolidada, indicadores visuais oportunidade/sobrevalorização  
**UX-DR-11: valora_ativo.html** — Detalhe ativo: header cotação/variação, gráfico histórico preços, cards fundamentals/dividendos/score/preço-teto, posição usuário  

**UX-DR-12: Tema Dark-Only** — Todos protótipos em dark mode, contraste WCAG 2.1 AA  
**UX-DR-13: Menu Lateral Fixo** — Sidebar esquerda com ícones + labels, item ativo destacado  
**UX-DR-14: Badges Numéricos** — Contador alertas novos visível menu/carteira  
**UX-DR-15: Tooltips Informativos** — Ícone 🛈 para origem dados, flags desatualização  
**UX-DR-16: Grupos Colapsáveis** — Agrupamento posições por classe ativo com subtotais colapsáveis  
**UX-DR-17: Ordenação Tabelas** — Click coluna header para ordenar crescente/decrescente  
**UX-DR-18: Exportar CSV** — Botão export em carteira/rentabilidade/proventos  
**UX-DR-19: Modais Ação** — Adicionar posição, importar CSV, editar score em modais overlay  
**UX-DR-20: Feedback Visual** — Loading spinners, toast notifications sucesso/erro, cores semânticas (verde oportunidade, vermelho alerta)

### FR Coverage Map

**Epic 1 - Fundação e Autenticação:**
- FR-1: Cadastro de Novo Usuário
- FR-2: Login de Usuário Existente
- FR-3: Logout e Gestão de Sessão
- FR-4: Recuperação de Senha
- FR-27: Menu Lateral e Navegação Entre Telas (fundação)

**Epic 2 - Gestão de Carteira e Posições:**
- FR-5: Adicionar Posição Manual
- FR-6: Importar Transações via CSV
- FR-7: Visualizar Lista de Posições
- FR-8: Consolidação por Tipo de Ativo
- FR-9: Alertas de Inconsistências na Carteira

**Epic 3 - Análise de Patrimônio e Evolução:**
- FR-10: Evolução do Patrimônio Líquido
- FR-11: Composição e Exposição Internacional

**Epic 4 - Histórico de Proventos:**
- FR-12: Histórico Mensal de Dividendos
- FR-13: Proventos por Ativo

**Epic 5 - Análise de Rentabilidade e Benchmarks:**
- FR-14: Retorno Total e Comparação com Benchmarks
- FR-15: Rentabilidade por Ativo

**Epic 6 - Score Fundamentalista Customizável:**
- FR-16: Criar e Editar Regras de Score
- FR-17: Aplicar Score na Carteira

**Epic 7 - Preço-Teto e Estratégias de Valuation:**
- FR-18: Calcular Preço-Teto por Método Bazin
- FR-19: Identificar Oportunidades e Alertas de Valuation

**Epic 8 - Sistema de Alertas Inteligentes:**
- FR-20: Lista de Alertas e Badge Numérico
- FR-21: Geração Automática de Alertas

**Epic 9 - Detalhe de Ativo e Rastreabilidade:**
- FR-25: Exibir Origem e Atualização de Dados
- FR-26: Visualizar Detalhe de Ativo

**Epic 10 - Dados de Mercado e Seed Setup:**
- FR-22: Catálogo de Ativos com Dados Seed
- FR-23: Histórico de Preços Seed
- FR-24: Dividendos e Indicadores Fundamentalistas Seed
- FR-28: Ações de Suporte (Exportar CSV)

**Cobertura Total:** 28/28 FRs ✅

## Epic List

### Epic 1: Fundação e Autenticação

Usuários podem criar conta, fazer login/logout, recuperar senha e acessar sistema protegido. Fundação técnica (Vite + React + Supabase + módulos base) estabelecida de forma incremental.

**FRs cobertos:** FR-1, FR-2, FR-3, FR-4, FR-27

**Entrega:** Sistema de autenticação completo com Supabase Auth, setup inicial do projeto Vite + React + TypeScript, estrutura de módulos (src/modules/auth + src/shared), Zustand auth store, React Router configurado, menu lateral fixo com navegação básica.

**Estratégia Incremental (Pre-mortem + War Room):**
- **História 1.1:** 🔴 Setup Vite + React + Supabase Client + Autenticação básica (forms login/cadastro/recuperação senha)
- **História 1.2:** 🔴 Estrutura módulos (src/modules/, src/shared/) + Zustand auth store + React Router + rotas protegidas
- **História 1.3:** 🟡 Menu lateral fixo + tema dark TailwindCSS + navegação entre telas
- **História 1.4:** 🟢 Banner informativo "MVP usa dados simulados" (0.5 dia)
  - **AC:** Banner global primeira vez que usuário loga: "Valora MVP usa dados simulados. Integração com APIs reais vem em v2." Dismissível, não aparece novamente.
  - **Trade-off War Room:** +0.5 dia Epic 1 (total 3.5 dias), mas transparência crítica — evita confusão usuário achando que cotações/fundamentals seed são reais
- **Rationale:** Dividir setup monolítico em 3 histórias <3 dias cada evita contexto explodido e permite validação incremental. Banner adicional garante transparência sobre seed data.

**Notas técnicas:**
- Setup Vite 5.x + React 18.3.x + TypeScript 5.5.x
- Supabase client configurado (@supabase/supabase-js)
- Zustand 4.5.x para auth state
- React Router 6.x com rotas protegidas
- Menu lateral com itens: Carteira, Patrimônio, Proventos, Rentabilidade, Score, Estratégias, Alertas
- Tema dark-only (TailwindCSS)
- Tabela users com RLS (user_id = auth.uid())

---

### Epic 2: Gestão de Carteira e Posições

Usuários podem cadastrar posições manualmente, importar transações via CSV, visualizar carteira consolidada com composição por tipo de ativo e alertas de inconsistências.

**FRs cobertos:** FR-5, FR-6, FR-7, FR-8, FR-9

**Entrega:** Módulo portfolio completo — adicionar/editar/deletar posições (ticker, quantidade, preço médio, data), importar CSV de transações com preview otimizado e correção inline, tela Carteira com lista posições (ordenação/agrupamento), gráfico pizza composição por classe ativo, card exposição internacional, alertas inconsistências (posição sem transações, cotação antiga).

**Histórias Críticas (Pre-mortem + War Room):**
- **História 2.4:** 🟡 Preview CSV paginado com correção inline e encoding detection (4 dias)
  - **AC:** Preview paginado (100 linhas/página), botão "Carregar mais X linhas", correção inline funciona, encoding detection ISO-8859-1/UTF-8/UTF-8-BOM, spinner validação com progresso "Validando linha 542 de 800..."
  - **Trade-off War Room:** Paginação em vez de virtualização — menos elegante mas factível (4 dias vs 7 dias com virtualização + correção inline dinâmica)
  - **Edge cases:** Testar encoding ISO-8859-1 (Excel Brasil), UTF-8 with/without BOM, arquivos 800+ linhas, correção inline em diferentes páginas
  - **Rationale:** Meio termo viável — entrega job-to-be-done (ver tudo + corrigir inline) sem explodir prazo. Virtualização com altura dinâmica (correção inline) tem bugs conhecidos react-window

**Notas técnicas:**
- Tabelas: positions, transactions (ambas com RLS user_id = auth.uid())
- Preço médio ponderado calculado via trigger Postgres ou Edge Function (AD-8)
- Importação CSV: validação formato, preview inline virtualizado, limite 1000 transações
- Integração AwesomeAPI para cotação USD-BRL (AD-12, client-side fetch, staleTime 1h, fallback R$5,00)
- TanStack Query para data fetching com cache
- Componentes: PositionList, AddPositionModal, TransactionImportCSV (com virtualização), PortfolioComposition

---

### Epic 3: Análise de Patrimônio e Evolução

Usuários podem visualizar evolução do patrimônio ao longo do tempo e composição detalhada por classe de ativo com exposição internacional.

**FRs cobertos:** FR-10, FR-11

**Entrega:** Módulo wealth — gráfico linha evolução patrimônio líquido (eixo X: data, eixo Y: R$) com períodos selecionáveis (1M, 3M, 6M, 1A, Tudo), cards composição % por classe ativo (gráfico pizza ou barras horizontais), card exposição internacional % (BDR + stocks US + REITs + crypto).

**Notas técnicas:**
- Cálculo patrimônio diário = Σ (cotação × quantidade) client-side (AD-5)
- Dados históricos reconstruídos de price_history + positions
- Recharts para gráficos (lazy-load com React.lazy, AD-11)
- Target performance: gráfico carrega em <3s para 365 pontos (NFR-Performance-3, NFR-Performance-4)
- Componentes: WealthEvolutionChart, CompositionPieChart, InternationalExposureCard

---

### Epic 4: Histórico de Proventos

Usuários podem visualizar histórico mensal de dividendos/JCP/rendimentos e detalhar proventos recebidos por ativo com filtros e ordenação.

**FRs cobertos:** FR-12, FR-13

**Entrega:** Módulo dividends — timeline de proventos agrupados por mês (gráfico barras verticais: eixo X = mês, eixo Y = valor total R$), tabela detalhada por ativo (ticker, tipo dividendo/JCP/rendimento, data COM, data pagamento, valor por cota, quantidade cotas, valor total recebido), filtros por ticker/tipo, ordenação por data/valor/ticker.

**Notas técnicas:**
- Query em transactions tipo dividendo|JCP|rendimento
- Períodos selecionáveis: 6M, 1A, Tudo
- Soma total de proventos no período em destaque
- Target performance: carrega <2s para 500 registros (NFR-Performance-5)
- Componentes: DividendsTimeline, DividendsByAssetTable

---

### Epic 5: Análise de Rentabilidade e Benchmarks

Usuários podem comparar rentabilidade da carteira com benchmarks (CDI/IBOV/IFIX) e analisar retorno por ativo separando ganho de capital de proventos.

**FRs cobertos:** FR-14, FR-15

**Entrega:** Módulo performance — gráfico linhas comparativo (carteira vs CDI vs IBOV vs IFIX no mesmo eixo temporal), card resumo rentabilidade ("Você bateu o CDI em +2,3pp"), tabela rentabilidade por ativo (ticker, retorno total %, ganho capital %, proventos R$, proventos %), ordenação por retorno total decrescente.

**Notas técnicas:**
- Rentabilidade carteira = ((Patrimônio final + Proventos − Aportes) / Patrimônio inicial) − 1
- Ganho capital % = ((cotação atual − preço médio) / preço médio) × 100
- Proventos % = (Σ dividendos / (preço médio × quantidade)) × 100
- Dados benchmark seed em tabela benchmarks (CDI, IBOV, IFIX série histórica)
- Target performance: cálculo 50 ativos 1 ano <3s (NFR-Performance-6)
- Componentes: PerformanceChart, BenchmarkComparison, PerformanceByAssetTable

---

### Epic 6: Score Fundamentalista Customizável

Usuários podem criar regras de Score Fundamentalista personalizadas (P/L, ROE, DY, etc.) e aplicar score na carteira para identificar ativos alinhados com critérios próprios.

**FRs cobertos:** FR-16, FR-17

**Entrega:** Módulo score — builder de regras (nome score, lista regras: métrica P/L|ROE|DY|Dívida/PL|Margem Líquida, operador <|>|entre, limiar numérico, pontos inteiros), lista scores salvos (seleção score ativo), aplicação score na Carteira (pontuação ao lado de cada ticker, ordenação por score decrescente/crescente), flag "⚠️ Dados antigos" quando fundamentals >90 dias.

**Histórias Críticas (Pre-mortem Fix):**
- **História 6.3:** 🟡 Otimização batch queries para cálculo Score
  - **AC:** Batch query `WHERE ticker IN (...)` em vez de 50 queries individuais, debounce client-side 300ms, loading state explícito
  - **Target:** 50 ativos <1s **incluindo cold start Edge Function**, não apenas após warm-up
  - **Rationale:** Queries individuais em loop causam latência 8s, cold start Deno 3s sem debounce dispara cálculos duplicados

**Notas técnicas:**
- Tabela score_rules com RLS (user_id = auth.uid())
- Cálculo Score = Σ pontos de regras aplicáveis, on-demand sem persistir resultado (AD-9 atualizado)
- **AD-9 Enhanced:** Batch queries `WHERE ticker IN (...)`, debounce 300ms, loading explícito, <1s incluindo cold start
- Edge Function ou Postgres Function para cálculo server-side (AD-5)
- TanStack Query cache staleTime 5min
- Target performance: cálculo 50 ativos <1s (NFR-Performance-2)
- Componentes: ScoreRuleBuilder, ScoreRuleList, ScoreDisplay

---

### Epic 7: Preço-Teto e Estratégias de Valuation

Usuários podem calcular Preço-Teto pelo método Bazin, identificar oportunidades (cotação < teto) e receber alertas de sobrevalorização ou oportunidades de compra.

**FRs cobertos:** FR-18, FR-19

**Entrega:** Módulo valuation — seletor método Bazin com campo DY mínimo desejado configurável, cálculo Preço-teto = Dividendo anual / DY mínimo, tabela resultados (ticker, cotação atual, Preço-Teto calculado, margem segurança % = (teto − cotação) / cotação, indicador visual verde se cotação < teto / vermelho se > teto), alertas automáticos quando ativo >15% abaixo teto (oportunidade) ou >20% acima (sobrevalorizado), tooltip "N/A" quando ativo sem histórico dividendos consistente.

**Histórias Críticas (Pre-mortem Fix):**
- **História 7.3:** 🟡 Otimização batch queries para cálculo Preço-Teto
  - **AC:** Mesma estratégia Epic 6 — batch query, debounce 300ms, loading explícito, <2s incluindo cold start
  - **Rationale:** Mesmo problema de latência que Score, solução idêntica

**Notas técnicas:**
- Cálculo on-demand sem persistir (AD-9 atualizado: batch queries, debounce, loading)
- Métodos Graham e Múltiplos fora escopo MVP (v2)
- Integração com módulo alerts para geração alertas valuation (FR-21)
- Target performance: cálculo 50 ativos <2s (NFR-Performance-7)
- Componentes: FairPriceTable, BazinCalculator, ValuationMethodSelector

---

### Epic 8: Sistema de Alertas Inteligentes

Usuários visualizam lista consolidada de alertas (inconsistências, oportunidades, eventos) com badge numérico e alertas são atualizados automaticamente via cron diário.

**FRs cobertos:** FR-20, FR-21

**Entrega:** Módulo alerts — tela lista alertas cronológica (tipo inconsistência|oportunidade|evento, descrição, data criação, status novo|lido|ignorado), badge numérico menu lateral/carteira com contagem alertas novos, **cron diário 6h** dispara geração automática alertas (Supabase scheduled Edge Function ou pg_cron), botão manual "Atualizar Alertas" como fallback para refresh imediato, tipos alertas MVP (inconsistência: posição sem transações, dividendo não recebido, cotação >7 dias desatualizada; oportunidade: ativo abaixo Preço-Teto configurado), ações marcar lido/ignorar.

**Histórias Críticas (Pre-mortem + War Room):**
- **História 8.2:** 🔴 Trigger Postgres "posição sem transação" + botão manual + Realtime (3 dias)
  - **AC:** Trigger PL/pgSQL dispara quando `INSERT INTO positions`, checa `COUNT(transactions) = 0`, insere alerta instantâneo. Supabase Realtime subscription atualiza badge frontend via WebSocket. Botão "Atualizar Alertas" força check manual completo (dividendos, cotações antigas).
  - **Trade-off War Room:** Trigger apenas para alertas **reativos** (80% casos: "posição sem transação"). Alertas **proativos** (dividendo esperado não recebido) via botão manual MVP, cron diário v2 quando dados externos dinâmicos.
  - **Rationale:** Feedback instantâneo no caso comum (usuário adiciona posição → alerta aparece segundos depois = "magia"). Cron diário 15h lag parece bug. Trigger é 3 dias vs cron 1 dia, mas UX vale trade-off. Cron v2 quando dados seed virarem APIs reais.

**Notas técnicas:**
- Tabela alerts com RLS (user_id = auth.uid())
- **AD-14 Atualizado (War Room):** Trigger Postgres PL/pgSQL para alertas reativos (posição sem transação) como estratégia primária MVP, botão manual para check completo, cron diário v2
- Edge Function POST /functions/v1/generate-alerts: varre positions/transactions, detecta inconsistências, insere/atualiza alerts (idempotente, não duplica)
- Supabase Realtime subscription seletiva para novos alertas (AD-4)
- Target performance: job processa 50 ativos <5s (NFR-Performance-11)
- Componentes: AlertList, AlertBadge, AlertItem

---

### Epic 9: Detalhe de Ativo e Rastreabilidade

Usuários podem visualizar informações detalhadas de qualquer ativo (histórico preços, fundamentals, dividendos, score, preço-teto, posição) e rastrear origem/atualização de todos os dados.

**FRs cobertos:** FR-25, FR-26

**Entrega:** Módulo assets — tela detalhe ativo (header: nome completo, ticker, tipo ação BR|FII|BDR|stock US|REIT|crypto, cotação atual, variação % dia, moeda; gráfico histórico preços últimos 12 meses com períodos 1M/3M/6M/1A; card indicadores fundamentalistas P/L|P/VP|ROE|DY|Dívida/PL|Margem Líquida; seção dividendos histórico trimestral data COM|valor|yield; Score Fundamentalista se ativo; Preço-Teto se configurado; posição usuário se houver com botão Adicionar/Editar), tooltips rastreabilidade (ícone 🛈 clicável: fonte seed|api|manual|csv + data atualização), flags desatualização "⚠️ Desatualizado" (>90 dias fundamentals, >7 dias cotações).

**Notas técnicas:**
- Colunas source e updated_at em price_history, dividends, fundamentals (FR-25)
- Acessível clicando ticker na Carteira
- Target performance: carrega <2s com 12 meses histórico (NFR-Performance-8)
- Componentes: AssetDetail, AssetPriceChart, AssetFundamentals, AssetDividendHistory

---

### Epic 10: Dados de Mercado e Seed Setup

Sistema possui catálogo de ~50 ativos seed com histórico de preços, dividendos e indicadores fundamentalistas validados, permitindo validação completa do MVP sem APIs externas. **Deve ser executado ANTES de Epic 2-9 para habilitar testes reais desde o início.**

**FRs cobertos:** FR-22, FR-23, FR-24, FR-28

**Entrega:** Scripts seed SQL (supabase/seed.sql) populando tabelas: assets (~50 ativos: ações BR PETR4|VALE3|ITUB4, FIIs HGLG11|KNRI11, BDRs AAPL34, stocks US AAPL|MSFT, REITs, cryptos BTC|ETH com ticker|nome|tipo|moeda), price_history (série diária simulada 12 meses com volatilidade realista), dividends (histórico trimestral simulado), fundamentals (P/L|ROE|DY|VPA|LPA|Dívida/PL|Margem Líquida trimestral), benchmarks (CDI|IBOV|IFIX série histórica), **script validação constraints de negócio**, função exportar CSV (Carteira, Rentabilidade, Proventos exportam tabela em CSV até 1000 linhas <2s), placeholders Sincronizar/Insights ("Em breve").

**Histórias Críticas (Pre-mortem + War Room):**
- **História 10.3:** 🔴 Seed data validation script (1 dia)
  - **AC:** Script Python valida constraints antes de gerar SQL:
    - `dividendo_anual > 0` ↔ `lucro_liquido > 0` (empresa com prejuízo não paga dividendo sustentável)
    - `5 < P/L < 50` (empresas normais)
    - `0% < DY < 20%`
    - `ROE` entre `-50%` e `+100%`
    - `Dívida/PL ≥ 0`
  - Se falhar, printa qual ativo violou qual constraint, não gera SQL
  - **Trade-off War Room:** +1 dia Epic 10, mas economiza 1 semana debugging bugs bizarros Epics 6/7. Dados obviamente errados fazem produto parecer amador.
  - **Rationale:** Seed inconsistente quebra Score/Preço-Teto silenciosamente, usuário perde confiança
- **Ordem de Execução:** 🔴 Epic 1 → **Epic 10** → Epic 2-9 paralelos
  - **Rationale:** Seed ANTES permite testar features com dados reais desde início, revela bugs de integração cedo (não com 3 mocks hardcoded)

**Notas técnicas:**
- Tabelas públicas sem RLS (AD-6): assets, price_history, dividends, fundamentals, benchmarks (leitura autenticada)
- Todos dados marcados source='seed' para rastreabilidade (FR-25)
- Seed via Supabase migrations/CLI (AD-13: supabase db push)
- **Validation script obrigatório:** valida constraints negócio antes de popular banco
- Target performance: seed scripts rodam <30s (NFR-Performance-12)
- Exportar CSV: target <2s para 1000 linhas (NFR-Performance-10)
- Busca ativo por ticker/nome (FR-22)
