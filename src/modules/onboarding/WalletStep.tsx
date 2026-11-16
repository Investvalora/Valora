import { useState } from "react";
import { Check, Pencil, Plus, WalletCards } from "lucide-react";
import { WalletEditorDialog } from "../portfolio/components/WalletEditorDialog";
import { useWallets } from "../portfolio/hooks/useWallets";
import type { Wallet } from "../portfolio/services/walletService";
import { walletPalette } from "../portfolio/walletPalette";
import { primaryButton } from "./styles";

export function WalletStep() {
  const { wallets, selectedWallet, selectWallet, isLoading, isError, refetch } =
    useWallets();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Wallet | null>(null);
  const [message, setMessage] = useState("");

  function openEditor(wallet: Wallet | null) {
    setEditing(wallet);
    setEditorOpen(true);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <p className="max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
        Separe seus investimentos por objetivo e escolha qual carteira quer
        acompanhar.
      </p>
      <button
        type="button"
        onClick={() => openEditor(null)}
        className={primaryButton}
      >
        <Plus size={18} aria-hidden="true" /> Criar minha carteira
      </button>
      {isLoading && (
        <p role="status" className="text-sm text-white/70">
          Carregando carteiras…
        </p>
      )}
      {isError && (
        <button
          type="button"
          onClick={() => void refetch()}
          className="min-h-11 text-sm text-[#5cc8ff] underline"
        >
          Tentar carregar as carteiras novamente
        </button>
      )}
      {!isLoading &&
        !isError &&
        (wallets.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <WalletCards
              size={22}
              className="shrink-0 text-[#5cc8ff]"
              aria-hidden="true"
            />
            <p className="text-sm text-white/75">
              Dê um nome e escolha uma cor para sua primeira carteira.
            </p>
          </div>
        ) : (
          <ul
            aria-label="Suas carteiras"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {wallets.map((wallet) => {
              const palette = walletPalette[wallet.color];
              const selected = selectedWallet?.id === wallet.id;
              return (
                <li
                  key={wallet.id}
                  className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#1c1c1c]"
                >
                  <div
                    className="flex min-h-20 flex-col justify-between gap-2 px-4 py-3"
                    style={{
                      backgroundColor: palette.color,
                      color: palette.textColor,
                    }}
                  >
                    <span className="text-xs font-medium">
                      {wallet.is_default ? "Carteira principal" : "Carteira"}
                    </span>
                    <h2 className="break-words font-semibold">{wallet.name}</h2>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1 px-2">
                    {selected ? (
                      <span className="inline-flex items-center gap-1.5 px-2 text-xs text-white/80">
                        <Check size={13} aria-hidden="true" /> Selecionada
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => selectWallet(wallet.id)}
                        aria-label={`Selecionar ${wallet.name}`}
                        className="min-h-11 rounded-lg px-2 text-xs text-white/80 hover:bg-white/10"
                      >
                        Selecionar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditor(wallet)}
                      aria-label={`Editar ${wallet.name}`}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs text-white/80 hover:bg-white/10"
                    >
                      <Pencil size={13} aria-hidden="true" /> Editar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ))}
      {message && (
        <p role="status" className="text-sm text-nf-green">
          {message}
        </p>
      )}
      <WalletEditorDialog
        isOpen={editorOpen}
        wallet={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={() => {
          setMessage(
            editing
              ? "Carteira atualizada."
              : "Carteira criada. Você pode acessá-la em Carteiras.",
          );
          setEditorOpen(false);
        }}
      />
    </div>
  );
}
