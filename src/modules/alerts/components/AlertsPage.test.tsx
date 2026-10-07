import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AlertsPage } from './AlertsPage'

const mocks = vi.hoisted(() => ({
  alerts: [] as Array<Record<string, unknown>>,
  isError: false,
  isLoading: false,
  generate: vi.fn(),
  checkPrices: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}))

vi.mock('../hooks/useAlerts', () => ({
  useAlerts: () => ({ data: mocks.alerts, isError: mocks.isError, isLoading: mocks.isLoading, refetch: vi.fn() }),
}))

vi.mock('../hooks/useAlertMutations', () => ({
  useGenerateAlerts: () => ({ isError: false, isPending: false, mutate: mocks.generate }),
  useCheckPriceTargets: () => ({ isError: false, isSuccess: false, isPending: false, mutate: mocks.checkPrices }),
  useCreatePriceTargetAlert: () => ({ isError: false, isPending: false, mutate: mocks.create }),
  useUpdateAlertStatus: () => ({ isError: false, isPending: false, mutate: mocks.update }),
}))

vi.mock('../../portfolio/hooks/useAssetSearch', () => ({
  useAssetSearch: () => ({ data: [] }),
  useTickerLatestPrice: () => null,
}))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AlertsPage />
    </QueryClientProvider>,
  )
}

describe('AlertsPage', () => {
  beforeEach(() => {
    mocks.alerts = []
    mocks.isError = false
    mocks.isLoading = false
    mocks.generate.mockReset()
    mocks.checkPrices.mockReset()
    mocks.create.mockReset()
    mocks.update.mockReset()
  })

  it('mostra o estado vazio e dispara geração sob demanda', () => {
    renderPage()

    expect(screen.getByText('Nenhum alerta encontrado')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar alertas' }))
    expect(mocks.generate).toHaveBeenCalledOnce()
  })

  it('lista alertas e permite marcar como lido ou ignorar', () => {
    mocks.alerts = [
      {
        id: 'alert-1',
        type: 'stale_quote',
        ticker: 'PETR4',
        status: 'novo',
        title: 'Cotação desatualizada',
        description: 'A última cotação de PETR4 é de 2026-08-01.',
        created_at: '2026-09-10T12:00:00Z',
      },
    ]

    renderPage()

    expect(screen.getByRole('article', { name: 'Cotação desatualizada' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como lido' }))
    expect(mocks.update).toHaveBeenCalledWith({ alertId: 'alert-1', status: 'lido' })
    fireEvent.click(screen.getByRole('button', { name: 'Ignorar' }))
    expect(mocks.update).toHaveBeenCalledWith({ alertId: 'alert-1', status: 'ignorado' })
  })

  it('mantém a lista tratável quando a consulta falha', () => {
    mocks.isError = true
    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar seus alertas.')
    expect(screen.queryByText('Nenhum alerta encontrado')).not.toBeInTheDocument()
  })

  it('abre e fecha o formulário de preço-alvo', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Alerta de preço' }))
    expect(screen.getByRole('dialog', { name: 'Novo alerta de preço' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Fechar formulário' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
