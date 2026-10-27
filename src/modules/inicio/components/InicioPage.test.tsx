import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { DashboardData } from '../../dashboard/hooks/useDashboard'
import { InicioPage } from './InicioPage'

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
  useWallets: () => ({ selectedWallet: { id: walletId, name: walletId === 'wallet-a' ? 'Minha Carteira' : 'Reserva' } }),
}))
vi.mock('../../dashboard/hooks/useDashboard', () => ({
  useDashboard: (id: string) => dashboardByWallet[id],
}))
vi.mock('../../../shared/hooks/useIsMobile', () => ({ useIsMobile: () => isMobile }))
vi.mock('../../portfolio/components/MobileCarteiraHome', () => ({
  MobileCarteiraHome: ({ dashboard, onAddTransaction, children }: { dashboard: DashboardData; onAddTransaction: () => void; children: ReactNode }) => (
    <section>
      <h1>Carteiras mobile</h1>
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

  it('restaura a tela de carteiras no início mobile e atualiza os dados ao trocar de carteira', () => {
    isMobile = true
    walletId = 'wallet-a'
    const { rerender } = render(<MemoryRouter><InicioPage /></MemoryRouter>)

    expect(screen.getByRole('heading', { name: 'Carteiras mobile' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir alertas (12 novos)' })).toHaveAttribute('href', '/alertas')
    expect(screen.getByRole('link', { name: 'Abrir alertas (12 novos)' })).toHaveTextContent('9+')
    expect(screen.getByText('Patrimônio mobile: 4872')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Olá, Kauê' }).parentElement?.parentElement).toHaveClass('pb-20')
    expect(screen.getByRole('link', { name: /Ativos Ver ativos da carteira/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Desempenho Rentabilidade/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Análise Ver análises/ })).toBeInTheDocument()

    walletId = 'wallet-b'
    rerender(<MemoryRouter><InicioPage /></MemoryRouter>)
    expect(screen.getByText('Patrimônio mobile: 1000')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '+ Lançamento' }))
    expect(screen.getByRole('dialog', { name: 'Novo lançamento' })).toBeInTheDocument()
  })
})
