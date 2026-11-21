import { useState } from 'react'
import { InformationDialog } from './InformationDialog'
import { Info } from 'lucide-react'
import { HELP_TOPICS, type HelpTopic } from '../help/topics'

/** Long explanations use the shared dialog: touch, focus trap and focus return. */
export function InformationHelp({ topic }: { topic: HelpTopic }) {
  const [open, setOpen] = useState(false)
  const content = HELP_TOPICS[topic]
  return <>
    <button type="button" aria-label={`Como funciona: ${content.title}`} aria-haspopup="dialog" aria-expanded={open} title={`Como funciona: ${content.title}`} onClick={() => setOpen(true)} className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-blue">
      <Info className="h-[17px] w-[17px]" strokeWidth={1.6} aria-hidden="true" />
    </button>
    <InformationDialog isOpen={open} onClose={() => setOpen(false)} {...content} />
  </>
}
