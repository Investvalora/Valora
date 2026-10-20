# Investigação — KPI cards da tela DesempenhoVisaoGeral (valores "chumbados")

**Branch investigada:** `feat/score-nova-regra-design` (HEAD = `992d55e`).
**Arquivo-alvo:** `c:\Users\Samuel Leite\wkspaces\Valora\src\modules\desempenho\components\DesempenhoVisaoGeral.tsx`
**Modo:** somente leitura. Nenhuma edição foi feita.

---

## Resumo (resposta direta)

Na árvore de trabalho atual, **NENHUM dos 8 KPI cards do topo da `DesempenhoVisaoGeral` tem valores hardcoded (strings literais ou números fixos).** Todos puxam dados reais via hooks que consultam o Supabase pelo react-query (`usePerformance` e `useDashboard`), e ambos já são filtrados pela carteira/conta selecionada (`walletId`).

Confirmei também que `git diff main -- src/modules/desempenho/components/DesempenhoVisaoGeral.tsx` é **vazio** — o arquivo no HEAD é byte-a-byte idêntico ao da `main`. Ou seja, o usuário não está vendo uma versão "chumbada" antiga deste arquivo; não há versão alternativa com KPIs literais.

O sintoma que o usuário descreveu ("tipos/ativos e valores para as contas ficando chumbados / sem atualização") **não vem dos KPI cards**, e sim de **dois componentes que ficam logo abaixo dos KPIs na mesma tela** (gráfico "Proventos mensais (12M)" e bloco "Top pagadores"), que usam `useDividends('1A')` **sem passar `walletId`**. Esse hook busca posições de **todas as carteiras** do usuário, então seus valores não mudam ao trocar de conta — parecendo "fixos". O mesmo problema existe na aba Rentabilidade (`usePositions()` chamado sem `walletId`).

Em resumo: os KPI cards em si estão corretos; o "chumbado" é um bug de escopo de carteira nos hooks de dividendos/posições, não valores literais.

---

## 1. Quais KPI cards têm valores hardcoded

**Nenhum.** Abaixo o mapeamento de cada um dos 8 KPI cards com a fonte de dados e a linha onde o valor é atribuído.

### Mobile — grid de KPI (`DesempenhoVisaoGeral.tsx` L107–132)
| Card | Linha do `label` | Linha do `value` | Fonte | Hardcoded? |
|---|---|---|---|---|
| Rent. total | L109 | L111 `rentFormatted` | `summary.portfolioReturnPct` ← `usePerformance('1A', walletId)` (L60) | Não — real, escopado por carteira |
| Último mês | L115 | L117 `lastMonthFormatted` | `monthlyTableData` ← `usePerformance('1A', walletId)` (L60) | Não — real, escopado por carteira |
| Proventos 12M | L121 | L123 `fmtBRL(dashboard.proventos12mBRL)` | `useDashboard(walletId)` (L62) | Não — real, escopado por carteira |
| vs CDI | L127 | L129 `cdiLabel` | `summary.portfolioReturnPct`/`cdiReturnPct` ← `usePerformance('1A', walletId)` (L60) | Não — real, escopado por carteira |

### Desktop — `KpiPillBar` (`DesempenhoVisaoGeral.tsx` L150–176)
| Card | Linha do `label` | Linha do `value` | Fonte | Hardcoded? |
|---|---|---|---|---|
| Rentabilidade (12M) | L153 | L155 `rentFormatted` | `summary.portfolioReturnPct` ← `usePerformance('1A', walletId)` (L60) | Não — real, escopado por carteira |
| Lucro | L163 | L165 `fmtBRL(dashboard.lucroTotalBRL)` | `useDashboard(walletId)` (L62) | Não — real, escopado por carteira |
| Proventos 12M | L167 | L169 `fmtBRL(dashboard.proventos12mBRL)` | `useDashboard(walletId)` (L62) | Não — real, escopado por carteira |
| Patrimônio atual | L171 | L173 `fmtBRL(dashboard.totalPatrimonioBRL)` | `useDashboard(walletId)` (L62) | Não — real, escopado por carteira |

Os únicos literais presentes no arquivo são: rótulos (`'Rent. total'`, etc.), o placeholder `'—'` exibido quando o dado é `null` (estado de loading/vazio, não um valor falso), e constantes de formatação (`maximumFractionDigits: 2`). Nada disso é um "valor chumbado" de KPI.

---

## 2. Quais KPI cards já puxam dados reais de hooks

**Todos os 8** (ver tabela acima). As cadeias de dados confirmadas como reais:

- `usePerformance(period, walletId)` — `c:\...\src\modules\performance\hooks\usePerformance.ts`. Usa `useWealthHistory`, `positionService.listPositions`, `dividendService.listDividendsByTickers`, `benchmarkService.listBenchmarks`, `useUSDRate`, tudo via `useQuery`. Escopado por `walletId`.
- `useDashboard(walletId)` — `c:\...\src\modules\dashboard\hooks\useDashboard.ts`. Usa `useWealthHistory`, `useFixedIncomePositions`, `positionService.listPositions`, `dividendService.listDividendsByTickers`, via `useQuery`. Escopado por `walletId`.
- `useWealthHistory(period, walletId)` — `c:\...\src\modules\wealth\hooks\useWealthHistory.ts`. Usa `wealthService.listPositionsSnapshot(userId, walletId)`, `wealthService.listPriceHistory`, `wealthService.listLatestPrices`, `useUSDRate`. Escopado por `walletId` (`enabled: Boolean(userId) && walletId !== ''`).
- `positionService.listPositions(userId, walletId?)` — `c:\...\src\modules\portfolio\services\positionService.ts`: aplica `.eq('wallet_id', walletId)` **somente quando `walletId !== undefined`**.

O único literal numérico de fallback na cadeia é `usdRate || 5` (taxa USD/BRL quando a API devolve 0) — é fallback de conversão cambial, não um valor de KPI.

Nenhum serviço de produção contem dados mock/seed como fallback de KPI (grep por `mock|seed|fallback|fixture|R$ \d` nos services retornou apenas arquivos de teste `.test.ts` e um comentário no `dividendService` dizendo que o sync do Yahoo sobrescreve o seed).

---

## 3. Hooks/serviços existentes no módulo de desempenho

O módulo `src/modules/dempenho/` é **puramente de apresentação** — não possui hooks nem services próprios. Arquivos rastreados (`git ls-files src/modules/desempenho`):

- `components/DesempenhoPage.tsx` — shell com `SubTabBar` + `<Outlet/>` (tabs: Visão geral / Rentabilidade / Proventos).
- `components/DesempenhoVisaoGeral.tsx` — tela investigada.
- `components/DesempenhoRentabilidade.tsx` — aba Rentabilidade (gráfico, tabela mensal, tabela por ativo).
- `components/DesempenhoProventos.tsx` — aba Proventos (gráfico + tabela de proventos).
- `components/TabelaMensal.tsx` — grade mensal estilo Investidor10.
- `components/ProventosChart.tsx` — gráfico de barras de proventos.
- `components/DesempenhoPage.test.tsx` — teste.

Hooks consumidos por essas telas (todos de outros módulos):

| Hook | Local | Aceita `walletId`? | Escopado por carteira? |
|---|---|---|---|
| `usePerformance(period, walletId)` | `performance/hooks/usePerformance.ts` | Sim | Sim |
| `useDashboard(walletId)` | `dashboard/hooks/useDashboard.ts` | Sim | Sim |
| `useWealthHistory(period, walletId)` | `wealth/hooks/useWealthHistory.ts` | Sim | Sim |
| `useWallets()` | `portfolio/hooks/useWallets.ts` | — | Fornece `selectedWallet` |
| `usePositions(walletId?)` | `portfolio/hooks/usePositions.ts` | Sim (opcional) | Sim, **se passado** |
| `useDividends(period)` | `dividends/hooks/useDividends.ts` | **NÃO** | **Não** |
| `useSyncDividends()` | `dividends/hooks/useDividends.ts` | — | — |

---

## 4. Onde está o problema real (e o que o usuário viu como "chumbado")

Não é hardcoded de KPI. É **falta de escopo de carteira** em dois hooks usados nesta mesma tela, mas fora dos KPI cards:

### 4a. `useDividends('1A')` sem `walletId` — afeta o gráfico e o "Top pagadores"
`DesempenhoVisaoGeral.tsx`:
- **L64:** `const { rows: divRows, isLoading: divLoading } = useDividends('1A')` — chamado **sem** `walletId`.
- **L67:** `const monthlyBars = useMemo(() => buildMonthlyBars(divRows), [divRows])` — alimenta o gráfico "Proventos mensais (12M)".
- **L69–72:** `topPagadores` = `[...divRows].sort(...).slice(0, 3)` — alimenta o bloco "Top pagadores (12M)".

Raiz no hook `dividends/hooks/useDividends.ts`:
- **L109:** `export function useDividends(period: DividendPeriod): UseDividendsResult {` — a assinatura **não recebe `walletId`**.
- **L115–116:** `queryKey: ['portfolio', 'positions', userId]` e `queryFn: () => positionService.listPositions(userId as string)` — sem `walletId` na chave nem na chamada.
- Como `positionService.listPositions` só filtra quando `walletId !== undefined`, essa chamada devolve posições de **todas as carteiras** do usuário. Os dividendos derivam dessas posições, então o gráfico e o Top pagadores **não mudam ao trocar de conta** — exatamente o "valores/ativos chumbados para as contas".

### 4b. `usePositions()` sem `walletId` — afeta a aba Rentabilidade (relacionada)
`DesempenhoRentabilidade.tsx`:
- **L89:** `const { data: positions = [] } = usePositions()` — chamado **sem** `walletId`.
- Usado para montar `tickerTypeMap` (L91–96) → alimenta o filtro de "tipos" (dropdown `availableTypes`, L~120) e os badges de classe/tipo + "Valor atual" na tabela por ativo. Como não é escopado, **tipos/ativos e valores ficam iguais em qualquer conta**.
- Obs.: os KPI pills da Rentabilidade (Rentabilidade total, vs CDI, IBOV, CDI) vêm de `usePerformance(period, walletId)` (L77) e **estão corretos**.

### 4c. Mesma lacuna na aba Proventos
`DesempenhoProventos.tsx`: `useDividends(period)` chamado sem `walletId` (linha com `const { rows, isLoading, availableTypes } = useDividends(period)`). Os 3 KPIs dessa tela (Proventos recebidos, Média mensal, Maior mês) derivam de `rows` — reais, mas não escopados por carteira.

---

## 5. O que seria necessário para conectar cada KPI/seção a dados reais por carteira

Os KPI cards do topo **já estão conectados**. O que falta é estender o escopo de carteira aos hooks de dividendos/posições, replicando o padrão já aplicado em `usePerformance`/`useDashboard`/`useWealthHistory` (que tem o fix `d46559a "fix(performance): filtrar posicoes e historico pela carteira selecionada"` na `main`).

Recomendações (somente recomendações — nada foi implementado):

1. **Adicionar `walletId` ao `useDividends`.** Em `dividends/hooks/useDividends.ts`:
   - Mudar a assinatura para `useDividends(period: DividendPeriod, walletId?: string)`.
   - Incluir `walletId` na `queryKey` de `positionsQuery` e na chamada `positionService.listPositions(userId, walletId)`.
   - Considerar `enabled: Boolean(userId) && walletId !== ''` para alinhar com `useWealthHistory`/`usePositions`.
   - Manter a `dividendsQueryKey` (L35–40) como está; o escopo entra via `tickers` derivados das posições filtradas.

2. **Atualizar os chamadores de `useDividends` para passar `walletId`:**
   - `DesempenhoVisaoGeral.tsx` L64 → `useDividends('1A', walletId)` (com `useWallets` já em L57–58).
   - `DesempenhoProventos.tsx` → obter `walletId` de `useWallets()` e passar a `useDividends(period, walletId)`.
   - Revisar outros usos de `useDividends` no repo (ex.: `ProventosPage`, `AtivoDetailPage`) para decidir, caso a caso, se devem herdar o escopo.

3. **Passar `walletId` ao `usePositions` em `DesempenhoRentabilidade.tsx` L89** → `usePositions(walletId)` (o hook já aceita e já filtra).

4. **Verificação:** rodar a suíte do projeto (ex.: `npm test` / `npm run test:unit` — confirmar o comando exato em `package.json`) com foco em `desempenho`, `dividends` e `portfolio`, garantindo que as chaves de query e os testes de `useDividends`/`positionService` continuam passando. Grep **não** é verificação.

Observação de produto: o cartão "Valor atual" da tabela por ativo (`DesempenhoRentabilidade.tsx`, bloco desktop) hoje calcula `qty * avgPrice` (custo), não o valor de mercado — é um dado "real" mas semanticamente incorreto para "Valor atual". Foge do escopo desta investigação (KPIs), mas vale sinalizar como melhoria separada.

---

## Conclusão

- **KPI cards do topo da Visão Geral:** nenhum valor hardcoded; todos reais e escopados por carteira.
- **Sintoma "chumbado por conta":** real, mas localizado no **gráfico de proventos + Top pagadores** (`useDividends('1A')` sem `walletId`) e, na aba Rentabilidade, na **tabela por ativo/filtro de tipos** (`usePositions()` sem `walletId`). Esses hooks agregam todas as carteiras e por isso não refletem a conta selecionada.
- **Causa raiz:** `useDividends` não expõe `walletId`; chamadas de `usePositions`/`useDividends` na camada de apresentação omitem o `walletId` que já está disponível via `useWallets`.
- **Correção sugerida:** propagar `walletId` por `useDividends` (assinatura + query key + `listPositions`) e passar `walletId` nos chamadores, espelhando o fix de escopo já existente em `usePerformance`/`useDashboard`/`useWealthHistory`.
