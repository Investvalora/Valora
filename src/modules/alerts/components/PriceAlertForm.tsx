import { useState } from 'react'
import { useCreatePriceTargetAlert } from '../hooks/useAlertMutations'
import type { AlertCondition } from '../types'

export function PriceAlertForm({ onClose, initialTicker = '' }: { onClose: () => void; initialTicker?: string }) {
  const [ticker, setTicker] = useState(initialTicker)
  const [condition, setCondition] = useState<AlertCondition>('below')
  const [targetPrice, setTargetPrice] = useState('')
  const [error, setError] = useState('')

  const createAlert = useCreatePriceTargetAlert()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const price = parseFloat(targetPrice.replace(',', '.'))
    if (!ticker.trim()) {
      setError('Informe o ticker do ativo.')
      return
    }
    if (isNaN(price) || price <= 0) {
      setError('Informe um preço-alvo válido.')
      return
    }

    try {
      await createAlert.mutateAsync({
        ticker: ticker.trim().toUpperCase(),
        targetPrice: price,
        condition,
      })
      onClose()
    } catch {
      setError('Erro ao criar alerta. Tente novamente.')
    }
  }

  return (
    <div className="rounded-[14px] border border-nf-blue/20 bg-[#1B1B1B] p-5">
      <h3 className="mb-4 text-[14px] font-semibold text-white">Novo alerta de preço</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end" noValidate>
        {/* Ativo */}
        <div className="flex flex-col gap-1 w-full md:min-w-[140px] md:w-auto">
          <label htmlFor="alert-ticker" className="text-[11px] text-white/50">
            Ativo (ticker)
          </label>
          <input
            id="alert-ticker"
            type="text"
            placeholder="Ex: PETR4"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="rounded-lg border border-white/[0.1] bg-[#2A2A2A] px-3 py-2 text-[13px] text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-nf-blue/40"
            maxLength={10}
          />
        </div>

        {/* Condição */}
        <div className="flex flex-col gap-1 w-full md:min-w-[140px] md:w-auto">
          <span className="text-[11px] text-white/50">Condição</span>
          <div className="flex gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="condition"
                value="below"
                checked={condition === 'below'}
                onChange={() => setCondition('below')}
                className="accent-nf-blue"
              />
              <span className="text-[12px] text-white/80">Abaixo de</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="condition"
                value="above"
                checked={condition === 'above'}
                onChange={() => setCondition('above')}
                className="accent-nf-blue"
              />
              <span className="text-[12px] text-white/80">Acima de</span>
            </label>
          </div>
        </div>

        {/* Preço-alvo */}
        <div className="flex flex-col gap-1 w-full md:min-w-[140px] md:w-auto">
          <label htmlFor="alert-price" className="text-[11px] text-white/50">
            Preço-alvo (R$)
          </label>
          <input
            id="alert-price"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Ex: 28.50"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            className="rounded-lg border border-white/[0.1] bg-[#2A2A2A] px-3 py-2 text-[13px] text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-nf-blue/40"
          />
        </div>

        {/* Botões */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="submit"
            disabled={createAlert.isPending}
            className="rounded-full bg-blue-600 px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {createAlert.isPending ? 'Criando…' : 'Criar alerta'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={createAlert.isPending}
            className="rounded-full border border-white/[0.15] px-4 py-2 text-[12px] font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </form>
      {error && (
        <p className="mt-2 text-[12px] text-nf-pink" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
