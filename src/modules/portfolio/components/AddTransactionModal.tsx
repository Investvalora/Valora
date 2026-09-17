import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '../../../shared/components/Modal'
import { useAddTransaction } from '../hooks/useTransactions'
import { ASSET_CLASS_LABEL } from '../composition'
import type { AssetType } from '../types'

// ─── schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  type: z.enum(['buy', 'sell']),
  transaction_date: z.string().min(1, 'Data obrigatória'),
  quantity: z
    .number({ invalid_type_error: 'Informe um número', required_error: 'Obrigatório' })
    .positive('Deve ser maior que zero'),
  price: z
    .number({ invalid_type_error: 'Informe um número', required_error: 'Obrigatório' })
    .min(0, 'Deve ser ≥ 0'),
  brokerage_fee: z
    .number({ invalid_type_error: 'Informe um número' })
    .min(0)
    .optional()
    .default(0),
})

type FormValues = z.infer<typeof schema>

// ─── helpers ─────────────────────────────────────────────────────────────────

const INPUT_CLASS =
  'w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'

const LABEL_CLASS = 'block text-xs font-medium text-gray-400 mb-1'

const ERROR_CLASS = 'text-red-400 text-xs mt-1'

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  ...ASSET_CLASS_LABEL,
  // nomes mais amigáveis para o modal
  stock_br: 'Ações BR',
  fii: 'FIIs',
  bdr: 'BDRs',
  stock_us: 'Stocks',
  etf_us: 'ETF US',
  reit: 'REITs',
  crypto: 'Criptomoedas',
  etf_br: 'ETF BR',
}

// ─── componente ──────────────────────────────────────────────────────────────

interface AddTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  ticker: string
  assetType?: AssetType | null
  assetName?: string | null
}

export function AddTransactionModal({
  isOpen,
  onClose,
  ticker,
  assetType,
  assetName,
}: AddTransactionModalProps) {
  const [globalError, setGlobalError] = useState('')
  const addTransaction = useAddTransaction()
  const isSaving = addTransaction.isPending

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'buy',
      transaction_date: new Date().toISOString().slice(0, 10),
      quantity: undefined,
      price: undefined,
      brokerage_fee: 0,
    },
  })

  // Resetar quando abre com ticker diferente
  useEffect(() => {
    if (isOpen) {
      reset({
        type: 'buy',
        transaction_date: new Date().toISOString().slice(0, 10),
        quantity: undefined,
        price: undefined,
        brokerage_fee: 0,
      })
      setGlobalError('')
    }
  }, [isOpen, ticker, reset])

  const transactionType = watch('type')
  const quantity = watch('quantity')
  const price = watch('price')
  const brokerageFee = watch('brokerage_fee') ?? 0

  const totalValue =
    Number.isFinite(quantity) && Number.isFinite(price) && quantity > 0 && price >= 0
      ? quantity * price + brokerageFee
      : null

  const brlFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const onSubmit = handleSubmit(async (values) => {
    setGlobalError('')
    try {
      await addTransaction.mutateAsync({
        ticker,
        type: values.type,
        quantity: values.quantity,
        price: values.price,
        brokerage_fee: values.brokerage_fee ?? 0,
        transaction_date: values.transaction_date,
      })
      onClose()
    } catch {
      setGlobalError('Erro ao salvar o lançamento. Tente novamente.')
    }
  })

  return (
    <Modal
      isOpen={isOpen}
      title="Adicionar Lançamento"
      onClose={onClose}
      dismissible={!isSaving}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {/* Tabs Compra / Venda */}
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-dark-border bg-dark-bg p-1">
          {(['buy', 'sell'] as const).map((t) => (
            <label
              key={t}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-colors ${
                transactionType === t
                  ? 'bg-dark-surface text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <input
                type="radio"
                value={t}
                className="sr-only"
                {...register('type')}
              />
              {t === 'buy' ? '🟢 Compra' : '🔴 Venda'}
            </label>
          ))}
        </div>

        {/* Ativo info (read-only) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className={LABEL_CLASS}>Tipo de ativo</p>
            <div className="px-3 py-2 rounded-lg border border-dark-border bg-dark-bg text-sm text-gray-300">
              {assetType ? ASSET_TYPE_LABELS[assetType] : '—'}
            </div>
          </div>
          <div>
            <p className={LABEL_CLASS}>Ativo</p>
            <div className="px-3 py-2 rounded-lg border border-dark-border bg-dark-bg text-sm font-semibold text-white">
              {ticker}
              {assetName && (
                <span className="ml-1 text-xs font-normal text-gray-400 truncate">
                  {assetName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Data e Quantidade */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="txn-date" className={LABEL_CLASS}>
              Data da transação
            </label>
            <input
              id="txn-date"
              type="date"
              className={INPUT_CLASS}
              aria-invalid={!!errors.transaction_date}
              {...register('transaction_date')}
            />
            {errors.transaction_date && (
              <p className={ERROR_CLASS} role="alert">
                {errors.transaction_date.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="txn-qty" className={LABEL_CLASS}>
              Quantidade
            </label>
            <input
              id="txn-qty"
              type="number"
              step="any"
              min="0"
              placeholder="0"
              className={INPUT_CLASS}
              aria-invalid={!!errors.quantity}
              {...register('quantity', { valueAsNumber: true })}
            />
            {errors.quantity && (
              <p className={ERROR_CLASS} role="alert">
                {errors.quantity.message}
              </p>
            )}
          </div>
        </div>

        {/* Preço e Outros custos */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="txn-price" className={LABEL_CLASS}>
              Preço
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">R$</span>
              <input
                id="txn-price"
                type="number"
                step="any"
                min="0"
                placeholder="0,00"
                className={INPUT_CLASS}
                aria-invalid={!!errors.price}
                {...register('price', { valueAsNumber: true })}
              />
            </div>
            {errors.price && (
              <p className={ERROR_CLASS} role="alert">
                {errors.price.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="txn-fee" className={LABEL_CLASS}>
              Outros custos{' '}
              <span className="text-gray-500">(Opcional)</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">R$</span>
              <input
                id="txn-fee"
                type="number"
                step="any"
                min="0"
                placeholder="0,00"
                className={INPUT_CLASS}
                {...register('brokerage_fee', { valueAsNumber: true })}
              />
            </div>
          </div>
        </div>

        {/* Valor total */}
        <div className="flex items-center justify-between rounded-lg bg-dark-bg px-4 py-3 border border-dark-border">
          <span className="text-sm font-semibold text-gray-200">Valor total</span>
          <span className="text-sm font-bold text-white tabular-nums">
            {totalValue !== null ? brlFormatter.format(totalValue) : 'R$ 0,00'}
          </span>
        </div>

        {/* Erro global */}
        {globalError && (
          <p className="text-sm text-red-400" role="alert">
            {globalError}
          </p>
        )}

        {/* Ações */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-dark-surface border border-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 transition-colors"
          >
            {isSaving ? 'Salvando…' : 'Salvar alteração'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
