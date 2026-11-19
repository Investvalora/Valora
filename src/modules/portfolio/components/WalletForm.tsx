import { useState, type FormEvent } from 'react'
import { Check, WalletCards } from 'lucide-react'
import { useCreateWallet, useUpdateWallet } from '../hooks/useWallets'
import type { Wallet, WalletColor } from '../services/walletService'
import { walletPalette } from '../walletPalette'

const walletColorOptions = Object.keys(walletPalette) as WalletColor[]

interface WalletFormProps {
  wallet: Wallet | null
  onClose: () => void
  onSaved?: () => void
  onBusyChange: (busy: boolean) => void
}

export function WalletForm({ wallet, onClose, onSaved, onBusyChange }: WalletFormProps) {
  const [name, setName] = useState(wallet?.name ?? '')
  const [color, setColor] = useState<WalletColor>(wallet?.color ?? 'gold')
  const [error, setError] = useState('')
  const createWallet = useCreateWallet()
  const updateWallet = useUpdateWallet()
  const isPending = createWallet.isPending || updateWallet.isPending
  const selectedPalette = walletPalette[color]

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Informe um nome para a carteira.')
      return
    }

    onBusyChange(true)
    try {
      if (wallet) {
        await updateWallet.mutateAsync({ walletId: wallet.id, name: trimmedName, color })
      } else {
        await createWallet.mutateAsync({ name: trimmedName, color })
      }
      if (onSaved) onSaved()
      else onClose()
    } catch {
      setError('Não foi possível salvar a carteira. Tente novamente.')
    } finally {
      onBusyChange(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="space-y-2">
      <label htmlFor="wallet-name" className="block text-xs text-white/60">Nome da carteira</label>
      <div
        className="flex min-h-32 flex-col justify-between rounded-2xl px-5 py-4 transition-[background-color,box-shadow] duration-200 motion-reduce:transition-none"
        style={{
          backgroundColor: `${selectedPalette.color}e6`,
          color: selectedPalette.textColor,
          boxShadow: `0 0 16px ${selectedPalette.color}33`,
        }}
        aria-label="Prévia da carteira"
      >
        <div className="flex items-center justify-between text-[11px] opacity-70">
          <span>{wallet?.is_default ? 'Carteira principal' : 'Sua carteira'}</span>
          <WalletCards className="h-4 w-4" aria-hidden="true" />
        </div>
        <input
          id="wallet-name"
          value={name}
          maxLength={60}
          autoFocus
          onChange={(event) => {
            setName(event.target.value)
            if (error) setError('')
          }}
          placeholder="Ex.: Reserva de emergência"
          aria-label="Nome da carteira"
          className="w-full border-none bg-transparent p-0 text-lg font-medium text-inherit outline-none placeholder:text-inherit placeholder:opacity-50 focus:outline-none focus:ring-0"
        />
      </div>
      </div>

      <fieldset>
        <legend className="mb-3 w-full text-xs text-white/60">Cor da carteira <span className="float-right text-white/40">{selectedPalette.label}</span></legend>
        <div className="flex flex-wrap items-center gap-2.5 py-1">
          {walletColorOptions.map((option) => {
            const selected = color === option
            return (
              <label key={option} className="flex shrink-0 cursor-pointer items-center justify-center">
                <input
                  type="radio"
                  name="wallet-color"
                  value={option}
                  checked={selected}
                  onChange={() => setColor(option)}
                  className="peer sr-only"
                  aria-label={walletPalette[option].label}
                />
                <span
                  className={`grid h-9 w-9 place-items-center rounded-full border-2 transition-colors duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-white peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#121212] ${selected ? 'border-white' : 'border-transparent active:opacity-80'}`}
                  style={{
                    backgroundColor: walletPalette[option].color,
                    color: walletPalette[option].textColor,
                  }}
                >
                  {selected && <Check className="h-4 w-4" strokeWidth={3} />}
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={onClose}
          aria-busy={isPending}
          disabled={isPending}
          className="min-h-12 rounded-xl bg-white/[0.06] px-4 text-sm font-medium text-zinc-300 transition active:scale-[0.98] disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          aria-busy={isPending}
          disabled={isPending}
          className="min-h-12 rounded-xl bg-white px-4 text-sm font-medium text-zinc-950 transition active:scale-[0.98] disabled:opacity-50"
        >
          {isPending ? 'Salvando…' : wallet ? 'Salvar' : 'Criar'}
        </button>
      </div>
    </form>
  )
}
