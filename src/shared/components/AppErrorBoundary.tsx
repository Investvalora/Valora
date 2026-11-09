import { Component, type ReactNode } from 'react'

export function isChunkError(error: Error) {
  return /ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed|Unable to preload CSS/i.test(error.message)
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null; online: boolean }> {
  state: { error: Error | null; online: boolean } = { error: null, online: navigator.onLine }
  static getDerivedStateFromError(error: Error) { return { error } }
  private updateConnection = () => this.setState({ online: navigator.onLine })
  componentDidMount() {
    window.addEventListener('online', this.updateConnection)
    window.addEventListener('offline', this.updateConnection)
  }
  componentWillUnmount() {
    window.removeEventListener('online', this.updateConnection)
    window.removeEventListener('offline', this.updateConnection)
  }
  render() {
    const error = this.state.error
    if (!error) return this.props.children
    const offline = !this.state.online
    const chunk = isChunkError(error)
    return (
      <main role="alert" className="flex min-h-screen items-center justify-center bg-[#111111] p-6 text-white">
        <section className="w-full max-w-md rounded-[14px] border border-white/[0.08] bg-[#1B1B1B] p-6">
          <h1 className="text-xl font-semibold">{offline ? 'Sem conexão' : chunk ? 'Não foi possível carregar esta tela' : 'Ocorreu um erro nesta tela'}</h1>
          <p className="mt-3 text-sm text-white/60">{offline ? 'Conecte-se à internet e tente novamente.' : chunk ? 'Um recurso do aplicativo não ficou disponível. Recarregue para buscar a versão atual.' : 'Tente abrir a tela novamente.'}</p>
          <p className="mt-3 text-sm text-white/60">Campos não salvos nesta tela podem precisar ser preenchidos novamente. Nenhuma operação será reenviada automaticamente.</p>
          <button type="button" disabled={chunk && offline} className="mt-5 min-h-11 rounded-full bg-white px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple" onClick={() => chunk ? window.location.reload() : this.setState({ error: null })}>{chunk && offline ? 'Aguardando conexão' : chunk ? 'Recarregar aplicativo' : 'Tentar novamente'}</button>
        </section>
      </main>
    )
  }
}
