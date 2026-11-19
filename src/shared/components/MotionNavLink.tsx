import { flushSync } from 'react-dom'
import { NavLink, useLocation, useNavigate, useResolvedPath, type NavLinkProps } from 'react-router-dom'

let activeTransition: ViewTransition | null = null
/** Native snapshots provide exit/enter without retaining live duplicate forms. */
export function MotionNavLink({ onClick, to, ...props }: NavLinkProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const resolved = useResolvedPath(to)
  return <NavLink {...props} to={to} onClick={event => {
    onClick?.(event)
    if (event.defaultPrevented || event.button !== 0 || event.detail === 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target || props.reloadDocument || props.download ||
      !document.startViewTransition || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      `${location.pathname}${location.search}${location.hash}` === `${resolved.pathname}${resolved.search}${resolved.hash}`) return
    event.preventDefault()
    activeTransition?.skipTransition()
    document.documentElement.dataset.viewTransition = 'true'
    const go = () => navigate(to, { replace: props.replace, state: props.state, relative: props.relative, preventScrollReset: props.preventScrollReset })
    let transition: ViewTransition
    try { transition = document.startViewTransition(() => flushSync(go)) }
    catch { delete document.documentElement.dataset.viewTransition; go(); return }
    activeTransition = transition
    void transition.ready.catch(() => {})
    void transition.finished.catch(() => {}).finally(() => {
      if (activeTransition === transition) {
        activeTransition = null
        delete document.documentElement.dataset.viewTransition
      }
    })
  }} />
}
