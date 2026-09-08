import { beforeEach, describe, expect, it, vi } from 'vitest'

// `vi.mock` é elevado acima dos imports, então a factory alcança o dublê por
// import dinâmico do módulo singleton.
vi.mock('../../../shared/services/supabaseClient', async () => {
  const { supabaseMock } = await import('../../../test/supabaseMock')
  return { supabase: supabaseMock.client }
})

import { resetSupabaseMock, supabaseMock } from '../../../test/supabaseMock'
import { positionService } from './positionService'

const SESSION_USER_ID = '11111111-1111-4111-8111-111111111111'
const FORM_TICKER = 'PETR4'

/** Erro de unicidade como o PostgREST o devolve para `(user_id, ticker)`. */
const DUPLICATE_ERROR = {
  code: '23505',
  message:
    'duplicate key value violates unique constraint "positions_user_id_ticker_idx"',
  details: 'Key (user_id, ticker)=(11111111-1111-4111-8111-111111111111, PETR4) already exists.',
  hint: null,
}

beforeEach(() => {
  resetSupabaseMock()
})

describe('positionService.addPosition', () => {
  it('grava user_id da sessão e nada além das colunas da posição', async () => {
    supabaseMock.on('positions', () => ({
      data: { id: 'pos-1', user_id: SESSION_USER_ID, ticker: FORM_TICKER },
      error: null,
    }))

    await positionService.addPosition(SESSION_USER_ID, {
      ticker: FORM_TICKER,
      quantity: 100,
      average_price: 32.1,
      acquisition_date: '2026-01-15',
    })

    const [payload] = supabaseMock.insertPayloads('positions')

    expect(payload).toEqual({
      user_id: SESSION_USER_ID,
      ticker: FORM_TICKER,
      quantity: 100,
      average_price: 32.1,
      acquisition_date: '2026-01-15',
    })
    expect(payload.user_id).toBe(SESSION_USER_ID)
  })

  it('propaga o erro do Postgres com o SQLSTATE intacto, para o mapeamento por código', async () => {
    supabaseMock.on('positions', () => ({ data: null, error: DUPLICATE_ERROR }))

    await expect(
      positionService.addPosition(SESSION_USER_ID, {
        ticker: FORM_TICKER,
        quantity: 100,
        average_price: 32.1,
        acquisition_date: '2026-01-15',
      }),
    ).rejects.toMatchObject({ code: '23505' })
  })
})

describe('positionService.listPositions', () => {
  it('filtra pelo user_id recebido', async () => {
    supabaseMock.on('positions', () => ({ data: [], error: null }))

    await positionService.listPositions(SESSION_USER_ID)

    expect(supabaseMock.callArgs('positions', 'eq')).toEqual([['user_id', SESSION_USER_ID]])
  })

  // O limite é o NFR de performance do Épico 2 ("50 posições em ≤2s"): sem ele
  // a consulta traz a tabela inteira do usuário e o teto de latência deixa de
  // ter qualquer garantia.
  it('limita a consulta a 50 posições', async () => {
    supabaseMock.on('positions', () => ({ data: [], error: null }))

    await positionService.listPositions(SESSION_USER_ID)

    expect(supabaseMock.callArgs('positions', 'limit')).toEqual([[50]])
  })
})

describe('positionService.findAssetByTicker', () => {
  it('devolve null para ticker fora do catálogo', async () => {
    supabaseMock.on('assets', () => ({ data: null, error: null }))

    await expect(positionService.findAssetByTicker('PETR99')).resolves.toBeNull()
    expect(supabaseMock.callArgs('assets', 'eq')).toContainEqual(['ticker', 'PETR99'])
  })

  it('normaliza o ticker para maiúsculas antes de consultar', async () => {
    supabaseMock.on('assets', () => ({
      data: { ticker: 'PETR4', name: 'Petrobras PN', type: 'stock_br', currency: 'BRL' },
      error: null,
    }))

    await positionService.findAssetByTicker(' petr4 ')

    expect(supabaseMock.callArgs('assets', 'eq')).toContainEqual(['ticker', 'PETR4'])
  })

  // Os dois caminhos precisam concordar sobre o que é catálogo: sem este filtro
  // um ativo delistado nunca aparece no autocomplete e ainda assim é
  // cadastrável digitando o ticker exato.
  it('exige active = true, como o autocomplete', async () => {
    supabaseMock.on('assets', () => ({ data: null, error: null }))

    await positionService.findAssetByTicker('PETR4')

    expect(supabaseMock.callArgs('assets', 'eq')).toContainEqual(['active', true])
  })
})

describe('positionService.searchAssets', () => {
  it('exige active = true', async () => {
    supabaseMock.on('assets', () => ({ data: [], error: null }))

    await positionService.searchAssets('PETR')

    expect(supabaseMock.callArgs('assets', 'eq')).toContainEqual(['active', true])
  })

  /**
   * O termo é interpolado dentro de `.or(...)`, que é a própria sintaxe de
   * filtro do PostgREST: vírgula separa condições, parênteses agrupam, e `%` e
   * `_` são os curingas de ILIKE. Um termo cru transforma busca em filtro.
   *
   * A asserção é sobre o argumento exato que chega ao client, e não sobre a
   * função de saneamento: é o argumento que o banco recebe.
   */
  it('não deixa metacaractere de filtro nem curinga de ILIKE chegar ao .or()', async () => {
    supabaseMock.on('assets', () => ({ data: [], error: null }))

    await positionService.searchAssets('pe,tr(o)%br*as_x')

    const [[filter]] = supabaseMock.callArgs('assets', 'or') as [[string]]

    // Os únicos `%` presentes são os quatro do próprio padrão `ilike.%...%`.
    expect(filter.match(/%/g)).toHaveLength(4)
    expect(filter).not.toContain('_')
    expect(filter).not.toContain('(o)')
    expect(filter).not.toContain('*')
    // Vírgulas: só a que separa as duas condições `ticker` e `name`.
    expect(filter.match(/,/g)).toHaveLength(1)
    expect(filter).toBe('ticker.ilike.%pe tr o  br as x%,name.ilike.%pe tr o  br as x%')
  })

  it('não consulta o catálogo quando o termo é só metacaractere', async () => {
    supabaseMock.on('assets', () => ({ data: [], error: null }))

    await expect(positionService.searchAssets('%_*')).resolves.toEqual([])
    expect(supabaseMock.callArgs('assets', 'or')).toEqual([])
  })
})
