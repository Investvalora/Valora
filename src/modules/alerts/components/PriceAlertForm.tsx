import { useState } from 'react'
import { useCreatePriceTargetAlert } from '../hooks/useAlertMutations'
import type { AlertCondition } from '../types'
import { AlertAssetField, AlertTargetPriceField } from './AlertPriceFields'
import { useAlertPriceFields } from '../hooks/useAlertPriceFields'
import { usePriceAlertDraft } from '../hooks/usePriceAlertDraft'
import { FormDraftNotice } from '../../../shared/components/FormDraftNotice'
import { PriceAlertActions, PriceAlertConditionField } from './PriceAlertControls'
import { Modal } from '../../../shared/components/Modal'
import { useAuth } from '../../auth/hooks/useAuth'

function formatCreateAlertError(error: unknown) {
  const cause = typeof error === 'object' && error !== null ? error : null
  const code = cause && 'code' in cause ? cause.code : null
  const message = cause && 'message' in cause && typeof cause.message === 'string' ? cause.message : ''
  if (code === '23505' || (!code && /duplicate|unique/i.test(message))) {
    return 'Já existe um alerta ativo com esse preço e condição. Edite o alerta existente ou escolha outra condição.'
  }
  if (code === '23503') {
    return 'Ativo não encontrado no catálogo. Confira o ticker e selecione o ativo na busca.'
  }
  return 'Não foi possível criar o alerta. Tente novamente.'
}

export function PriceAlertForm({ onClose, onDismiss, initialTicker = '' }: {
  onClose: () => void
  onDismiss?: () => void
  initialTicker?: string
}) {
  const { user } = useAuth()
  return <PriceAlertFields key={`${user?.id ?? 'anonymous'}:${initialTicker}`} onClose={onClose} onDismiss={onDismiss} initialTicker={initialTicker} />
}

function PriceAlertFields({ onClose, onDismiss, initialTicker }: { onClose: () => void; onDismiss?: () => void; initialTicker: string }) {
  const [ticker, setTicker] = useState(initialTicker)
  const [condition, setCondition] = useState<AlertCondition>('below')
  const [targetPrice, setTargetPrice] = useState('')
  const [error, setError] = useState('')

  const createAlert = useCreatePriceTargetAlert()
  const isGlobalSheet = Boolean(onDismiss) && !initialTicker
  const draft = usePriceAlertDraft(isGlobalSheet ? 'sheet' : 'inline', { ticker, price: targetPrice, condition }, initialTicker)
  const [hasDraftOnOpen] = useState(draft.available)
  const fields = useAlertPriceFields({ ticker, price: targetPrice, onTickerChange: setTicker, onPriceChange: setTargetPrice, initialTicker: hasDraftOnOpen ? '' : initialTicker })
  function close() { draft.clear(); onClose() }
  function dismiss() {
    if (isGlobalSheet) draft.clear()
    onDismiss?.()
  }
  function restore() {
    const saved = draft.restore()
    if (!saved) return
    fields.changeTicker(saved.ticker); fields.changePrice(saved.price); setCondition(saved.condition)
  }

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
      close()
    } catch (cause) {
      setError(formatCreateAlertError(cause))
    }
  }

  const form = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <FormDraftNotice {...draft} onRestore={restore} onDiscard={draft.clear} />
      <AlertAssetField model={fields} />

      <PriceAlertConditionField value={condition} onChange={setCondition} />
      <AlertTargetPriceField model={fields} />
      {error && <p className="text-[12px] text-nf-pink" role="alert">{error}</p>}
      <PriceAlertActions onCancel={close} pending={createAlert.isPending} />
    </form>
  )
  return onDismiss ? (
    <Modal isOpen title="Novo alerta de preço" variant="transaction" transactionDrawer onClose={dismiss} dismissible={!createAlert.isPending}>
      <p className="mb-5 text-sm text-white/60">Escolha um ativo e o preço que deseja acompanhar.</p>
      {form}
    </Modal>
  ) : (
    <div className="rounded-[14px] border border-nf-blue/20 bg-[#1B1B1B] p-5">
      <h3 className="mb-4 text-[14px] font-semibold text-white">Novo alerta de preço</h3>
      {form}
    </div>
  )
}
