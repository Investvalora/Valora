import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Modal } from '../../../shared/components/Modal'
import { useEditAlert } from '../hooks/useAlertMutations'
import type { Alert } from '../types'

function EditAlertForm({ alert, onClose }: { alert: Alert; onClose: () => void }) {
  const edit = useEditAlert()
  const [title, setTitle] = useState(alert.title)
  const [description, setDescription] = useState(alert.description)
  const [price, setPrice] = useState(String(alert.target_price ?? ''))
  const [condition, setCondition] = useState(alert.condition ?? 'below')
  const [error, setError] = useState('')
  const field = 'mt-2 w-full rounded-xl border border-white/15 bg-[#252525] px-3 py-3 text-sm text-white focus:border-nf-blue focus:outline-none'
  return <Modal isOpen title={`Editar alerta · ${alert.ticker}`} variant="score" onClose={onClose} dismissible={!edit.isPending} initialFocusSelector="#edit-alert-title">
    <form className="space-y-5" onSubmit={async (event) => {
      event.preventDefault()
      setError('')
      const targetPrice = Number(price.replace(',', '.'))
      if (!title.trim() || !description.trim() || (alert.type === 'price_target' && (!Number.isFinite(targetPrice) || targetPrice <= 0))) { setError('Preencha os campos com valores válidos.'); return }
      const updatedDescription = alert.type === 'price_target' && description === alert.description
        ? `Notificar quando ${alert.ticker} estiver ${condition === 'below' ? 'abaixo de' : 'acima de'} ${targetPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`
        : description
      try { await edit.mutateAsync({ alert, payload: { title, description: updatedDescription, ...(alert.type === 'price_target' ? { targetPrice, condition } : {}) } }); onClose() }
      catch { setError('Não foi possível salvar. Confira os dados e tente novamente.') }
    }}>
      <label className="block text-sm text-white/60">Título<input id="edit-alert-title" className={field} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required /></label>
      <label className="block text-sm text-white/60">Descrição<textarea className={field} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={3} required /></label>
      {alert.type === 'price_target' && <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-white/60">Condição<select className={field} value={condition} onChange={(event) => setCondition(event.target.value as 'above' | 'below')}><option value="below">Abaixo de</option><option value="above">Acima de</option></select></label>
        <label className="text-sm text-white/60">Preço-alvo (R$)<input className={field} type="number" min="0.0001" step="0.0001" value={price} onChange={(event) => setPrice(event.target.value)} required /></label>
      </div>}
      <p className="text-xs text-white/45">{alert.status === 'ignorado' ? 'Editar mantém o alerta ignorado e não reinicia o prazo de exclusão de 3 dias.' : alert.type === 'price_target' ? 'Ao salvar, o alerta volta a monitorar o preço com a condição informada.' : 'Esta edição altera o texto do alerta. A geração automática continua usando os critérios do sistema.'}</p>
      {error && <p role="alert" className="text-sm text-nf-pink">{error}</p>}
      <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
        <button type="button" disabled={edit.isPending} onClick={onClose} className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/70">Cancelar</button>
        <button disabled={edit.isPending} className="rounded-full bg-[#393939] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{edit.isPending ? 'Salvando…' : 'Salvar alterações'}</button>
      </div>
    </form>
  </Modal>
}

export function EditAlertButton({ alert }: { alert: Alert }) {
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" aria-label={`Editar alerta de ${alert.ticker}`} onClick={() => setOpen(true)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"><Pencil className="h-3 w-3" aria-hidden="true" />Editar</button>
    {open && <EditAlertForm alert={alert} onClose={() => setOpen(false)} />}
  </>
}
