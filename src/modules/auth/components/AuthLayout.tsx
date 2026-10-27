import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { Link } from 'react-router-dom'

interface AuthLayoutProps {
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
  prioritizeFormOnMobile?: boolean
  hideHeader?: boolean
}

const highlights = [
  'Cálculos transparentes, com detalhamento de cada critério',
  'Score e preço-teto (Bazin e Graham) personalizáveis',
  'Carteira, proventos e alertas consolidados',
]

export function AuthLayout({ title, description, children, footer, prioritizeFormOnMobile = false, hideHeader = false }: AuthLayoutProps) {
  return (
    <main className="login-page relative min-h-dvh overflow-hidden bg-[#111315] text-white">
      <div className="login-page__glow" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col px-6 py-8 sm:px-10 lg:px-14 lg:py-12">
        <div className={`flex items-center gap-2 text-[15px] font-semibold tracking-[0.08em] ${prioritizeFormOnMobile ? 'justify-center lg:justify-start' : ''}`}>
          <img src="/icons/valora-512.png" alt="" className="h-6 w-6 rounded-[6px] object-contain" />
          VALORA
        </div>

        <div className={`grid flex-1 items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] lg:gap-24 lg:py-0 ${prioritizeFormOnMobile ? 'py-8' : 'py-12'}`}>
          <section className={`max-w-[520px] ${prioritizeFormOnMobile ? 'hidden lg:block' : ''}`}>
            <h1 className="max-w-[440px] text-[36px] font-semibold leading-[1.25] tracking-[-0.02em] sm:text-[44px]">
              Invista com clareza e transparência.
            </h1>
            <p className="mt-5 max-w-[430px] text-[13px] leading-[1.45] text-[#a8adb1]">
              Sua ferramenta de apoio à decisão para investir de forma consciente: indicadores, score e preço-teto em um só lugar.
            </p>
            <ul className="mt-5 space-y-2 text-[12px] text-[#c5c9cc]">
              {highlights.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-[#1e7139] text-[#7ee39a]">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className={`w-full max-w-[420px] justify-self-center rounded-xl border p-7 backdrop-blur-sm lg:justify-self-end ${prioritizeFormOnMobile ? 'border-white/[0.16] bg-[#1b1b1d]/20 shadow-[0_24px_64px_rgba(0,0,0,0.36)] lg:border-white/[0.12] lg:bg-[#1b1b1d]/20 lg:shadow-[0_20px_60px_rgba(0,0,0,0.25)]' : 'border-white/[0.12] bg-[#1b1b1d]/90 shadow-[0_20px_60px_rgba(0,0,0,0.25)]'}`}>
            {!hideHeader && (
              <>
                <h2 className={`font-semibold ${prioritizeFormOnMobile ? 'text-2xl lg:text-lg' : 'text-lg'}`}>{title}</h2>
                <p className={`mt-1 text-[#a0a2a6] ${prioritizeFormOnMobile ? 'text-sm lg:text-xs' : 'text-xs'}`}>{description}</p>
              </>
            )}
            <div className={hideHeader ? '' : 'mt-5'}>{children}</div>
            <div className="mt-5 text-center text-xs text-[#a0a2a6]">{footer}</div>
          </section>
        </div>
        <nav aria-label="Informações do Valora" className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-[#a0a2a6]">
          <Link to="/sobre" className="hover:text-white">Sobre o Valora</Link>
          <Link to="/privacidade" className="hover:text-white">Política de Privacidade</Link>
          <Link to="/termos" className="hover:text-white">Termos de Uso</Link>
        </nav>
      </div>
    </main>
  )
}
