import { lazy, Suspense, useEffect, useState, type ComponentProps } from 'react'
import type { QuickTransactionModal as QuickModal } from './QuickTransactionModal'
import { Modal } from '../../../shared/components/Modal'

const QuickTransactionModal = lazy(() => import('./QuickTransactionModal').then(m => ({ default: m.QuickTransactionModal })))

export function DeferredQuickTransactionModal(props: ComponentProps<typeof QuickModal>) {
  const [requested, setRequested] = useState(props.isOpen)
  useEffect(() => { if (props.isOpen) setRequested(true) }, [props.isOpen])
  // Keep the original open/close lifecycle after first use, including draft cleanup.
  if (!props.isOpen && !requested) return null
  return <Suspense fallback={<Modal isOpen={props.isOpen} title="Adicionar Lançamento" variant="transaction" onClose={props.onClose}><p role="status">Carregando formulário…</p></Modal>}>
    <QuickTransactionModal {...props} />
  </Suspense>
}
