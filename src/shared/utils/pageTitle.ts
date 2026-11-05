const TITLES: Record<string, string> = {
  '/': 'Início', '/inicio': 'Início', '/carteira': 'Ativos', '/carteiras': 'Carteiras',
  '/login': 'Entrar', '/cadastro': 'Criar conta', '/signup': 'Criar conta',
  '/recuperar-senha': 'Recuperar senha', '/reset-password': 'Redefinir senha',
  '/sobre': 'Sobre', '/privacidade': 'Privacidade', '/termos': 'Termos de uso', '/conta': 'Minha conta',
  '/ativos': 'Ativos', '/ativos/posicoes': 'Posições', '/ativos/composicao': 'Composição',
  '/ativos/lancamentos': 'Lançamentos', '/lancamentos': 'Lançamentos', '/patrimonio': 'Patrimônio',
  '/desempenho': 'Desempenho', '/desempenho/visao-geral': 'Desempenho',
  '/desempenho/rentabilidade': 'Rentabilidade', '/rentabilidade': 'Rentabilidade',
  '/desempenho/proventos': 'Proventos', '/proventos': 'Proventos', '/analise': 'Análise',
  '/analise/visao-geral': 'Análise', '/analise/score': 'Score', '/score': 'Score',
  '/analise/score/nova': 'Nova regra', '/analise/estrategias': 'Estratégias', '/estrategias': 'Estratégias',
  '/analise/estrategias/nova': 'Nova estratégia', '/analise/estrategias/novo': 'Novo insight',
  '/analise/alertas': 'Alertas', '/alertas': 'Alertas',
}

export function titleForPath(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/'
  let title = TITLES[path]
  if (!title && /^\/analise\/score\/[^/]+\/editar$/.test(path)) title = 'Editar regra'
  const asset = /^\/ativo\/([^/]+)$/.exec(path)
  if (asset) {
    try {
      const ticker = decodeURIComponent(asset[1]).toUpperCase()
      title = /^[A-Z0-9.^-]{1,30}$/.test(ticker) ? ticker : 'Resumo do ativo'
    } catch { title = 'Resumo do ativo' }
  }
  return `${title ?? 'Página não encontrada'} | Valora`
}
