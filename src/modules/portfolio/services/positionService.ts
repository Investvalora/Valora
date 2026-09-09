import { supabase } from '../../../shared/services/supabaseClient'
import { Asset, NewPosition, Position, PositionWithAsset } from '../types'

/** Limite de posições do MVP (NFR de performance do Épico 2). */
const POSITIONS_LIMIT = 50

/** Sugestões exibidas no autocomplete de ticker. */
const ASSET_SEARCH_LIMIT = 8

const ASSET_COLUMNS = 'ticker, name, type, currency'

const POSITION_COLUMNS =
  'id, user_id, ticker, quantity, average_price, acquisition_date, created_at, updated_at'

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
