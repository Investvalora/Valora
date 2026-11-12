import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
  createError: null as null | { code: string; message: string },
}))

vi.mock('../../auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u', email: 'kaue@example.com', user_metadata: { full_name: 'Kauê Cardoso' } } }),
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
  useCreatePriceTargetAlert: () => ({ isPending: false, mutateAsync: mocks.create }),
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
      <MemoryRouter><main><AlertsPage /></main></MemoryRouter>
    </QueryClientProvider>,
  )
}

function openAlertForm() {
  fireEvent.click(screen.getAllByRole('button', { name: 'Novo alerta' })[0])
}

describe('AlertsPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mocks.alerts = []
    mocks.isError = false
    mocks.isLoading = false
    mocks.mobile = false
    mocks.generate.mockReset()
    mocks.checkPrices.mockReset()
    mocks.create.mockReset().mockImplementation(() => {
      if (mocks.createError) throw mocks.createError
      return Promise.resolve()
    })
    mocks.createError = null
    mocks.update.mockReset()
  })

  it('mostra o estado vazio e dispara geração sob demanda', () => {
    renderPage()

    expect(screen.getByText('Nenhum alerta encontrado')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar alertas →' }))
    expect(mocks.generate).toHaveBeenCalledOnce()
  })

  it('mantém o cabeçalho mobile no topo e a condição dentro da frase do alerta', () => {
    mocks.alerts = [{
      id: 'target', type: 'price_target', ticker: 'PETR4', status: 'lido',
      title: 'Alerta de preço: PETR4',
      description: 'Notificar quando PETR4 estiver abaixo de R$ 30,00.',
      target_price: 30, condition: 'below', created_at: '2026-09-20T10:00:00Z',
    }]

    renderPage()

    expect(screen.getByRole('heading', { name: 'Alertas e notificações' }).closest('.fixed')).toHaveClass('top-0', 'bg-[#131313]')
    expect(screen.getByRole('link', { name: 'Abrir minha conta' })).toHaveClass('h-9', 'w-9', 'bg-purple-500', 'text-sm')
    expect(screen.getByRole('link', { name: 'Abrir minha conta' }).closest('.fixed')).toHaveClass('pt-[calc(env(safe-area-inset-top)+1.5rem)]')
    const alert = screen.getByRole('article', { name: 'Alerta de preço: PETR4' })
    expect(alert).toHaveClass('bg-transparent', 'border-b')
    expect(alert.parentElement).toHaveClass('-mx-4', 'sm:-mx-6', 'border-t')
    expect(alert).toHaveClass('border-b')
    expect(alert).toHaveTextContent('Avisar quando estiver abaixo de R$ 30,00')
    expect(within(alert).getAllByText(/Avisar quando/)).toHaveLength(1)
    expect(within(alert).getByText('PETR4')).toBeInTheDocument()
    expect(within(alert).queryByText('Preço-alvo')).not.toBeInTheDocument()
    const filters = screen.getByRole('group', { name: 'Filtros de alertas' })
    expect(filters).toHaveClass('overflow-x-auto')
    expect(filters.closest('.fixed')).toBe(screen.getByRole('heading', { name: 'Alertas e notificações' }).closest('.fixed'))
    expect(screen.getByText('Acompanhe os eventos importantes da sua carteira e gerencie seus alertas.')).toHaveClass('hidden', 'md:block')
  })

  it('mostra a divisória sob o cabeçalho e os filtros somente após rolar', () => {
    renderPage()
    const header = screen.getByRole('heading', { name: 'Alertas e notificações' }).closest('.fixed')!
    const scrollArea = header.closest('main')!

    expect(header).toHaveClass('border-transparent')
    scrollArea.scrollTop = 24
    fireEvent.scroll(scrollArea)
    expect(header).toHaveClass('border-white/[0.10]')
    scrollArea.scrollTop = 0
    fireEvent.scroll(scrollArea)
    expect(header).toHaveClass('border-transparent')
  })

  it('destaca o alerta disparado sem criar uma linha extra e mantém as ações', () => {
    mocks.alerts = [{
      id: 'triggered', type: 'price_target', ticker: 'MXRF11', status: 'novo',
      title: 'Alerta de preço: MXRF11',
      description: 'Notificar quando MXRF11 estiver abaixo de R$ 8,99.',
      target_price: 8.99, condition: 'below', created_at: '2026-09-20T10:00:00Z',
    }]

    renderPage()
    const alert = screen.getByRole('article', { name: 'Alerta de preço: MXRF11' })
    expect(within(alert).getByText('Preço-alvo atingido.').parentElement?.parentElement).toHaveClass('bg-nf-green/[0.12]')
    expect(within(alert).getByText('Preço-alvo atingido.').parentElement?.parentElement).not.toHaveClass('border-t')
    fireEvent.click(within(alert).getByRole('button', { name: 'Manter ativo' }))
    expect(mocks.update).toHaveBeenCalledWith({ alertId: 'triggered', status: 'lido' })
  })

  it('remove completamente o destaque de um filtro desmarcado', () => {
    renderPage()
    const filter = screen.getByRole('button', { name: /Não lidas: 0/ })

    fireEvent.click(filter)
    expect(filter).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(filter)
    expect(filter).toHaveAttribute('aria-pressed', 'false')
    expect(filter.className).not.toContain('hover:bg-')
    expect(filter).not.toHaveClass('border')
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
    fireEvent.click(screen.getByRole('button', { name: 'Lido' }))
    expect(mocks.update).toHaveBeenCalledWith({ alertId: 'alert-1', status: 'lido' })
    fireEvent.click(screen.getByRole('button', { name: 'Ignorar' }))
    expect(mocks.update).toHaveBeenCalledWith({ alertId: 'alert-1', status: 'ignorado' })
  })

  it('distingue alertas novos, monitorados, lidos e ignorados sem apagar os ativos', () => {
    mocks.alerts = [
      { id: 'new', type: 'stale_quote', ticker: 'PETR4', status: 'novo', title: 'Cotação nova', description: 'Nova', created_at: '2026-09-20T10:00:00Z' },
      { id: 'monitoring', type: 'price_target', ticker: 'VALE3', status: 'lido', title: 'Preço monitorado', description: 'Ativo', created_at: '2026-09-19T10:00:00Z' },
      { id: 'read', type: 'opportunity', ticker: 'ITUB4', status: 'lido', title: 'Oportunidade lida', description: 'Lida', created_at: '2026-09-18T10:00:00Z' },
      { id: 'ignored', type: 'overvalued', ticker: 'BBDC4', status: 'ignorado', title: 'Alerta ignorado', description: 'Arquivado', created_at: '2026-09-17T10:00:00Z' },
    ]

    renderPage()
    const fresh = screen.getByRole('article', { name: 'Cotação nova' })
    const monitoring = screen.getByRole('article', { name: 'Preço monitorado' })
    const read = screen.getByRole('article', { name: 'Oportunidade lida' })
    const ignored = screen.getByRole('article', { name: 'Alerta ignorado' })

    expect(within(fresh).getByText('Novo')).toHaveClass('text-nf-blue')
    expect(within(monitoring).getByText('Monitorando')).toHaveClass('text-nf-yellow')
    expect(monitoring).not.toHaveClass('opacity-75', 'opacity-60')
    expect(within(read).getByText('Lido')).toHaveClass('text-white/25')
    expect(read).toHaveClass('opacity-65')
    expect(within(ignored).getByText('Ignorado')).toHaveClass('text-white/18')
    expect(ignored).toHaveClass('opacity-45')
  })

  it('mantém a lista tratável quando a consulta falha', () => {
    mocks.isError = true
    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar seus alertas.')
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })

  it('abre e fecha o formulário de preço-alvo', () => {
    renderPage()

    openAlertForm()
    expect(screen.getByRole('dialog', { name: 'Novo alerta de preço' })).toHaveClass('transaction-drawer-panel')

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('filtra alertas não lidos e pausados na tela mobile', () => {
    mocks.mobile = true
    mocks.alerts = [
      { id: 'new', type: 'overvalued', ticker: 'AAPL', status: 'novo', title: 'Novo AAPL', description: 'Alerta novo', created_at: '2026-09-20T10:00:00Z' },
      { id: 'ignored', type: 'price_target', ticker: 'PETR4', status: 'ignorado', title: 'Ignorado PETR4', description: 'Alerta ignorado', created_at: '2026-09-19T10:00:00Z' },
    ]

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Não lidas: 1/ }))
    expect(screen.getByRole('article', { name: 'Novo AAPL' })).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Ignorado PETR4' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Não lidas: 1/ }))
    fireEvent.click(screen.getByRole('button', { name: /Pausados: 1/ }))
    expect(screen.queryByRole('article', { name: 'Novo AAPL' })).not.toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Ignorado PETR4' })).toBeInTheDocument()
  })

  it('abre e fecha a folha de novo alerta no mobile', () => {
    mocks.mobile = true
    renderPage()

    openAlertForm()
    expect(screen.getByRole('dialog', { name: 'Novo alerta de preço' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

  })

  it('inclui os preços-alvo ativos na atualização manual', () => {
    mocks.mobile = true
    mocks.alerts = [{
      id: 'target', type: 'price_target', ticker: 'PETR4', status: 'lido',
      title: 'Alerta de preço: PETR4', description: 'Monitorando preço',
      created_at: '2026-09-20T10:00:00Z',
    }]
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Mais ações' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Atualizar alertas' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mais ações' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Verificar preços-alvo' }))
    expect(mocks.generate).toHaveBeenCalledOnce()
    expect(mocks.checkPrices).toHaveBeenCalledOnce()
  })

  it('mantém a criação do alerta funcional na folha mobile', async () => {
    mocks.mobile = true
    renderPage()

    openAlertForm()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'petr4' } })
    const above = screen.getByRole('radio', { name: 'Acima de' })
    fireEvent.click(above)
    expect(above).toBeChecked()
    fireEvent.change(screen.getByLabelText('Preço-alvo (R$)'), { target: { value: '42.50' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar alerta' }))

    expect(mocks.create).toHaveBeenCalledWith(
      { ticker: 'PETR4', targetPrice: 42.5, condition: 'above' },
    )
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Novo alerta de preço' })).not.toBeInTheDocument())
  })

  it.each([false, true])('recupera rascunho sem enviar e limpa no cancelamento (mobile=%s)', mobile => {
    mocks.mobile = mobile
    const first = renderPage()
    const open = openAlertForm
    open()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'PETR4' } })
    fireEvent.change(screen.getByLabelText('Preço-alvo (R$)'), { target: { value: '42.50' } })
    first.unmount()
    renderPage(); open()
    expect(screen.getByLabelText('Preço-alvo (R$)')).toHaveValue(null)
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar rascunho' }))
    expect(screen.getByLabelText('Preço-alvo (R$)')).toHaveValue(42.5)
    expect(mocks.create).not.toHaveBeenCalled()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    open()
    expect(screen.queryByText('Restaurar rascunho')).not.toBeInTheDocument()
  })

  it.each([false, true])('bloqueia ticker vazio e preço inválido no formulário atual (mobile=%s)', (mobile) => {
    mocks.mobile = mobile
    renderPage()
    openAlertForm()
    const form = screen.getByRole('dialog').querySelector('form')!
    fireEvent.submit(form)
    expect(mocks.create).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'MXRF11' } })
    fireEvent.change(screen.getByLabelText('Preço-alvo (R$)'), { target: { value: '0' } })
    fireEvent.submit(form)
    expect(mocks.create).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it.each([
    [false, '23503', 'Ativo não encontrado no catálogo'],
    [false, '23505', 'Já existe um alerta ativo com esse preço e condição'],
    [false, 'unexpected', 'Não foi possível criar o alerta. Tente novamente.'],
    [true, '23503', 'Ativo não encontrado no catálogo'],
    [true, '23505', 'Já existe um alerta ativo com esse preço e condição'],
    [true, 'unexpected', 'Não foi possível criar o alerta. Tente novamente.'],
  ])('orienta falha %s/%s e preserva campos para nova tentativa', (mobile, code, message) => {
    mocks.mobile = mobile as boolean
    mocks.createError = { code: code as string, message: 'detalhe interno' }
    renderPage()
    openAlertForm()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'MXRF11' } })
    fireEvent.change(screen.getByLabelText('Preço-alvo (R$)'), { target: { value: '9' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar alerta' }))
    expect(screen.getByRole('alert')).toHaveTextContent(message as string)
    expect(screen.queryByText(/detalhe interno/)).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveValue('MXRF11')
    expect(screen.getByLabelText('Preço-alvo (R$)')).toHaveValue(9)
    fireEvent.click(screen.getByRole('button', { name: 'Criar alerta' }))
    expect(mocks.create).toHaveBeenCalledTimes(2)
  })
})
