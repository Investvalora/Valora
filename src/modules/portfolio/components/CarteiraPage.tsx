import { useCallback, useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { usePositions } from '../hooks/usePositions'
import { AddPositionForm } from './AddPositionForm'
import { PositionsTable } from './PositionsTable'

export function CarteiraPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const { data: positions = [], isLoading, isError, refetch } = usePositions()

  const hasPositions = positions.length > 0

  const openModal = () => {
    setSuccessMessage('')
    setIsModalOpen(true)
  }

  // Fechar no meio da escrita desmonta o formulário: o aviso de sucesso e a
  // revalidação da lista se perdem e a posição gravada só aparece no próximo
  // carregamento. Enquanto `isSaving`, nada fecha o modal.
  const closeModal = useCallback(() => {
    if (isSaving) return
    setIsModalOpen(false)
  }, [isSaving])

  const handleSuccess = (ticker: string) => {
    setIsSaving(false)
    setIsModalOpen(false)
    setSuccessMessage(`Posição em ${ticker} cadastrada.`)
  }

  // Contagem só quando é verdade: com erro e sem cache, "0 posições" afirmaria
  // que a carteira está vazia quando ninguém conseguiu consultá-la.
  const summary = isLoading
    ? 'Carregando posições...'
    : isError && !hasPositions
      ? 'Não foi possível carregar as posições.'
      : `${positions.length} ${positions.length === 1 ? 'posição cadastrada' : 'posições cadastradas'}`

  return (
    <div className="p-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Carteira</h1>
          <p className="mt-1 text-sm text-gray-400">{summary}</p>
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
          <p className="text-sm text-red-400">
            {hasPositions
              ? 'Não foi possível atualizar suas posições. A lista abaixo é a última carregada.'
              : 'Não foi possível carregar suas posições.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 text-sm font-medium text-red-300 underline hover:text-red-200"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Falha de revalidação não apaga o que já estava na tela: esconder a
          lista carregada por causa de um refetch perdido é regressão de
          informação. Sem cache algum, só o banner acima aparece — o estado
          vazio afirmaria uma carteira vazia que não foi verificada. */}
      {isLoading ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : hasPositions || !isError ? (
        <PositionsTable positions={positions} />
      ) : null}

      <Modal
        isOpen={isModalOpen}
        title="Adicionar posição"
        onClose={closeModal}
        dismissible={!isSaving}
      >
        <AddPositionForm
          onSuccess={handleSuccess}
          onCancel={closeModal}
          onBusyChange={setIsSaving}
        />
      </Modal>
    </div>
  )
}
