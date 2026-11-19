import type { Wallet } from "../services/walletService";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function WalletsTotal({
  wallets,
  totals,
  isLoading,
  isError,
}: {
  wallets: Wallet[];
  totals: Map<string, number | null>;
  isLoading: boolean;
  isError: boolean;
}) {
  const complete = wallets.every((wallet) => totals.get(wallet.id) !== null);
  const total = wallets.reduce(
    (sum, wallet) => sum + (totals.get(wallet.id) ?? 0),
    0,
  );
  return (
    <section aria-label="Total de todas as carteiras" className="mb-6">
      <p className="text-xs text-white/50">Patrimônio em todas as carteiras</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-white tabular-nums">
        {isLoading
          ? "Carregando…"
          : isError
            ? "Indisponível"
            : !complete
              ? "—"
              : money.format(total)}
      </p>
      {!isLoading && !isError && !complete && (
        <p className="mt-1 text-xs text-white/40">
          Aguardando a avaliação completa das carteiras.
        </p>
      )}
    </section>
  );
}
