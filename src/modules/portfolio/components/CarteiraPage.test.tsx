import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'

vi.mock('../../../shared/services/supabaseClient', async () => {
  const { supabaseMock } = await import('../../../test/supabaseMock')
  return { supabase: supabaseMock.client }
})

import { resetSupabaseMock, supabaseMock } from '../../../test/supabaseMock'
import { useAuthStore } from '../../auth/store'
import { CarteiraPage } from './CarteiraPage'

const SESSION_USER_ID = '11111111-1111-4111-8111-111111111111'

const CATALOG_ASSET = {
  ticker: 'PETR4',
  name: 'Petrobras PN',
  type: 'stock_br',
  currency: 'BRL',
}

const CREATED_ROW = {
  id: 'pos-1',
  user_id: SESSION_USER_ID,
  ticker: 'PETR4',
  quantity: 100,
  average_price: 32.1,
  acquisition_date: '2026-01-15',
  created_at: '2026-01-15T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
  asset: CATALOG_ASSET,
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

beforeEach(() => {
  resetSupabaseMock()
  useAuthStore.setState({
    user: { id: SESSION_USER_ID } as User,
    session: { user: { id: SESSION_USER_ID } } as Session,
    loading: false,
  })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('CarteiraPage — cadastro válido (linha da matriz)', () => {
  it('fecha o modal e revalida a tabela sem recarregar a página', async () => {
    // O catálogo responde ao lookup exato e ao autocomplete.
    supabaseMock.on('assets', (chain) => {
      const isExactLookup = chain.calls.some((call) => call.method === 'maybeSingle')
      return isExactLookup
        ? { data: CATALOG_ASSET, error: null }
        : { data: [CATALOG_ASSET], error: null }
    })

    // A listagem só passa a devolver a posição depois do INSERT: é o que
    // distingue "a tabela revalidou" de "a tabela já vinha preenchida".
    let storedRows: unknown[] = []
    supabaseMock.on('positions', (chain) => {
      if (chain.calls.some((call) => call.method === 'insert')) {
        storedRows = [CREATED_ROW]
        return { data: CREATED_ROW, error: null }
      }
      return { data: storedRows, error: null }
    })

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>
    )
    render(<CarteiraPage />, { wrapper })

    expect(await screen.findByText('Nenhuma posição cadastrada')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '+ adicionar posição' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()

    await user.type(screen.getByLabelText('Ativo'), 'PETR4')
    await user.type(screen.getByLabelText('Quantidade'), '100')
    await user.type(screen.getByLabelText('Preço médio'), '32,10')
    fireEvent.change(screen.getByLabelText('Data de aquisição'), {
      target: { value: '2026-01-15' },
    })
    await user.click(screen.getByRole('button', { name: 'Adicionar posição' }))

    // Modal fecha.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    // Tabela revalida: a linha aparece sem remontar a página.
    const row = await screen.findByRole('row', { name: /PETR4/ })
    expect(row).toHaveTextContent('Petrobras PN')
    expect(row).toHaveTextContent('15/01/2026')
    expect(screen.queryByText('Nenhuma posição cadastrada')).toBeNull()

    expect(await screen.findByRole('status')).toHaveTextContent('Posição em PETR4 cadastrada.')

    // A leitura sempre filtra pelo usuário da sessão.
    expect(supabaseMock.callArgs('positions', 'eq')).toContainEqual(['user_id', SESSION_USER_ID])
  })
})
