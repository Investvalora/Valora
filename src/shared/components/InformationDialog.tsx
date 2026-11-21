import { Lightbulb } from 'lucide-react'
import { Modal } from './Modal'

type InformationDialogProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  meaning: string
  rules: readonly string[]
  example: string
}

/** Apresentação compartilhada das ajudas: painel inferior mobile e diálogo desktop. */
export function InformationDialog({ isOpen, onClose, title, meaning, rules, example }: InformationDialogProps) {
  return <Modal isOpen={isOpen} onClose={onClose} title={title} variant="information" informationExpandable>
    <div className="space-y-6">
      <p className="text-[13px] leading-6 text-white/60">{meaning}</p>

      <section aria-label="Como usar e regras">
        <h3 className="mb-1 text-[11px] font-medium text-white/50">Como usar</h3>
        <ol className="divide-y divide-white/[0.06]">
          {rules.map((rule, index) => <li key={rule} className="flex gap-3 py-3 first:pt-2 last:pb-0">
            <span aria-hidden="true" className="pt-0.5 text-[10px] font-medium leading-5 text-white/25 tabular-nums">{String(index + 1).padStart(2, '0')}</span>
            <p className="min-w-0 text-[13px] leading-6 text-white/65">{rule}</p>
          </li>)}
        </ol>
      </section>

      <section aria-label="Exemplo" className="rounded-2xl border border-violet-300/[0.08] bg-violet-300/[0.04] p-4">
        <h3 className="mb-2 flex items-center gap-2 text-xs font-medium text-violet-200/75">
          <Lightbulb className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden="true" />
          Exemplo
        </h3>
        <p className="text-[13px] leading-6 text-white/60">{example}</p>
      </section>
    </div>
  </Modal>
}
