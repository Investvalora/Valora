import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { AssetType, NewFixedIncomePosition } from '../types'

// ─── dublês das hooks (sem tocar em supabase/auth/wallets) ───────────────────
// O modal chama useAddTransaction, useAddFixedIncomePosition e useCalcFixedIncome
// no topo. Dubamos os três para inspecionar o payload enviado e controlar o
// estado de "salvando" sem subir até o banco.
const holders = vi.hoisted(() => ({
  addTx: {
    mutateAsync: vi.fn(async () => ({ id: 'txn-1' })),
    isPending: false,
  },
  addFI: {
    mutate: vi.fn(),
    isPending: false,
  },
  calc: vi.fn(async () => undefined),
}))

vi.mock('../hooks/useTransactions', () => ({
  useAddTransaction: () => holders.addTx,
}))
vi.mock('../hooks/useFixedIncomePositions', () => ({
  useAddFixedIncomePosition: () => holders.addFI,
}))
vi.mock('../hooks/useCalcFixedIncome', () => ({
  useCalcFixedIncome: () => ({ calc: holders.calc }),
}))

import { AddTransactionModal } from './AddTransactionModal'

// ─── helpers ───────────────────────────────────────────────────────────────

function renderModal(props: {
  ticker?: string
  assetType?: AssetType | null
  assetName?: string | null
} = {}) {
  const onClose = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  render(
    <AddTransactionModal
      isOpen
      onClose={onClose}
      ticker={props.ticker ?? ''}
      assetType={props.assetType ?? null}
      assetName={props.assetName ?? null}
    />,
    { wrapper },
  )
  return { onClose }
}

/** Dispara `change` num campo pelo id — funciona p/ input, select e date. */
function change(id: string, value: string) {
  const el = document.getElementById(id)
  if (!el) throw new Error(`#${id} não encontrado`)
  fireEvent.change(el, { target: { value } })
}

function selectCategory(category: 'fixed_income' | 'tesouro_direto') {
  change('cat-select', category)
}

beforeEach(() => {
  holders.addFI.mutate.mockImplementation(
    (_payload: unknown, opts?: { onSuccess?: () => void; onError?: () => void }) => {
      opts?.onSuccess?.()
    },
  )
  holders.addFI.isPending = false
  holders.addTx.mutateAsync.mockImplementation(async () => ({ id: 'txn-1' }))
  holders.addTx.isPending = false
  holders.calc.mockImplementation(async () => undefined)
})

// ─── seletor sem ticker ─────────────────────────────────────────────────────

describe('AddTransactionModal — seletor sem ticker', () => {
  it('oferece só Renda Fixa e Tesouro Direto (sem renda variável)', () => {
    renderModal()
    const select = document.getElementById('cat-select') as HTMLSelectElement
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual([
      'Selecione',
      'Renda Fixa',
      'Tesouro Direto',
    ])
    expect(screen.queryByRole('option', { name: 'Ações BR' })).toBeNull()
  })

  it('renderiza o formulário de Renda Fixa ao selecionar a categoria', () => {
    renderModal()
    expect(document.getElementById('rf-emissor')).toBeNull()
    selectCategory('fixed_income')
    expect(document.getElementById('rf-emissor')).not.toBeNull()
    expect(document.getElementById('td-ativo')).toBeNull()
  })

  it('renderiza o formulário de Tesouro Direto ao selecionar a categoria', () => {
    renderModal()
    expect(document.getElementById('td-ativo')).toBeNull()
    selectCategory('tesouro_direto')
    expect(document.getElementById('td-ativo')).not.toBeNull()
    expect(document.getElementById('rf-emissor')).toBeNull()
  })
})

// ─── ticker pré-preenchido (caminho inalterado) ──────────────────────────────

describe('AddTransactionModal — ticker pré-preenchido', () => {
  it('não mostra o seletor e renderiza o formulário de renda variável', () => {
    renderModal({ ticker: 'PETR4', assetType: 'stock_br', assetName: 'Petrobras PN' })
    expect(document.getElementById('cat-select')).toBeNull()
    expect(screen.getByText('🟢 Compra')).toBeInTheDocument()
    expect(screen.getByText('PETR4')).toBeInTheDocument()
    expect(document.getElementById('rf-emissor')).toBeNull()
    expect(document.getElementById('td-ativo')).toBeNull()
  })
})

// ─── Renda Fixa ──────────────────────────────────────────────────────────────

describe('AddTransactionModal — Renda Fixa', () => {
  it('submete o payload com indexador derivado do tipo do título', async () => {
    const { onClose } = renderModal()
    selectCategory('fixed_income')
    change('rf-emissor', 'Banco X')
    change('rf-tipo', 'cdb_cdi')
    change('rf-taxa', '110')
    change('rf-valor', '1000')
    change('rf-date', '2026-01-15')
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alteração' }))

    await waitFor(() => expect(holders.addFI.mutate).toHaveBeenCalledTimes(1))
    const payload = holders.addFI.mutate.mock.calls[0][0] as NewFixedIncomePosition
    expect(payload).toEqual({
      name: 'Banco X',
      type: 'cdb_cdi',
      indexer: 'cdi',
      rate: 110,
      principal: 1000,
      application_date: '2026-01-15',
      maturity_date: null,
    })
    expect(holders.calc).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('deriva o indexador e o label da taxa do tipo selecionado', () => {
    renderModal()
    selectCategory('fixed_income')
    // Antes do tipo: label genérico e indexador vazio.
    expect(screen.getByText('Taxa')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
    change('rf-tipo', 'cdb_cdi')
    // Depois: indexador CDI e label específico por indexador.
    expect(screen.getByText('CDI')).toBeInTheDocument()
    expect(screen.getByText('% do CDI (ex: 110)')).toBeInTheDocument()
  })

  it('não submete e mostra erros quando campos obrigatórios faltam', async () => {
    renderModal()
    selectCategory('fixed_income')
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alteração' }))

    await waitFor(() =>
      expect(screen.getByText('Informe o emissor')).toBeInTheDocument(),
    )
    expect(holders.addFI.mutate).not.toHaveBeenCalled()
  })
})

// ─── Tesouro Direto ─────────────────────────────────────────────────────────

describe('AddTransactionModal — Tesouro Direto', () => {
  it('mapeia _juros para o tipo-base mas distingue no name', async () => {
    const { onClose } = renderModal()
    selectCategory('tesouro_direto')
    change('td-ativo', 'tesouro_ipca_juros')
    change('td-taxa', '6.5')
    change('td-date', '2026-01-15')
    change('td-qty', '0.5')
    change('td-price', '14000')
    change('td-maturity', '2029-01-01')
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alteração' }))

    await waitFor(() => expect(holders.addFI.mutate).toHaveBeenCalledTimes(1))
    const payload = holders.addFI.mutate.mock.calls[0][0] as NewFixedIncomePosition
    expect(payload).toEqual({
      name: 'Tesouro IPCA+ com Juros Semestrais',
      type: 'tesouro_ipca',
      indexer: 'ipca',
      rate: 6.5,
      principal: 7000,
      application_date: '2026-01-15',
      maturity_date: '2029-01-01',
    })
    expect(holders.calc).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('deriva o indexador selic para Tesouro Selic', async () => {
    renderModal()
    selectCategory('tesouro_direto')
    change('td-ativo', 'tesouro_selic')
    change('td-taxa', '13')
    change('td-date', '2026-01-15')
    change('td-qty', '1')
    change('td-price', '100')
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alteração' }))

    await waitFor(() => expect(holders.addFI.mutate).toHaveBeenCalledTimes(1))
    const payload = holders.addFI.mutate.mock.calls[0][0] as NewFixedIncomePosition
    expect(payload).toMatchObject({
      type: 'tesouro_selic',
      indexer: 'selic',
      name: 'Tesouro Selic',
      rate: 13,
    })
  })

  it('taxa fica desabilitada até escolher o ativo e o label deriva do indexador', () => {
    renderModal()
    selectCategory('tesouro_direto')
    expect((document.getElementById('td-taxa') as HTMLInputElement).disabled).toBe(true)
    expect(screen.getByText('Taxa')).toBeInTheDocument()
    change('td-ativo', 'tesouro_ipca')
    expect((document.getElementById('td-taxa') as HTMLInputElement).disabled).toBe(false)
    expect(
      screen.getByText('Spread (% a.a., ex: 6.5 para IPCA+6,5%)'),
    ).toBeInTheDocument()
  })

  it('não submete e mostra erro quando o ativo não é selecionado', async () => {
    renderModal()
    selectCategory('tesouro_direto')
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alteração' }))

    await waitFor(() =>
      expect(screen.getByText('Selecione o ativo')).toBeInTheDocument(),
    )
    expect(holders.addFI.mutate).not.toHaveBeenCalled()
  })
})

// ─── isSaving ───────────────────────────────────────────────────────────────

describe('AddTransactionModal — bloqueio durante salvamento', () => {
  it('trava o submit e o fechamento enquanto addFI está pendente', () => {
    holders.addFI.isPending = true
    const { onClose } = renderModal()
    selectCategory('fixed_income')

    expect(screen.getByRole('button', { name: /Salvar|Salvando/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled()
    // Escape não fecha o modal enquanto salva (dismissible = !isSaving).
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })
})
