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
})

describe('positionService.findAssetByTicker', () => {
  it('devolve null para ticker fora do catálogo', async () => {
    supabaseMock.on('assets', () => ({ data: null, error: null }))

    await expect(positionService.findAssetByTicker('PETR99')).resolves.toBeNull()
    expect(supabaseMock.callArgs('assets', 'eq')).toEqual([['ticker', 'PETR99']])
  })

  it('normaliza o ticker para maiúsculas antes de consultar', async () => {
    supabaseMock.on('assets', () => ({
      data: { ticker: 'PETR4', name: 'Petrobras PN', type: 'stock_br', currency: 'BRL' },
      error: null,
    }))

    await positionService.findAssetByTicker(' petr4 ')

    expect(supabaseMock.callArgs('assets', 'eq')).toEqual([['ticker', 'PETR4']])
  })
})
