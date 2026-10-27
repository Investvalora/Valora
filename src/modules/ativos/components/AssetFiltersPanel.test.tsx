import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AtivosPage } from './AtivosPage'
import { AtivosPosicoes } from './AtivosPosicoes'
import { AtivosComposicao } from './AtivosComposicao'
import { matchesAssetFilters, useAssetFilters } from '../hooks/useAssetFilters'
import { downloadPositionsCsv } from '../../portfolio/export/positionsCsv'
const fixedState = vi.hoisted(() => ({ data: [] as { id: string; name: string; principal: number; remaining_principal: number; current_value: number }[], isLoading: false, isError: false }))
const scoreState = vi.hoisted(() => ({ enabled: false }))

vi.mock('../../portfolio/export/positionsCsv', () => ({ downloadPositionsCsv: vi.fn() }))

vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user' } }) }))
vi.mock('../../portfolio/hooks/useWallets', () => ({ useWallets: () => ({ selectedWallet: { id: 'wallet' } }) }))
vi.mock('../../portfolio/hooks/useFixedIncomePositions', () => ({ useFixedIncomePositions: () => fixedState }))
vi.mock('../../portfolio/hooks/usePositions', () => ({ usePositions: () => ({ data: [
  { id: 'a', ticker: 'AAA3', quantity: 10, average_price: 8, acquisition_date: '2026-01-01', asset: { currency: 'BRL', type: 'stock_br', name: 'Ações Alfa' } },
  { id: 'b', ticker: 'FII11', quantity: 5, average_price: 8, acquisition_date: '2026-01-01', asset: { currency: 'BRL', type: 'fii', name: 'Fundo Beta' } },
] }) }))
vi.mock('../../portfolio/hooks/useLatestQuotes', () => ({ useLatestQuotes: () => ({ data: [
  { ticker: 'AAA3', close: 10, date: '2026-10-23' }, { ticker: 'FII11', close: 20, date: '2026-10-23' },
] }) }))
vi.mock('../../../shared/hooks/useUSDRate', () => ({ useUSDRate: () => ({ data: { rate: 5 } }) }))
vi.mock('../../portfolio/hooks/useDividendTotals', () => ({ useDividendTotals: () => new Map() }))
vi.mock('../../score/hooks/useFundamentals', () => ({ useFundamentals: () => ({ data: scoreState.enabled ? [{ ticker: 'AAA3', pl: 8 }] : [] }) }))
vi.mock('../../score/hooks/useScoreRules', () => ({ useScoreRules: () => ({ data: scoreState.enabled ? [{ id: 'rule', name: 'Valor', metric: 'pl', operator: 'lt', threshold_min: 10, points: 5 }] : [] }), groupRulesByName: () => scoreState.enabled ? new Map([['Valor', []]]) : new Map() }))
vi.mock('../../score/hooks/useScorePreferences', () => ({ useScorePreferences: () => ({ data: scoreState.enabled ? { default_score_rule_id: 'rule' } : null }), useUpsertScorePreferences: () => ({ mutate: vi.fn() }) }))
vi.mock('../../valuation/hooks/useBazin', () => ({ useBazin: () => ({ bazinByTicker: new Map() }) }))
vi.mock('../../valuation/hooks/useStrategies', () => ({ useStrategies: () => ({ strategies: [], isError: false }) }))

beforeEach(() => { scoreState.enabled = false; fixedState.data = []; fixedState.isLoading = false; fixedState.isError = false; useAssetFilters.setState({ query: '', types: [], isOpen: false }); localStorage.clear() })

function show() {
  return render(<MemoryRouter initialEntries={['/ativos/posicoes']}><Routes><Route path="/ativos" element={<AtivosPage />}>
    <Route path="posicoes" element={<AtivosPosicoes />} /><Route path="composicao" element={<AtivosComposicao />} />
  </Route></Routes></MemoryRouter>)
}

it('reaproveita score preferido, regras e fundamentos na coluna escolhida', async () => {
  scoreState.enabled = true
  const user = userEvent.setup()
  show()
  expect(screen.getByLabelText('Score das posições')).toHaveValue('Valor')
  await user.click(screen.getByRole('button', { name: 'Editar colunas' }))
  await user.click(screen.getByRole('checkbox', { name: 'Meu score' }))
  await user.click(screen.getByRole('button', { name: /^Salvar$/ }))
  const table = within(screen.getByRole('table', { name: 'Posições de Ações BR' }))
  expect(table.getByRole('columnheader', { name: 'Meu score' })).toBeInTheDocument()
  expect(table.getByRole('row', { name: /AAA3/ })).toHaveTextContent('5,00')
  const index = table.getAllByRole('columnheader').findIndex((header) => header.textContent === 'Meu score')
  expect(within(within(screen.getByRole('table', { name: 'Posições de FIIs' })).getByRole('row', { name: /FII11/ })).getAllByRole('cell')[index]).toHaveTextContent('—')
})

it('os dois botões abrem o painel; aplicar filtra tabela e composição, limpar restaura os dados', async () => {
  const user = userEvent.setup()
  show()
  const table = screen
  expect(table.getByRole('link', { name: 'AAA3' })).toBeInTheDocument()
  expect(table.getByRole('link', { name: 'FII11' })).toBeInTheDocument()
  await user.click(screen.getAllByRole('button', { name: /^Filtrar/ })[1])
  const dialog = within(screen.getByRole('dialog', { name: 'Filtrar ativos' }))
  await user.type(dialog.getByLabelText('Ticker ou nome do ativo'), '  fundo beta ')
  await user.click(dialog.getByRole('checkbox', { name: 'FIIs' }))
  expect(table.getByRole('link', { name: 'AAA3' })).toBeInTheDocument()
  await user.click(dialog.getByRole('button', { name: 'Aplicar filtros' }))
  expect(table.queryByRole('link', { name: 'AAA3' })).not.toBeInTheDocument()
  expect(table.getByRole('link', { name: 'FII11' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Exportar CSV' }))
  expect(vi.mocked(downloadPositionsCsv).mock.lastCall?.[0].map((row) => row.ticker)).toEqual(['FII11'])
  await user.click(screen.getByRole('tab', { name: 'Composição' }))
  const chart = screen.getAllByRole('img', { name: 'Gráfico de composição da carteira' })[0]
  expect(chart.querySelectorAll('path')).toHaveLength(1)
  expect(within(chart).getByLabelText(/FIIs:/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))
  expect(chart.querySelectorAll('path')).toHaveLength(2)
  await user.click(screen.getAllByRole('button', { name: /^Filtrar/ })[0])
  expect(screen.getByRole('dialog', { name: 'Filtrar ativos' })).toBeInTheDocument()
})

it('cancelar descarta o rascunho e busca sem resultados mostra estado específico', async () => {
  const user = userEvent.setup()
  show()
  await user.click(screen.getAllByRole('button', { name: /^Filtrar/ })[0])
  await user.type(screen.getByLabelText('Ticker ou nome do ativo'), 'inexistente')
  await user.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(useAssetFilters.getState().query).toBe('')
  await user.click(screen.getAllByRole('button', { name: /^Filtrar/ })[0])
  await user.type(screen.getByLabelText('Ticker ou nome do ativo'), 'inexistente')
  await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
  expect(within(screen.getByRole('table', { name: 'Posições por classe de ativo' })).getByText('Nenhum ativo corresponde aos filtros selecionados.')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))
  expect(screen.getByRole('link', { name: 'AAA3' })).toBeInTheDocument()
})

it('combina classes por OU e busca por E, ignorando acentos e caixa', () => {
  const asset = { ticker: 'AAA3', name: 'Ações Alfa', type: 'stock_br' as const }
  expect(matchesAssetFilters(asset, { query: 'ACOES aaa', types: ['fii', 'stock_br'] })).toBe(true)
  expect(matchesAssetFilters(asset, { query: 'alfa', types: ['fii'] })).toBe(false)
  expect(matchesAssetFilters(asset, { query: 'alfa beta', types: [] })).toBe(false)
  expect(matchesAssetFilters({ ticker: 'SEM' }, { query: 'sem', types: ['unknown'] })).toBe(true)
})

it('inclui renda fixa nos KPIs, tabela e composição e respeita filtro por classe e nome', async () => {
  fixedState.data = [{ id: 'f', name: 'Tesouro IPCA', principal: 150, remaining_principal: 100, current_value: 120 }]
  const user = userEvent.setup()
  show()
  expect(screen.getByRole('table', { name: 'Posições de renda fixa' })).toHaveTextContent('Tesouro IPCA')
  expect(screen.getByText(/R\$\s*320,00/)).toBeInTheDocument()
  await user.click(screen.getAllByRole('button', { name: /^Filtrar/ })[0])
  await user.click(screen.getByRole('checkbox', { name: 'Renda Fixa' }))
  await user.type(screen.getByLabelText('Ticker ou nome do ativo'), 'tesouro')
  await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
  expect(screen.queryByRole('link', { name: 'AAA3' })).not.toBeInTheDocument()
  expect(screen.getByRole('table', { name: 'Posições de renda fixa' })).toHaveTextContent('120,00')
  await user.click(screen.getByRole('tab', { name: 'Composição' }))
  let chart = screen.getAllByRole('img', { name: 'Gráfico de composição da carteira' })[0]
  expect(within(chart).getByLabelText(/Renda Fixa:/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Ativos' }))
  chart = screen.getAllByRole('img', { name: 'Gráfico de composição da carteira' })[0]
  expect(within(chart).getByLabelText(/Tesouro IPCA:/)).toBeInTheDocument()
})

it('não mostra total parcial durante carregamento ou falha da renda fixa', () => {
  fixedState.isLoading = true
  const view = show()
  expect(screen.queryByText(/R\$\s*200,00/)).not.toBeInTheDocument()
  expect(screen.getByText('Carregando posições e renda fixa…')).toBeInTheDocument()
  // Uma falha de consulta também impede apresentar apenas a parcela variável.
  fixedState.isLoading = false
  fixedState.isError = true
  view.unmount()
  show()
  expect(screen.queryByText(/R\$\s*200,00/)).not.toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('O patrimônio total está indisponível.')
})
