import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { useDeleteWallet } from '../hooks/useWallets'
import type { Wallet } from '../services/walletService'

export function DeleteWalletDialog({ wallet, onClose }: { wallet: Wallet; onClose: () => void }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const deletion = useDeleteWallet()
  const allowed = !wallet.is_default && name.trim() === wallet.name

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

  return <Modal isOpen title="Excluir carteira" onClose={onClose} dismissible={!deletion.isPending} variant="transaction" initialFocusSelector="#delete-wallet-name">
    <form onSubmit={confirm} className="space-y-5">
      <p className="break-words text-base text-white">Excluir a carteira <strong>{wallet.name}</strong>?</p>
      <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm leading-relaxed text-red-200">
        Serão excluídos permanentemente os lançamentos, posições, aplicações e eventos de renda fixa, proventos importados e metas desta carteira. Essa ação não pode ser desfeita.
      </div>
      <p className="text-sm text-white/65">As outras carteiras, estratégias e alertas da conta serão mantidos. Não há movimentação na corretora.</p>
      <label className="block text-sm text-white/80" htmlFor="delete-wallet-name">Digite o nome da carteira para confirmar</label>
      <input id="delete-wallet-name" autoComplete="off" value={name} onChange={event => setName(event.target.value)} disabled={deletion.isPending}
        className="min-h-12 w-full rounded-xl border border-white/20 bg-[#242424] px-3 text-base text-white focus:outline-none focus:ring-2 focus:ring-red-400" />
      {wallet.is_default && <p role="alert" className="text-sm text-red-300">A carteira principal não pode ser excluída.</p>}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" disabled={deletion.isPending} onClick={onClose} className="min-h-11 rounded-xl border border-white/20 px-4 text-sm text-white disabled:opacity-40">Cancelar</button>
        <button type="submit" disabled={!allowed || deletion.isPending} className="min-h-11 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40">{deletion.isPending ? 'Excluindo…' : 'Excluir definitivamente'}</button>
      </div>
    </form>
  </Modal>
}
