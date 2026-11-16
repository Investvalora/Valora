import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { FirstAccessPage } from './FirstAccessPage'
import { PortfolioDemo } from './PortfolioDemo'
import { shouldShowFirstAccess } from './firstAccess'

const mocks = vi.hoisted(() => {
  const newUser: User = {
    id: 'new-user',
    aud: 'authenticated',
    app_metadata: { provider: 'email' },
    user_metadata: { valora_first_access: true },
    created_at: '2026-11-15T00:00:00Z',
  }
  return {
    newUser,
    user: newUser,
    asset: { ticker: 'PETR4', name: 'Petrobras', type: 'stock_br', currency: 'BRL' },
    create: vi.fn(),
    toggle: vi.fn(),
    defer: vi.fn(),
    history: [],
    wallet: vi.fn(),
  }
})
vi.mock('../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user }) }))
vi.mock('../portfolio/hooks/useAssetSearch', () => ({
  useAssetSearch: (term: string) => ({ data: term === 'PETR' ? [mocks.asset] : term === 'VALE' ? [
    { ticker: 'VALE3', name: 'Vale', type: 'stock_br', currency: 'BRL' },
  ] : [] }),
}))
vi.mock('../score/hooks/useFundamentals', () => ({ useFundamentals: () => ({
  data: [{ ticker: 'PETR4', pl: 9.4, source: 'yahoo' }, { ticker: 'VALE3', pl: 5.1, source: 'yahoo' }],
}) }))
vi.mock('../portfolio/hooks/useWallets', () => ({
  useWallets: () => ({ wallets: [], isLoading: false, isError: false }),
  useCreateWallet: () => ({ mutateAsync: mocks.wallet }),
  useUpdateWallet: () => ({}),
}))
vi.mock('../assets/hooks/usePriceHistory', () => ({ usePriceHistory: () => ({ data: mocks.history }) }))
vi.mock('../portfolio/hooks/useLatestQuotes', () => ({ useLatestQuotes: () => ({ data: [] }) }))
vi.mock('../alerts/hooks/useAlertMutations', () => ({
  useCreatePriceTargetAlert: () => ({ mutateAsync: mocks.create, isPending: false }),
}))
vi.mock('../alerts/services/alertQuoteService', () => ({
  alertQuoteService: { resolveAsset: async () => mocks.asset, getQuote: async () => ({ price: 35 }) },
}))
vi.mock('../alerts/hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({ supported: true, configured: true, ready: true, toggle: mocks.toggle }),
  deferPushPrompt: mocks.defer,
}))

function open(path = '/boas-vindas') {
  render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/boas-vindas" element={<FirstAccessPage />} />
    <Route path="/inicio" element={<h1>Início do Valora</h1>} />
    <Route path="/conta" element={<h1>Conta do usuário</h1>} />
  </Routes></MemoryRouter>)
}

beforeEach(() => {
  vi.stubGlobal('Notification', { permission: 'default' })
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
  sessionStorage.clear()
  mocks.user = mocks.newUser
  mocks.create.mockReset()
  mocks.toggle.mockClear()
  mocks.defer.mockClear()
  mocks.wallet.mockReset().mockResolvedValue({})
})
afterEach(() => vi.unstubAllGlobals())

it('cria um alerta no fluxo, oferece push e registra a conclusão da conta', async () => {
  mocks.create.mockResolvedValue({ ticker: 'PETR4', condition: 'above', target_price: 35 })
  open()
  const logo = screen.getByText('Valora')
  expect(screen.getByRole('group', { name: 'Etapa 1 de 9' })).toHaveTextContent('1/9')
  expect(screen.getByRole('button', { name: 'Pular' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
  expect(screen.getByRole('heading', { name: 'Veja como uma carteira rende' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
  expect(screen.getByRole('heading', { name: 'Crie e gerencie suas carteiras' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
  expect(screen.getByText('Valora')).toBe(logo)
  const next = screen.getByRole('button', { name: 'Próximo' })
  expect(next).toBeEnabled()
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'PETR' } })
  fireEvent.click(await screen.findByRole('button', { name: /PETR4 Petrobras/ }))
  expect(next).toBeEnabled()
  fireEvent.click(next)
  expect(screen.getByText(/Veja como o preço mudou/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '1M' }))
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
  expect(screen.getByRole('heading', { name: 'Compare ativos lado a lado' })).toBeInTheDocument()
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'VALE' } })
  fireEvent.click(screen.getByRole('button', { name: /VALE3 · Vale/ }))
  const comparison = within(screen.getByRole('table'))
  expect(comparison.getByText('5,1×')).toBeInTheDocument()
  expect(comparison.getByText('9,4×')).toBeInTheDocument()
  expect(comparison.queryByRole('link')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
  expect(screen.getByRole('button', { name: '1M' })).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
  expect(screen.getByText(/mesmo se o ativo estiver fora/)).toBeInTheDocument()
  expect(screen.queryByRole('region', { name: 'Histórico de preços' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
  expect(screen.getByRole('combobox')).toHaveValue('PETR4')
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
  expect(screen.getByRole('searchbox')).toHaveValue('PETR')
  expect(await screen.findByRole('button', { name: /PETR4 Petrobras/, pressed: true })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
  fireEvent.click(screen.getByRole('radio', { name: 'Acima de' }))
  const price = screen.getByRole('spinbutton')
  fireEvent.change(price, { target: { value: '37' } })
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
  expect(screen.getByRole('spinbutton')).toHaveValue(37)
  expect(screen.queryByRole('button', { name: /restaurar rascunho/i })).not.toBeInTheDocument()
  const create = screen.getByRole('button', { name: 'Criar alerta' })
  expect(create.closest('form')).not.toBeNull()
  expect(create.closest('footer')).toBeNull()
  fireEvent.click(create)
  expect(await screen.findByRole('heading', { name: 'Alerta criado' })).toBeInTheDocument()
  expect(mocks.create).toHaveBeenCalledWith({ ticker: 'PETR4', condition: 'above', targetPrice: 37 })
  expect(mocks.toggle).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: 'Ativar notificações' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
  expect(screen.getByRole('heading', { name: 'Receba avisos neste dispositivo' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Ativar notificações' }))
  expect(mocks.toggle).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', { name: 'Começar a usar o Valora' }))
  expect(screen.getByRole('heading', { name: 'Início do Valora' })).toBeInTheDocument()
  expect(shouldShowFirstAccess(mocks.user)).toBe(false)
})

it('mostra a carteira de exemplo e só cria uma carteira após confirmar no formulário', async () => {
  open('/boas-vindas?rever=1')
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
  expect(screen.getByText('Demonstração')).toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Rentabilidade comparada ao CDI' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Proventos' }))
  expect(screen.getByRole('region', { name: 'Proventos mensais' })).toHaveTextContent(/283,00/)
  expect(screen.queryByRole('button', { name: 'Criar minha carteira' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
  expect(mocks.wallet).not.toHaveBeenCalled()
  const create = screen.getByRole('button', { name: 'Criar minha carteira' })
  expect(create.closest('footer')).toBeNull()
  fireEvent.click(create)
  const dialog = within(screen.getByRole('dialog', { name: 'Nova carteira' }))
  fireEvent.change(dialog.getByRole('textbox', { name: 'Nome da carteira' }), { target: { value: 'Minha carteira' } })
  fireEvent.click(dialog.getByRole('button', { name: 'Criar' }))
  expect(await screen.findByText('Carteira criada. Você pode acessá-la em Carteiras.')).toBeInTheDocument()
  expect(mocks.wallet).toHaveBeenCalledWith({ name: 'Minha carteira', color: 'gold' })
  expect(screen.getByRole('heading', { name: 'Crie e gerencie suas carteiras' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
  expect(screen.getByRole('heading', { name: 'Encontre um ativo que você acompanha' })).toBeInTheDocument()
})

it('contas antigas entram normalmente e podem rever a apresentação pela Conta', () => {
  mocks.user = { ...mocks.newUser, id: 'existing-user', user_metadata: {} }
  expect(shouldShowFirstAccess(mocks.user)).toBe(false)
  open('/boas-vindas?rever=1')
  const next = () => fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
  for (let index = 0; index < 4; index++) next()
  expect(screen.getByText('Série de preços fictícia')).toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Histórico de preços' })).toBeInTheDocument()
  next()
  const example = within(screen.getByRole('table'))
  expect(example.getByRole('columnheader', { name: 'Empresa Horizonte' })).toBeInTheDocument()
  expect(example.getByRole('columnheader', { name: 'Empresa Aurora' })).toBeInTheDocument()
  expect(screen.getByText(/Empresas e indicadores fictícios/)).toBeInTheDocument()
  for (let index = 0; index < 3; index++) next()
  expect(screen.getByRole('heading', { name: 'Receba avisos neste dispositivo' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Começar a usar o Valora' }))
  expect(screen.getByRole('heading', { name: 'Início do Valora' })).toBeInTheDocument()
  expect(mocks.create).not.toHaveBeenCalled()
  expect(mocks.wallet).not.toHaveBeenCalled()
  expect(mocks.toggle).not.toHaveBeenCalled()
})

it('mantém o mesmo gráfico visível enquanto aplica e remove o desfoque entre as visões', async () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
  render(<PortfolioDemo />)
  const section = screen.getByRole('region', { name: 'Rentabilidade comparada ao CDI' })
  const plot = section.querySelector('[data-blurred]')
  fireEvent.click(screen.getByRole('button', { name: 'Proventos' }))
  expect(plot).toHaveAttribute('data-blurred', 'true')
  expect(screen.getByRole('region', { name: 'Rentabilidade comparada ao CDI' })).toBe(section)
  expect(await screen.findByRole('region', { name: 'Proventos mensais' })).toBe(section)
  expect(section.querySelector('[data-blurred]')).toBe(plot)
  expect(plot).toHaveAttribute('data-blurred', 'false')
})

it('ajusta a altura ao teclado e preserva o cabeçalho enquanto a busca recebe foco', () => {
  const viewport = Object.assign(new EventTarget(), { height: 720, offsetTop: 0, scale: 1 })
  vi.stubGlobal('visualViewport', viewport)
  open('/boas-vindas?rever=1')
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
  const page = screen.getByRole('main')
  const header = screen.getByText('Valora').closest('header')
  expect(page.style.getPropertyValue('--welcome-height')).toBe('720px')
  screen.getByRole('searchbox').focus()
  viewport.height = 420
  viewport.dispatchEvent(new Event('resize'))
  expect(page.style.getPropertyValue('--welcome-height')).toBe('420px')
  expect(page.style.getPropertyValue('--welcome-top')).toBe('0px')
  expect(page).toHaveAttribute('data-keyboard', 'open')
  expect(screen.getByText('Valora').closest('header')).toBe(header)
  expect(screen.getByRole('searchbox')).toHaveFocus()
  viewport.height = 720
  viewport.dispatchEvent(new Event('resize'))
  expect(page).toHaveAttribute('data-keyboard', 'closed')
})

it('habilita Próximo depois da sequência animada quando o movimento está ativo', async () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
  open('/boas-vindas?rever=1')
  const next = screen.getByRole('button', { name: 'Próximo' })
  expect(next).toBeDisabled()
  await waitFor(() => expect(next).toBeEnabled(), { timeout: 2000 })
})
