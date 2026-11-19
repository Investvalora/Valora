import { useState } from 'react'
import { Modal } from './Modal'
import { HELP_TOPICS, type HelpTopic } from '../help/topics'

/** Long explanations use the shared dialog: touch, focus trap and focus return. */
export function InformationHelp({ topic }: { topic: HelpTopic }) {
  const [open, setOpen] = useState(false)
  const content = HELP_TOPICS[topic]
  return <>
    <button type="button" aria-label={`Como funciona: ${content.title}`} aria-haspopup="dialog" aria-expanded={open} title={`Como funciona: ${content.title}`} onClick={() => setOpen(true)} className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-blue">
      <span aria-hidden="true" className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border border-current text-xs font-bold leading-none">i</span>
    </button>
    <Modal isOpen={open} title={content.title} onClose={() => setOpen(false)}>
      <div className="space-y-5 text-sm leading-relaxed text-white/75">
        <p>{content.meaning}</p>
        <section><h3 className="mb-2 font-semibold text-white">Como usar e regras</h3><ul className="list-disc space-y-2 pl-5">{content.rules.map(rule => <li key={rule}>{rule}</li>)}</ul></section>
        <section className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-4"><h3 className="mb-2 font-semibold text-white">Exemplo</h3><p>{content.example}</p></section>
      </div>
    </Modal>
  </>
}
