import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { useAddTransaction } from '../hooks/useTransactions'
import { usePositions } from '../hooks/usePositions'
import { useWallets } from '../hooks/useWallets'
import { positionService } from '../services/positionService'
import { ASSET_CLASS_LABEL } from '../composition'
import type { AssetType } from '../types'

interface QuickTransactionModalProps {
  isOpen: boolean
  onClose: () => void
}

const ASSET_TYPES = Object.entries(ASSET_CLASS_LABEL) as [AssetType, string][]

export function QuickTransactionModal({ isOpen, onClose }: QuickTransactionModalProps) {
  const { selectedWallet } = useWallets()
  const { data: positions = [] } = usePositions(selectedWallet?.id ?? '')
  const addTransaction = useAddTransaction()

  const [type, setType] = useState<'buy' | 'sell'>('buy')
  const [assetClass, setAssetClass] = useState<AssetType | ''>('')
  const [ticker, setTicker] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [otherCosts, setOtherCosts] = useState('')
  const [error, setError] = useState('')

  const parsedQuantity = Number(quantity.replace(',', '.'))
  const parsedPrice = Number(price.replace(',', '.'))
  const parsedOtherCosts = Number(otherCosts.replace(',', '.')) || 0
  const totalValue =
    Number.isFinite(parsedQuantity) && Number.isFinite(parsedPrice)
      ? parsedQuantity * parsedPrice + parsedOtherCosts
      : 0

  const totalFormatted = totalValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const normalizedTicker = ticker.trim().toUpperCase()

    if (!normalizedTicker || !date || parsedQuantity <= 0 || parsedPrice < 0) {
      setError('Preencha ativo, data, quantidade e preço válidos.')
      return
    }

    if (!Number.isFinite(parsedQuantity) || !Number.isFinite(parsedPrice)) {
      setError('Quantidade e preço precisam ser números válidos.')
      return
    }

    if (type === 'sell') {
      const position = positions.find((item) => item.ticker === normalizedTicker)
      if (!position || parsedQuantity > Number(position.quantity)) {
        setError('A venda não pode superar a quantidade desta carteira.')
        return
      }
    }

    try {
      const asset = await positionService.findAssetByTicker(normalizedTicker)
      if (!asset) {
        setError('Ativo não encontrado no catálogo.')
        return
      }

      await addTransaction.mutateAsync({
        ticker: normalizedTicker,
        type,
        transaction_date: date,
        quantity: parsedQuantity,
        price: parsedPrice,
      })

      setAssetClass('')
      setTicker('')
      setQuantity('')
      setPrice('')
      setOtherCosts('')
      onClose()
    } catch {
      setError('Não foi possível salvar o lançamento. Tente novamente.')
    }
  }

  const inputClass =
    'w-full rounded-xl border border-white/[0.12] bg-[#2A2A2A] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.3]'

  const labelClass = 'block text-xs text-white/50 mb-1'

  return (
    <Modal
      isOpen={isOpen}
      title="Adicionar Lançamento"
      onClose={onClose}
      dismissible={!addTransaction.isPending}
    >
      <form onSubmit={submit} className="space-y-5">
        {/* Toggle Compra / Venda */}
        <div className="flex rounded-xl bg-[#2A2A2A] p-1 gap-1">
          <button
            type="button"
            onClick={() => setType('buy')}
            aria-pressed={type === 'buy'}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              type === 'buy'
                ? 'bg-[#3A3A3A] border border-white/[0.15] text-white'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            Compra
          </button>
          <button
            type="button"
            onClick={() => setType('sell')}
            aria-pressed={type === 'sell'}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              type === 'sell'
                ? 'bg-[#3A3A3A] border border-white/[0.15] text-white'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            Venda
          </button>
        </div>

        {/* Grid 2 colunas */}
        <div className="grid grid-cols-2 gap-3">
          {/* Linha 1: Tipo de ativo + Ativo */}
          <div>
            <label htmlFor="qt-asset-class" className={labelClass}>
              Tipo de ativo
            </label>
            <select
              id="qt-asset-class"
              value={assetClass}
              onChange={(e) => {
                setAssetClass(e.target.value as AssetType | '')
                setTicker('')
              }}
              className={`${inputClass} appearance-none`}
            >
              <option value="" disabled>
                Selecione
              </option>
              {ASSET_TYPES.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="qt-ticker" className={labelClass}>
              Ativo
            </label>
            <input
              id="qt-ticker"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              disabled={!assetClass}
              className={`${inputClass} disabled:opacity-40`}
              placeholder="PETR4"
              autoCapitalize="characters"
              maxLength={20}
            />
          </div>

          {/* Linha 2: Data + Quantidade */}
          <div>
            <label htmlFor="qt-date" className={labelClass}>
              Data da transação
            </label>
            <input
              id="qt-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="qt-qty" className={labelClass}>
              Quantidade
            </label>
            <input
              id="qt-qty"
              type="number"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={inputClass}
              placeholder="0"
              min={0}
            />
          </div>

          {/* Linha 3: Preço + Outros custos */}
          <div>
            <label htmlFor="qt-price" className={labelClass}>
              Preço
            </label>
            <input
              id="qt-price"
              type="number"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={inputClass}
              placeholder="0,00"
              min={0}
            />
          </div>
          <div>
            <label htmlFor="qt-other-costs" className={labelClass}>
              Outros custos{' '}
              <span className="text-white/30">OPCIONAL</span>
            </label>
            <input
              id="qt-other-costs"
              type="number"
              inputMode="decimal"
              value={otherCosts}
              onChange={(e) => setOtherCosts(e.target.value)}
              className={inputClass}
              placeholder="0,00"
              min={0}
            />
          </div>
        </div>

        {/* Valor total */}
        <div className="text-right">
          <p className="text-xs text-white/50">Valor total</p>
          <p className="text-xl font-semibold text-white">{totalFormatted}</p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-white/60 transition-colors hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={addTransaction.isPending || !selectedWallet}
            className="rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {addTransaction.isPending ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
