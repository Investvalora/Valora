/**
 * MobileAuthLayout — wrapper visual compartilhado pelas telas mobile de auth.
 * Fornece: fundo preto, gradiente suave azul+verde espalhado, logo centralizada.
 */
import type { ReactNode } from 'react'

// SVG da logo Valora sem borda
export function ValoraLogoSvg({ id = 'auth-v-gradient' }: { id?: string }) {
  return (
    <svg width="56" height="56" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5cc8ff" />
          <stop offset="1" stopColor="#3f7dff" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="128" height="128" rx="28" fill="#101822" />
      <path
        d="M32 76L52 52L70 68L96 36"
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="96" cy="36" r="6" fill="#5cc8ff" />
    </svg>
  )
}

// SVG logo do Google (oficial)
export function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"/>
    </svg>
  )
}

// Classes de input / botão reutilizáveis para as telas mobile
export const mobileInput =
  'h-14 w-full rounded-2xl border border-white/[0.10] bg-white/[0.07] px-4 text-[15px] text-white placeholder-white/30 outline-none transition-[border-color,box-shadow] focus:border-[#3b82f6]/70 focus:bg-white/[0.10] focus:ring-1 focus:ring-[#3b82f6]/25'

export const mobilePrimaryBtn =
  'h-14 w-full rounded-2xl bg-[#2563eb] text-[16px] font-bold text-white shadow-[0_4px_20px_rgba(37,99,235,0.25)] transition-opacity hover:opacity-90 disabled:opacity-50'

export const mobileFieldError = 'mt-1.5 px-1 text-xs text-rose-300'

export const mobileErrorBox =
  'rounded-xl border border-rose-400/25 bg-rose-400/[0.08] px-4 py-3 text-sm text-rose-200'

export const mobileSuccessBox =
  'rounded-xl border border-emerald-400/25 bg-emerald-400/[0.08] px-4 py-3 text-sm text-emerald-200'

export const mobileAccentLink =
  'font-semibold text-[#60a5fa] transition-opacity hover:opacity-80'

interface MobileAuthLayoutProps {
  children: ReactNode
  logoId?: string
}

export function MobileAuthLayout({ children, logoId = 'auth-v-gradient' }: MobileAuthLayoutProps) {
  return (
    <main
      className="relative flex min-h-dvh flex-col text-white"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >

      {/* Logo + nome */}
      <div className="relative flex flex-col items-center pt-14 pb-8">
        <div className="mb-3 grid h-14 w-14 place-items-center overflow-hidden rounded-[16px]">
          <ValoraLogoSvg id={logoId} />
        </div>
        <span className="text-[12px] font-semibold tracking-[0.2em] text-white/50">VALORA</span>
      </div>

      {/* Conteúdo da tela */}
      <div className="relative flex flex-1 flex-col px-6">
        {children}
      </div>
    </main>
  )
}
