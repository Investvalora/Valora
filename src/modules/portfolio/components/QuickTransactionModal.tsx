import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { useAddTransaction } from '../hooks/useTransactions'
import { usePositions } from '../hooks/usePositions'
import { useWallets } from '../hooks/useWallets'
import { positionService } from '../services/positionService'

interface QuickTransactionModalProps {
  isOpen: boolean
  onClose: () => void
}

export function QuickTransactionModal({ isOpen, onClose }: QuickTransactionModalProps) {
  const { selectedWallet } = useWallets()
  const { data: positions = [] } = usePositions(selectedWallet?.id ?? '')
  const addTransaction = useAddTransaction()
  const [ticker, setTicker] = useState('')
  const [type, setType] = useState<'buy' | 'sell'>('buy')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const normalizedTicker = ticker.trim().toUpperCase()
    const parsedQuantity = Number(quantity.replace(',', '.'))
    const parsedPrice = Number(price.replace(',', '.'))

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

      setTicker('')
      setQuantity('')
      setPrice('')
      onClose()
    } catch {
      setError('Não foi possível salvar o lançamento. Tente novamente.')
    }
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2.5 text-white'

  return (
    <Modal
      isOpen={isOpen}
      title="Novo lançamento"
      onClose={onClose}
      dismissible={!addTransaction.isPending}
    >
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-zinc-400">
          Carteira: <span className="text-white">{selectedWallet?.name ?? '—'}</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType('buy')}
            aria-pressed={type === 'buy'}
            className={`rounded-lg border px-3 py-2 text-sm ${
              type === 'buy' ? 'border-green-500 text-green-300' : 'border-zinc-600 text-zinc-400'
            }`}
          >
            Compra
          </button>
          <button
            type="button"
            onClick={() => setType('sell')}
            aria-pressed={type === 'sell'}
            className={`rounded-lg border px-3 py-2 text-sm ${
              type === 'sell' ? 'border-red-500 text-red-300' : 'border-zinc-600 text-zinc-400'
            }`}
          >
            Venda
          </button>
        </div>
        <label className="block text-sm text-zinc-300">
          Ativo
          <input
            value={ticker}
            onChange={(event) => setTicker(event.target.value.toUpperCase())}
            className={`mt-1 ${inputClass}`}
            placeholder="PETR4"
            autoCapitalize="characters"
            maxLength={20}
          />
        </label>
        <label className="block text-sm text-zinc-300">
          Data
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm text-zinc-300">
            Quantidade
            <input
              type="text"
              inputMode="decimal"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className={`mt-1 ${inputClass}`}
              placeholder="0"
            />
          </label>
          <label className="block text-sm text-zinc-300">
            Preço unitário
            <input
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className={`mt-1 ${inputClass}`}
              placeholder="0,00"
            />
          </label>
        </div>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={addTransaction.isPending || !selectedWallet}
          className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-zinc-950 disabled:opacity-50"
        >
          {addTransaction.isPending ? 'Salvando…' : 'Salvar lançamento'}
        </button>
      </form>
    </Modal>
  )
}
