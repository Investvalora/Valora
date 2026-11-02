import type { AlertPriceModel as Model } from '../hooks/useAlertPriceFields'
import { assetClassLabel } from '../../portfolio/composition'

const inputStyle = 'min-h-12 w-full rounded-xl border border-white/20 bg-[#202020] px-3.5 py-2.5 text-base text-white placeholder:text-[#A0A0A5] focus:border-nf-blue focus:outline-none focus:ring-0 md:min-h-11 md:border-white/[0.12] md:bg-[#131313] md:text-sm'

export function AlertAssetField({ model }: { model: Model }) {
  const open = model.show && model.suggestions.length > 0
  return <div className="relative w-full md:min-w-[140px] md:flex-1">
    <label htmlFor="alert-asset-ticker" className="mb-2 block text-sm text-white/80">Ativo (ticker)</label>
    <input id="alert-asset-ticker" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls="alert-asset-suggestions"
      aria-activedescendant={open && model.highlighted >= 0 ? `alert-asset-option-${model.highlighted}` : undefined}
      autoComplete="off" placeholder="Ticker ou nome, ex.: MXRF11" value={model.ticker} required
      onChange={event => model.changeTicker(event.target.value)} onFocus={() => model.setShow(true)} onBlur={() => model.setShow(false)}
      onClick={() => model.setShow(true)}
      onKeyDown={event => {
        if (event.key === 'Escape' && open) { event.stopPropagation(); model.setShow(false); return }
        if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && model.suggestions.length) {
          event.preventDefault(); model.setShow(true)
          const direction = event.key === 'ArrowDown' ? 1 : -1
          model.setHighlighted(previous => previous < 0 ? (direction > 0 ? 0 : model.suggestions.length - 1) : (previous + direction + model.suggestions.length) % model.suggestions.length)
        }
        if (event.key === 'Enter' && open) {
          event.preventDefault()
          const asset = model.suggestions[model.highlighted >= 0 ? model.highlighted : 0]
          if (asset) { model.select(asset); document.getElementById('alert-target-price')?.focus() }
        }
      }} className={inputStyle} />
    {open && <ul id="alert-asset-suggestions" role="listbox" aria-label="Ativos do catálogo" className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-white/15 bg-[#242424] p-1 shadow-xl">
      {model.suggestions.map((asset,index) => <li id={`alert-asset-option-${index}`} key={asset.ticker} role="option" aria-selected={index === model.highlighted}
        onMouseDown={event => event.preventDefault()} onMouseEnter={() => model.setHighlighted(index)} onClick={() => { model.select(asset); document.getElementById('alert-target-price')?.focus() }}
        className={`cursor-pointer rounded-lg px-3 py-2.5 ${index === model.highlighted ? 'bg-white/10' : 'hover:bg-white/5'}`}>
        <span className="block text-sm font-semibold text-white">{asset.ticker}</span><span className="block break-words text-sm text-white/65">{asset.name}</span><span className="block text-xs text-white/50">{assetClassLabel(asset.type)} · {asset.currency}</span>
      </li>)}
    </ul>}
  </div>
}

export function AlertTargetPriceField({ model }: { model: Model }) {
  const currency = model.selected?.currency ?? 'BRL'
  return <div className="w-full md:min-w-[140px] md:flex-1">
    <label htmlFor="alert-target-price" className="mb-2 block text-sm text-white/80">Preço-alvo ({currency === 'USD' ? 'US$' : 'R$'})</label>
    <input id="alert-target-price" type="number" inputMode="decimal" min="0.0001" step="0.0001" required value={model.price}
      onChange={event => model.changePrice(event.target.value)} className={inputStyle} />
    <p className="mt-2 text-xs leading-relaxed text-white/60">Selecione o ativo para preencher uma vez. Depois, ajuste o preço-alvo livremente.</p>
    {model.quote && <p className="mt-2 text-xs text-white/65">Última cotação disponível: {new Intl.NumberFormat('pt-BR', { style: 'currency',currency,maximumFractionDigits: 8 }).format(model.quote.price)}{model.quote.date ? ` (${model.quote.date.split('-').reverse().join('/')})` : ''}.</p>}
    {model.loading && <p role="status" className="mt-2 text-xs text-white/65">Buscando cotação…</p>}
    {model.error && <p role="status" className="mt-2 text-xs text-amber-200">{model.error}</p>}
    <button type="button" disabled={!model.selected || model.loading} onClick={model.refresh} className="mt-2 min-h-11 rounded-lg border border-white/15 px-3 text-sm text-white/80 hover:bg-white/5 disabled:opacity-40">Atualizar cotação</button>
  </div>
}
