# Architecture Decision Records - Valora MVP

**Data:** 2026-08-15  
**Método:** Architecture Decision Records Panel  
**Participantes:** Marina (Backend), Ricardo (Frontend), Lucas (DevOps)

---

## ADR-001: Postgres Functions vs Edge Functions para Cálculos Server-Side

**Status:** ✅ APPROVED  
**Decisão:** **Postgres Functions PL/pgSQL**

### Contexto
Score Fundamentalista e Preço-Teto precisam calcular sobre fundamentals server-side. First Principles sugeriu Postgres Functions, mas Edge Functions TypeScript são mais familiares.

### Alternativas Consideradas

**Opção A: Postgres Functions PL/pgSQL**
- ✅ 0 cold start (Postgres sempre warm)
- ✅ Proximidade dados (0 network hop)
- ✅ Performance <500ms consistente
- ✅ Custo $0 (incluído plano DB)
- ❌ PL/pgSQL menos familiar
- ❌ Debugging mais difícil
- ❌ Sem libs npm

**Opção B: Edge Functions TypeScript (Deno)**
- ✅ TypeScript unificado front+back
- ✅ Debugging familiar (console.log)
- ✅ Libs npm (Zod, date-fns)
- ✅ Portabilidade (Lambda, Workers)
- ❌ Cold start 1-3s
- ❌ Network hop adicional
- ❌ Custo $20/mês se viralizar

### Decisão
**Postgres Functions** para MVP.

**Rationale:**
1. NFR <1s impossível garantir com cold start Edge Functions
2. Custo $0 vs potencial $20+/mês
3. Deployment mais simples (migrations únicas)
4. Performance crítica supera DX

**Mitigações:**
- Documentar functions com comentários explicativos
- Criar helpers reutilizáveis (`safe_divide(a,b)`)
- Fallback plan: refactor para Edge Functions se time sofrer muito (3+ meses)

**Implementação:**
```sql
CREATE OR REPLACE FUNCTION calculate_score(
  p_user_id UUID,
  p_score_rules_id UUID
) RETURNS TABLE(ticker TEXT, score INT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.ticker,
    SUM(
      CASE 
        WHEN f.p_l < sr.threshold AND sr.operator = '<' THEN sr.points
        WHEN f.roe > sr.threshold AND sr.operator = '>' THEN sr.points
        ELSE 0
      END
    )::INT as score
  FROM positions p
  JOIN fundamentals f ON p.ticker = f.ticker
  CROSS JOIN score_rules sr
  WHERE p.user_id = p_user_id 
    AND sr.score_id = p_score_rules_id
  GROUP BY p.ticker;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## ADR-002: Monolito Modular vs Microserviços

**Status:** ✅ APPROVED  
**Decisão:** **Monolito Modular**

### Contexto
PRD decidiu monolito, mas microserviços oferecem melhor escalabilidade futura.

### Alternativas Consideradas

**Opção A: Monolito Modular**
- ✅ 1 deploy ($7-15/mês)
- ✅ 1 CI/CD pipeline
- ✅ Debugging simples
- ✅ Transações atômicas
- ❌ Escala vertical apenas
- ❌ Deploy coupling

**Opção B: Microserviços (5 serviços: auth, portfolio, analysis, valuation, alerts)**
- ✅ Escala independente
- ✅ Deploy independente
- ✅ Tech stack heterogêneo
- ❌ Overhead 5x ($35-75/mês)
- ❌ Latência inter-serviço 50-100ms
- ❌ Distributed tracing complexo
- ❌ Transações distribuídas (saga pattern)

### Decisão
**Monolito Modular** para MVP, extração microserviços **quando necessário** (não prematura).

**Rationale:**
1. MVP 500 users cabe em 1 processo
2. Overhead microserviços é 5-10x (tempo + custo)
3. Módulos organizacionais preparam extração sem pagar custo agora
4. Extração é refactor localizado quando dor real aparecer

**Estrutura:**
```
src/
├── modules/
│   ├── portfolio/   # Pode virar microserviço futuro
│   ├── analysis/    # Pode virar microserviço futuro
│   ├── valuation/   # Pode virar microserviço futuro
│   └── alerts/      # Pode virar microserviço futuro
└── shared/          # Cross-cutting, sempre compartilhado
```

**Regra Extração:** Extrair quando **dor real** (latência, deploy coupling, tech stack conflict), não "porque escalabilidade".

---

## ADR-003: State Management — React Query + Zustand Seletivo

**Status:** ✅ APPROVED  
**Decisão:** **React Query (primary) + Zustand (minimal)**

### Contexto
AD-2 original escolheu Zustand, mas 80% do state é server state (melhor em React Query).

### Alternativas Consideradas

**Opção A: Zustand para todo state**
- ✅ API unificada
- ❌ Duplica server state (desync)
- ❌ Bundle 15kb desnecessário

**Opção B: React Query apenas**
- ✅ Server state perfeito
- ❌ Auth awkward (query session)
- ❌ UI preferences precisam useState + prop drilling

**Opção C: React Query + Zustand seletivo** ✅
- ✅ Cada ferramenta para seu propósito
- ✅ Bundle otimizado (13kb total)
- ✅ 0 duplicação state

### Decisão
**React Query (primary) + Zustand (minimal)**.

**Divisão Clara:**
- **React Query:** Todo server state (positions, transactions, score, fundamentals, alerts list)
- **Zustand:** Auth session, UI preferences, Realtime ephemeral updates
- **useState:** UI state local (modals, accordions)
- **URL:** Filtros, períodos (`useSearchParams`)

**Anti-pattern Proibido:**
```ts
// ❌ NUNCA fazer isso
const useStore = create((set) => ({
  positions: [], // ERRADO: server state em Zustand
  setPositions: (data) => set({ positions: data })
}))

// ✅ CORRETO
const { data: positions } = useQuery({
  queryKey: ['positions', userId],
  queryFn: () => supabase.from('positions').select()
})
```

---

## ADR-004: Seed Incremental Idempotente

**Status:** ✅ APPROVED  
**Decisão:** **Seed Incremental com scripts idempotentes**

### Contexto
First Principles sugeriu seed incremental (10→30→50 ativos), mas seed monolítico é mais simples.

### Alternativas Consideradas

**Opção A: Seed monolítico 50 ativos**
- ✅ 1 script SQL simples
- ✅ Ambientes consistentes
- ❌ Epic 2 bloqueado até Epic 10 completo
- ❌ Developer carrega 50 ativos desnecessários

**Opção B: Seed incremental idempotente** ✅
- ✅ Epic 2 começa imediatamente
- ✅ Developer carrega mínimo necessário
- ✅ Testes rápidos (10 ativos < 5s)
- ❌ 3 scripts (complexidade mitigada por idempotência)

### Decisão
**Seed Incremental idempotente**.

**Estrutura:**
```
supabase/migrations/
├── 001_seed_minimal.sql       # 10 ativos + price_history 3M
├── 002_seed_fundamentals.sql  # 30 ativos + fundamentals
├── 003_seed_full.sql          # 50 ativos + dividends + benchmarks + 12M
```

**Cada script:**
```sql
-- Idempotente: ON CONFLICT DO NOTHING
INSERT INTO assets(ticker, name, type)
VALUES ('PETR4', 'Petrobras PN', 'stock_br')
ON CONFLICT (ticker) DO NOTHING;

-- Aditivo: expand, nunca delete
INSERT INTO price_history(ticker, date, price)
SELECT ... WHERE NOT EXISTS (...);
```

**Developer Workflow:**
- Epic 2 (Portfolio): roda `001`
- Epic 4 (Valuation): roda `001` + `002`
- Epic 3 (Analysis): roda `001` + `002` + `003`
- **Ou sempre roda todos** (< 20s total)

---

## ADR-005: Deploy — Cloudflare Pages + Supabase

**Status:** ✅ APPROVED  
**Decisão:** **Cloudflare Pages (frontend) + Supabase Cloud (backend)**

### Contexto
AD-10 original mencionou Railway/Render, mas Cloudflare Pages é $0 e melhor latência BR.

### Alternativas Consideradas

| Plataforma | Custo/mês | Latência BR | Prós | Contras |
|------------|-----------|-------------|------|---------|
| **Vercel** | $20 | ~100ms | Preview deploys | Overkill para Vite SPA |
| **Railway** | $5-10 | ~150ms | Flexível | USA-only network |
| **Render** | $7 | ~100ms | Datacenter Ohio | Cold boot 30s |
| **Cloudflare Pages** ✅ | **$0** | **<50ms** | Edge global, grátis | Apenas frontend estático |

### Decisão
**Cloudflare Pages + Supabase**.

**Rationale:**
1. **Não precisamos servidor Node** — Supabase É o backend (Postgres + Auth + Edge Functions)
2. **$0 frontend hosting** (vs $5-20 alternativas)
3. **Latência BR <50ms** (Edge Network 200+ cidades)
4. **DX excelente:** Preview deploys, rollback instant, analytics grátis

**Custo Total MVP:**
- Cloudflare Pages: $0
- Supabase Pro: $25/mês
- **Total: $25/mês** (vs $32-45 Railway/Render + Supabase)

**Stack Final:**
```
┌─────────────────────┐
│ Cloudflare Pages    │ ← Frontend Vite SPA ($0)
│ (Edge Network)      │
└──────────┬──────────┘
           │ HTTPS
           ↓
┌─────────────────────┐
│ Supabase Cloud      │ ← Backend completo ($25/mês)
│ - Postgres 15       │
│ - Auth (JWT)        │
│ - Edge Functions    │
│ - Realtime          │
│ - Storage           │
└─────────────────────┘
```

**Fallback:** Se precisarmos backend Node (workers, cron jobs complexos), adicionar Railway ($5/mês) depois. MVP não precisa.

---

## Impacto nos Architecture Decisions Originais

### Atualizações Necessárias

**AD-9 (Original): Cálculos On-Demand**
- ✅ Mantém on-demand
- 🔄 **Atualiza:** Especifica **Postgres Functions** (não Edge Functions)
- 🔄 **Adiciona:** Batch queries, safe_divide helpers

**AD-10 (Original): Deploy Railway/Render**
- 🔄 **Substitui:** Cloudflare Pages + Supabase
- 🔄 **Atualiza custo:** $25/mês (não $32-45)
- 🔄 **Adiciona:** Latência BR <50ms como requisito

**AD-11 (Original): Performance Strategy**
- ✅ Mantém indexes, lazy-load
- 🔄 **Adiciona:** Postgres Functions <500ms target

**AD-14 (Original): Alertas**
- ✅ Mantém Trigger Postgres
- ✅ Mantém Realtime
- 🔄 **Confirma:** Botão manual fallback (não cron diário MVP)

---

## Decisões Consolidadas — Architecture Spine Revisado

### Stack Técnica Final

**Frontend:**
- Vite 5.x + React 18.3.x + TypeScript 5.5.x
- **State:** React Query 5.x (server) + Zustand 4.5.x (auth/preferences)
- Routing: React Router 6.x
- UI: TailwindCSS 3.4.x dark-only MVP
- Charts: Recharts 2.12.x lazy-load
- **Deploy:** Cloudflare Pages ($0)

**Backend:**
- Supabase Cloud ($25/mês):
  - Postgres 15 + RLS
  - Auth JWT
  - **Postgres Functions PL/pgSQL** (cálculos server-side)
  - Edge Functions Deno (jobs auxiliares)
  - Realtime WebSocket (alertas)

**Desenvolvimento:**
- pnpm 9.x
- ESLint 9.x + Prettier
- Vitest (unit) + Playwright (E2E)

---

## Próximos Passos

1. ✅ ADRs aprovados
2. ⏭️ Atualizar Architecture Spine com decisões revisadas
3. ⏭️ Criar histórias detalhadas incorporando ADRs
4. ⏭️ Step 3: Criar histórias com ACs + edge cases + dependências 🟢🟡🔴

---

**Gerado por:** Architecture Decision Records Panel  
**Data:** 2026-08-15  
**Status:** Aprovado — 5/5 ADRs consolidados
