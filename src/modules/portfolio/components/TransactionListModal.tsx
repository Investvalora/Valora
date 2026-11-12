import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { useTransactionsByTicker, useDeleteTransaction } from '../hooks/useTransactions'
import type { Transaction } from '../services/transactionsService'
import type { AssetCurrency } from '../types'
import { EditTransactionButton } from './EditTransactionButton'

// ─── formatadores ─────────────────────────────────────────────────────────────

const moneyFormatters = {
  BRL: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
  USD: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }),
}

const qtyFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 8,
})

function fmtDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  if (!year || !month || !day) return iso
  // Evita new Date('YYYY-MM-DD') que interpreta como UTC e pode mostrar dia anterior
  return `${day}/${month}/${year}`
}

function fmtMoney(v: number, currency: AssetCurrency): string {
  if (!Number.isFinite(Number(v))) return '—'
  return moneyFormatters[currency].format(Number(v))
}

function fmtQty(v: number): string {
  if (!Number.isFinite(Number(v))) return '—'
  return qtyFormatter.format(Number(v))
}

// ─── labels de tipo ───────────────────────────────────────────────────────────

const TYPE_LABEL: Record<Transaction['type'], string> = {
  buy: 'Compra',
  sell: 'Venda',
  dividend: 'Dividendo',
  jcp: 'JCP',
  bonus: 'Bonificação',
}

const TYPE_COLOR: Record<Transaction['type'], string> = {
  buy: 'text-green-400',
  sell: 'text-red-400',
  dividend: 'text-blue-400',
  jcp: 'text-blue-400',
  bonus: 'text-amber-400',
}

// ─── paginação simples ────────────────────────────────────────────────────────

const PAGE_SIZE = 5

// ─── linha da tabela ──────────────────────────────────────────────────────────

function TransactionRow({
  txn,
  onDelete,
  isDeleting,
  compact,
  currency,
}: {
  txn: Transaction
  onDelete: (id: string) => void
  isDeleting: boolean
  compact: boolean
  currency: AssetCurrency
}) {
  const [confirming, setConfirming] = useState(false)
  const totalValue = Number(txn.quantity) * Number(txn.price) + Number(txn.brokerage_fee ?? 0)

  const type = <span className={`font-medium ${TYPE_COLOR[txn.type]}`}>{TYPE_LABEL[txn.type] ?? txn.type}</span>
  const source = <span className="rounded border border-white/10 px-2 py-0.5 text-xs font-medium text-gray-300">Manual</span>
  const actions = (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <EditTransactionButton transaction={txn} />
      {confirming ? (
        <span className="inline-flex items-center gap-2">
          <span className="text-xs text-gray-400">Excluir?</span>
          <button
            type="button"
            onClick={() => onDelete(txn.id)}
            disabled={isDeleting}
            className="text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-colors"
          >
            Sim
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-xs px-2 py-1 rounded border border-dark-border text-gray-300 hover:text-white transition-colors"
          >
            Não
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={isDeleting}
          className={`rounded p-1.5 text-red-400 transition-colors hover:bg-red-900/20 hover:text-red-300 disabled:opacity-50 ${compact ? 'grid size-11 place-items-center' : ''}`}
          aria-label={`Excluir lançamento de ${TYPE_LABEL[txn.type]} em ${fmtDate(txn.transaction_date)}`}
        >
          {/* ícone de lixeira */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </button>
      )}
    </div>
  )

  if (compact) {
    return (
      <li className="min-w-0 rounded-xl border border-white/10 bg-black/15 p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {type}
          <time dateTime={txn.transaction_date} className="tabular-nums text-white/70">{fmtDate(txn.transaction_date)}</time>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="min-w-0">
            <dt className="text-white/65">Quantidade</dt>
            <dd className="mt-1 break-words font-medium tabular-nums">{fmtQty(txn.quantity)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-white/65">Preço unitário</dt>
            <dd className="mt-1 break-words font-medium tabular-nums">{fmtMoney(txn.price, currency)}</dd>
          </div>
          <div className="col-span-2 min-w-0">
            <dt className="text-white/65">Valor total</dt>
            <dd className="mt-1 break-words text-base font-semibold tabular-nums">{fmtMoney(totalValue, currency)}</dd>
          </div>
        </dl>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-1">
          {source}
          {actions}
        </div>
      </li>
    )
  }

  return (
    <tr className="border-t border-dark-border transition-colors hover:bg-dark-surface/40">
      <td className="px-4 py-3 text-sm">{type}</td>
      <td className="px-4 py-3 text-sm tabular-nums text-gray-300">{fmtDate(txn.transaction_date)}</td>
      <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-200">{fmtQty(txn.quantity)}</td>
      <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-200">{fmtMoney(txn.price, currency)}</td>
      <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-white">{fmtMoney(totalValue, currency)}</td>
      <td className="px-4 py-3 text-center text-sm">{source}</td>
      <td className="px-4 py-3 text-sm">{actions}</td>
    </tr>
  )
}

// ─── modal principal ──────────────────────────────────────────────────────────

interface TransactionListModalProps {
  isOpen: boolean
  onClose: () => void
  ticker: string
}

export function TransactionListModal({ isOpen, onClose, ticker }: TransactionListModalProps) {
  const deletion = useDeleteTransaction(ticker)
  return (
    <Modal isOpen={isOpen} title={`Lançamentos do Ativo ${ticker}`} onClose={onClose} dismissible={!deletion.isPending}>
      {isOpen && <TransactionHistory key={ticker} ticker={ticker} deletion={deletion} />}
    </Modal>
  )
}

export function TransactionHistory({ ticker, deletion, compact = false, currency = 'BRL' }: {
  ticker: string
  deletion: ReturnType<typeof useDeleteTransaction>
  compact?: boolean
  currency?: AssetCurrency
}) {
  const [page, setPage] = useState(0)

  const {
    data: allTransactions = [],
    isLoading,
    isError,
    refetch,
  } = useTransactionsByTicker(ticker)

  const [deleteError, setDeleteError] = useState('')

  // Paginação
  const totalPages = Math.ceil(allTransactions.length / PAGE_SIZE)
  const transactions = allTransactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  async function handleDelete(id: string) {
    setDeleteError('')
    try {
      await deletion.mutateAsync(id)
      // Se apagou o último item da página atual, voltar uma página
      if (transactions.length === 1 && page > 0) setPage((p) => p - 1)
    } catch {
      setDeleteError('Erro ao excluir. Tente novamente.')
    }
  }

  const rows = transactions.map((txn) => (
    <TransactionRow key={txn.id} txn={txn} onDelete={handleDelete} isDeleting={deletion.isPending} compact={compact} currency={currency} />
  ))

  return (
    <div className="space-y-4 min-w-0">
      {/* Estado loading */}
      {isLoading && (
        <p className="text-sm text-gray-400 animate-pulse py-4 text-center">
          Carregando lançamentos…
        </p>
      )}

      {/* Estado erro */}
      {isError && !isLoading && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center">
          <p className="text-sm text-red-400 mb-2">Erro ao carregar lançamentos.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-xs underline text-red-300 hover:text-red-200"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Erro de deleção */}
      {deleteError && (
        <p className="text-xs text-red-400" role="alert">
          {deleteError}
        </p>
      )}

      {/* Sem lançamentos */}
      {!isLoading && !isError && allTransactions.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-gray-400">Nenhum lançamento cadastrado para {ticker}.</p>
          <p className="text-xs text-gray-500 mt-1">
            Use "Adicionar Lançamento" para registrar compras e vendas.
          </p>
        </div>
      )}

      {/* Tabela */}
      {!isLoading && !isError && allTransactions.length > 0 && (
        <>
          {compact ? <ul className="space-y-2">{rows}</ul> : <div className="overflow-x-auto rounded-lg border border-dark-border">
            <table className="w-full text-left">
              <thead className="bg-dark-bg">
                <tr>
                  {['Tipo de ordem', 'Data do lançamento', 'Quantidade', 'Preço unitário', 'Valor total', 'Fonte', 'Opções'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>{rows}</tbody>
            </table>
          </div>}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 text-xs rounded border border-dark-border text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>

              {compact ? <span className="text-xs tabular-nums text-white/70">{page + 1} de {totalPages}</span> : Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i)}
                  className={`w-8 h-8 text-xs rounded border transition-colors ${
                    page === i
                      ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                      : 'border-dark-border text-gray-300 hover:text-white'
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="px-3 py-1.5 text-xs rounded border border-dark-border text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Próximo
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
