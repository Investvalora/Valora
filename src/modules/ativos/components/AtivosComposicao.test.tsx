import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AtivosComposicao } from './AtivosComposicao'
import { supabaseMock } from '../../../test/supabaseMock'
import { useAssetFilters } from '../hooks/useAssetFilters'

vi.mock('../../../shared/services/supabaseClient', async () => {
  const { supabaseMock } = await import('../../../test/supabaseMock')
  return { supabase: supabaseMock.client }
})
vi.mock('../../portfolio/hooks/useAcquisitionCosts', () => ({ useAcquisitionCosts: () => ({ byPosition: new Map() }) }))
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }))
afterEach(() => vi.unstubAllGlobals())
beforeEach(() => {
  supabaseMock.reset()
  useAssetFilters.getState().clear()
  supabaseMock.on('wallets', () => ({ data: { allocation_targets: { stock_br: 60, fii: 40 } }, error: null }))
})

vi.mock('../services/sectorService', () => ({ sectorService: { list: async () => [{ ticker: 'AAA3', sector: 'Financeiro', source: 'brapi' }] } }))
vi.mock('../../portfolio/hooks/useWallets', () => ({ useWallets: () => ({ selectedWallet: { id: 'wallet' } }) }))
vi.mock('../../portfolio/hooks/useFixedIncomePositions', () => ({ useFixedIncomePositions: () => ({ data: [] }) }))
vi.mock('../../portfolio/hooks/usePositions', () => ({ usePositions: () => ({ data: [
  { id: 'a', ticker: 'AAA3', quantity: 10, average_price: 8, acquisition_date: '2026-01-01', asset: { currency: 'BRL', type: 'stock_br', name: 'Empresa A' } },
  { id: 'b', ticker: 'BBB3', quantity: 5, average_price: 8, acquisition_date: '2026-01-01', asset: { currency: 'BRL', type: 'stock_br', name: 'Empresa B' } },
] }) }))
vi.mock('../../portfolio/hooks/useLatestQuotes', () => ({ useLatestQuotes: () => ({ data: [
  { ticker: 'AAA3', close: 10, date: '2026-10-23' },
  { ticker: 'BBB3', close: 20, date: '2026-10-23' },
] }) }))
vi.mock('../../../shared/hooks/useUSDRate', () => ({ useUSDRate: () => ({ data: { rate: 5 } }) }))
vi.mock('../../portfolio/hooks/useDividendTotals', () => ({ useDividendTotals: () => new Map() }))

it('alterna gráfico e lista pelos mesmos botões no desktop e mobile, sem select', async () => {
  const user = userEvent.setup()
  render(<QueryClientProvider client={new QueryClient()}><AtivosComposicao /></QueryClientProvider>)
  expect(screen.getByRole('heading', { name: 'Composição por classe' })).toBeInTheDocument()
  const chart = screen.getAllByRole('img', { name: 'Gráfico de composição da carteira' })[0]
  expect(chart.querySelectorAll('path')).toHaveLength(1)

  await user.click(screen.getByRole('button', { name: 'Ativos' }))
  expect(screen.getByRole('heading', { name: 'Composição por ativo' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Ativos' })).toHaveAttribute('aria-pressed', 'true')
  expect(chart.querySelectorAll('path')).toHaveLength(2)
  expect(within(chart).getByLabelText(/AAA3:/)).toBeInTheDocument()
  expect(within(chart).getByLabelText(/BBB3:/)).toBeInTheDocument()
  expect(within(chart).getAllByText(/R\$\s*100,00/)).toHaveLength(2)

  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Tipo de ativos' }))
  expect(screen.getByRole('heading', { name: 'Composição por classe' })).toBeInTheDocument()
  expect(chart.querySelectorAll('path')).toHaveLength(1)
})

it('oferece setor no desktop e no mobile, incluindo ativos sem classificação', async () => {
  const user = userEvent.setup()
  render(<QueryClientProvider client={new QueryClient()}><AtivosComposicao /></QueryClientProvider>)
  await user.click(screen.getByRole('button', { name: 'Setor' }))
  expect(screen.getByRole('heading', { name: 'Composição por setor' })).toBeInTheDocument()
  expect(await screen.findAllByText('Financeiro')).not.toHaveLength(0)
  expect(screen.getAllByText('Não classificado')).not.toHaveLength(0)
  await user.click(screen.getByRole('button', { name: 'Ativos' }))
  expect(screen.getByRole('heading', { name: 'Composição por ativo' })).toBeInTheDocument()
})

it('mostra meta e diferença iguais à tabela, incluindo classe sem posição', async () => {
  const user = userEvent.setup()
  render(<QueryClientProvider client={new QueryClient()}><AtivosComposicao /></QueryClientProvider>)
  await user.click(screen.getByRole('switch', { name: 'Exibir posição ideal' }))
  expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  const comparison = screen.getByRole('region', { name: 'Composição da carteira' })
  expect(await within(comparison).findAllByText(/60,00%/)).not.toHaveLength(0)
  expect(within(comparison).getAllByText(/-R\$\s*80,00/)).not.toHaveLength(0)
  expect(within(comparison).getAllByText(/\+R\$\s*80,00/)).not.toHaveLength(0)
  const chart = screen.getAllByRole('img', { name: 'Gráfico de composição da carteira' })[0]
  expect(chart.querySelectorAll('path')).toHaveLength(1)
  expect(within(chart).getByText(/Meta: 60,00%.*Diferença: -R\$\s*80,00/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Editar metas' }))
  await user.clear(screen.getByLabelText('Meta Ações BR'))
  await user.type(screen.getByLabelText('Meta Ações BR'), '30')
  await user.clear(screen.getByLabelText('Meta FIIs'))
  await user.type(screen.getByLabelText('Meta FIIs'), '70')
  await user.click(screen.getByRole('button', { name: 'Salvar metas' }))
  expect(await within(chart).findByText(/Meta: 30,00%.*Diferença: -R\$\s*140,00/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Setor' }))
  expect(screen.getByText(/Setores de ações BR e BDRs via Brapi/, { selector: '.sr-only' })).toBeInTheDocument()
  expect(screen.getByRole('table')).toBeInTheDocument()
})

it('mantém a descrição no mesmo espaço e revela detalhes de setor sob demanda', async () => {
  const user = userEvent.setup()
  render(<QueryClientProvider client={new QueryClient()}><AtivosComposicao /></QueryClientProvider>)
  const description = screen.getByTestId('composition-description')
  expect(description).toHaveClass('h-12', 'md:h-10')
  await user.click(screen.getByRole('button', { name: 'Setor' }))
  expect(screen.getByTestId('composition-description')).toBe(description)
  const fullDescription = screen.getByText(/Classificação por setor da Brapi para ações brasileiras/, { selector: '.sr-only' })
  expect(fullDescription.closest('[aria-hidden]')).toHaveAttribute('aria-hidden', 'true')
  const details = screen.getByRole('button', { name: /Sobre os setores/ })
  expect(details).toHaveAttribute('aria-expanded', 'false')
  await user.click(details)
  expect(details).toHaveAttribute('aria-expanded', 'true')
  expect(fullDescription.closest('[aria-hidden]')).toHaveAttribute('aria-hidden', 'false')
  expect(fullDescription).toBeInTheDocument()
  await user.click(details)
  expect(details).toHaveAttribute('aria-expanded', 'false')
})

it('explica o toggle no mobile e permite recolher o editor de metas', async () => {
  const user = userEvent.setup()
  render(<QueryClientProvider client={new QueryClient()}><AtivosComposicao /></QueryClientProvider>)
  expect(screen.getByText('Posição ideal')).toHaveClass('md:hidden')
  await user.click(screen.getByRole('switch', { name: 'Exibir posição ideal' }))
  const editor = screen.getByRole('button', { name: 'Ajustar metas' })
  expect(editor).toHaveAttribute('aria-expanded', 'false')
  expect(document.getElementById(editor.getAttribute('aria-controls')!)).toHaveClass('hidden', 'md:block')
  await user.click(editor)
  expect(editor).toHaveAttribute('aria-expanded', 'true')
  expect(document.getElementById(editor.getAttribute('aria-controls')!)).not.toHaveClass('hidden')
  await user.click(editor)
  expect(editor).toHaveAttribute('aria-expanded', 'false')
})

it('compara metas com a carteira inteira mesmo com filtro de um ticker', async () => {
  useAssetFilters.getState().apply({ query: 'AAA3', types: [] })
  const user = userEvent.setup()
  render(<QueryClientProvider client={new QueryClient()}><AtivosComposicao /></QueryClientProvider>)
  await user.click(screen.getByRole('switch', { name: 'Exibir posição ideal' }))
  const chart = screen.getAllByRole('img', { name: 'Gráfico de composição da carteira' })[0]
  expect(await within(chart).findByText(/Meta: 60,00%.*Diferença: -R\$\s*80,00/)).toBeInTheDocument()
})

it('reutiliza os segmentos da rosca e desfoca as barras durante o morph', async () => {
  const frames = new Map<number, FrameRequestCallback>()
  let id = 0
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
  vi.stubGlobal('requestAnimationFrame', vi.fn((frame: FrameRequestCallback) => { frames.set(++id, frame); return id }))
  vi.stubGlobal('cancelAnimationFrame', vi.fn((frameId: number) => frames.delete(frameId)))
  const tick = (now: number) => act(() => {
    const pending = [...frames.values()]
    frames.clear()
    pending.forEach(frame => frame(now))
  })
  const user = userEvent.setup()
  render(<QueryClientProvider client={new QueryClient()}><AtivosComposicao /></QueryClientProvider>)
  const chart = screen.getByRole('img', { name: 'Gráfico de composição da carteira' })
  const firstSegment = chart.querySelector('path')!
  const originalShape = firstSegment.getAttribute('d')
  await user.click(screen.getByRole('button', { name: 'Ativos' }))
  expect(chart.querySelector('path')).toBe(firstSegment)
  expect(firstSegment).toHaveAttribute('d', originalShape)
  tick(0)
  tick(350)
  expect(chart.querySelector('path')).toBe(firstSegment)
  expect(firstSegment.getAttribute('d')).not.toBe(originalShape)
  expect(chart.querySelectorAll('path')).toHaveLength(2)
  expect(within(chart).getByText(/R\$\s*200,00/)).toBeInTheDocument()
  const list = screen.getByRole('region', { name: 'Composição da carteira' }).querySelector('[style*="filter:"]')!
  expect(list).toHaveStyle({ filter: 'blur(2px)' })
  tick(700)
  expect(list).toHaveStyle({ filter: 'blur(0px)' })
  expect(chart.querySelector('path')).toBe(firstSegment)
})
