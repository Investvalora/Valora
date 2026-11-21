import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Modal } from '../../../shared/components/Modal'

type ResumoCarteiraPopoverProps = {
  patrimonio: string
  valorInvestido: string
  ganhoCapital: string
  proventos12m: string
  rentabilidade: string
  onClose: () => void
}

/** Mantém o nome público; usa o mesmo painel acessível dos diálogos de informação. */
export function ResumoCarteiraPopover({ patrimonio, valorInvestido, ganhoCapital, proventos12m, rentabilidade, onClose }: ResumoCarteiraPopoverProps) {
  const metrics = [
    { label: 'Patrimônio total', value: patrimonio },
    { label: 'Valor investido', value: valorInvestido },
    { label: 'Ganho de capital', value: ganhoCapital },
    { label: 'Proventos recebidos (12M)', value: proventos12m },
    { label: 'Variação da posição', value: rentabilidade },
  ]
  return (
    <Modal isOpen title="Resumo da carteira" variant="information" onClose={onClose}>
      <dl className="space-y-5">
        {metrics.map(({ label, value }) => (
          <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <dt className="text-sm text-white/55">{label}</dt>
            <dd className="break-words text-base font-medium text-white tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <Link to="/desempenho" onClick={onClose} className="mt-6 flex min-h-11 items-center justify-between gap-3 rounded-xl bg-white/[0.05] px-4 text-sm text-white/85 hover:bg-white/10">
        Ver desempenho <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </Modal>
  )
}
