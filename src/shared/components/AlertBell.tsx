import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'

export function AlertBell({ count = 0, className = '' }: { count?: number; className?: string }) {
  return (
    <Link to="/alertas" aria-label={count > 0 ? `Abrir alertas (${count} novos)` : 'Abrir alertas'}
      className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#393939] transition-colors hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple ${className}`}>
      <Bell className="h-4 w-4 text-white" strokeWidth={1.8} aria-hidden="true" />
      {count > 0 && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#F765A3] text-[9px] font-semibold text-white ring-[1.5px] ring-[#131313]">{count > 9 ? '9+' : count}</span>}
    </Link>
  )
}
