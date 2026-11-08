export function FormDraftNotice({ available, storageFailed, onRestore, onDiscard }: {
  available: boolean; storageFailed: boolean; onRestore: () => void; onDiscard: () => void
}) {
  return <>
    {available && <div role="status" className="w-full rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-white/80">
      <p>Há um rascunho deste formulário nesta sessão. Restaurar não envia nem salva os dados.</p>
      <div className="mt-2 flex flex-wrap gap-3">
        <button type="button" onClick={onRestore} className="min-h-11 text-nf-purple underline">Restaurar rascunho</button>
        <button type="button" onClick={onDiscard} className="min-h-11 underline">Descartar rascunho</button>
      </div>
    </div>}
    {storageFailed && <p role="status" className="w-full text-sm text-white/70">Não foi possível guardar o rascunho neste navegador. Mantenha o formulário aberto até concluir.</p>}
  </>
}
