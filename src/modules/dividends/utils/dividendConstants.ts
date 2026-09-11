/**
 * Limite máximo de registros buscados/exportados no módulo de dividendos.
 * Usado tanto pelo `dividendService` (query limit) quanto pelo `dividendsCsv`
 * (slice de exportação), garantindo que os dois estejam sempre alinhados.
 */
export const DIVIDENDS_LIMIT = 500
