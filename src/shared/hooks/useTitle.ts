import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { titleForPath } from '../utils/pageTitle'

/**
 * Hook que atualiza automaticamente o título da aba do navegador
 * baseado na rota atual.
 *
 * Deve ser chamado uma vez no componente raiz (App ou layout principal).
 */
export function useTitle() {
  const { pathname } = useLocation()

  useEffect(() => {
    const title = titleForPath(pathname)
    document.title = title
  }, [pathname])
}
