import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import { PlanningPage } from './PlanningPage'
import { resetSupabaseMock, supabaseMock } from '../../test/supabaseMock'
vi.mock('../../shared/services/supabaseClient', async () => ({ supabase: (await import('../../test/supabaseMock')).supabaseMock.client }))
vi.mock('../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }))
const walletState = vi.hoisted(() => ({ loading: false, error: false, empty: false, refetch: vi.fn() }))
vi.mock('../portfolio/hooks/useWallets', () => ({ useWallets: () => ({ wallets: walletState.loading || walletState.error || walletState.empty ? [] : [{ id: 'wallet', name: 'Teste' }], selectedWallet: walletState.loading || walletState.error || walletState.empty ? null : { id: 'wallet', name: 'Teste' }, selectWallet: vi.fn(), isLoading: walletState.loading, isError: walletState.error, refetch: walletState.refetch }) }))
vi.mock('../ativos/hooks/useAtivosValuation', () => ({ useAtivosValuation: () => ({ positions: [], tickers: [], compositionRows: [{ type: 'stock_br', marketValueBRL: 100 }], complete: true, isLoading: false, isError: false }) }))
vi.mock('../ativos/components/AllocationTargets', () => ({ AllocationTargets: () => <p>Metas existentes</p> }))
vi.mock('../dividends/hooks/useBrlDividends', () => ({ useBrlDividends: () => ({ rows: [{ source: 'imported', total_value: 120 }, { total_value: 12000 }], isLoading: false, isError: false }) }))
vi.mock('../portfolio/hooks/useFixedIncomeHistory', () => ({ useFixedIncomeHistory: () => ({ data: { positions: [], events: [] }, isLoading: false, isError: false, refetch: vi.fn() }) }))
vi.mock('../performance/hooks/useHistoricalReturns', () => ({ useHistoricalReturns: () => ({ points: [{ date: '2026-01-01', value: 100, purchases: 100, withdrawals: 0, income: 0, fxChange: 0, marketChange: 0 }], issues: [], isLoading: false, isError: false, incomplete: false, refetch: vi.fn() }) }))
vi.mock('../portfolio/hooks/useLatestQuotes', () => ({ useLatestQuotes: () => ({ data: [], refetch: vi.fn() }) }))
vi.mock('../../shared/hooks/useUSDRate', () => ({ useUSDRate: () => ({ data: undefined, refetch: vi.fn() }) }))
vi.mock('../score/services/fundamentalsService', () => ({ fundamentalsService: { listByTickers: vi.fn().mockResolvedValue([]) } }))
function setup() { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><MemoryRouter><PlanningPage /></MemoryRouter></QueryClientProvider>) }
beforeEach(() => { walletState.loading = false; walletState.error = false; walletState.empty = false; walletState.refetch.mockClear(); resetSupabaseMock(); supabaseMock.on('wallets', () => ({ data: { allocation_targets: { stock_br: 50, fii: 50 }, passive_income_goal: 100 }, error: null })) })
it('simula o aporte por meta e informa a sobra sem gravar movimentos', async () => {
  setup()
  await screen.findByText('Informe valores válidos e metas que somem 100%.')
  fireEvent.change(screen.getByLabelText('Aporte disponível (R$)'), { target: { value: '100' } })
  expect(screen.getByText(/Sobra em caixa:/)).toHaveTextContent(/0,00/)
  expect(supabaseMock.insertPayloads('transactions')).toHaveLength(0)
})
it('salva a meta da carteira e exclui estimativas da renda realizada', async () => {
  setup(); fireEvent.click(screen.getByRole('tab', { name: 'Meta de renda' }))
  await screen.findByLabelText('Meta mensal (R$)')
  expect(screen.getByText(/Média confirmada/)).toHaveTextContent(/10,00/)
  fireEvent.change(screen.getByLabelText('Meta mensal (R$)'), { target: { value: '200,50' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar meta' }))
  await waitFor(() => expect(supabaseMock.callArgs('wallets', 'update').map(args => args[0])).toContainEqual({ passive_income_goal: 200.5 }))
})
it('expõe a reconciliação e informa a limitação da restauração', async () => {
  setup(); fireEvent.click(screen.getByRole('tab', { name: 'Variação do patrimônio' }))
  expect(await screen.findByText('Efeito do câmbio')).toBeInTheDocument()
  expect(screen.getByText('Proventos no período, fora do saldo')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('tab', { name: 'Exportar carteira' }))
  expect(screen.getByRole('button', { name: 'Baixar exportação completa' })).toBeInTheDocument()
  expect(screen.getByLabelText('Conferir arquivo para futura restauração')).toBeInTheDocument()
})

it('mostra skeleton enquanto as carteiras chegam sem anunciar carteira vazia', () => {
  walletState.loading = true
  setup()
  expect(screen.getByRole('status')).toHaveTextContent('Carregando carteiras…')
  expect(screen.getByLabelText('Carteira')).toBeDisabled()
  expect(screen.queryByText('Selecione ou crie uma carteira.')).not.toBeInTheDocument()
  expect(supabaseMock.callArgs('wallets', 'select')).toHaveLength(0)
})
it('mostra falha com nova tentativa, sem tratar erro como ausência de carteira', () => {
  walletState.error = true
  setup()
  expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar as carteiras.')
  expect(screen.queryByText('Selecione ou crie uma carteira.')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(walletState.refetch).toHaveBeenCalledOnce()
})
it('mostra orientação de carteira vazia apenas depois da consulta concluída', () => {
  walletState.empty = true
  setup()
  expect(screen.getByText('Selecione ou crie uma carteira.')).toBeInTheDocument()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})
