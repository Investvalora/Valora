import { useState, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import { useCreateWallet, useUpdateWallet } from '../hooks/useWallets'
import type { Wallet, WalletColor } from '../services/walletService'
import { walletPalette } from '../walletPalette'

const walletColorOptions = Object.keys(walletPalette) as WalletColor[]

interface WalletFormProps {
  wallet: Wallet | null
  onClose: () => void
  onBusyChange: (busy: boolean) => void
}

export function WalletForm({ wallet, onClose, onBusyChange }: WalletFormProps) {
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
      onClose()
    } catch {
      setError('Não foi possível salvar a carteira. Tente novamente.')
    } finally {
      onBusyChange(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div
        className="flex min-h-28 flex-col justify-between rounded-2xl px-4 py-3 transition-[background-color,box-shadow] duration-200"
        style={{
          backgroundColor: `${selectedPalette.color}e6`,
          color: selectedPalette.textColor,
          boxShadow: `0 0 16px ${selectedPalette.color}33`,
        }}
        aria-label="Prévia da carteira"
      >
        <div className="text-xs font-medium opacity-80">
          Patrimônio total
          <span className="mt-0.5 block text-base font-semibold">R$ 0,00</span>
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
          placeholder="Nome da carteira"
          aria-label="Nome da carteira"
          className="w-full border-none bg-transparent p-0 text-lg font-semibold text-inherit outline-none placeholder:text-inherit placeholder:opacity-50 focus:outline-none focus:ring-0"
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-zinc-300">Cor</legend>
        <div className="flex flex-wrap items-center gap-2 py-1">
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
                  className={`grid h-8 w-8 place-items-center rounded-full border-2 transition-colors duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-white peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#121212] ${selected ? 'border-white' : 'border-transparent active:opacity-80'}`}
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
          disabled={isPending}
          className="min-h-12 rounded-2xl bg-white/[0.06] px-4 font-medium text-zinc-300 transition active:scale-[0.98] disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="min-h-12 rounded-2xl bg-white px-4 font-semibold text-zinc-950 transition active:scale-[0.98] disabled:opacity-50"
        >
          {isPending ? 'Salvando…' : wallet ? 'Salvar' : 'Criar'}
        </button>
      </div>
    </form>
  )
}
