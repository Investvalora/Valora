import type { ReactNode } from 'react'

type PanelCardProps = {
  children: ReactNode
  className?: string
  /** Padding interno — padrão p-6 */
  padding?: string
}

export function PanelCard({
  children,
  className = '',
  padding = 'p-6',
}: PanelCardProps) {
  return (
    <div
      className={`
        rounded-[14px] border border-white/[0.08]
        bg-[#1B1B1B]
        ${padding}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
