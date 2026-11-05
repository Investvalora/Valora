import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { titleForPath } from '../utils/pageTitle'

export function PageTitle() {
  const { pathname } = useLocation()
  useEffect(() => { document.title = titleForPath(pathname) }, [pathname])
  return null
}
