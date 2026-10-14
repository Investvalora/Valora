# Implementation Plan — Desktop Novo Fluxo

> Branch: `feature/desktop-novo-fluxo-figma`
> Figma: https://www.figma.com/design/Oo5BfunlPb6XxsxHuphAZq/VALORA — página "Novo fluxo"
> Verificação final: `pnpm run build` em `c:\Users\Samuel Leite\wkspaces\Valora` sem erros TypeScript.

---

## Design decisions (registradas aqui, não no código)

- **Sub-rotas via React Router nested routes** (não useState por tab) — os designs mostram URLs distintas por tab (`/ativos/posicoes`, `/ativos/composicao`, etc.), e React Router aninhado é o padrão já usado no projeto.
- **AtivosPage / DesempenhoPage / AnalisePage viram shells** (apenas header + SubTabBar + `<Outlet>`) — o conteúdo de cada tab vai para um componente-folha próprio, o que mantém os arquivos existentes sem apagá-los e distribui responsabilidade.
- **KpiBarAtivos** é um componente novo específico para a barra horizontal com 4 colunas + "Resumo completo" — não usa KpiCard (orientação horizontal diferente do layout em coluna dos KpiCards existentes).
- **ResumoCarteiraPopover** usa posicionamento absoluto relativo ao botão "Resumo completo" (não é modal) — o Figma mostra um painel lateral que flutua sobre a tabela, não bloqueia a navegação.
- **Gráficos**: Recharts já instalado (^2.12.7). PerformanceLineChart e AportesBarChart já existem e são reutilizados via React.lazy. Nenhuma nova biblioteca de gráficos.
- **WalletMorphSelector dropdown**: substitui o visual existente (verificar src/shared/components/WalletMorphSelector.tsx antes de escrever) mantendo lógica de selectWallet do hook useWallets.
- **QuickTransactionModal**: atualiza o design do modal global (botão "Lançamento" da TopBar) para o novo layout — não toca AddTransactionModal usado nas linhas da tabela de lançamentos.

---

## Ordem de dependência

```
FEAT-001 (roteamento + componentes base)
  └── FEAT-002 (sub-tabs Ativos)     ← depende de FEAT-001
  └── FEAT-003 (Desempenho + Análise) ← depende de FEAT-001
FEAT-004 (Modal + seletor carteiras)  ← independente, pode rodar após FEAT-001
```

---

- [ ] 1. **FEAT-001 — Sub-roteamento e componentes de infraestrutura**

      Cria SubTabBar, KpiBarAtivos, ResumoCarteiraPopover e reestrutura routes.tsx com rotas aninhadas. Transforma AtivosPage, DesempenhoPage e AnalisePage em shells com `<Outlet>`.

      **Arquivos a criar:**
      - `src/modules/ativos/components/SubTabBar.tsx`
      - `src/modules/ativos/components/KpiBarAtivos.tsx`
      - `src/modules/ativos/components/ResumoCarteiraPopover.tsx`

      **Arquivos a modificar:**
      - `src/routes.tsx` — adicionar sub-rotas para ativos/*, desempenho/*, analise/*
      - `src/modules/ativos/components/AtivosPage.tsx` — transformar em shell
      - `src/modules/desempenho/components/DesempenhoPage.tsx` — transformar em shell
      - `src/modules/analise/components/AnalisePage.tsx` — transformar em shell

      **Detalhes SubTabBar:**
      ```tsx
      // Props: tabs: { label: string; to: string }[]
      // NavLink com end, underline azul 2px no ativo, texto white no ativo / white/40 inativo
      // border-b border-white/[0.08], cada link pb-2.5 text-sm font-medium
      ```

      **Detalhes KpiBarAtivos:**
      ```tsx
      // Props: patrimonio, valorInvestido, ganhoCapital (number|null), ativos (number), onResumo
      // Layout: rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-6 py-4
      // 4 seções separadas por border-r border-white/[0.08]: label text-xs text-white/50, valor text-sm font-semibold text-white
      // Ganho de capital: text-nf-green se >= 0, text-nf-pink se negativo
      // Rightmost: link 'Resumo completo >' text-nf-blue text-sm cursor-pointer
      ```

      **Detalhes ResumoCarteiraPopover:**
      ```tsx
      // Popover absoluto z-50, w-[340px], bg-[#1C1C1C] border border-white/[0.1] rounded-2xl shadow-2xl p-5
      // createPortal para ficar fora do overflow da tabela
      // Linha "Patrimônio total" — valor direita
      // Linha "Lucro total" — valor verde, subtexto "Ganho de capital R$ X · Dividendos R$ X"
      // Linha "Proventos recebidos (12M)"
      // Linha "Rentabilidade" — verde
      // Link "Ver detalhes em Desempenho →" (text-nf-blue)
      // Props: patrimonio, valorInvestido, ganhoCapital, proventos12m, dividendos, rentabilidadePct, onClose
      ```

      **routes.tsx — estrutura nova:**
      ```tsx
      // Ativos
      <Route path="ativos" element={<AtivosPage />}>
        <Route index element={<Navigate to="posicoes" replace />} />
        <Route path="posicoes" element={<AtivosPosicoes />} />
        <Route path="composicao" element={<AtivosComposicao />} />
        <Route path="lancamentos" element={<AtivosLancamentos />} />
      </Route>
      // Desempenho
      <Route path="desempenho" element={<DesempenhoPage />}>
        <Route index element={<Navigate to="rentabilidade" replace />} />
        <Route path="rentabilidade" element={<DesempenhoRentabilidade />} />
        <Route path="proventos" element={<DesempenhoProventos />} />
      </Route>
      // Analise
      <Route path="analise" element={<AnalisePage />}>
        <Route index element={<Navigate to="score" replace />} />
        <Route path="score" element={<AnaliseScore />} />
        <Route path="alertas" element={<AnaliseAlertas />} />
      </Route>
      ```
      Usar React.lazy para os componentes-folha. Envolver em `<Suspense fallback={<div className="p-8 text-white/40 animate-pulse text-sm">Carregando…</div>}>` no Outlet.

      **AtivosPage shell:**
      ```tsx
      // Manter: import SubTabBar, Outlet, useLocation para derivar título dinâmico
      // Remover: toda a lógica de dados (usePositions, hooks, derivações) — vai para AtivosPosicoes
      // Manter: botões Filtrar/Exportar CSV no header (estéticos por enquanto)
      // Breadcrumb: botão '< Ativos' (link para /ativos, text-white/50 hover:text-white text-sm)
      // Título dinâmico via useLocation pathname.includes
      // SubTabBar tabs: [{label:'Visão geral',to:'/ativos'}, {label:'Posições',to:'/ativos/posicoes'}, {label:'Composição',to:'/ativos/composicao'}, {label:'Lançamentos',to:'/ativos/lancamentos'}]
      ```

      Verify: `pnpm run build` — sem erros TypeScript. `pnpm run test:run` — testes passam.

---

- [ ] 2. **FEAT-002 — Sub-tabs Ativos (Posições, Composição, Lançamentos)**

      Depende de FEAT-001. Cria os 3 componentes-folha das sub-rotas de Ativos. Reutiliza toda a lógica de dados já em AtivosPage.tsx e LancamentosPage.tsx. Atualiza AtivosTable com colunas extras.

      **Arquivos a criar:**
      - `src/modules/ativos/components/AtivosPosicoes.tsx`
      - `src/modules/ativos/components/AtivosComposicao.tsx`
      - `src/modules/ativos/components/AtivosLancamentos.tsx`

      **Arquivos a modificar:**
      - `src/modules/ativos/components/AtivosTable.tsx` — colunas extras no modo expandido

      **AtivosPosicoes.tsx — estrutura:**
      ```tsx
      // Copiar hooks e derivações de AtivosPage.tsx atual (tudo entre os comentários "dados brutos" e "render")
      // usePositions, useDashboard, useLatestQuotes, useDividendTotals, useBazin, useFundamentals
      // derivePositionRows → enrichPositionRows → sorted rows
      // deriveComposition para passar para AtivosComposicao também (não aqui)
      // KpiBarAtivos com: derived.totalBRL, valorInvestido, lucroPrejuizo, positionCount
      // Estado isResumoOpen, ao clicar 'Resumo completo' abre ResumoCarteiraPopover
      // Dados popover: totalBRL, valorInvestido, lucroPrejuizo, proventos12m (dashboard.proventos12mBRL), dividendos, rentabilidadePct
      // PanelCard 'Meus ativos (N)' com AtivosTable rows={rows} totalBRL={derived.totalBRL}
      ```

      **AtivosTable.tsx — colunas extras:**
      ```tsx
      // No GroupHeader colapsado: Ativo | Ativos | Valor total | Variação | % carteira (como já está)
      // No AssetRow (expandido): adicionar após DY:
      //   Proventos (12M): row.proventos12m (de dividendTotals Map) — text-nf-green se > 0
      //   Payout%: row.payoutPct ou calcular (proventos12m / (dividendTotals / marketValue * 100))
      //   P/L: row.pl de EnrichedPositionRow.fundamentals
      //   P/VP: row.pvp de EnrichedPositionRow.fundamentals
      //   DY%: já existe
      // Verificar src/modules/portfolio/enrichPositionRows.ts para confirmar campos disponíveis
      // Adicionar coluna 'Cotação' com ícone info (Info icon 12px text-white/40)
      // min-w-[1100px] na tabela
      ```

      **AtivosComposicao.tsx — estrutura:**
      ```tsx
      // Mesmos hooks de dados que AtivosPosicoes (ou receber via Context — preferir re-usar hooks localmente para simplicidade)
      // deriveComposition(derived.rows, derived.totalBRL) → composition.slices
      // KpiBarAtivos mesmos dados
      // PanelCard 'Composição por classe':
      //   toggle segmentado (3 botões, bg-[#2A2A2A] inativo, bg-[#3A3A3A] ativo, rounded-lg)
      //   switch 'Exibir posição ideal' (input checkbox com visual pill bg-nf-blue quando checked)
      //   flex: AlocacaoDonut (w-[260px]) com label central via prop centerLabel="Patrimônio\nR$ X"
      //   lista à direita: composition.slices.map(s => row com dot colorido, nome, badge 'Internacional' (se stock_us/etf_us/reit/crypto), 'Maior posição: X', valor, %, barra)
      // AlocacaoDonut já aceita slices — verificar se aceita centerLabel ou se precisa atualizar props
      ```

      **AtivosLancamentos.tsx — estrutura:**
      ```tsx
      // useWallets, useAllTransactions, usePositions — copiar de LancamentosPage.tsx
      // KpiBarAtivos mesmos dados (precisará dos hooks de positions/dashboard também)
      // PanelCard 'Consolidação de aportes': AportesBarChart lazy, filtros período, dropdown tipo
      //   (extrair lógica de período de LancamentosPage, copiar PERIOD_OPTIONS e useMemo de chartData)
      // PanelCard 'Renda variável (N)': busca + tabela
      //   Reutilizar TxnRow de LancamentosPage.tsx: extrair o componente TxnRow para
      //   src/modules/portfolio/components/TxnRow.tsx para ser importado em ambos
      //   Botão '+ Lançamento' no header abre AddTransactionModal sem ticker pré-selecionado
      ```

      Verify: `pnpm run build` — sem erros TypeScript.

---

- [ ] 3. **FEAT-003 — Sub-tabs Desempenho (Rentabilidade, Proventos) e Análise (Score, Alertas)**

      Depende de FEAT-001. Independente de FEAT-002. Cria 4 novos componentes-folha.

      **Arquivos a criar:**
      - `src/modules/desempenho/components/DesempenhoRentabilidade.tsx`
      - `src/modules/desempenho/components/DesempenhoProventos.tsx`
      - `src/modules/analise/components/AnaliseScore.tsx`
      - `src/modules/analise/components/AnaliseAlertas.tsx`

      **Arquivos a modificar (opcional):**
      - `src/modules/alerts/hooks/useAlertMutations.ts` — adicionar useCreatePriceAlert se não existir

      **DesempenhoRentabilidade.tsx:**
      ```tsx
      // Cabeçalho: título 'Rentabilidade' + botão 'Exportar CSV' (ícone Download outline)
      // KPI bar horizontal (inline, não KpiBarAtivos pois layout ligeiramente diferente):
      //   border border-white/[0.08] rounded-xl bg-[#1A1A1A] px-6 py-4 flex items-center gap-0
      //   col 1: 'Rentabilidade total' / perf.summary.portfolioReturnPct verde/rosa
      //   col 2: 'Últimos 12M' / dashboard.variacaoPct ou '—'
      //   col 3: 'Lucro total' / (totalBRL - valorInvestido) verde
      //   link 'Resumo completo >'
      // usePerformance(period), useDashboard, useWallets
      // PanelCard 'Rentabilidade comparada com índices':
      //   dropdown 'Desde o início' (period select), dropdown 'Todos os tipos' (classe filter)
      //   legenda inline com séries (Rentabilidade azul, CDI amarelo, IPCA cinza, IFIX cinza, IBOV cinza, SMLL cinza)
      //   PerformanceLineChart lazy — reutilizar chartSeries de DesempenhoPage
      // PanelCard 'Rentabilidade' (tabela mensal):
      //   Colunas: Ano | Jan-Dez | Retorno anual | Acumulado
      //   TabelaMensal já existe mas pode precisar de ajuste de estilos (positivo verde, negativo rosa)
      //   Verificar src/modules/desempenho/components/TabelaMensal.tsx
      // PanelCard 'Rentabilidade por ativo':
      //   botão 'Exportar CSV' no header
      //   Verificar src/modules/performance/hooks/usePerformance.ts para campo assetReturns
      //   Tabela: avatar circular inicial (bg colorido por assetClassColor(type)), Ativo, Classe badge, Valor atual, Rentabilidade, vs CDI, Desempenho (barra colorida)
      //   Se assetReturns não existir no hook, mostrar tabela vazia com "Em breve"
      ```

      **DesempenhoProventos.tsx:**
      ```tsx
      // useDividends(period), useWallets
      // KPI bar: Proventos recebidos (12M) | Média mensal | Maior mês (calcular de monthlyBars)
      //   Média mensal = sum / count de meses com valor > 0
      //   Maior mês = max(monthlyBars) com label "R$ X · mês/ano"
      // PanelCard 'Proventos por mês': ProventosChart lazy (bars = monthlyBars)
      // PanelCard 'Proventos recebidos (N)':
      //   busca por ticker (useState search, filtrar divs.rows)
      //   dropdown 'Todos os tipos' (useState typeFilter, filtrar por type)
      //   tabela: Ticker | Tipo (badge 'DIVIDEND' bg-nf-blue/15 text-nf-blue rounded-md px-2 py-0.5 text-xs) | Data com | Data pagamento | Valor/cota | Quantidade | Valor total (text-nf-green)
      //   dados de useDividends().rows (DividendRow do tipo src/modules/dividends/types.ts)
      ```

      **AnaliseScore.tsx:**
      ```tsx
      // useScoreRules, useScorePreferences, useUpsertScorePreferences, useDeleteScoreRule
      // Cabeçalho: breadcrumb '< Análise' (link /analise), 'Score Fundamentalista' + botão '+ Nova regra'
      // PanelCard 'Regras de score (N)':
      //   Tabela: Nome | Métrica (METRIC_LABELS[rule.metric]) | Condição (formatThreshold) | Pontos (+N text-nf-green) | 'Usar este score' (btn outline rounded-full px-3 py-1 text-xs border-white/[0.15]) | 'Editar' (text text-white/60) | 'Excluir' (text text-nf-pink)
      //   'Usar este score' → upsertPrefs.mutate({ default_score_rule_id: rule.id })
      //   'Editar' → openModal(rule)
      //   'Excluir' → deleteRule.mutate(rule.id)
      // Modal '+ Nova regra': reutilizar Modal + ScoreRuleForm existentes (padrão de AnalisePage.tsx)
      // Estado: isModalOpen, editingRule
      ```

      **AnaliseAlertas.tsx:**
      ```tsx
      // useAlerts, useUpdateAlertStatus, useGenerateAlerts
      // Cabeçalho: breadcrumb '< Análise', 'Alertas' + botão '+ Alerta de preço' + 'Atualizar alertas'
      // Form inline (showAlertForm: useState):
      //   campo 'Ativo' (input tipo texto, toUpperCase)
      //   radio group 'Abaixo de' / 'Acima de' (conditionType: 'below' | 'above')
      //   input 'Preço-alvo' (number, step="any")
      //   botões 'Criar alerta' (bg-blue-600 rounded-full) e 'Cancelar'
      //   verificar alertsService.ts para método createPriceAlert; se não existir, criar no serviço
      // Lista de cards (um por linha):
      //   card bg-[#1A1A1A] border border-white/[0.08] rounded-xl p-5
      //   linha superior: ícone tipo (BellRing para price_target, TrendingUp para overvalued) + ticker + badge tipo + badge status (Novo azul / Ignorado cinza)
      //   título bold text-white, descrição text-sm text-white/60, data text-xs text-white/40
      //   cards Novo: botões 'Marcar como lido' + 'Ignorar'
      //   Ordenação: novo primeiro, ignorado por último (como em AlertasCol)
      // Reutilizar ALERT_CONFIG de AlertasCol.tsx ou copiar para utils local
      ```

      Verify: `pnpm run build` — sem erros TypeScript. `pnpm run test:run`.

---

- [ ] 4. **FEAT-004 — Modal de lançamento (novo design) e dropdown seletor de carteiras**

      Independente de FEAT-002 e FEAT-003. Pode rodar em paralelo com ambos (mas execução é sequencial).

      **Arquivos a modificar:**
      - `src/modules/portfolio/components/QuickTransactionModal.tsx` — novo design
      - `src/shared/components/WalletMorphSelector.tsx` (ou arquivo que renderiza o seletor de carteiras na TopBar)

      **QuickTransactionModal.tsx — novo layout:**
      ```tsx
      // Manter: Modal, useAddTransaction, usePositions, useWallets, positionService
      // Novo estado: assetType (AssetType | '')
      // Toggle Compra/Venda (pill):
      //   container: flex rounded-xl bg-[#2A2A2A] p-1 gap-1
      //   botão ativo: bg-[#3A3A3A] border border-white/[0.15] text-white rounded-lg
      //   botão inativo: text-white/50 rounded-lg
      // Grid 2 col gap-3:
      //   col 1: label 'Tipo de ativo', select com ASSET_CLASS_LABEL (options)
      //   col 2: label 'Ativo', input texto placeholder="PETR4" (habilitado sempre)
      //   col 1: label 'Data da transação', input type=date
      //   col 2: label 'Quantidade', input type=number
      //   col 1: label 'Preço', input type=number
      //   col 2: label 'Outros custos' + span 'OPCIONAL' text-white/30 text-xs, input type=number
      // Valor total: div justify-end: 'Valor total' text-xs text-white/50 + R$ X text-xl font-semibold
      // Botões: flex justify-between: 'Cancelar' text-white/60 hover:text-white | 'Salvar' bg-blue-600 rounded-full px-6 py-2
      // Estilo inputs: w-full rounded-xl border border-white/[0.12] bg-[#2A2A2A] px-3 py-2.5 text-sm text-white
      // Manter validação existente (ticker não vazio, qty > 0, price >= 0, positionService.findAssetByTicker)
      ```

      **WalletMorphSelector.tsx — novo dropdown:**
      ```tsx
      // Ler arquivo atual primeiro para entender estrutura existente
      // useWallets() para lista + selectedWallet + selectWallet
      // useState isOpen
      // useEffect: document.addEventListener('mousedown', handler) para fechar ao clicar fora
      // Botão trigger (como já existe): dot colorido + nome carteira + ChevronDown
      // Dropdown (absolute top-full left-0 mt-2 z-50 min-w-[240px]):
      //   bg-[#1C1C1C] border border-white/[0.1] rounded-2xl shadow-2xl py-2
      //   header: 'Carteiras' text-xs text-white/40 px-4 py-1
      //   lista wallets: map → flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/[0.05] cursor-pointer
      //     dot: w-2.5 h-2.5 rounded-full bg-[walletPalette[w.color].color]
      //     div flex-1: nome text-sm font-medium text-white + patrimônio text-xs text-white/50
      //       Patrimônio: mostrar apenas para selectedWallet (dashboard.totalBRL) — para as outras mostrar '—'
      //     Check icon 14px text-nf-blue apenas se w.id === selectedWallet.id
      //   divider: border-t border-white/[0.08] mx-2 my-1
      //   '+ Nova carteira': botão com Plus icon + texto text-sm text-nf-blue (onClick → navegar para /conta ou abrir modal de criação)
      //   'Gerenciar carteiras': botão com Settings icon + texto text-sm text-nf-blue (onClick → navegar /conta)
      // Importar walletPalette de src/modules/portfolio/walletPalette.ts
      ```

      Verify: `pnpm run build` — sem erros TypeScript. `pnpm run test:run`.

---

## Padrão visual de referência (resumo rápido)

| Elemento | Classe Tailwind |
|---|---|
| Fundo card | `bg-[#1A1A1A]` ou `bg-[#1B1B1B]` |
| Borda card | `border border-white/[0.08]` |
| Raio card | `rounded-xl` ou `rounded-[14px]` |
| Texto primário | `text-white` |
| Texto secundário | `text-white/60` ou `text-[#8F8F8F]` |
| Verde positivo | `text-nf-green` (`#4ADE80`) |
| Rosa negativo | `text-nf-pink` (`#F472B6`) |
| Azul link/ação | `text-nf-blue` (`#3B82F6`) |
| Badge FIIs | `bg-nf-pink/20 text-nf-pink` |
| Badge Ações | `bg-purple-500/20 text-purple-400` |
| Badge Stocks | `bg-blue-500/20 text-blue-400` |
| Badge ETFs | `bg-nf-green/20 text-nf-green` |
| Badge Cripto | `bg-yellow-400/20 text-yellow-400` |
| Botão primário | `bg-blue-600 rounded-full px-4 py-1.5 text-sm` |
| Botão secundário | `border border-white/10 bg-[#2A2A2A] rounded-full px-4 py-1.5 text-sm` |
| Tab ativa | `border-b-2 border-nf-blue text-white` |
| Tab inativa | `text-white/40 hover:text-white` |

---

## Notas de implementação

1. **Lógica de derivação**: toda a lógica de `derivePositionRows`, `enrichPositionRows`, `deriveComposition` deve ser executada nos componentes-folha, não no shell. O shell não importa hooks de dados.

2. **AtivosTable colunas extras**: `EnrichedPositionRow` (exportado de `src/modules/portfolio/positionRows.ts`) já contém `dy`, `pl` (via fundamentals), `pvp`. Confirmar campos disponíveis antes de escrever — se faltarem, calcular localmente na tabela.

3. **Proventos (12M) na tabela**: vem do `dividendTotals Map<string, number>` que já é calculado em AtivosPosicoes. Passar como prop `dividendTotalsByTicker` para AtivosTable ou calcular internamente via enrich.

4. **Gráfico de linha no Desempenho**: `PerformanceLineChart` espera `series: PerformanceSeries[]`. Verificar `usePerformance` para confirmar que `portfolioSeries` e `benchmarkSeries` estão disponíveis (já usado em DesempenhoPage).

5. **Rentabilidade por ativo**: verificar se `usePerformance` retorna dados por ativo. Se não retornar, exibir tabela vazia com placeholder "Em breve" sem bloquear o build.

6. **Criar alerta de preço**: verificar `src/modules/alerts/services/alertsService.ts` para método de criação. Se não existir, adicionar e criar hook `useCreatePriceAlert`.

7. **Exportar CSV**: os botões são visuais por ora. Conectar lógica real é opcional — não bloqueia o build.
