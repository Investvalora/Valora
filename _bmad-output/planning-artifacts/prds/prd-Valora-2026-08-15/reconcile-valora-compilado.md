# Reconciliação: VALORA_COMPILADO_COMPLETO.md vs PRD MVP Valora

**Data:** 2026-08-15  
**Revisor:** Agente de Reconciliação  
**Documentos analisados:**
- Input: `VALORA_COMPILADO_COMPLETO.md` (2090 linhas)
- PRD: `_bmad-output/planning-artifacts/prds/prd-Valora-2026-08-15/prd.md` (595 linhas)

---

## Gaps Encontrados

### 1. **Posicionamento competitivo e proposta de valor não articulados claramente no PRD**

**Localização:** VALORA_COMPILADO_COMPLETO §"Diferencial vs Concorrência" (linhas 40-47)

**Gap:** O compilado apresenta tabela comparativa detalhada vs Investidor10 e Kinvo destacando:
- Score customizável (Valora ✅ vs concorrentes ❌)
- Preço-teto transparente com fórmula visível
- Alertas combinados (preço + fundamentos + eventos)
- Rastreabilidade com fonte + timestamp por linha
- Modelo híbrido (manual + integração fase 1+2)

**No PRD:** Seção §1 Visão menciona diferenciação em uma frase genérica, mas não posiciona claramente contra concorrentes nomeados. UX/Sales/Marketing precisarão desta comparação direta.

**Onde deveria estar:** §1 Visão ou nova subseção "1.2 Posicionamento de Mercado" com tabela comparativa sintetizada.

---

### 2. **Público-alvo B2B e assessores sub-representado**

**Localização:** VALORA_COMPILADO_COMPLETO §"Público-alvo" (linhas 49-54)

**Gap:** O compilado lista 4 segmentos:
1. Investidores pessoa física (renda média-alta)
2. Traders fundamentalistas B3
3. **Assessores independentes** que precisam ferramenta própria
4. **Fintechs B2B** que querem integrar análise de carteira

**No PRD:** §2 Usuário-Alvo foca **apenas** em investidores PF. Assessores e fintechs B2B são mencionados brevemente em §1 Visão mas não têm Jobs To Be Done, jornadas, ou considerações de produto (multi-tenancy, white-label, permissões por cliente).

**Impacto:** Se Valora pretende monetizar via B2B (assessores, fintechs), o PRD deveria ter:
- §2.1 Jobs To Be Done para assessor ("Gerenciar 20 carteiras de clientes PF", "Aplicar estratégia padrão em lote")
- Consideração de arquitetura multi-tenant em §4 Features ou nota em Questões em Aberto

**Onde deveria estar:** §2.2 ou §2.4 "Segmento Secundário: Assessores e B2B" + nota em §9 Questões em Aberto sobre multi-tenancy.

---

### 3. **Design System e Paleta de Cores detalhados ausentes no PRD**

**Localização:** VALORA_COMPILADO_COMPLETO §"Design System" (linhas 733-966)

**Gap:** O compilado documenta:
- Paleta completa (`--bg-0` a `--bg-3`, `--line-1/2`, `--text-1/2/3`, cores de status `--cyan`, `--green`, `--amber`, `--red`)
- Tipografia (Space Grotesk para títulos, IBM Plex Sans para corpo; escala completa de tamanhos)
- Espaçamento (4px a 32px, padding de cards)
- Componentes padrão (buttons, KPI cards, pills/tags, tables)
- Layout padrão (Topbar + Sidebar + Main, com HTML estrutural)
- Animações (keyframe `rise`, delays staggered)
- Responsividade (breakpoints 1920px, 1280px, 768px, 540px)

**No PRD:** §4.11 FR-25/FR-26 menciona "design system definido em VALORA_COMPILADO_COMPLETO.md" por referência, mas não o sintetiza nem lista decisões visuais críticas (ex: dark-only, paleta, tipografia).

**Impacto:** UX designer e frontend devs precisarão referência interna no PRD ou adendo separado. Se design system não for capturado, risco de implementação divergente dos protótipos.

**Onde deveria estar:**
- **Opção A:** Adendo técnico `design-system.md` referenciado no PRD.
- **Opção B:** §4.11 expandido com subseção "Design System Summary" listando paleta, tipografia, componentes key.
- **Decisão atual:** OK deixar em `addendum.md` técnico, mas PRD deveria ter nota explícita: "Design system completo em addendum.md; dark theme obrigatório MVP."

---

### 4. **Roadmap detalhado e sprints não refletidos no PRD**

**Localização:** VALORA_COMPILADO_COMPLETO §"Roadmap & Sprints" (linhas 1825-1895)

**Gap:** O compilado apresenta roadmap de 3 fases:
- **FASE 1 (MVP — 8 semanas):** 7-8 sprints detalhados com checklists por sprint (Setup, Autenticação, API Carteira, Score/Valuation, Alertas, Market Data, Testes & Deploy).
- **FASE 2 (Expansão):** Comparador, integrações com corretoras, análise textual CVM, mobile app, marketplace estratégias.
- **FASE 3 (B2B/Escalabilidade):** White-label, APIs para assessores, análise em lote, data warehouse.

**No PRD:** §6 Escopo do MVP lista "No Escopo" vs "Fora de Escopo" mas não timeline nem fases. §5 Não-Objetivos menciona "v2", "v3" genericamente mas sem roadmap estruturado.

**Impacto:** PM, stakeholders e time de infra precisam visibility sobre:
- Quando features v2 entram (ex: integração APIs reais de cotação)?
- Escopo de cada sprint do MVP?
- Quando avaliar pivô B2B (fase 3)?

**Onde deveria estar:**
- Nova seção §11 "Roadmap" com timeline alto nível (MVP 8 semanas, v2 +4 meses, v3 +1 ano).
- Ou documento separado `roadmap.md` referenciado no PRD.
- Mínimo: adicionar em §6.2 "Fora de Escopo" nota de timeline: "Itens v2 planejados para Q4 2026, v3 para Q2 2027."

---

### 5. **Riscos & Mitigação detalhados ausentes no PRD**

**Localização:** VALORA_COMPILADO_COMPLETO §"Riscos & Mitigação" (linhas 2033-2045)

**Gap:** O compilado documenta 8 riscos com probabilidade, impacto e mitigação:
- APIs externas caem (🟡 Média prob, 🔴 Alto impacto) → Cache Redis, fallback, UI feedback
- Fórmula inválida (user input) → Validação Zod, preview tempo real
- Volume alto de ativos (100+) → Paginação, lazy-load, indexação
- Usuário não entende score → Breakdown visual, exemplos, tooltips
- Corretora tem dados diferentes → Rastreabilidade visível
- Performance mobile → PWA, lighthouse 90+
- Sincronização estratégias → Migrations Prisma, versionamento
- Compatibilidade navegador → BrowserStack, caniuse.com

**No PRD:** §9 Questões em Aberto lista 7 decisões técnicas pendentes, mas **não há seção de riscos**.

**Impacto:** Time de produto e stakeholders não têm visibility sobre:
- Principais ameaças ao MVP (ex: APIs externas caem → usuário vê dados vazios)
- Mitigações planejadas (ex: cache Redis, fallback last-known value)
- Planos de contingência

**Onde deveria estar:** Nova seção §10 "Riscos e Mitigações" (renumerando Assumptions para §11) com tabela:

| Risco | Prob | Impacto | Mitigação |
|-------|------|---------|-----------|
| APIs externas caem | Média | Alto | Cache Redis 5min, fallback last-known, UI "dados desatualizados" |
| Fórmula Score inválida (user) | Média | Médio | Validação Zod, preview tempo real, exemplos |
| ... | ... | ... | ... |

---

### 6. **Stack de 11 microserviços vs arquitetura do PRD**

**Localização:** VALORA_COMPILADO_COMPLETO §"11 Microserviços" (linhas 1014-1070)

**Gap:** O compilado define arquitetura detalhada com 11 microserviços:
1. valora-gateway / BFF (Fastify, porta 3000)
2. valora-portfolio-engine
3. valora-fundamental-engine (Score calc)
4. valora-valuation-engine (Preço-Teto)
5. valora-alerts-engine
6. valora-market-data-ingestion (scheduler 5min mercado, 1h fora)
7. valora-fundamental-data-ingestion (diário pós-fechamento)
8. valora-cvm-loader (fatos relevantes CVM)
9. valora-data-normalizer (padronização entre APIs)
10. valora-text-analysis (parse relatórios, sentimento fase 2)
11. valora-strategy-manager (CRUD estratégias)

**No PRD:** §0 menciona "decisões técnicas vivem em addendum.md", mas addendum não foi fornecido para análise. PRD não discute arquitetura (monolito vs microserviços, BFF, engines separados).

**Impacto:**
- **Se MVP for microserviços:** Complexidade de deploy, orquestração, infra (Docker, Railway, 11 containers) não está dimensionada no PRD → risco de timeline 8 semanas ser irrealista.
- **Se MVP for monolito:** Contradição com compilado → decisão arquitetural não registrada.

**Onde deveria estar:**
- Nota em §0 "Propósito" ou §6 "Escopo do MVP": "Arquitetura: [Monolito Next.js + Supabase] ou [Microserviços conforme COMPILADO] — ver addendum.md."
- Ou §9 Questões em Aberto: "Q8: MVP usa monolito (Next.js + Route Handlers + Supabase) ou microserviços (11 serviços conforme COMPILADO)? Trade-off: simplicidade vs escalabilidade futura."

---

### 7. **Tone of voice e UX writing ausentes no PRD**

**Localização:** VALORA_COMPILADO_COMPLETO §Design System menciona mensagens de erro, tooltips, labels; protótipos HTML têm copy específico ("sem burocracia", "centralize tudo", "oportunidade", "atenção").

**Gap:** PRD não documenta:
- Tom de voz (profissional mas acessível? técnico? educativo?)
- Exemplos de copy para alertas ("Posição PETR4 sem transações cadastradas" vs "Ops, falta info sobre PETR4")
- Mensagens de erro e estados vazios (primeira vez, sem posições, sem dados)

**Impacto:** Frontend devs e UX writers improvisarão copy, podendo gerar inconsistência de tom.

**Onde deveria estar:**
- Documento separado `ux-writing-guide.md`.
- Ou seção no design system adendo.
- Mínimo: nota no PRD §4.11: "Copy e tone of voice: ver protótipos HTML (valora_cadastro, valora_carteira) como referência; manter tom profissional-direto, evitar jargão excessivo."

---

## Conteúdo Bem Capturado

### ✅ Features funcionais detalhadas
- **FR-1 a FR-26** do PRD mapeiam corretamente features do compilado (autenticação, carteira, score, preço-teto, alertas, patrimônio, proventos, rentabilidade, rastreabilidade).
- Consequências testáveis bem definidas para cada FR.

### ✅ Jobs To Be Done e Jornadas de Usuário
- **UJ-1 a UJ-4** do PRD (§2.3) capturam bem as jornadas principais do compilado:
  - Ricardo consolida carteira → **UJ-1** vs COMPILADO "Tela Carteira".
  - Ana cria Score customizado → **UJ-2** vs COMPILADO "Tela Score".
  - Carlos checa Preço-Teto Bazin → **UJ-3** vs COMPILADO "Tela Estratégias".
  - Beatriz importa CSV → **UJ-4** vs COMPILADO "RF05 Importar CSV".

### ✅ Glossário robusto
- PRD §3 captura termos-chave (Ativo, Posição, Transação, Score, Preço-Teto, Dividendo, Patrimônio, Rentabilidade, Alerta, Benchmark, RLS).
- Mapeamento direto com termos do compilado.

### ✅ Escopo MVP e Não-Objetivos
- PRD §5, §6 articulam bem o que **não** entra no MVP (integrações corretoras, notificações externas, modo claro, renda fixa, análise técnica, mobile nativo, social).
- Alinhado com COMPILADO "Telas em Falta" (Alertas, Comparador, Configurações marcados como Fase 2).

### ✅ Métricas de sucesso concretas
- PRD §7 define métricas primárias, secundárias e contra-métricas:
  - **SM-1:** Retenção semanal ≥40%.
  - **SM-2:** ≥60% cadastram 5+ posições na 1ª sessão.
  - **SM-3:** ≥30% criam Score customizado em 2 semanas.
- Compilado não tinha métricas → **PRD adiciona valor aqui**.

### ✅ NFRs cross-cutting
- PRD §8 captura performance (Carteira em ≤2s, Score em ≤1s), segurança (RLS, JWT), acessibilidade (navegação teclado, WCAG AA), observabilidade (logs JSON, Sentry).
- Alinhado com COMPILADO "Requisitos Não Funcionais" (RNF01 a RNF10).

### ✅ Questões em aberto transparentes
- PRD §9 lista 7 decisões pendentes (API de cotação v2, conversão BRL/USD, fórmula Bazin, consolidar protótipos, tema score, alerta dividendo, job alertas).
- Boa prática de transparência; compilado não tinha seção equivalente.

---

## Recomendações de Ação

### Prioridade Alta (bloqueia desenvolvimento)
1. **[GAP #6]** Definir arquitetura MVP: monolito (Next.js + Supabase) ou microserviços (11 serviços)? Registrar decisão em PRD §0 ou §9.
2. **[GAP #4]** Adicionar timeline alto nível no PRD: MVP 8 semanas, v2 planejado Q4 2026, v3 Q2 2027. Stakeholders precisam dessa visibility.

### Prioridade Média (melhora clareza do PRD)
3. **[GAP #1]** Adicionar subseção §1.2 "Posicionamento de Mercado" com tabela comparativa vs Investidor10/Kinvo (sintetizada do compilado).
4. **[GAP #2]** Adicionar §2.4 "Segmento Secundário: Assessores e B2B" com Jobs To Be Done e nota sobre multi-tenancy em §9.
5. **[GAP #5]** Adicionar seção §10 "Riscos e Mitigações" com tabela dos 8 riscos principais do compilado.

### Prioridade Baixa (nice-to-have)
6. **[GAP #3]** Criar `design-system.md` separado ou expandir §4.11 com paleta, tipografia, componentes. Adicionar nota explícita no PRD: "Design system completo em addendum.md."
7. **[GAP #7]** Criar `ux-writing-guide.md` ou adicionar nota no PRD sobre tone of voice (usar protótipos HTML como referência).

---

## Resumo Executivo

**Input:** `VALORA_COMPILADO_COMPLETO.md` (2090 linhas, documento técnico-operacional completo)  
**PRD:** `prd.md` (595 linhas, documento de produto focado em features e requisitos)

**Gaps Críticos Encontrados: 3**
1. Posicionamento competitivo vs Investidor10/Kinvo não articulado claramente.
2. Público-alvo B2B (assessores, fintechs) sub-representado — sem Jobs To Be Done ou considerações de produto.
3. Decisão arquitetural (monolito vs 11 microserviços) não registrada no PRD — impacta viabilidade do timeline de 8 semanas.

**Gaps Importantes: 3**
4. Roadmap detalhado e timeline de fases ausentes no PRD (stakeholders precisam visibility).
5. Riscos & Mitigação (8 riscos documentados no compilado) ausentes no PRD.
6. Design system detalhado (paleta, tipografia, componentes) não sintetizado no PRD — referenciado mas não capturado.

**Gap Menor: 1**
7. Tone of voice e UX writing não documentados — risco de inconsistência de copy.

**Conteúdo Bem Capturado:**
- Features funcionais (FR-1 a FR-26) ✅
- Jobs To Be Done e Jornadas de Usuário (UJ-1 a UJ-4) ✅
- Glossário robusto ✅
- Escopo MVP e Não-Objetivos ✅
- Métricas de sucesso concretas ✅ (PRD adiciona valor aqui)
- NFRs cross-cutting ✅
- Questões em aberto transparentes ✅

**Conclusão:**
PRD captura bem o **core funcional** do MVP, mas gaps em **posicionamento estratégico**, **público B2B**, **arquitetura técnica**, **roadmap** e **riscos** precisam ser endereçados antes do kick-off de desenvolvimento. Nenhum gap bloqueia 100% (features estão claras), mas falta contexto estratégico e decisões técnicas críticas.

---

**Arquivo gerado:** `_bmad-output/planning-artifacts/prds/prd-Valora-2026-08-15/reconcile-valora-compilado.md`
