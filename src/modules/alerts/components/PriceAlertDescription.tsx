import { TrendingDown, TrendingUp } from "lucide-react";
import type { Alert } from "../types";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function PriceAlertDescription({ alert }: { alert: Alert }) {
  if (
    alert.type !== "price_target" ||
    alert.target_price == null ||
    alert.condition == null
  ) {
    return <>{alert.description}</>;
  }

  const customDescription = alert.description
    .replace(/(?:^|\.\s*)notificar quando[^.]*\.?/i, "")
    .trim();
  const isBelow = alert.condition === "below";

  return (
    <>
      {customDescription && <>{customDescription.replace(/\.?\s*$/, "")}. </>}
      Avisar quando estiver{" "}
      {isBelow ? "abaixo de" : "acima de"}{" "}
      <span className="mx-0.5 inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 align-middle text-[11px] font-medium">
        {isBelow ? (
          <TrendingDown className="h-3 w-3 text-nf-green" aria-hidden="true" />
        ) : (
          <TrendingUp className="h-3 w-3 text-nf-pink" aria-hidden="true" />
        )}
        <span className="text-white/70">
          {currencyFormatter.format(alert.target_price)}
        </span>
      </span>.
    </>
  );
}
