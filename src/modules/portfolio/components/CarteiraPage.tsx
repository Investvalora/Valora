import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { usePositions } from '../hooks/usePositions'
import { AddPositionForm } from './AddPositionForm'
import { PositionsTable } from './PositionsTable'

export function CarteiraPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const { data: positions = [], isLoading, isError, refetch } = usePositions()

  const openModal = () => {
    setSuccessMessage('')
    setIsModalOpen(true)
  }

  const handleSuccess = (ticker: string) => {
    setIsModalOpen(false)
    setSuccessMessage(`Posição em ${ticker} cadastrada.`)
  }

  return (
    <div className="p-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Carteira</h1>
          <p className="mt-1 text-sm text-gray-400">
            {isLoading
              ? 'Carregando posições...'
              : `${positions.length} ${positions.length === 1 ? 'posição cadastrada' : 'posições cadastradas'}`}
          </p>
        </div>

        <button
          type="button"
          onClick={openModal}
          className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          + adicionar posição
        </button>
      </header>

      {successMessage && (
        <div className="mb-6 rounded-lg border border-green-500/50 bg-green-500/10 p-4" role="status">
          <p className="text-sm text-green-400">{successMessage}</p>
        </div>
      )}

      {isError && (
        <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-4" role="alert">
          <p className="text-sm text-red-400">Não foi possível carregar suas posições.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 text-sm font-medium text-red-300 underline hover:text-red-200"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : (
        !isError && <PositionsTable positions={positions} />
      )}

      <Modal isOpen={isModalOpen} title="Adicionar posição" onClose={() => setIsModalOpen(false)}>
        <AddPositionForm onSuccess={handleSuccess} onCancel={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  )
}
