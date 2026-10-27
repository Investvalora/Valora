import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AtivoDetailPage } from './AtivoDetailPage'
import { valueAssets } from '../../ativos/assetValuation'
import type { FixedIncomePosition, LatestQuote, PositionWithAsset } from '../../portfolio/types'

const create = vi.hoisted(() => vi.fn())
const valuation = vi.hoisted(() => vi.fn())
beforeEach(() => valuation.mockReturnValue({ positions: [], rows: [], isLoading: false, isError: false }))
vi.mock('../../portfolio/hooks/useWallets', () => ({ useWallets: () => ({ selectedWallet: { id: 'w1' } }) }))
vi.mock('../../ativos/hooks/useAtivosValuation', () => ({ useAtivosValuation: (...args: unknown[]) => valuation(...args) }))
vi.mock('../hooks/useDailyChange', () => ({ useDailyChange: () => -2.5 }))
vi.mock('../hooks/useAssetDetail', () => ({ useAssetDetail: () => ({ data: { ticker: 'PETR4', name: 'Petrobras', type: 'stock_br', currency: 'BRL' } }) }))
vi.mock('../hooks/usePriceHistory', () => ({ usePriceHistory: () => ({ data: [] }) }))
vi.mock('../hooks/useAssetDividends', () => ({ useAssetDividends: () => ({ data: [] }) }))
vi.mock('../../portfolio/hooks/usePositions', () => ({ usePositions: () => ({ data: [] }) }))
vi.mock('../../portfolio/hooks/useLatestQuotes', () => ({ useLatestQuotes: () => ({ data: [] }) }))
vi.mock('../../portfolio/hooks/useDividendTotals', () => ({ useDividendTotals: () => new Map() }))
vi.mock('../../portfolio/hooks/useTransactions', () => ({ useAllTransactions: () => ({ data: [] }) }))
vi.mock('../../score/hooks/useFundamentals', () => ({ useFundamentals: () => ({ data: [] }) }))
vi.mock('../../score/hooks/useScoreRules', () => ({ useScoreRules: () => ({ data: [] }) }))
vi.mock('../../score/hooks/useScorePreferences', () => ({ useScorePreferences: () => ({ data: null }) }))
vi.mock('../../score/hooks/useCalculateScore', () => ({ useCalculateScore: () => new Map() }))
vi.mock('../../valuation/hooks/useBazin', () => ({ useBazin: () => ({ bazinByTicker: new Map() }) }))
vi.mock('../../alerts/hooks/useAlerts', () => ({ useAlerts: () => ({ data: [] }) }))
vi.mock('../../alerts/hooks/useAlertMutations', () => ({ useCreatePriceTargetAlert: () => ({ mutateAsync: create, isPending: false }) }))
vi.mock('../../performance/hooks/usePerformance', () => ({ usePerformance: () => ({ summary: {} }) }))
vi.mock('../../portfolio/components/AddTransactionModal', () => ({ AddTransactionModal: ({ isOpen, ticker, assetName, assetType, onClose }: { isOpen: boolean; ticker: string; assetName: string; assetType: string; onClose: () => void }) => isOpen ? <div role="dialog" aria-label="Lançamento"><p>{ticker} {assetName} {assetType}</p><button onClick={onClose}>Cancelar lançamento</button></div> : null }))

it('abre lançamento preenchido e cria alerta com o ticker do detalhe, permitindo corrigir uma falha', async () => {
  create.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({})
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={['/ativos/PETR4']}><Routes><Route path="/ativos/:ticker" element={<AtivoDetailPage />} /></Routes></MemoryRouter>)
  await user.click(screen.getByRole('button', { name: '+ Lançamento do ativo' }))
  expect(within(screen.getByRole('dialog', { name: 'Lançamento' })).getByText('PETR4 Petrobras stock_br')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Cancelar lançamento' }))
  await user.click(screen.getByRole('button', { name: 'Criar alerta' }))
  const dialog = within(screen.getByRole('dialog', { name: 'Criar alerta' }))
  expect(dialog.getByLabelText('Ativo (ticker)')).toHaveValue('PETR4')
  await user.click(dialog.getByRole('button', { name: 'Criar alerta' }))
  expect(create).not.toHaveBeenCalled()
  await user.type(dialog.getByRole('spinbutton'), '25')
  await user.click(dialog.getByRole('button', { name: 'Criar alerta' }))
  expect(dialog.getByRole('alert')).toHaveTextContent('Erro ao criar alerta')
  await user.click(dialog.getByRole('button', { name: 'Criar alerta' }))
  expect(create).toHaveBeenLastCalledWith({ ticker: 'PETR4', targetPrice: 25, condition: 'below' })
  expect(screen.queryByRole('dialog', { name: 'Criar alerta' })).not.toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'Alertas' })).toHaveAttribute('aria-selected', 'true')
})

it('mostra peso sobre BRL, USD e renda fixa da carteira selecionada e separa variação diária do custo', () => {
  const positions = [
    { id: 'a', ticker: 'PETR4', quantity: 10, average_price: 10, asset: { currency: 'BRL', type: 'stock_br' } },
    { id: 'b', ticker: 'AAPL', quantity: 1, average_price: 20, asset: { currency: 'USD', type: 'stock_us' } },
  ] as PositionWithAsset[]
  const valued = valueAssets(positions, [{ ticker: 'PETR4', close: 20 }, { ticker: 'AAPL', close: 20 }] as LatestQuote[], [{ name: 'CDB', principal: 100, current_value: 100 }] as FixedIncomePosition[], 5)
  valuation.mockReturnValue({ ...valued, positions, isLoading: false, isError: false })
  render(<MemoryRouter initialEntries={['/ativo/PETR4']}><Routes><Route path="/ativo/:ticker" element={<AtivoDetailPage />} /></Routes></MemoryRouter>)
  expect(valuation).toHaveBeenCalledWith('w1', true)
  expect(screen.getByText('+50,00%')).toBeInTheDocument()
  expect(screen.getByText('-2,50% no último fechamento')).toBeInTheDocument()
})
