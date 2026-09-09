import { supabase } from '../../../shared/services/supabaseClient'
import { shiftIsoDate } from '../../../shared/utils/isoDate'
import { Asset, LatestQuote, NewPosition, Position, PositionWithAsset } from '../types'

/** Limite de posições do MVP (NFR de performance do Épico 2). */
const POSITIONS_LIMIT = 50

/** Sugestões exibidas no autocomplete de ticker. */
const ASSET_SEARCH_LIMIT = 8

/**
 * Janela de busca da cotação, em dias de calendário.
 *
 * É o que impede a consulta de arrastar os 12 meses de série de até 50 tickers
 * só para usar o último ponto de cada um. Um ativo sem fechamento na janela
 * fica sem cotação e a linha mostra lacuna — resultado correto para US, REIT e
 * cripto, que ainda não têm refresh agendado.
 */
const QUOTE_WINDOW_DAYS = 10

const ASSET_COLUMNS = 'ticker, name, type, currency'

const POSITION_COLUMNS =
  'id, user_id, ticker, quantity, average_price, acquisition_date, created_at, updated_at'

const QUOTE_COLUMNS = 'ticker, date, close, source, updated_at'

/**
 * Remove os metacaracteres da sintaxe de filtro do PostgREST antes de
 * interpolar o termo em `.or(...)`. Sem isso, uma vírgula ou parêntese
 * digitados pelo usuário viram sintaxe de filtro, não texto de busca.
 *
 * `%` e `_` saem porque são os dois curingas de ILIKE: `%` casa qualquer
 * sequência e `_` casa exatamente um caractere. Deixar o `_` passar mantinha
 * o curinga de um caractere aberto mesmo com o `%` bloqueado.
 */
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,.()%*_\\"']/g, ' ').trim()
}

/**
 * Tickers em maiúsculas, sem vazios e sem repetição, em ordem alfabética.
 *
 * A ordem estável importa fora daqui: é ela que faz a query key das cotações
 * ser a mesma para a mesma carteira, em vez de mudar a cada reordenação da
 * lista e refazer a consulta.
 */
export function normalizeTickers(tickers: string[]): string[] {
  const unique = new Set<string>()

  for (const ticker of tickers) {
    const normalized = typeof ticker === 'string' ? ticker.trim().toUpperCase() : ''
    if (normalized) unique.add(normalized)
  }

  return [...unique].sort()
}

/**
 * Fechamento mais recente por ticker.
 *
 * A consulta já vem ordenada por `(ticker, date desc)`, então a primeira
 * ocorrência de cada ticker é a mais recente. Ainda assim a escolha é feita
 * comparando a data: se a ordenação do servidor mudar, o pior caso passa a ser
 * "mesma resposta", e não "cotação antiga exibida como atual".
 */
function pickLatestPerTicker(rows: LatestQuote[]): LatestQuote[] {
  const latest = new Map<string, LatestQuote>()

  for (const row of rows) {
    if (!row?.ticker) continue
    if (typeof row.date !== 'string' || !row.date) continue

    const current = latest.get(row.ticker)
    if (!current || row.date > String(current.date)) latest.set(row.ticker, row)
  }

  return [...latest.values()]
}

export const positionService = {
  /** Posições do usuário, com o ativo do catálogo embutido pela FK. */
  async listPositions(userId: string): Promise<PositionWithAsset[]> {
    const { data, error } = await supabase
      .from('positions')
      .select(`${POSITION_COLUMNS}, asset:assets(${ASSET_COLUMNS})`)
      .eq('user_id', userId)
      .order('ticker', { ascending: true })
      .limit(POSITIONS_LIMIT)

    if (error) throw error
    return (data ?? []) as unknown as PositionWithAsset[]
  },

  /**
   * Último fechamento de cada ticker informado, dentro da janela de
   * `QUOTE_WINDOW_DAYS` dias.
   *
   * Uma consulta só, sem `DISTINCT ON` — que o PostgREST não expõe. A ordem
   * `(ticker, date desc)` é servida pelo índice `price_history_ticker_date_idx`
   * e a redução para uma linha por ticker acontece no cliente.
   *
   * RLS de `price_history` libera SELECT apenas para `authenticated`; sem
   * sessão a resposta viria vazia, e é o `enabled` do hook que evita a ida.
   */
  async listLatestQuotes(tickers: string[], reference: Date = new Date()): Promise<LatestQuote[]> {
    const wanted = normalizeTickers(tickers)
    if (wanted.length === 0) return []

    const { data, error } = await supabase
      .from('price_history')
      .select(QUOTE_COLUMNS)
      .in('ticker', wanted)
      .gte('date', shiftIsoDate(-QUOTE_WINDOW_DAYS, reference))
      .order('ticker', { ascending: true })
      .order('date', { ascending: false })
      // Teto que não pode truncar dado real: `(ticker, date)` é único, então a
      // janela admite no máximo `QUOTE_WINDOW_DAYS + 1` linhas por ticker.
      // Sem ele, o limite default do PostgREST decidiria por nós.
      .limit(wanted.length * (QUOTE_WINDOW_DAYS + 1))

    if (error) throw error
    return pickLatestPerTicker((data ?? []) as unknown as LatestQuote[])
  },

  /** Insere a posição amarrando `user_id` à sessão, nunca ao formulário. */
  async addPosition(userId: string, position: NewPosition): Promise<Position> {
    const { data, error } = await supabase
      .from('positions')
      .insert({
        user_id: userId,
        ticker: position.ticker,
        quantity: position.quantity,
        average_price: position.average_price,
        acquisition_date: position.acquisition_date,
      })
      .select(POSITION_COLUMNS)
      .single()

    if (error) throw error
    return data as unknown as Position
  },

  /**
   * Ativo do catálogo pelo ticker exato. Devolve `null` quando não existe —
   * é o que produz "Ativo não encontrado" antes de qualquer INSERT, para que
   * a FK nunca seja violada.
   *
   * O filtro `active = true` é o mesmo de `searchAssets`, e por isso: sem ele,
   * um ativo delistado ficava invisível no autocomplete e ainda assim
   * cadastrável digitando o ticker exato. Os dois caminhos precisam concordar
   * sobre o que é catálogo válido.
   */
  async findAssetByTicker(ticker: string): Promise<Asset | null> {
    const { data, error } = await supabase
      .from('assets')
      .select(ASSET_COLUMNS)
      .eq('ticker', ticker.trim().toUpperCase())
      .eq('active', true)
      .maybeSingle()

    if (error) throw error
    return (data as unknown as Asset | null) ?? null
  },

  /** Busca no catálogo por ticker ou nome, para o autocomplete. */
  async searchAssets(term: string): Promise<Asset[]> {
    const sanitized = sanitizeSearchTerm(term)
    if (!sanitized) return []

    const { data, error } = await supabase
      .from('assets')
      .select(ASSET_COLUMNS)
      .eq('active', true)
      .or(`ticker.ilike.%${sanitized}%,name.ilike.%${sanitized}%`)
      .order('ticker', { ascending: true })
      .limit(ASSET_SEARCH_LIMIT)

    if (error) throw error
    return (data ?? []) as unknown as Asset[]
  },
}
