import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AlertsPage } from './AlertsPage'

const mocks = vi.hoisted(() => ({
  alerts: [] as Array<Record<string, unknown>>,
  isError: false,
  isLoading: false,
  mobile: false,
  generate: vi.fn(),
  checkPrices: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}))

vi.mock('../../auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { email: 'kaue@example.com', user_metadata: { full_name: 'Kauê Cardoso' } } }),
}))

vi.mock('../../../shared/hooks/useIsMobile', () => ({
  useIsMobile: () => mocks.mobile,
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
      <MemoryRouter><AlertsPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AlertsPage', () => {
  beforeEach(() => {
    mocks.alerts = []
    mocks.isError = false
    mocks.isLoading = false
    mocks.mobile = false
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

  it('filtra alertas novos e ignorados na tela mobile', () => {
    mocks.mobile = true
    mocks.alerts = [
      { id: 'new', type: 'overvalued', ticker: 'AAPL', status: 'novo', title: 'Novo AAPL', description: 'Alerta novo', created_at: '2026-09-20T10:00:00Z' },
      { id: 'ignored', type: 'price_target', ticker: 'PETR4', status: 'ignorado', title: 'Ignorado PETR4', description: 'Alerta ignorado', created_at: '2026-09-19T10:00:00Z' },
    ]

    renderPage()

    fireEvent.click(screen.getByRole('tab', { name: 'Novos' }))
    expect(screen.getByRole('article', { name: 'Novo AAPL' })).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Ignorado PETR4' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Ignorados' }))
    expect(screen.queryByRole('article', { name: 'Novo AAPL' })).not.toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Ignorado PETR4' })).toBeInTheDocument()
  })

  it('abre a folha de novo alerta e atualiza a lista pelo botão mobile', () => {
    mocks.mobile = true
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Criar alerta de preço no celular' }))
    expect(screen.getByRole('dialog', { name: 'Novo alerta de preço' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Fechar formulário' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Atualizar alertas no celular' }))
    expect(mocks.generate).toHaveBeenCalledOnce()
  })

  it('inclui os preços-alvo ativos na atualização mobile', () => {
    mocks.mobile = true
    mocks.alerts = [{
      id: 'target', type: 'price_target', ticker: 'PETR4', status: 'lido',
      title: 'Alerta de preço: PETR4', description: 'Monitorando preço',
      created_at: '2026-09-20T10:00:00Z',
    }]
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Atualizar alertas no celular' }))
    expect(mocks.generate).toHaveBeenCalledOnce()
    expect(mocks.checkPrices).toHaveBeenCalledOnce()
  })

  it('mantém a criação do alerta funcional na folha mobile', () => {
    mocks.mobile = true
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Criar alerta de preço no celular' }))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'petr4' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Acima de' }))
    fireEvent.change(screen.getByLabelText('Preço-alvo (R$)'), { target: { value: '42.50' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar alerta' }))

    expect(mocks.create).toHaveBeenCalledWith(
      { ticker: 'PETR4', targetPrice: 42.5, condition: 'above' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })
})
