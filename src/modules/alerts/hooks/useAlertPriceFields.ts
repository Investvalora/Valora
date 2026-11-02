import { useCallback, useEffect, useRef, useState } from 'react'
import { useAssetSearch } from '../../portfolio/hooks/useAssetSearch'
import type { Asset } from '../../portfolio/types'
import { alertQuoteService } from '../services/alertQuoteService'

export function useAlertPriceFields({ ticker, price, onTickerChange, onPriceChange, initialTicker = '' }: {
  ticker: string; price: string; onTickerChange: (value: string) => void; onPriceChange: (value: string) => void; initialTicker?: string
}) {
  const [term, setTerm] = useState(ticker)
  useEffect(() => { const timer = setTimeout(() => setTerm(ticker), 250); return () => clearTimeout(timer) }, [ticker])
  const search = useAssetSearch(term)
  const [selected, setSelected] = useState<Asset | null>(null)
  const [show, setShow] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const [quote, setQuote] = useState<{ price: number; date?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const request = useRef(0)
  const edits = useRef(0)
  const selectedTicker = useRef('')
  const cancelRequest = useCallback(() => { request.current++ }, [])
  const suggestions = ticker === term && ticker.trim().length >= 2 ? search.data ?? [] : []
  useEffect(() => { setHighlighted(previous => Math.min(previous, suggestions.length - 1)) }, [suggestions.length])

  const loadQuote = useCallback(async (asset: Asset, revision = edits.current) => {
    const id = ++request.current
    setLoading(true)
    setError('')
    try {
      const result = await alertQuoteService.getQuote(asset.ticker)
      if (id !== request.current) return
      setQuote(result)
      if (result && revision === edits.current) onPriceChange(String(result.price))
      if (!result) setError('Cotação indisponível. Você pode informar o preço-alvo manualmente.')
    } catch {
      if (id === request.current) setError('Não foi possível buscar a cotação. Seu preço-alvo foi mantido; tente novamente ou informe-o manualmente.')
    } finally {
      if (id === request.current) setLoading(false)
    }
  }, [onPriceChange])

  useEffect(() => {
    if (!initialTicker) return
    const id = ++request.current
    const revision = edits.current
    setLoading(true)
    void alertQuoteService.resolveAsset(initialTicker).then(asset => {
      if (id !== request.current) return
      if (asset) {
        selectedTicker.current = asset.ticker
        setSelected(asset)
        void loadQuote(asset, revision)
      } else {
        setLoading(false)
        setError('Selecione o ativo na busca para carregar a cotação.')
      }
    }).catch(() => {
      if (id === request.current) { setLoading(false); setError('Não foi possível carregar o ativo. Tente selecioná-lo na busca.') }
    })
    return cancelRequest
  }, [initialTicker, loadQuote, cancelRequest])
  useEffect(() => cancelRequest, [cancelRequest])

  function changeTicker(value: string) {
    request.current++
    edits.current++
    selectedTicker.current = ''
    setSelected(null); setQuote(null); setError(''); setLoading(false)
    setShow(true); setHighlighted(-1)
    onTickerChange(value); onPriceChange('')
  }
  function select(asset: Asset) {
    setShow(false); setHighlighted(-1)
    if (selectedTicker.current === asset.ticker) return
    edits.current++
    selectedTicker.current = asset.ticker
    setSelected(asset); setQuote(null)
    onTickerChange(asset.ticker); onPriceChange('')
    void loadQuote(asset)
  }
  function changePrice(value: string) { edits.current++; onPriceChange(value) }

  return { ticker, price, suggestions, selected, show, setShow, highlighted, setHighlighted, select, changeTicker, changePrice,
    quote, loading, error, refresh: () => { if (selected) void loadQuote(selected) } }
}

export type AlertPriceModel = ReturnType<typeof useAlertPriceFields>
