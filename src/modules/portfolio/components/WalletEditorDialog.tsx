import { useEffect, useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import type { Wallet } from '../services/walletService'
import { WalletForm } from './WalletForm'

interface WalletEditorDialogProps {
  isOpen: boolean
  wallet: Wallet | null
  onClose: () => void
  onSaved?: () => void
}

export function WalletEditorDialog({ isOpen, wallet, onClose, onSaved }: WalletEditorDialogProps) {
  const [retained, setRetained] = useState(isOpen)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setRetained(true)
      return
    }

    const timeout = window.setTimeout(() => setRetained(false), 300)
    return () => window.clearTimeout(timeout)
  }, [isOpen])

  return (
    <Modal
      isOpen={isOpen || retained}
      title={wallet ? 'Editar carteira' : 'Nova carteira'}
      titleStyle="subtle"
      description={wallet ? 'Ajuste o nome e a cor desta carteira.' : 'Dê um nome e uma cor aos seus investimentos.'}
      onClose={onClose}
      dismissible={!busy && isOpen}
      variant="wallet"
      closing={!isOpen}
      initialFocusSelector="#wallet-name"
    >
      {(isOpen || retained) && (
        <WalletForm
          key={wallet?.id ?? 'new'}
          wallet={wallet}
          onClose={onClose}
          onSaved={onSaved}
          onBusyChange={setBusy}
        />
      )}
    </Modal>
  )
}
