/**
 * AnalisePage — tela do novo fluxo desktop.
 * Layout 3 colunas: Score Fundamentalista | Alertas | Proventos
 * Reutiliza o Modal + ScoreRuleForm já existentes.
 */
import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { ScoreRuleForm } from '../../score/components/ScoreRuleForm'
import type { ScoreRule } from '../../score/types'
import { ScoreCol } from './ScoreCol'
import { AlertasCol } from './AlertasCol'
import { ProventosCol } from './ProventosCol'

export function AnalisePage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<ScoreRule | undefined>(undefined)
  const [isSaving, setIsSaving] = useState(false)

  const openCreate = () => { setEditingRule(undefined); setIsModalOpen(true) }
  const openEdit = (rule: ScoreRule) => { setEditingRule(rule); setIsModalOpen(true) }
  const closeModal = () => { if (isSaving) return; setIsModalOpen(false); setEditingRule(undefined) }

  return (
    <div className="flex flex-col gap-5 pt-2">
      {/* ── Cabeçalho ── */}
      <div className="flex items-center gap-3">
        <h1 className="text-[22px] font-semibold text-white">Análise</h1>
      </div>

      {/* ── 3 colunas ── */}
      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: '1fr 1fr 1fr', minHeight: '700px' }}
      >
        {/* Coluna 1 — Score */}
        <ScoreCol onNewRule={openCreate} onEditRule={openEdit} />

        {/* Coluna 2 — Alertas */}
        <AlertasCol />

        {/* Coluna 3 — Proventos */}
        <ProventosCol />
      </div>

      {/* Modal reutilizado do ScorePage */}
      <Modal
        isOpen={isModalOpen}
        title={editingRule ? 'Editar Regra' : 'Nova Regra de Score'}
        onClose={closeModal}
        dismissible={!isSaving}
      >
        <ScoreRuleForm
          editingRule={editingRule}
          onSuccess={closeModal}
          onCancel={closeModal}
          onBusyChange={setIsSaving}
        />
      </Modal>
    </div>
  )
}
