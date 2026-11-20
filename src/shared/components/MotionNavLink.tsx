import { NavLink, type NavLinkProps } from 'react-router-dom'

/** Keep navigation independent of full-page snapshots and synchronous React flushes.
 * MotionRegion supplies the short, non-blocking entrance after normal navigation. */
export function MotionNavLink(props: NavLinkProps) {
  return <NavLink {...props} />
}
