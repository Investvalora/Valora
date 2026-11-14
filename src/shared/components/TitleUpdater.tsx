import { useTitle } from '../hooks/useTitle'

/**
 * Componente que deve ser renderizado dentro do BrowserRouter
 * para atualizar o título da página automaticamente.
 *
 * Não renderiza nada no DOM, apenas executa o efeito do hook.
 */
export function TitleUpdater() {
  useTitle()
  return null
}
