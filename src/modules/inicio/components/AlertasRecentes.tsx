import { ArrowRight, Bell, TrendingUp } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { PanelCard } from '../../../shared/components/PanelCard'

const ALERTAS = [
  {
    id: 1,
    titulo: 'Sobrevalorizado: AAPL',
    detalhe: '99,3% acima do preço-teto Bazin',
    status: 'Novo',
    icon: TrendingUp,
    color: '#FF8FBE',
  },
  {
    id: 2,
    titulo: 'Sobrevalorizado: MXRF11',
    detalhe: '66,8% acima do preço-teto Bazin',
    status: 'Novo',
    icon: TrendingUp,
    color: '#FF8FBE',
  },
  {
    id: 3,
    titulo: 'Alerta de preço: MXRF11',
    detalhe: 'Abaixo de R$ 9,04',
    status: 'Ignorado',
    icon: Bell,
    color: '#7987FF',
  },
]

export function AlertasRecentes() {
  return (
    <PanelCard className="flex w-[420px] shrink-0 flex-col" padding="p-6">
      {/* Cabeçalho */}
      <div className="mb-4 flex items-center gap-3">
        <h2 className="flex-1 text-[15px] font-semibold text-white/80">
          Alertas recentes
        </h2>
        <span
          className="
            rounded-full border border-nf-blue/60
            bg-nf-blue/12 px-2.5 py-0.5
            text-[11px] text-nf-blue
          "
        >
          2 novos
        </span>
      </div>

      {/* Lista */}
      <div className="flex flex-1 flex-col">
        {ALERTAS.map((al, i) => {
          const Icon = al.icon
          const isNovo = al.status === 'Novo'

          return (
            <div
              key={al.id}
              className={`
                flex items-center gap-3 py-2.5
                ${i > 0 ? 'border-t border-white/[0.07]' : ''}
              `}
            >
              {/* Ícone */}
              <span
                className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-lg"
                style={{ background: `${al.color}24` }}
                aria-hidden="true"
              >
                <Icon className="h-4 w-4" strokeWidth={1.8} style={{ color: al.color }} aria-hidden="true" />
              </span>

              {/* Texto */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-white">
                  {al.titulo}
                </p>
                <p className="truncate text-[11px] text-[#8F8F8F]">
                  {al.detalhe}
                </p>
              </div>

              {/* Chip status */}
              {isNovo ? (
                <span
                  className="
                    rounded-full border border-nf-blue/60
                    bg-nf-blue/12 px-2.5 py-0.5
                    text-[11px] text-nf-blue
                  "
                >
                  {al.status}
                </span>
              ) : (
                <span
                  className="
                    rounded-full border border-white/20
                    px-2.5 py-0.5
                    text-[11px] text-[#8F8F8F]
                  "
                >
                  {al.status}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Link rodapé */}
      <div className="mt-4 border-t border-white/[0.07] pt-4">
        <NavLink
          to="/novo/analise"
          className="flex items-center gap-1.5 text-[12px] font-medium text-nf-blue hover:underline"
        >
          Ver todos os alertas
          <ArrowRight className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
        </NavLink>
      </div>
    </PanelCard>
  )
}
