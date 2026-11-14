/**
 * Extrai a inicial de um ativo para exibição em avatares.
 * Usa o ticker como fonte de verdade para garantir consistência.
 *
 * @param ticker - O ticker do ativo (ex: "ITUB4", "PETR4")
 * @param name - O nome do ativo (opcional, não utilizado)
 * @returns A primeira letra do ticker em maiúscula, ou '?' se vazio
 */
export function getAssetInitial(ticker: string, _name?: string | null): string {
  const initial = ticker?.trim().charAt(0).toUpperCase() || '?'
  return initial
}
