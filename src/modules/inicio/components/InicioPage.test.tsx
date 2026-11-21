import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { DashboardData } from '../../dashboard/hooks/useDashboard'
import { InicioPage } from './InicioPage'
import { AlertBell } from '../../../shared/components/AlertBell'

let walletId = 'wallet-a'
let isMobile = false
vi.mock('../../alerts/hooks/useAlerts', () => ({ useNewAlertsCount: () => ({ data: 12 }) }))
const dashboardByWallet: Record<string, DashboardData> = {
  'wallet-a': {
    totalPatrimonioBRL: 4872,
    valorInvestidoBRL: 2529,
    ganhoCapitalBRL: 2343,
    lucroTotalBRL: 2730.43,
    proventos12mBRL: 387.43,
    proventosTotalBRL: 387.43,
    variacaoPct: 4,
    rentabilidadeTotalPct: 92.65,
    monthlySeries: [{ month: '2026-09', totalBRL: 4872, investedBRL: 2529 }],
    compositionSlices: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
  'wallet-b': {
    totalPatrimonioBRL: 1000,
    valorInvestidoBRL: 800,
    ganhoCapitalBRL: 200,
    lucroTotalBRL: 200,
    proventos12mBRL: null,
    proventosTotalBRL: null,
    variacaoPct: null,
    rentabilidadeTotalPct: 25,
    monthlySeries: [],
    compositionSlices: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
}

vi.mock('../../auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { email: 'kaue@example.com', user_metadata: { full_name: 'Kauê Cardoso' } } }),
}))
vi.mock('../../portfolio/hooks/useWallets', () => ({
  useWallets: () => ({ selectedWallet: { id: walletId, name: walletId === 'wallet-a' ? 'Minha Carteira' : 'Reserva', color: 'gold' } }),
}))
vi.mock('../../dashboard/hooks/useDashboard', () => ({
  useDashboard: (id: string) => dashboardByWallet[id],
}))
vi.mock('../../../shared/hooks/useIsMobile', () => ({ useIsMobile: () => isMobile }))
vi.mock('../../portfolio/components/MobileCarteiraHome', () => ({
  MobileCarteiraHome: ({ dashboard, onAddTransaction, alertCount, children }: { dashboard: DashboardData; onAddTransaction: () => void; alertCount: number; children: ReactNode }) => (
    <section>
      <h1>Carteiras mobile</h1>
      <AlertBell count={alertCount} />
      <p>Patrimônio mobile: {dashboard.totalPatrimonioBRL}</p>
      <button type="button" onClick={onAddTransaction}>+ Lançamento</button>
      {children}
    </section>
  ),
}))
vi.mock('../../portfolio/components/QuickTransactionModal', () => ({
  QuickTransactionModal: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div role="dialog" aria-label="Novo lançamento">Novo lançamento</div> : null,
}))
vi.mock('./AlertasRecentes', () => ({ AlertasRecentes: () => <div>Alertas recentes</div> }))

describe('Início', () => {
  it('usa os valores da carteira selecionada em vez dos exemplos antigos', () => {
    isMobile = false
    walletId = 'wallet-a'
    const { rerender } = render(<MemoryRouter><InicioPage /></MemoryRouter>)

    expect(screen.getAllByText('R$ 4.872,00')).toHaveLength(2)
    expect(screen.getByText('R$ 2.730,43')).toBeInTheDocument()
    expect(screen.queryByText('R$ 13.666,39')).not.toBeInTheDocument()
    expect(screen.getByText(/Minha Carteira/)).toBeInTheDocument()

    walletId = 'wallet-b'
    rerender(<MemoryRouter><InicioPage /></MemoryRouter>)

    expect(screen.getByText('R$ 1.000,00')).toBeInTheDocument()
    expect(screen.getByText(/Reserva/)).toBeInTheDocument()
    expect(screen.queryByText('R$ 4.872,00')).not.toBeInTheDocument()
  })

  it('restaura a tela de carteiras no início mobile e atualiza os dados ao trocar de carteira', async () => {
    isMobile = true
    walletId = 'wallet-a'
    const { rerender } = render(<MemoryRouter><InicioPage /></MemoryRouter>)

    expect(screen.getByRole('heading', { name: 'Carteiras mobile' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir alertas (12 novos)' })).toHaveAttribute('href', '/alertas')
    expect(screen.getByRole('link', { name: 'Abrir alertas (12 novos)' })).toHaveTextContent('9+')
    expect(screen.getByText('Patrimônio mobile: 4872')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ativos Ver ativos da carteira/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Desempenho Rentabilidade/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Análise Ver análises/ })).toBeInTheDocument()

    walletId = 'wallet-b'
    rerender(<MemoryRouter><InicioPage /></MemoryRouter>)
    expect(screen.getByText('Patrimônio mobile: 1000')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '+ Lançamento' }))
    expect(await screen.findByRole('dialog', { name: 'Novo lançamento' })).toBeInTheDocument()
  })

  it('abre os detalhes em um diálogo sem expandir o resumo e devolve o foco ao fechar', async () => {
    const user = userEvent.setup()
    isMobile = true
    walletId = 'wallet-a'
    render(<MemoryRouter><InicioPage /></MemoryRouter>)
    const summary = within(screen.getByRole('region', { name: 'Resumo da carteira' }))
    expect(summary.getAllByText('R$ 4.872,00')).toHaveLength(1)
    expect(summary.getAllByText('+92,65%')).toHaveLength(1)
    expect(summary.queryByText('Ganho de capital')).not.toBeInTheDocument()
    const compositionButton = summary.getByRole('button', { name: 'Ver composição' })
    await user.click(compositionButton)
    const profit = within(screen.getByRole('dialog', { name: 'Composição do lucro' }))
    expect(profit.getByText('R$ 2.343,00')).toBeVisible()
    expect(summary.queryByText('Ganho de capital')).not.toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(compositionButton).toHaveFocus()
    await user.click(summary.getByRole('button', { name: 'Ver período' }))
    const periods = within(screen.getByRole('dialog', { name: 'Períodos de rentabilidade' }))
    expect(periods.getByText('+4,00%')).toBeVisible()
    expect(periods.getByText(/O retorno considera as movimentações/)).toBeVisible()
    await user.click(periods.getByRole('button', { name: 'Fechar' }))
    await user.click(summary.getByRole('button', { name: 'Como funciona: Patrimônio e valor investido' }))
    expect(screen.getByRole('dialog', { name: 'Patrimônio e valor investido' })).toBeInTheDocument()
  })

  it('mantém métricas indisponíveis distintas de zero no resumo mobile', () => {
    isMobile = true
    walletId = 'wallet-b'
    render(<MemoryRouter><InicioPage /></MemoryRouter>)
    const summary = within(screen.getByRole('region', { name: 'Resumo da carteira' }))
    expect(summary.getByText('Proventos').parentElement?.parentElement).toHaveTextContent('—')
    expect(summary.queryByText('R$ 0,00')).not.toBeInTheDocument()
    fireEvent.click(summary.getByText('Ver período'))
    expect(within(screen.getByRole('dialog', { name: 'Períodos de rentabilidade' })).getByText('Últimos 12 meses', { selector: 'dt' }).nextElementSibling).toHaveTextContent('—')
  })
})
