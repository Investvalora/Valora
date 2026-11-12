import { useId } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { AlertCondition } from "../types";

const conditions = [
  {
    value: "below",
    label: "Abaixo de",
    Icon: TrendingDown,
    iconClass: "text-nf-green",
    accentClass: "accent-nf-green",
    selectedClass: "border-nf-green/50 bg-nf-green/10 text-nf-green",
  },
  {
    value: "above",
    label: "Acima de",
    Icon: TrendingUp,
    iconClass: "text-nf-pink",
    accentClass: "accent-nf-pink",
    selectedClass: "border-nf-pink/50 bg-nf-pink/10 text-nf-pink",
  },
] as const;

export function PriceAlertConditionField({
  value,
  onChange,
}: {
  value: AlertCondition;
  onChange: (value: AlertCondition) => void;
}) {
  const name = useId();

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-medium text-white/80">
        Condição do alerta
      </legend>
      <div className="grid grid-cols-2 gap-2">
        {conditions.map(
          ({
            value: option,
            label,
            Icon,
            iconClass,
            accentClass,
            selectedClass,
          }) => (
            <label
              key={option}
              className={`flex min-h-12 cursor-pointer items-center gap-1.5 rounded-xl border px-2 text-sm font-semibold transition-colors focus-within:ring-2 focus-within:ring-white/60 sm:gap-2 sm:px-3 ${
                value === option
                  ? selectedClass
                  : "border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.07]"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option}
                checked={value === option}
                onChange={() => onChange(option)}
                className={`size-3.5 shrink-0 ${accentClass}`}
              />
              <Icon
                size={16}
                className={`shrink-0 ${iconClass}`}
                aria-hidden="true"
              />
              {label}
            </label>
          ),
        )}
      </div>
    </fieldset>
  );
}

export function PriceAlertActions({
  onCancel,
  pending,
}: {
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <div className="flex items-center gap-2 border-t border-white/10 pt-4">
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 flex-[2] rounded-xl bg-nf-blue px-3 text-sm font-semibold text-[#131313] transition-colors hover:bg-[#a5a9ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#181818] disabled:opacity-50"
      >
        {pending ? "Criando…" : "Criar alerta"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="min-h-12 flex-1 rounded-xl border border-white/15 px-3 text-sm font-medium text-white/75 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-50"
      >
        Cancelar
      </button>
    </div>
  );
}
