import type { AssetType } from '../../modules/portfolio/types'
import contract from './contract.json'

export const INDICATOR_IDS = ['pl', 'pvp', 'roe', 'dy', 'debt_equity', 'net_margin'] as const
export type IndicatorId = typeof INDICATOR_IDS[number]
export const INDICATOR_OPERATORS = ['lt', 'lte', 'gt', 'gte', 'between'] as const
export const INDICATOR_LABELS: Record<IndicatorId, string> = {
  pl: 'P/L', pvp: 'P/VP', roe: 'ROE (%)', dy: 'DY (%)', debt_equity: 'Dívida/PL', net_margin: 'Margem Líquida (%)',
}
const equities: AssetType[] = ['stock_br', 'stock_us', 'bdr']
/** Existing raw values and thresholds are preserved. Debt/PL is Yahoo percentage. */
export const INDICATOR_CATALOG = Object.fromEntries(INDICATOR_IDS.map(id => [id, {
  label: INDICATOR_LABELS[id],
  unit: contract[id].unit,
  classes: [...equities, ...(['pvp', 'dy'].includes(id) ? ['fii', 'reit'] as AssetType[] : [])],
  operators: INDICATOR_OPERATORS,
  alertOperators: ['gte', 'lte'] as const,
  sourceField: 'source', referenceField: 'reference_date',
  requiredSource: contract[id].requiredSource,
}])) as Record<IndicatorId, {
  label: string; unit: 'multiple' | 'percent'; classes: AssetType[];
  operators: typeof INDICATOR_OPERATORS; alertOperators: readonly ['gte', 'lte'];
  sourceField: string; referenceField: string; requiredSource: string | null;
}>
export function supportsIndicator(id: IndicatorId, type: AssetType) {
  return INDICATOR_CATALOG[id].classes.includes(type)
}

/** Display raw catalog units; never rescale a stored value or threshold. */
export function formatIndicatorValue(id: IndicatorId, value: number | null, maximumFractionDigits = 4): string {
  if (value === null || !Number.isFinite(value)) return 'Indisponível'
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits })}${INDICATOR_CATALOG[id].unit === 'percent' ? '%' : ''}`
}

/** Read raw units without converting user thresholds or silently inventing a source. */
export function indicatorValue(row: Partial<Record<IndicatorId, number | null>> & { source?: string | null } | null, id: IndicatorId, type?: AssetType | null): number | null {
  if (!row || (type && !supportsIndicator(id, type)) || row.source === 'seed' || row.source === 'synthetic') return null
  const requiredSource = INDICATOR_CATALOG[id].requiredSource
  if (requiredSource && row.source !== requiredSource) return null
  const value = row[id]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export const INDICATOR_EXPLANATIONS: Record<IndicatorId, { meaning: string; formula: string; context: string }> = {
  dy: { meaning: 'Dividend Yield: relaciona os proventos por ação ao preço da ação.', formula: 'Proventos por ação no período ÷ cotação × 100.', context: 'É um percentual histórico; distribuições extraordinárias e quedas de preço podem elevar o DY. Não garante pagamentos futuros.' },
  pl: { meaning: 'Preço/Lucro: compara o preço da ação ao lucro por ação.', formula: 'Cotação ÷ lucro por ação.', context: 'É um múltiplo, não um percentual. Prejuízo ou lucro excepcional pode tornar a comparação pouco útil.' },
  pvp: { meaning: 'Preço/Valor Patrimonial: compara o preço ao patrimônio contábil por ação ou cota.', formula: 'Cotação ÷ valor patrimonial por ação/cota.', context: '1 significa preço igual ao patrimônio contábil por unidade. Abaixo de 1 não prova, sozinho, que o ativo está barato.' },
  roe: { meaning: 'Retorno sobre o patrimônio: relaciona o lucro ao patrimônio líquido.', formula: 'Lucro líquido ÷ patrimônio líquido × 100.', context: 'É um percentual. Patrimônio muito baixo ou negativo pode distorcer a leitura; período e convenção dependem da fonte.' },
  debt_equity: { meaning: 'Dívida/Patrimônio Líquido: relaciona o endividamento ao patrimônio da empresa.', formula: 'Dívida ÷ patrimônio líquido; a unidade depende da fonte.', context: 'No Yahoo, o valor vem em percentual: 76 significa 76% (0,76 vez). Um limite de 1,5 compara com 1,5%, não 1,5 vez, quando essa é a fonte. Os limites existentes não são convertidos automaticamente.' },
  net_margin: { meaning: 'Margem líquida: mostra a parcela da receita que se transforma em lucro líquido.', formula: 'Lucro líquido ÷ receita × 100.', context: 'É um percentual. Itens extraordinários e diferenças entre setores influenciam a comparação.' },
}
