import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'

vi.mock('../../../shared/services/supabaseClient', async () => {
  const { supabaseMock } = await import('../../../test/supabaseMock')
  return { supabase: supabaseMock.client }
})

import { resetSupabaseMock, supabaseMock } from '../../../test/supabaseMock'
import { useAuthStore } from '../../auth/store'
import { quotesQueryKey, useLatestQuotes } from './useLatestQuotes'

const SESSION_USER_ID = '11111111-1111-4111-8111-111111111111'

const QUOTE_ROW = {
  ticker: 'PETR4',
  date: '2026-02-10',
  close: 34.5,
  source: 'b3_cotahist',
  updated_at: '2026-02-10T21:30:00Z',
}

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
}

/**
 * O client é criado fora do componente de propósito: instanciá-lo no corpo do
 * wrapper produziria um cache novo a cada render, e nenhuma asserção sobre cache
 * significaria coisa alguma.
 */
function wrapperFor(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

function renderQuotes(tickers: string[], queryClient = createQueryClient()) {
  return renderHook(() => useLatestQuotes(tickers), { wrapper: wrapperFor(queryClient) })
}

function signIn() {
  useAuthStore.setState({
    user: { id: SESSION_USER_ID } as User,
    session: { user: { id: SESSION_USER_ID } } as Session,
    loading: false,
  })
}

beforeEach(() => {
  resetSupabaseMock()
  signIn()
})

describe('useLatestQuotes', () => {
  it('busca as cotações dos tickers informados', async () => {
    supabaseMock.on('price_history', () => ({ data: [QUOTE_ROW], error: null }))

    const { result } = renderQuotes(['PETR4'])

    await waitFor(() => expect(result.current.data).toHaveLength(1))
    expect(result.current.data?.[0].ticker).toBe('PETR4')
  })

  /**
   * A policy de `price_history` libera SELECT só para `authenticated`: sem sessão
   * a consulta volta vazia, e vazio é indistinguível de "esses ativos não têm
   * cotação". O `enabled` impede a pergunta em vez de interpretar a resposta.
   */
  it('não consulta nada sem sessão, mesmo com tickers', async () => {
    useAuthStore.setState({ user: null, session: null, loading: false })
    supabaseMock.on('price_history', () => ({ data: [QUOTE_ROW], error: null }))

    const { result } = renderQuotes(['PETR4'])

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))
    expect(supabaseMock.chains).toHaveLength(0)
    expect(result.current.data).toBeUndefined()
  })

  it('não consulta nada quando a carteira está vazia', async () => {
    supabaseMock.on('price_history', () => ({ data: [], error: null }))

    const { result } = renderQuotes([])

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))
    expect(supabaseMock.chains).toHaveLength(0)
  })

  it('usa a chave no padrão do projeto', () => {
    expect(quotesQueryKey(['PETR4', 'VALE3'])).toEqual(['portfolio', 'quotes', ['PETR4', 'VALE3']])
  })

  /**
   * A lista de tickers chega na ordem da tela, que o usuário reordena. Sem
   * normalizar a chave, cada reordenação criaria uma entrada de cache nova e
   * repetiria a consulta para exatamente os mesmos ativos.
   */
  it('reaproveita o cache quando só a ordem dos tickers muda', async () => {
    supabaseMock.on('price_history', () => ({ data: [QUOTE_ROW], error: null }))
    const queryClient = createQueryClient()

    const first = renderQuotes(['VALE3', 'PETR4'], queryClient)
    await waitFor(() => expect(first.result.current.data).toHaveLength(1))

    const second = renderQuotes(['PETR4', 'VALE3'], queryClient)
    await waitFor(() => expect(second.result.current.data).toHaveLength(1))

    expect(supabaseMock.chainsWith('price_history', 'select')).toHaveLength(1)
  })

  it('propaga o erro para que a página avise sem apagar a lista', async () => {
    supabaseMock.on('price_history', () => ({
      data: null,
      error: { code: '08006', message: 'connection failure', details: null, hint: null },
    }))

    const { result } = renderQuotes(['PETR4'])

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
