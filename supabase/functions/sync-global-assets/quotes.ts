/** Preserve the provider timestamp, including an older session's actual date. */
export function quoteStamp(seconds: unknown, price: unknown, now = Date.now()) {
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0 ||
      typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0 ||
      seconds * 1000 > now + 300000 || seconds * 1000 < now - 7 * 86400000) {
    throw new Error('invalid_quote');
  }
  const market_time = new Date(seconds * 1000).toISOString();
  return { date: market_time.slice(0, 10), market_time };
}

export function selectedProviders(body: unknown): string[] {
  const all = ['finnhub', 'coingecko', 'awesomeapi'];
  if (!body || typeof body !== 'object' || !('providers' in body)) return all;
  const providers = (body as { providers: unknown }).providers;
  if (!Array.isArray(providers) || !providers.length || providers.some(p => !all.includes(p))) throw new Error('invalid_providers');
  return [...new Set(providers)] as string[];
}
