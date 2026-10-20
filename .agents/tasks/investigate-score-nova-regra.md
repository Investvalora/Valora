# Investigação — Módulo Score e "Nova Regra de Score"

**Workspace:** `c:\Users\Samuel Leite\wkspaces\Valora`
**Data da investigação:** leitura direta do código-fonte

---

## Resposta Resumida

O módulo de Score está **completamente implementado**. Existem duas camadas de tela:

1. **`/analise/score`** → `AnaliseScore.tsx` — gerencia regras de score em cards agrupados por nome, com modal de criação/edição via `ScoreRuleForm.tsx`. Esta é a tela principal de score e está **100% funcional**.
2. **`/score`** (rota legada) → `ScorePage.tsx` — versão anterior desktop/mobile, ainda registrada no router mas não exibida na nav atual.

O formulário "Nova regra de score" (`ScoreRuleForm`) **já existe** em `src/modules/score/components/ScoreRuleForm.tsx` e funciona como modal em `/analise/score`. Não há nenhuma funcionalidade de score faltando.

**O contexto original da mensagem** ("faltou a gente implementar essas duas telas") se referia a `DesempenhoVisaoGeral` e `AnaliseVisaoGeral` — e **ambas já foram implementadas** como parte do plano em `.agents/tasks/visao-geral-plan.md`. As rotas `/desempenho/visao-geral` e `/analise/visao-geral` estão registradas e os componentes existem nos arquivos finais.

---

## Inventário Completo do Módulo Score

### Arquivos existentes em `src/modules/score/`

```
src/modules/score/
├── types.ts
├── components/
│   ├── ScorePage.tsx          ← tela legada em /score
│   ├── ScoreRuleForm.tsx      ← FORMULÁRIO "Nova regra de score" (modal)
│   └── ScoreRuleList.tsx      ← tabela desktop (usada pelo ScorePage legado)
├── hooks/
│   ├── useScoreRules.ts       ← CRUD: list/create/update/delete regras
│   ├── useScorePreferences.ts ← score ativo (default_score_rule_id)
│   ├── useCalculateScore.ts   ← calcula scores via useMemo (puro, sem banco)
│   └── useFundamentals.ts     ← busca fundamentals por tickers
├── services/
│   ├── scoreService.ts        ← Supabase: score_rules + user_preferences
│   └── fundamentalsService.ts ← Supabase: tabela fundamentals
└── utils/
    ├── scoreCalculation.ts    ← lógica pura de avaliação de regras
    ├── scoreCalculation.test.ts
    ├── scoreValidation.ts     ← schema Zod do formulário
    └── scoreValidation.test.ts
```

### Arquivos de Análise que usam Score

```
src/modules/analise/components/
├── AnalisePage.tsx         ← shell /analise com SubTabBar
├── AnaliseVisaoGeral.tsx   ← /analise/visao-geral (IMPLEMENTADA)
├── AnaliseScore.tsx        ← /analise/score (tela de gerenciamento de scores)
├── AnaliseAlertas.tsx      ← /analise/alertas
├── ScoreCol.tsx            ← coluna de Score usada por AnaliseVisaoGeral
├── AlertasCol.tsx          ← coluna de Alertas usada por AnaliseVisaoGeral
└── ProventosCol.tsx        ← coluna de Proventos usada por AnaliseVisaoGeral
```

---

## 1. Telas de Score existentes

### `ScorePage.tsx` — rota legada `/score`
**Arquivo:** `src/modules/score/components/ScorePage.tsx`

- Layout desktop: tabela via `ScoreRuleList`, botão "+ Nova Regra" abre `Modal` com `ScoreRuleForm`.
- Layout mobile: cards agrupados por `groupByName(rules)`, cada card exibe regras com badge de pontos e botão editar.
- **Status:** funcional, mas não exibida no menu de navegação do novo fluxo. Mantida para backward-compat.

### `AnaliseScore.tsx` — rota atual `/analise/score`
**Arquivo:** `src/modules/analise/components/AnaliseScore.tsx`

- Regras agrupadas por `name` em `ScoreGroupCard`s.
- Cada card: header com nome + total de pontos + botão "Usar este score", linhas de regra com Métrica + Condição + badge de pontos + botões ✏️ Editar e 🗑️ Excluir.
- Botão "+ Nova regra" no header → abre `Modal` com `ScoreRuleForm`.
- Gerencia estado do modal com `useState` local.
- **Status:** completamente implementada, estilo dark `#1B1B1B`.

### `AnaliseVisaoGeral.tsx` — rota `/analise/visao-geral`
**Arquivo:** `src/modules/analise/components/AnaliseVisaoGeral.tsx`

- KPI pills (desktop) e grid 2×2 (mobile).
- Grid 3 colunas desktop: `ScoreCol` + `AlertasCol` + `ProventosCol`.
- Seções inline mobile (substituem o grid).
- Tabela "Score por ativo (score ativo)" via `useCalculateScore`.
- Modal com `ScoreRuleForm` herdado.
- **Status:** completamente implementada e roteada.

---

## 2. ScoreRuleForm — "Nova Regra de Score"

**Arquivo:** `src/modules/score/components/ScoreRuleForm.tsx`

O formulário já existe com todos os campos:

| Campo | Tipo | Validação |
|-------|------|-----------|
| Nome do Score | `text` | obrigatório, `min(1)` |
| Métrica | `select` | `pl \| pvp \| roe \| dy \| debt_equity \| net_margin` |
| Operador | `select` | `lt \| lte \| gt \| gte \| between` |
| Valor de referência (threshold_min) | `number` | obrigatório, finito |
| Valor máximo (threshold_max) | `number` | obrigatório só quando `between` |
| Pontos | `number int` | positivo ou negativo |

Schema Zod em `src/modules/score/utils/scoreValidation.ts` (linha 1-55):
- `scoreRuleSchema` exportado como `ScoreRuleFormValues`.
- `superRefine` valida que `threshold_max > threshold_min` no modo `between`.

Usa `react-hook-form` + `zodResolver`. Props:
```tsx
interface ScoreRuleFormProps {
  editingRule?: ScoreRule    // undefined = criação, definido = edição
  onSuccess: () => void
  onCancel: () => void
  onBusyChange?: (isBusy: boolean) => void  // bloqueia fechamento do modal
}
```

---

## 3. Modelo de Dados (Tipos TypeScript)

**Arquivo:** `src/modules/score/types.ts`

```ts
// Métricas disponíveis
type ScoreMetric = 'pl' | 'pvp' | 'roe' | 'dy' | 'debt_equity' | 'net_margin'

// Operadores de comparação
type ScoreOperator = 'lt' | 'lte' | 'gt' | 'gte' | 'between'

// Linha da tabela score_rules no Supabase
interface ScoreRule {
  id: string
  user_id: string
  name: string           // ← agrupa múltiplas regras num mesmo "score"
  metric: ScoreMetric
  operator: ScoreOperator
  threshold_min: number
  threshold_max: number | null   // só usado com 'between'
  points: number
  created_at: string
}

// Linha da tabela user_preferences
interface UserPreferences {
  user_id: string
  default_score_rule_id: string | null  // ← qual score está ativo
  valuation_method: string
  preferred_currency: string
  updated_at: string
}
```

**Labels para UI** (`METRIC_LABELS`, `OPERATOR_LABELS`) também definidas em `types.ts` (linhas 42-52).

---

## 4. Armazenamento (Supabase)

**Tabelas:**
- `score_rules` — uma linha por regra individual. Várias regras com o mesmo `name` formam um "grupo de score".
- `user_preferences` — campo `default_score_rule_id` aponta para a regra representativa do score ativo.
- `fundamentals` — dados fundamentalistas por ticker + `reference_date`.

**RLS:** `score_rules` e `user_preferences` têm RLS por `user_id`. `fundamentals` tem policy `FOR SELECT TO authenticated USING (true)` (todos os autenticados leem).

**Serviço:** `src/modules/score/services/scoreService.ts`
- `listRules(userId)`: ordena por `name` ASC + `created_at` ASC
- `createRule(userId, payload)`: insert + select retornando `ScoreRule`
- `updateRule(id, userId, payload)`: update com guard de `user_id`
- `deleteRule(id, userId)`: delete com guard de `user_id`
- `getPreferences(userId)`: `.maybeSingle()` (null se inexistente)
- `upsertPreferences(userId, prefs)`: upsert por `user_id`

---

## 5. Métricas/Indicadores Fundamentalistas

**Arquivo:** `src/modules/score/types.ts` (linhas 42-46) e `src/modules/score/services/fundamentalsService.ts` (linhas 1-10)

Métricas disponíveis no sistema:

| Código | Label UI | Coluna na tabela `fundamentals` |
|--------|----------|----------------------------------|
| `pl` | P/L | `pl` |
| `pvp` | P/VP | `pvp` |
| `roe` | ROE (%) | `roe` |
| `dy` | DY (%) | `dy` |
| `debt_equity` | Dívida/PL | `debt_equity` |
| `net_margin` | Margem Líquida (%) | `net_margin` |

Campos adicionais na tabela `fundamentals` (para outras features):
- `lpa` — Lucro por Ação (usado em Payout e Graham)
- `vpa` — Valor Patrimonial por Ação (usado em Graham)

---

## 6. Cálculo de Score

**Arquivo:** `src/modules/score/utils/scoreCalculation.ts`

```ts
// Avalia se um valor satisfaz a condição de uma regra
export function evaluateRule(rule: ScoreRule, value: number): boolean

// Aplica todas as regras sobre fundamentals e retorna score por ticker
export function applyScoreRules(
  rules: ScoreRule[],
  fundamentals: FundamentalsRow[],
): ScoreByTicker   // Map<string, number | null>
```

**Resultado:**
- Ticker com fundamentals: soma dos `points` das regras satisfeitas (pode ser 0).
- Ticker sem fundamentals: ausente do Map → UI exibe "N/A" ou "—".
- Função pura: sem I/O, sem efeitos colaterais.

**Hook de integração:** `src/modules/score/hooks/useCalculateScore.ts`
- Envolve `applyScoreRules` em `useMemo` para evitar recálculo desnecessário.
- Recebe `rules: ScoreRule[]` e `fundamentals: FundamentalsRow[]`, retorna `ScoreByTicker`.

---

## 7. Rotas

**Arquivo:** `src/routes.tsx`

| Rota | Componente | Status |
|------|-----------|--------|
| `/score` | `ScorePage` (legado) | ✅ roteada, não aparece no menu novo |
| `/analise` | `AnalisePage` (shell) | ✅ roteada |
| `/analise/visao-geral` | `AnaliseVisaoGeral` | ✅ roteada e implementada |
| `/analise/score` | `AnaliseScore` | ✅ roteada e implementada |
| `/analise/alertas` | `AnaliseAlertas` | ✅ roteada e implementada |

Lazy imports em `routes.tsx` (linhas 47-49):
```ts
const AnaliseVisaoGeral = lazy(() => import('./modules/analise/components/AnaliseVisaoGeral').then((m) => ({ default: m.AnaliseVisaoGeral })))
const AnaliseScore   = lazy(() => import('./modules/analise/components/AnaliseScore').then((m) => ({ default: m.AnaliseScore })))
const AnaliseAlertas = lazy(() => import('./modules/analise/components/AnaliseAlertas').then((m) => ({ default: m.AnaliseAlertas })))
```

Não há rotas `/analise/score/nova` ou `/analise/score/:id/editar` — a criação/edição é feita via modal em `/analise/score`.

---

## 8. Componentes de Formulário/Modal Reutilizáveis

**Modal compartilhado:** `src/shared/components/Modal.tsx`
```tsx
<Modal isOpen title onClose dismissible>
  {/* children */}
</Modal>
```

**ScoreRuleForm:** `src/modules/score/components/ScoreRuleForm.tsx`
- Usado por `AnaliseScore`, `AnaliseVisaoGeral` e `ScorePage` (legado).
- Props simples: `editingRule?`, `onSuccess`, `onCancel`, `onBusyChange?`.

**SubTabBar:** `src/modules/ativos/components/SubTabBar.tsx`
- Usado por `AnalisePage`, `DesempenhoPage`, `AtivosPage`.
- Props: `tabs: { label, to }[]`.

---

## 9. Pré-visualização de Impacto (Score por Ativo)

**Funciona via:**
1. `usePositions(walletId)` → lista de posições → extrai `tickers`.
2. `useFundamentals(tickers)` → dados da tabela `fundamentals` por ticker.
3. `useCalculateScore(activeRules, fundamentals)` → `Map<ticker, score>`.

**Implementado em:**
- `ScoreCol.tsx` (coluna em `AnaliseVisaoGeral`) — linha 90-96: calcula `scoreByTicker` e mostra "N ativos avaliados" no footer.
- `AnaliseVisaoGeral.tsx` — tabela "Score por ativo (score ativo)" com colunas Ativo + Score, ordenada por pontuação desc.

---

## 10. Padrões de Design

**Cores:**
- Background cards: `bg-[#1B1B1B]` (dark) ou `bg-[#1A1A1A]`
- Borders: `border border-white/[0.08]`
- Verde: `text-nf-green` = `#63D16B` (aprox.)
- Rosa: `text-nf-pink` = `#FF8FBE`
- Azul: `text-nf-blue` = `#7987FF`

**Estrutura de pastas por módulo:**
```
src/modules/<dominio>/
├── components/   ← páginas e sub-componentes
├── hooks/        ← react-query + lógica de estado
├── services/     ← chamadas ao Supabase
├── types.ts      ← interfaces TypeScript
└── utils/        ← funções puras + testes
```

**Padrão de serviço/store/hook:**
- Sem Zustand no módulo score — state management via React Query (`@tanstack/react-query`).
- `useQuery` para leitura, `useMutation` com `queryClient.invalidateQueries` para escrita.
- `staleTime` de 5 min para regras, 1 hora para fundamentals.

**Componentes UI base:**
- Sem shadcn/radix — componentes custom com Tailwind direto.
- `KpiCard`, `KpiPillBar`, `PanelCard`, `Modal`, `Tooltip` em `src/shared/components/`.
- `KpiCardGrid` foi criado em `mobile-desempenho-analise-plan.md` mas não confirmado como arquivo existente — **não encontrado** via glob (pode estar pendente).

**Build/Test:**
- Build: `pnpm run build` (tsc -b + vite build + build-pwa.mjs)
- Testes: `pnpm run test:run` (vitest)
- Lint: `pnpm run lint`

---

## Conclusões e Status

### O que está implementado

| Feature | Arquivo | Status |
|---------|---------|--------|
| Tipos TypeScript de Score | `src/modules/score/types.ts` | ✅ completo |
| Schema de validação Zod | `src/modules/score/utils/scoreValidation.ts` | ✅ completo |
| Serviço Supabase (CRUD) | `src/modules/score/services/scoreService.ts` | ✅ completo |
| Hooks React Query | `src/modules/score/hooks/*.ts` | ✅ completo |
| Cálculo de score (puro) | `src/modules/score/utils/scoreCalculation.ts` | ✅ completo |
| Formulário Nova/Editar regra | `src/modules/score/components/ScoreRuleForm.tsx` | ✅ completo |
| Tela `/analise/score` | `src/modules/analise/components/AnaliseScore.tsx` | ✅ completo |
| Tela `/analise/visao-geral` | `src/modules/analise/components/AnaliseVisaoGeral.tsx` | ✅ completo |
| Tela legada `/score` | `src/modules/score/components/ScorePage.tsx` | ✅ completo (legado) |
| Rotas registradas | `src/routes.tsx` linhas 47-49 + 88-90 | ✅ correto |

### O que pode estar pendente

1. **`KpiCardGrid`** — mencionado em `mobile-desempenho-analise-plan.md` como componente a criar em `src/shared/components/KpiCardGrid.tsx`, mas não encontrado com glob. Se o plano mobile foi executado, este arquivo deveria existir. Verificar com `pnpm run build`.

2. **Adaptações mobile de `DesempenhoVisaoGeral` e `AnaliseVisaoGeral`** — o plano `mobile-desempenho-analise-plan.md` detalha adaptações de layout mobile (grid 2×2 de KPIs, seções inline mobile, TabelaMensal por card de ano) que podem não ter sido aplicadas ainda. Os componentes existem mas podem ainda usar o layout desktop em telas móveis.

3. **Layout responsivo de `DesempenhoRentabilidade` e `DesempenhoProventos`** — mesmas adaptações mobile planejadas no mesmo plano.

### Recomendações

- **Não há tela de score faltando.** O "Nova regra de score" existe como modal em `/analise/score`.
- Se o usuário queria se referir às duas telas de "Visão Geral" (`/desempenho/visao-geral` e `/analise/visao-geral`), **ambas já estão implementadas**.
- O próximo trabalho pendente é o plano `mobile-desempenho-analise-plan.md` — adaptações de responsividade mobile para as telas de Desempenho e Análise, que inclui `KpiCardGrid` e layouts específicos para mobile.
- Executar `pnpm run build` e `pnpm run test:run` para confirmar que nenhum erro de compilação existe no estado atual.
