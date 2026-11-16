import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useCreatePriceTargetAlert } from '../hooks/useAlertMutations'
import type { Alert, AlertCondition } from '../types'
import { AlertAssetField, AlertTargetPriceField } from './AlertPriceFields'
import { useAlertPriceFields } from '../hooks/useAlertPriceFields'
import { readOnboardingAlertDraft, usePriceAlertDraft } from '../hooks/usePriceAlertDraft'
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

interface PriceAlertFormProps {
  onClose: () => void
  onDismiss?: () => void
  initialTicker?: string
  onCreated?: (alert: Alert) => void
  conditionHint?: string
  actionsContainer?: HTMLElement | null
  onAdvance?: () => void
}

export function PriceAlertForm({ initialTicker = '', ...props }: PriceAlertFormProps) {
  const { user } = useAuth()
  return <PriceAlertFields key={`${user?.id ?? 'anonymous'}:${initialTicker}`} {...props} initialTicker={initialTicker} />
}

function PriceAlertFields({ onClose, onDismiss, onCreated, conditionHint, actionsContainer, onAdvance, initialTicker = '' }: PriceAlertFormProps) {
  const { user } = useAuth()
  const [savedDraft] = useState(() => onCreated ? readOnboardingAlertDraft(user?.id, initialTicker) : null)
  const [ticker, setTicker] = useState(savedDraft?.ticker ?? initialTicker)
  const [condition, setCondition] = useState<AlertCondition>(savedDraft?.condition ?? 'below')
  const [targetPrice, setTargetPrice] = useState(savedDraft?.price ?? '')
  const [error, setError] = useState('')

  const createAlert = useCreatePriceTargetAlert()
  const isGlobalSheet = Boolean(onDismiss) && !initialTicker
  const draft = usePriceAlertDraft(onCreated ? 'onboarding' : isGlobalSheet ? 'sheet' : 'inline', { ticker, price: targetPrice, condition }, initialTicker)
  const [hasDraftOnOpen] = useState(draft.available)
  const fields = useAlertPriceFields({
    ticker, price: targetPrice, onTickerChange: setTicker, onPriceChange: setTargetPrice,
    initialTicker: savedDraft?.ticker ?? (hasDraftOnOpen ? '' : initialTicker),
    preserveInitialPrice: Boolean(savedDraft),
  })
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
    if (createAlert.isPending) return
    setError('')

    const price = parseFloat(targetPrice.replace(',', '.'))
    if (!ticker.trim()) {
      setError('Informe o ticker do ativo.')
      return
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError('Informe um preço-alvo válido.')
      return
    }

    try {
      const alert = await createAlert.mutateAsync({
        ticker: ticker.trim().toUpperCase(),
        targetPrice: price,
        condition,
      })
      draft.clear()
      if (onCreated) onCreated(alert)
      else onClose()
    } catch (cause) {
      setError(formatCreateAlertError(cause))
    }
  }

  const form = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
      {!onCreated && <FormDraftNotice {...draft} onRestore={restore} onDiscard={draft.clear} />}
      <AlertAssetField model={fields} />

      <PriceAlertConditionField value={condition} onChange={setCondition} />
      {conditionHint && <p className="rounded-xl border border-nf-blue/25 bg-nf-blue/10 px-3 py-2 text-sm text-white/80">{conditionHint}</p>}
      <AlertTargetPriceField model={fields} />
      {error && <p className="text-[12px] text-nf-pink" role="alert">{error}</p>}
      {onCreated && <p className="text-xs text-white/60" role={draft.storageFailed ? 'status' : undefined}>{draft.storageFailed
        ? 'O navegador não conseguiu guardar o rascunho nesta aba.'
        : 'Se deixar o alerta pela metade, as alterações ficam como rascunho nesta aba.'}</p>}
      <PriceAlertActions onCancel={onCreated ? undefined : close} pending={createAlert.isPending} />
      {actionsContainer && onAdvance && createPortal(
        <nav aria-label="Navegação da apresentação" className="flex justify-between gap-3">
          <button type="button" onClick={onClose} disabled={createAlert.isPending} className="min-h-11 rounded-xl border border-white/15 px-4 text-sm font-semibold hover:bg-white/10 disabled:opacity-50">Voltar</button>
          <button type="button" onClick={onAdvance} disabled={createAlert.isPending} className="min-h-11 rounded-xl border border-[#5cc8ff]/50 bg-[#3f7dff]/10 px-4 text-sm font-semibold text-white hover:bg-[#3f7dff]/20 disabled:opacity-50">Próximo</button>
        </nav>,
        actionsContainer,
      )}
    </form>
  )
  return onDismiss ? (
    <Modal isOpen title="Novo alerta de preço" variant="transaction" transactionDrawer onClose={dismiss} dismissible={!createAlert.isPending}>
      <p className="mb-5 text-sm text-white/60">Escolha um ativo e o preço que deseja acompanhar.</p>
      {form}
    </Modal>
  ) : onCreated ? form : (
    <div className="rounded-[14px] border border-nf-blue/20 bg-[#1B1B1B] p-5">
      <h3 className="mb-4 text-[14px] font-semibold text-white">Novo alerta de preço</h3>
      {form}
    </div>
  )
}
