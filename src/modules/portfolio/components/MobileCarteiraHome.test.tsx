import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DashboardData } from '../../dashboard/hooks/useDashboard'
import type { Wallet } from '../services/walletService'
import { MobileCarteiraHome } from './MobileCarteiraHome'

const selectWallet = vi.fn()
const createWallet = vi.fn()
const updateWallet = vi.fn()
const wallet = {
  id: 'wallet-1',
  user_id: 'user-1',
  name: 'Minha Carteira',
  color: 'gold' as const,
  is_default: true,
  created_at: '2026-01-01T00:00:00Z',
}
const secondWallet = {
  ...wallet,
  id: 'wallet-2',
  name: 'Reserva',
  color: 'green' as const,
  is_default: false,
  created_at: '2026-02-01T00:00:00Z',
}
let currentWallets: Wallet[] = [wallet]

vi.mock('../../auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'samuel@example.com',
      user_metadata: { full_name: 'Samuel Silva' },
    },
  }),
}))

vi.mock('../hooks/useWallets', () => ({
  useWallets: () => ({
    wallets: currentWallets,
    selectedWallet: wallet,
    selectWallet,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCreateWallet: () => ({ mutateAsync: createWallet, isPending: false }),
  useUpdateWallet: () => ({ mutateAsync: updateWallet, isPending: false }),
}))

vi.mock('../hooks/useWalletTotals', () => ({
  useWalletTotals: () => ({
    totals: new Map([['wallet-1', 5000]]),
    isLoading: false,
    isError: false,
  }),
}))

const dashboard: DashboardData = {
  totalPatrimonioBRL: 5000,
  valorInvestidoBRL: 4000,
  ganhoCapitalBRL: 1000,
  lucroTotalBRL: 1200,
  proventos12mBRL: 200,
  variacaoPct: 10,
  rentabilidadeTotalPct: 25,
  monthlySeries: [{ month: '2026-09', totalBRL: 5000, investedBRL: 4000 }],
  compositionSlices: [],
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
}

function renderHome(onAddTransaction = vi.fn()) {
  return render(
    <MemoryRouter>
      <MobileCarteiraHome
        dashboard={dashboard}
        onAddTransaction={onAddTransaction}
      />
    </MemoryRouter>,
  )
}

describe('Carteira inicial no celular', () => {
  afterEach(() => { vi.restoreAllMocks() })

  beforeEach(() => {
    const originalRect = HTMLElement.prototype.getBoundingClientRect
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return this.dataset.testid === 'wallet-swipe-zone'
        ? new DOMRect(294, 0, 96, 192)
        : originalRect.call(this)
    })
    currentWallets = [wallet]
    selectWallet.mockClear()
    createWallet.mockReset()
    updateWallet.mockReset()
    createWallet.mockResolvedValue(undefined)
    updateWallet.mockResolvedValue(undefined)
  })

  it('mostra os dados reais da carteira e abre o lançamento', async () => {
    const onAddTransaction = vi.fn()
    renderHome(onAddTransaction)

    expect(screen.getByRole('heading', { name: 'Olá, Samuel' })).toBeInTheDocument()
    expect(screen.getAllByText(/5.000,00/).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Evolução do Patrimônio' })).toBeInTheDocument()

    const actionButton = screen.getByRole('button', { name: '+ Lançamento' })
    fireEvent.click(actionButton)
    expect(screen.getByRole('button', { name: '+ Lançamento' })).not.toBe(actionButton)
    await waitFor(() => {
      expect(onAddTransaction).toHaveBeenCalledOnce()
    })
  })

  it('ignora gestos fora da zona lateral e rolagem vertical', () => {
    renderHome()
    const page = screen.getByTestId('wallet-slide-track').closest('section')!
    fireEvent.touchStart(page, { touches: [{ clientX: 150, clientY: 150 }] })
    fireEvent.touchMove(page, { touches: [{ clientX: 10, clientY: 155 }] })
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 10, clientY: 155 }] })
    expect(screen.queryByRole('heading', { name: 'Carteiras' })).not.toBeInTheDocument()
    fireEvent.touchStart(page, { touches: [{ clientX: 300, clientY: 150 }] })
    fireEvent.touchMove(page, { touches: [{ clientX: 290, clientY: 320 }] })
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 290, clientY: 320 }] })
    expect(screen.queryByRole('heading', { name: 'Carteiras' })).not.toBeInTheDocument()
    expect(screen.getByTestId('wallet-slide-track').style.transform).toContain('0%')
  })

  it('abre as carteiras pelo gesto lateral e seleciona uma carteira', () => {
    renderHome()
    const page = screen.getByRole('heading', { name: 'Olá, Samuel' }).closest('section')!

    fireEvent.touchStart(page, { touches: [{ clientX: 300, clientY: 150 }] })
    fireEvent.touchEnd(page, {
      changedTouches: [{ clientX: 100, clientY: 160 }],
    })

    expect(screen.getByRole('heading', { name: 'Carteiras' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ Carteira' })).toBeInTheDocument()
    expect(screen.getAllByText(/5.000,00/).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar Minha Carteira' }))
    expect(selectWallet).toHaveBeenCalledWith('wallet-1')
    expect(screen.getByRole('heading', { name: 'Olá, Samuel' })).toBeInTheDocument()
  })

  it('mantém o conteúdo atual do início enquanto reconecta o seletor lateral', () => {
    currentWallets = [wallet, secondWallet]
    render(
      <MemoryRouter>
        <MobileCarteiraHome dashboard={dashboard} onAddTransaction={vi.fn()}>
          <div><h1>Início atual</h1><a href="/ativos">Ativos</a></div>
        </MobileCarteiraHome>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Início atual' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ativos' })).toBeInTheDocument()
    const avatar = screen.getByRole('link', { name: 'Abrir minha conta' })
    expect(avatar.closest('[data-testid="wallet-slide-track"]')).toBeNull()
    expect(screen.getAllByTestId('wallet-card')).toHaveLength(2)

    const page = screen.getByRole('heading', { name: 'Início atual' }).closest('section')!
    fireEvent.touchStart(page, { touches: [{ clientX: 300, clientY: 150 }] })
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 100, clientY: 160 }] })

    expect(screen.getByRole('heading', { name: 'Carteiras' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir minha conta' })).toBe(avatar)
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar Reserva' }))
    expect(selectWallet).toHaveBeenCalledWith('wallet-2')
    expect(screen.getByRole('heading', { name: 'Início atual' })).toBeInTheDocument()
  })

  it('mostra uma faixa por carteira real, começando pela principal', () => {
    currentWallets = [secondWallet, wallet]
    renderHome()

    const cards = screen.getAllByTestId('wallet-card')
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveStyle({ backgroundColor: '#d8b632' })
    expect(cards[1]).toHaveStyle({ backgroundColor: '#29c95f' })
    expect(cards[0].style.clipPath).toBe('')
    expect(Number(cards[1].style.zIndex)).toBeGreaterThan(Number(cards[0].style.zIndex))

    fireEvent.click(screen.getByRole('button', { name: 'Ver e selecionar carteiras: 2' }))

    expect(screen.getAllByTestId('wallet-card')[0]).toBe(cards[0])
    expect(screen.getAllByTestId('wallet-card')[1]).toBe(cards[1])
    expect(cards[0].style.top).toBe('160px')
    expect(cards[1].style.top).toBe('340px')
  })

  it('mostra no máximo três carteiras na pilha inicial e mantém todas na tela lateral', () => {
    currentWallets = [wallet, secondWallet, ...Array.from({ length: 4 }, (_, index) => ({
      ...secondWallet,
      id: `wallet-${index + 3}`,
      name: `Carteira ${index + 3}`,
      created_at: `2026-0${index + 3}-01T00:00:00Z`,
    }))]
    renderHome()

    const cards = screen.getAllByTestId('wallet-card')
    expect(cards).toHaveLength(6)
    expect(cards.slice(0, 3).every((card) => card.style.opacity === '1')).toBe(true)
    expect(cards.slice(3).every((card) => card.style.opacity === '0')).toBe(true)
    expect(cards[3].style.pointerEvents).toBe('none')

    fireEvent.click(screen.getByRole('button', { name: 'Ver e selecionar carteiras: 6' }))
    expect(cards.every((card) => card.style.opacity === '1')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar Carteira 6' }))
    expect(selectWallet).toHaveBeenCalledWith('wallet-6')
  })

  it('não desenha faixas quando não há carteiras carregadas', () => {
    currentWallets = []
    renderHome()

    expect(screen.queryAllByTestId('wallet-card')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /Ver e selecionar carteiras/ })).toBeNull()
  })

  it('mostra prévia e novas cores no modal de criação', async () => {
    renderHome()
    fireEvent.click(screen.getByRole('button', { name: 'Ver e selecionar carteiras: 1' }))
    fireEvent.click(screen.getByRole('button', { name: '+ Carteira' }))

    expect(await screen.findByRole('dialog', { name: 'Nova carteira' })).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Nova carteira' })).toHaveClass('wallet-modal-panel')
    expect(screen.getByLabelText('Nome da carteira')).toHaveFocus()
    expect(screen.getAllByRole('radio')).toHaveLength(8)

    fireEvent.change(screen.getByLabelText('Nome da carteira'), {
      target: { value: 'Reserva' },
    })
    fireEvent.click(screen.getByRole('radio', { name: 'Rosa' }))

    const previewName = screen.getByLabelText('Nome da carteira')
    expect(previewName).toHaveValue('Reserva')
    expect(previewName.parentElement?.style.backgroundColor).toContain('rgba(234, 114, 170,')

    fireEvent.click(screen.getByRole('button', { name: 'Criar' }))
    await waitFor(() => {
      expect(createWallet).toHaveBeenCalledWith({ name: 'Reserva', color: 'pink' })
    })
  })

  it('permite editar a cor de uma carteira existente', async () => {
    renderHome()
    fireEvent.click(screen.getByRole('button', { name: 'Ver e selecionar carteiras: 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Editar Minha Carteira' }))

    expect(screen.getByRole('dialog', { name: 'Editar carteira' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome da carteira')).toHaveValue('Minha Carteira')

    fireEvent.click(screen.getByRole('radio', { name: 'Roxo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => {
      expect(updateWallet).toHaveBeenCalledWith({
        walletId: 'wallet-1',
        name: 'Minha Carteira',
        color: 'purple',
      })
    })
  })

  it('acompanha o dedo e anima o retorno para a tela inicial', () => {
    renderHome()
    const page = screen.getByRole('heading', { name: 'Olá, Samuel' }).closest('section')!
    const track = screen.getByTestId('wallet-slide-track')
    const card = screen.getByTestId('wallet-card')
    const closedLeft = card.style.left

    fireEvent.touchStart(page, { touches: [{ clientX: 300, clientY: 150 }] })
    fireEvent.touchMove(page, { touches: [{ clientX: 180, clientY: 155 }] })
    expect(track.style.transform).toContain('-120px')
    expect(card.style.left).not.toBe(closedLeft)

    fireEvent.touchEnd(page, {
      changedTouches: [{ clientX: 100, clientY: 155 }],
    })
    expect(track.style.transform).toContain('-100%')
    expect(screen.getByTestId('wallet-card')).toBe(card)

    fireEvent.touchStart(page, { touches: [{ clientX: 90, clientY: 150 }] })
    fireEvent.touchMove(page, { touches: [{ clientX: 210, clientY: 155 }] })
    expect(track.style.transform).toContain('120px')

    fireEvent.touchEnd(page, {
      changedTouches: [{ clientX: 280, clientY: 155 }],
    })
    expect(track.style.transform).toContain('0%')
    expect(screen.getByRole('heading', { name: 'Olá, Samuel' })).toBeInTheDocument()
  })

  it('restaura a posição ao cancelar o arrasto e permite abrir pela área lateral', () => {
    renderHome()
    const page = screen.getByTestId('wallet-slide-track').closest('section')!
    fireEvent.touchStart(page, { touches: [{ clientX: 300, clientY: 150 }] })
    fireEvent.touchMove(page, { touches: [{ clientX: 180, clientY: 150 }] })
    fireEvent.touchCancel(page)
    expect(screen.getByTestId('wallet-slide-track').style.transform).toContain('0%')
    fireEvent.click(screen.getByRole('button', { name: 'Abrir carteiras' }))
    expect(screen.getByRole('heading', { name: 'Carteiras' })).toBeInTheDocument()
  })
})
