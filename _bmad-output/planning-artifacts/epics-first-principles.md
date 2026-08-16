# Valora MVP - Epic Breakdown (First Principles Consolidation)

## Overview

Este documento apresenta a estrutura de épicos **consolidada** aplicando First Principles Analysis. Reduz de 10 para **7 épicos** eliminando duplicação e agrupando domínios similares.

**Estratégia de Paralelização:**
- 🟢 **INDEPENDENT** — História pode ser desenvolvida em paralelo sem bloqueios
- 🟡 **SOFT DEPENDENCY** — Funciona com mocks, ideal com dependência completa
- 🔴 **BLOCKS** — Bloqueia outras histórias até conclusão

**Decisões First Principles:**
1. **Consolidar Épicos 3+4+5** → Epic 3: Análise de Portfolio (Patrimônio + Proventos + Rentabilidade = views do portfolio)
2. **Consolidar Épicos 6+7** → Epic 4: Valuation e Scoring Engine (infra compartilhada)
3. **Postgres Functions** em vez de Edge Functions (0 cold start, <500ms)
4. **Seed incremental** por demanda (não monolítico upfront)
5. **Tema polish** movido para v2 (CSS mínimo Epic 1)

**Economia:** ~12 dias por consolidação + 2 dias por Postgres Functions

---

## FR Coverage Map

**Epic 1 - Fundação e Autenticação:**
- FR-1, FR-2, FR-3, FR-4, FR-27

**Epic 2 - Gestão de Carteira e Posições:**
- FR-5, FR-6, FR-7, FR-8, FR-9

**Epic 3 - Análise de Portfolio:** (consolida antigos 3+4+5)
- FR-10, FR-11, FR-12, FR-13, FR-14, FR-15

**Epic 4 - Valuation e Scoring Engine:** (consolida antigos 6+7)
- FR-16, FR-17, FR-18, FR-19

**Epic 5 - Sistema de Alertas Inteligentes:**
- FR-20, FR-21

**Epic 6 - Detalhe de Ativo e Rastreabilidade:**
- FR-25, FR-26

**Epic 7 - Dados de Mercado e Seed Incremental:**
- FR-22, FR-23, FR-24, FR-28

**Cobertura:** 28/28 FRs ✅  
**Estrutura:** 7 épicos (consolidados de 10)

---

## Epic List

### Epic 1: Fundação e Autenticação

Usuários podem criar conta, fazer login/logout, recuperar senha e acessar sistema protegido.

**FRs:** FR-1, FR-2, FR-3, FR-4, FR-27  
**Estimativa:** 3 dias

**Histórias:**
- 1.1: 🔴 Setup Vite + React + Supabase + Auth básica (1d)
- 1.2: 🔴 Estrutura módulos + Zustand + React Router (1d)
- 1.3: 🟡 Menu lateral CSS mínimo (0.5d) — **First Principles: tema polish v2**
- 1.4: 🟢 Banner "dados simulados" (0.5d)

**First Principles:** História 1.3 simplificada — menu funcional sem design system completo (-1 dia)

---

### Epic 2: Gestão de Carteira e Posições

Usuários cadastram posições manualmente ou via CSV, visualizam carteira consolidada.

**FRs:** FR-5, FR-6, FR-7, FR-8, FR-9  
**Estimativa:** 6 dias

**Histórias Críticas:**
- 2.4: 🟡 Preview CSV paginado + correção inline + encoding (4d)

---

### Epic 3: Análise de Portfolio

**[CONSOLIDADO]** Patrimônio + Proventos + Rentabilidade = views agregadas do portfolio.

**FRs:** FR-10, FR-11, FR-12, FR-13, FR-14, FR-15  
**Estimativa:** 8 dias

**Rationale First Principles:**
- Todos são **queries diferentes do mesmo domínio**
- Developer context unificado evita fragmentação
- 8 dias coesos vs 3 épicos (2+2+2=6d + overhead=8-9d)

**Entrega:**
- Gráfico evolução patrimônio (períodos 1M/3M/6M/1A/Tudo)
- Cards composição/exposição internacional
- Timeline proventos mensal + tabela por ativo
- Gráfico comparativo rentabilidade vs benchmarks
- Tabela rentabilidade por ativo (ganho capital + proventos)

**Módulo:** `analysis` (substitui wealth/dividends/performance)

---

### Epic 4: Valuation e Scoring Engine

**[CONSOLIDADO]** Score + Preço-Teto = cálculos sobre fundamentals com infra compartilhada.

**FRs:** FR-16, FR-17, FR-18, FR-19  
**Estimativa:** 6 dias (economia 2 dias vs 8 dias separados)

**Histórias:**
- 4.1: 🔴 **Postgres Functions PL/pgSQL** engine (2d) — `calculate_score`, `calculate_fair_price_bazin`
- 4.2: 🟡 UI Score Fundamentalista (2d)
- 4.3: 🟡 UI Preço-Teto Bazin (1d)
- 4.4: 🟢 Alertas valuation integrados (1d)

**First Principles:**
- **Postgres Functions** em vez de Edge Functions
- **0 cold start**, <500ms consistente (vs 1-3s Deno)
- Infra compartilhada economiza duplicação

```sql
CREATE FUNCTION calculate_score(p_user_id UUID, p_score_rules_id UUID)
RETURNS TABLE(ticker TEXT, score INT) AS $$
  -- batch query fundamentals WHERE ticker IN (user positions)
  -- apply rules, sum points
$$ LANGUAGE plpgsql;
```

---

### Epic 5: Sistema de Alertas Inteligentes

Alertas instantâneos via Trigger Postgres + Realtime.

**FRs:** FR-20, FR-21  
**Estimativa:** 3 dias

**Histórias:**
- 5.1: 🔴 Trigger Postgres "posição sem transação" + Realtime (2d)
- 5.2: 🟡 Lista alertas + badge + botão manual (1d)

---

### Epic 6: Detalhe de Ativo e Rastreabilidade

Tela detalhe ativo + tooltips rastreabilidade.

**FRs:** FR-25, FR-26  
**Estimativa:** 3 dias

---

### Epic 7: Dados de Mercado e Seed Incremental

**[SEED INCREMENTAL]** Seed populado conforme épicos precisam.

**FRs:** FR-22, FR-23, FR-24, FR-28  
**Estimativa:** 4 dias

**Estratégia First Principles:**
- 7.1: 🔴 Seed mínimo: `assets` (10) + `price_history` → **habilita Epic 2** (1d)
- 7.2: 🟡 Seed expand: `fundamentals` (30) → **habilita Epic 4 Score** (1d)
- 7.3: 🟡 Seed expand: `dividends` + `benchmarks` (50) → **habilita Epic 3 e 4 Preço-Teto** (1d)
- 7.4: 🔴 Validation script retroativo (1d)

**Ordem Execução:**
- Epic 1 → Epic 7.1 → **Epic 2 paralelo** com Epic 7.2-7.4
- Epic 7.2 completo → Epic 4 começa
- Epic 7.3 completo → Epic 3 começa

**Rationale:** Seed incremental desbloqueia Epic 2 imediatamente (não espera seed completo)

---

## Comparação: Antes vs Depois

| Métrica | Antes (10 épicos) | Depois (7 épicos) | Economia |
|---------|-------------------|-------------------|----------|
| **Épicos totais** | 10 | 7 | -3 épicos |
| **Dias estimados** | ~45 dias | ~33 dias | -12 dias |
| **Módulos frontend** | 9 separados | 3 core + views | Código mais coeso |
| **Cálculos server** | Edge Functions (cold start 1-3s) | Postgres Functions (<500ms) | 2-6x mais rápido |
| **Seed strategy** | Monolítico upfront | Incremental por demanda | Epic 2 não bloqueado |
| **Tema Epic 1** | TailwindCSS completo | CSS mínimo (polish v2) | -1 dia |

---

## Decisões Técnicas First Principles

### 1. Postgres Functions vs Edge Functions

**Problema:** Edge Functions Deno têm cold start 1-3s, problemaidentificado no pre-mortem.

**Solução First Principles:** Postgres já tem os dados — fazer cálculo direto em PL/pgSQL.

**Impacto:**
- Score/Preço-Teto <500ms **consistente** (não 1-3s variável)
- 0 cold start — Postgres sempre warm
- 1 batch query vs Edge Function fazendo 50 queries individuais

**Trade-off:** PL/pgSQL menos familiar que TypeScript, mas performance vale.

### 2. Consolidação Épicos Análise (3+4+5 → 3)

**Problema:** Patrimônio/Proventos/Rentabilidade fragmentados em 3 épicos, mas todos são **views agregadas do portfolio**.

**Solução First Principles:** 1 módulo `analysis` com queries diferentes.

**Impacto:**
- Developer context unificado
- Reduz overhead context switch entre épicos
- FRs 10-15 entregues em 8 dias coesos

### 3. Consolidação Épicos Valuation (6+7 → 4)

**Problema:** Score e Preço-Teto duplicam infra (batch queries, debounce, loading, alertas).

**Solução First Principles:** Engine de cálculo compartilhado.

**Impacto:**
- Economia 2 dias por reuso infra
- Código mais DRY
- FRs 16-19 em 6 dias vs 8 dias

### 4. Seed Incremental

**Problema:** Epic 10 monolítico bloqueia Epic 2-9 até seed completo estar pronto.

**Solução First Principles:** Seed o mínimo necessário primeiro (10 ativos), expand conforme demanda.

**Impacto:**
- Epic 2 começa **em paralelo** com seed expand
- Testes com dados reais desde início
- Menos chance de gerar dados nunca usados

---

## Validação Party Mode

**Data:** 2026-08-15  
**Participantes:** Mary (BA), Amelia (Backend), Winston (Arch), John (PM), Sally (UX)

**Contexto fornecido:**
- 3 desenvolvedores
- Deadline: 3-4 meses
- Gargalo: **time** (não tração)

**Decisões Aprovadas:**

✅ **Consolidação 7 épicos mantida**
- Rationale: 3 devs + deadline apertada → consolidação é necessidade, não over-engineering
- Economia ~12 dias crítica nesse cenário

✅ **Story 0.1: Spike PL/pgSQL vs Edge Function (John)**
- 2 dias dev paralelo entre Epic 1 e Epic 4
- Valida ADR-001 antes comprometer 6 dias Epic 4
- Critério: <2x dificuldade → PL/pgSQL, >3x → TypeScript
- ROI esperado: +5.5 dias (economiza risco 7.5d - custo 2d)

✅ **Edge Cases → ACs Explícitos (Sally + Amelia)**
- 6 edge cases 🔴ALTO viram ACs numerados
- 13 edge cases 🟡MÉDIO viram sub-bullets
- Incorporados inline nos ACs (não seção separada)
- Total: 19/19 edge cases cobertos
- ROI: 1h investida, economiza 5-10h debugging produção

## Próximos Passos

1. ✅ Estrutura aprovada (7 épicos consolidados)
2. ✅ Party Mode validação completa
3. ⏭️ **AGORA:** Criar histórias detalhadas com acceptance criteria + edge cases + 🟢🟡🔴
4. ⏭️ Gerar estimativas finais
5. ⏭️ Roadmap de implementação

