import type {
  AssetClassKey,
  AssetClassSlice,
  AssetType,
  CompositionSummary,
  PositionRow,
} from './types'

/**
 * Composição da carteira por classe de ativo e exposição internacional.
 *
 * Fonte única: os cards do Épico 3 reusam exatamente estas regras (rótulos,
 * cores, ordem, conjunto de classes internacionais e a agregação). Duplicar
 * qualquer parte disso dentro de um componente é o caminho garantido para duas
 * telas do mesmo app discordarem sobre quanto do patrimônio está no exterior.
 *
 * A função é pura e consome as linhas já derivadas por `derivePositionRows`:
 * `marketValueBRL` chega em BRL, com a conversão USD e as guardas de valor já
 * resolvidas. Recalcular aqui seria arriscar divergir do card de patrimônio.
 */

/**
 * Rótulo de cada classe do catálogo, em pt-BR.
 *
 * `Record<AssetType, string>` de propósito: acrescentar um valor ao enum
 * `public.asset_type` sem dar nome a ele passa a ser erro de build, não uma
 * fatia sem rótulo na tela.
 */
export const ASSET_CLASS_LABEL: Record<AssetType, string> = {
  stock_br: 'Ações BR',
  fii: 'FIIs',
  bdr: 'BDRs',
  stock_us: 'Stocks US',
  reit: 'REITs',
  crypto: 'Cryptos',
}

/** Bucket das posições avaliadas cuja classe não veio no catálogo. */
export const UNKNOWN_ASSET_CLASS = 'unknown'

export const UNKNOWN_ASSET_CLASS_LABEL = 'Outros'

/**
 * Ordem de exibição das classes — a mesma da definição do requisito (Ações BR,
 * FIIs, BDRs, Stocks US, REITs, Cryptos). Fixa e não por valor: uma legenda que
 * se reordena a cada oscilação de preço obriga o usuário a reencontrar a classe
 * que estava lendo.
 */
export const ASSET_CLASS_ORDER: readonly AssetType[] = [
  'stock_br',
  'fii',
  'bdr',
  'stock_us',
  'reit',
  'crypto',
]

/**
 * Classes que compõem a exposição ao exterior.
 *
 * Decidido por CLASSE e não por moeda: BDR é negociado em BRL na B3 e ainda
 * assim é exposição a empresa estrangeira, enquanto filtrar por `currency`
 * deixaria o BDR de fora e inflaria a fatia "nacional".
 */
export const INTERNATIONAL_TYPES: readonly AssetType[] = ['bdr', 'stock_us', 'reit', 'crypto']

/**
 * Cor de cada classe na pizza e no marcador da legenda.
 *
 * Todas do nível 400 do Tailwind: sobre o fundo do card (`dark-surface`,
 * #1e293b) ficam acima de 5:1, com folga sobre o mínimo de 3:1 exigido para
 * elemento gráfico (WCAG 1.4.11), e são distinguíveis entre si. A cor nunca é o
 * único portador da informação — a legenda textual repete classe, valor e
 * percentual.
 */
export const ASSET_CLASS_COLOR: Record<AssetType, string> = {
  stock_br: '#38bdf8',
  fii: '#4ade80',
  bdr: '#facc15',
  stock_us: '#a78bfa',
  reit: '#fb923c',
  crypto: '#f472b6',
}

export const UNKNOWN_ASSET_CLASS_COLOR = '#94a3b8'

/** Ordem completa, com o bucket de classe desconhecida sempre no fim. */
const DISPLAY_ORDER: readonly AssetClassKey[] = [...ASSET_CLASS_ORDER, UNKNOWN_ASSET_CLASS]

export function assetClassLabel(key: AssetClassKey): string {
  return key === UNKNOWN_ASSET_CLASS ? UNKNOWN_ASSET_CLASS_LABEL : ASSET_CLASS_LABEL[key]
}

export function assetClassColor(key: AssetClassKey): string {
  return key === UNKNOWN_ASSET_CLASS ? UNKNOWN_ASSET_CLASS_COLOR : ASSET_CLASS_COLOR[key]
}

/** Classe desconhecida não é afirmada como internacional — não há base. */
export function isInternationalClass(key: AssetClassKey): boolean {
  return key !== UNKNOWN_ASSET_CLASS && INTERNATIONAL_TYPES.includes(key)
}

interface ClassBucket {
  valueBRL: number
  topTicker: string
  topValue: number
}

/** Composição sem nada avaliado: lacuna, não fatias de 0%. */
function emptyComposition(): CompositionSummary {
  return { slices: [], totalBRL: 0, internationalPercent: 0, internationalValueBRL: 0 }
}

/**
 * Agrega as linhas derivadas por classe.
 *
 * `totalBRL` vem do pai (`derivePositionRows`) em vez de ser somado aqui: é o
 * mesmo número do card de patrimônio, então os percentuais são, por construção,
 * proporções do total que o usuário está vendo ao lado.
 *
 * Posição sem `marketValueBRL` não entra em fatia nenhuma nem no denominador —
 * é lacuna, não R$ 0. Total não positivo (nenhuma cotação chegou) devolve
 * composição vazia, o que evita a divisão por zero e deixa a decisão de exibir
 * lacuna para quem renderiza.
 */
export function deriveComposition(rows: PositionRow[], totalBRL: number): CompositionSummary {
  if (!Number.isFinite(totalBRL) || totalBRL <= 0) return emptyComposition()

  const buckets = new Map<AssetClassKey, ClassBucket>()

  for (const row of rows) {
    const value = row.marketValueBRL
    // Exatamente o critério que o pai usou para somar no total: assim a soma
    // das fatias é o total, e os percentuais fecham em 100%.
    if (value === null || !Number.isFinite(value)) continue

    const key: AssetClassKey = row.type ?? UNKNOWN_ASSET_CLASS
    const bucket = buckets.get(key)

    if (!bucket) {
      buckets.set(key, { valueBRL: value, topTicker: row.ticker, topValue: value })
      continue
    }

    bucket.valueBRL += value

    // Desempate alfabético: com dois tickers de mesmo valor, o "principal" não
    // pode depender da ordem em que o banco devolveu as linhas — mudaria de
    // render em render sem nada ter mudado na carteira.
    const isBigger =
      value > bucket.topValue ||
      (value === bucket.topValue && row.ticker.localeCompare(bucket.topTicker, 'pt-BR') < 0)

    if (isBigger) {
      bucket.topTicker = row.ticker
      bucket.topValue = value
    }
  }

  const slices: AssetClassSlice[] = []
  let internationalValueBRL = 0

  for (const key of DISPLAY_ORDER) {
    const bucket = buckets.get(key)
    // Classe sem posição não aparece — nem na pizza nem na legenda.
    if (!bucket) continue

    slices.push({
      type: key,
      label: assetClassLabel(key),
      valueBRL: bucket.valueBRL,
      percent: (bucket.valueBRL / totalBRL) * 100,
      topTicker: bucket.topTicker,
    })

    if (isInternationalClass(key)) internationalValueBRL += bucket.valueBRL
  }

  return {
    slices,
    totalBRL,
    internationalValueBRL,
    internationalPercent: (internationalValueBRL / totalBRL) * 100,
  }
}
