import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { ASSET_COLUMNS, DEFAULT_ASSET_COLUMNS, type AssetColumnId } from '../hooks/useAssetColumns'

export function AssetColumnEditor({ columns, onSave, onClose }: {
  columns: AssetColumnId[]
  onSave: (columns: AssetColumnId[]) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(() => new Set(columns))
  const dirty = ASSET_COLUMNS.some((column) => draft.has(column.id) !== columns.includes(column.id))
  return (
    <Modal isOpen title="Editar colunas" variant="score" onClose={onClose}>
      <p className="mb-6 text-sm text-white/50">Escolha as colunas que deseja visualizar na tabela. Ativo e quantidade ficam sempre visíveis.</p>
      <div className="space-y-6">
        {[...new Set(ASSET_COLUMNS.map((column) => column.group))].map((group) => (
          <fieldset key={group} className="border-b border-white/10 pb-6">
            <legend className="mb-4 text-sm font-semibold text-white/80">{group}</legend>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              {ASSET_COLUMNS.filter((column) => column.group === group).map((column) => {
                const locked = 'locked' in column && column.locked
                return <label key={column.id} className={`flex items-start gap-2 text-sm ${locked ? 'text-white/35' : 'cursor-pointer text-white/80'}`}>
                  <input type="checkbox" checked={draft.has(column.id)} disabled={locked} className="mt-0.5 h-4 w-4 shrink-0 accent-[#7987FF]" onChange={() => setDraft((previous) => {
                    const next = new Set(previous)
                    if (next.has(column.id)) next.delete(column.id); else next.add(column.id)
                    return next
                  })} />{column.label}
                </label>
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <p className="my-4 text-xs text-white/40">Quando não houver dados para um indicador, a tabela exibirá —.</p>
      <div className="sticky bottom-0 -mx-6 -mb-6 flex items-center justify-between gap-3 border-t border-white/10 bg-[#1c1c1c] p-5">
        <button type="button" onClick={() => setDraft(new Set(DEFAULT_ASSET_COLUMNS))} className="text-sm text-nf-blue">Restaurar padrão</button>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="text-sm text-white/60">Cancelar</button>
          <button type="button" disabled={!dirty} onClick={() => { onSave([...draft]); onClose() }} className="rounded-lg bg-nf-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-40">Salvar</button>
        </div>
      </div>
    </Modal>
  )
}
