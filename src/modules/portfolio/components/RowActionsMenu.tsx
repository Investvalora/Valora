import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../../../shared/components/Modal'
import { AddTransactionModal } from './AddTransactionModal'
import { TransactionListModal } from './TransactionListModal'
import { useDeletePosition } from '../hooks/useTransactions'
import type { AssetType } from '../types'

interface RowActionsMenuProps {
  positionId: string
  ticker: string
  assetType?: AssetType | null
  assetName?: string | null
}

export function RowActionsMenu({
  positionId,
  ticker,
  assetType,
  assetName,
}: RowActionsMenuProps) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [modal, setModal] = useState<'add' | 'list' | 'delete' | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })

  const triggerRef = useRef<HTMLButtonElement>(null)

  const deletePosition = useDeletePosition()

  // Fecha o dropdown ao clicar fora ou pressionar Escape
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(e: MouseEvent) {
      // Verifica se o clique foi fora do trigger E fora do portal do dropdown
      const dropdownPortal = document.getElementById('row-actions-portal')
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        dropdownPortal &&
        !dropdownPortal.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    // Recalcula posição ao scroll/resize
    function handleScroll() {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        setDropdownPos({
          top: rect.bottom + window.scrollY + 4,
          left: rect.right + window.scrollX - 208, // 208 = w-52 = 13rem
        })
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleScroll)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleScroll)
    }
  }, [isOpen])

  async function handleDelete() {
    setDeleteError('')
    try {
      await deletePosition.mutateAsync(positionId)
      setModal(null)
    } catch {
      setDeleteError('Erro ao excluir a posição. Tente novamente.')
    }
  }

  const menuItems = [
    {
      label: 'Adicionar Lançamento',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      ),
      onClick: () => { setModal('add'); setIsOpen(false) },
    },
    {
      label: 'Ver lançamentos',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <line x1="9" y1="12" x2="15" y2="12" />
          <line x1="9" y1="16" x2="13" y2="16" />
        </svg>
      ),
      onClick: () => { setModal('list'); setIsOpen(false) },
    },
    {
      label: 'Ver fundamentos',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      ),
      onClick: () => { navigate(`/ativo/${ticker}`); setIsOpen(false) },
    },
    {
      label: 'Excluir',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          <path d="M10 11v6M14 11v6M9 6V4h6v2" />
        </svg>
      ),
      onClick: () => { setModal('delete'); setIsOpen(false) },
      danger: true,
    },
  ]

  return (
    <>
      {/* Botão trigger */}
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            if (!isOpen && triggerRef.current) {
              const rect = triggerRef.current.getBoundingClientRect()
              setDropdownPos({
                top: rect.bottom + window.scrollY + 4,
                left: rect.right + window.scrollX - 208,
              })
            }
            setIsOpen((v) => !v)
          }}
          className="rounded p-1.5 text-gray-400 hover:text-white hover:bg-dark-surface transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={`Ações para ${ticker}`}
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          {/* ícone "..." */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="19" cy="12" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Dropdown renderizado via portal — escapa de overflow:hidden/auto de qualquer ancestral */}
      {isOpen && createPortal(
        <div
          id="row-actions-portal"
          role="menu"
          style={{ position: 'absolute', top: dropdownPos.top, left: dropdownPos.left, zIndex: 9999 }}
          className="w-52 rounded-xl border border-dark-border bg-dark-surface shadow-xl py-1"
        >
          {menuItems.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={item.onClick}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-dark-bg ${
                item.danger ? 'text-red-400 hover:text-red-300' : 'text-gray-200 hover:text-white'
              }`}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>,
        document.body,
      )}

      {/* Modal: Adicionar Lançamento */}
      <AddTransactionModal
        isOpen={modal === 'add'}
        onClose={() => setModal(null)}
        ticker={ticker}
        assetType={assetType}
        assetName={assetName}
      />

      {/* Modal: Ver Lançamentos */}
      <TransactionListModal
        isOpen={modal === 'list'}
        onClose={() => setModal(null)}
        ticker={ticker}
      />

      {/* Modal: Confirmar Exclusão de Posição */}
      <Modal
        isOpen={modal === 'delete'}
        title="Excluir posição"
        onClose={() => { setModal(null); setDeleteError('') }}
        dismissible={!deletePosition.isPending}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            Tem certeza que deseja excluir a posição em{' '}
            <span className="font-semibold text-white">{ticker}</span>?
          </p>
          <p className="text-xs text-gray-500">
            Esta ação removerá a posição. Os lançamentos (transações) associados
            a este ativo <strong className="text-gray-400">não</strong> serão apagados.
          </p>
          {deleteError && (
            <p className="text-sm text-red-400" role="alert">
              {deleteError}
            </p>
          )}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => { setModal(null); setDeleteError('') }}
              disabled={deletePosition.isPending}
              className="flex-1 rounded-lg border border-dark-border px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deletePosition.isPending}
              className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 transition-colors"
            >
              {deletePosition.isPending ? 'Excluindo…' : 'Excluir'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
