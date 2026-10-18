import { useEffect, useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import type { Wallet } from '../services/walletService'
import { WalletForm } from './WalletForm'

interface WalletEditorDialogProps {
  isOpen: boolean
  wallet: Wallet | null
  onClose: () => void
}

export function WalletEditorDialog({ isOpen, wallet, onClose }: WalletEditorDialogProps) {
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
          onBusyChange={setBusy}
        />
      )}
    </Modal>
  )
}
