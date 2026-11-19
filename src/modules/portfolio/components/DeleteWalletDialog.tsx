import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { useDeleteWallet } from '../hooks/useWallets'
import type { Wallet } from '../services/walletService'
import { walletPalette } from '../walletPalette'
import { Check, Trash2 } from 'lucide-react'

export function DeleteWalletDialog({ wallet, selected = false, onClose }: { wallet: Wallet; selected?: boolean; onClose: () => void }) {
  const [step, setStep] = useState<'review' | 'confirm'>('review')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const deletion = useDeleteWallet()
  const allowed = step === 'confirm' && !wallet.is_default && name.trim() === wallet.name
  const palette = walletPalette[wallet.color]

  async function confirm(event: React.FormEvent) {
    event.preventDefault()
    if (!allowed || deletion.isPending) return
    setError('')
    try {
      await deletion.mutateAsync({ walletId: wallet.id, confirmationName: name.trim() })
      onClose()
    } catch (cause) {
      const code = typeof cause === 'object' && cause !== null && 'code' in cause ? cause.code : null
      setError(code === '22023' || code === 'P0002'
        ? 'A carteira mudou ou não está disponível para exclusão. Feche esta janela e atualize a lista.'
        : 'Não foi possível concluir a exclusão. Confira a lista de carteiras antes de tentar novamente.')
    }
  }

  return <Modal isOpen title="Excluir carteira" titleStyle="subtle" description={step === 'review' ? 'Confira a carteira antes de continuar.' : 'Digite o nome da carteira para concluir.'} onClose={onClose} dismissible={!deletion.isPending} variant="transaction" initialFocusSelector={step === 'confirm' ? '#delete-wallet-name' : '#review-wallet-cancel'}>
    <form onSubmit={confirm} className="space-y-5">
      <p className="text-xs font-medium text-white/40">{step === 'review' ? '1 de 2 · Confira a carteira' : '2 de 2 · Confirme a exclusão'}</p>
      <div className="flex min-h-28 flex-col justify-between gap-4 rounded-2xl p-4" style={{ backgroundColor: palette.color, color: palette.textColor }}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs opacity-70">{wallet.is_default ? 'Carteira principal' : 'Carteira para exclusão'}</span>
          <Trash2 className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <strong className="min-w-0 break-words text-lg font-medium">{wallet.name}</strong>
          {selected && <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold text-white"><Check size={12} aria-hidden="true" />Selecionada</span>}
        </div>
      </div>
      <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm leading-relaxed text-red-200">
        <p className="mb-1 font-medium">Esta ação não pode ser desfeita.</p>
        Serão removidos os lançamentos, posições, aplicações e eventos de renda fixa, proventos importados e metas desta carteira.
      </div>
      <p className="text-xs leading-relaxed text-white/45">As outras carteiras, estratégias e alertas da conta serão mantidos. Não há movimentação na corretora.</p>
      {step === 'confirm' && <>
      <label className="block text-sm text-white/80" htmlFor="delete-wallet-name">Digite o nome da carteira para confirmar</label>
      <input id="delete-wallet-name" autoComplete="off" value={name} onChange={event => setName(event.target.value)} disabled={deletion.isPending}
        className="min-h-12 w-full rounded-xl border border-white/20 bg-[#242424] px-3 text-base text-white focus:outline-none focus:ring-2 focus:ring-red-400" />
      </>}
      {wallet.is_default && <p role="alert" className="text-sm text-red-300">A carteira principal não pode ser excluída.</p>}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <div className="flex flex-wrap justify-end gap-3">
        <button id="review-wallet-cancel" type="button" disabled={deletion.isPending} onClick={onClose} className="min-h-11 rounded-xl border border-white/20 px-4 text-sm text-white disabled:opacity-40">Cancelar</button>
        {step === 'review'
          ? <button type="button" disabled={wallet.is_default || deletion.isPending} onClick={() => setStep('confirm')} className="min-h-11 rounded-xl bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-40">Continuar</button>
          : <button type="submit" disabled={!allowed || deletion.isPending} className="min-h-11 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40">{deletion.isPending ? 'Excluindo…' : 'Excluir definitivamente'}</button>}
      </div>
    </form>
  </Modal>
}
