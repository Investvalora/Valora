import { authorizeServiceJob } from '../_shared/serviceAuthorization.ts'
import { boundedBytes } from '../_shared/officialFiles.ts'

// Edge Function: sync-b3-prices
//
// Ingestão automática de preços da B3 a partir do COTAHIST oficial.
// Substitui o antigo sync-br-assets (stub vazio) e a dependência do brapi
// para histórico BR.
//
// FONTE
//   https://bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_M{MMAAAA}.ZIP
//   Publicado pela própria B3. Sem chave, sem quota. O arquivo mensal contém
//   todos os pregões do mês e é reescrito a cada novo pregão, então baixar o
//   mês corrente e fazer upsert mantém a série em dia.
//
// COMPORTAMENTO
//   - Baixa o COTAHIST do mês corrente (e opcionalmente meses anteriores via
//     ?meses=N no corpo, para backfill).
//   - Parseia registros tipo 01, mercado à vista (tpmerc=10), apenas para os
//     tickers BR ativos do catálogo.
//   - Upsert em price_history com source='b3_cotahist', idempotente por
//     (ticker, date).
//
// SEGURANCA
//   Gateway JWT e autorização explícita de serviço, validada antes de qualquer
//   consulta ou download. Aceita a chave interna exata ou seu digest no Vault.
//
// LIMITACAO
//   COTAHIST é preço bruto. adjusted_close = close até o histórico de
//   dividendos existir (Épico 3) para calcular o ajuste real.
//
// Deploy:  supabase functions deploy sync-b3-prices --project-ref <ref>

// Sem SDK: o import de @supabase/supabase-js via esm.sh causa BOOT_ERROR quando
// a function é publicada sem import map (verificado por bisseção em 2026-09-08).
// A function só precisa de SELECT em assets e UPSERT em price_history, então
// fala direto com o PostgREST via fetch, usando a service role key.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

async function pgSelectAtivosBR(): Promise<{ ticker: string; provider_symbol: string | null }[]> {
  const rows: { ticker: string; provider_symbol: string | null }[] = [];
  for (let offset = 0; ; offset += 500) {
  const url = `${SUPABASE_URL}/rest/v1/assets`
    + `?select=ticker,provider_symbol&active=eq.true&type=in.(stock_br,fii,bdr,etf_br)&order=ticker&limit=500&offset=${offset}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(15000),
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!r.ok) throw new Error(`PostgREST select ${r.status}: ${(await r.text()).slice(0, 120)}`);
  const page = await r.json(); rows.push(...page);
  if (page.length < 500) return rows;
  }
}

async function pgUpsertPrecos(rows: Record<string, unknown>[]): Promise<void> {
  const url = `${SUPABASE_URL}/rest/v1/price_history?on_conflict=ticker,date`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(`PostgREST upsert ${r.status}: ${(await r.text()).slice(0, 120)}`);
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE = 'https://bvmf.bmfbovespa.com.br/InstDados/SerHist';

interface Row {
  date: string; open: number; high: number; low: number; close: number; volume: number | null; isin: string;
}

/** B3 uses ZIP data descriptors: compressed size is zero in the local header.
 * Read the central directory size so Deno never receives the descriptor/trailer
 * as part of the raw deflate stream. Node tolerates this trailer; Edge does not. */
export function cotahistPayload(buf: Uint8Array): { payload: Uint8Array<ArrayBuffer>; method: number } {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (buf.length < 30 || dv.getUint32(0, true) !== 0x04034b50) throw new Error('invalid_zip');
  const flags = dv.getUint16(6, true), method = dv.getUint16(8, true);
  if (flags & 1 || ![0, 8].includes(method)) throw new Error('unsupported_zip');
  const start = 30 + dv.getUint16(26, true) + dv.getUint16(28, true);
  let compressed = dv.getUint32(18, true);
  if (flags & 8) {
    let end = buf.length - 22;
    for (; end >= Math.max(0, buf.length - 65557); end--) if (dv.getUint32(end, true) === 0x06054b50) break;
    if (end < Math.max(0, buf.length - 65557) || dv.getUint16(end + 10, true) !== 1 || dv.getUint16(end + 4, true) || dv.getUint16(end + 6, true)) throw new Error('invalid_zip_directory');
    const directory = dv.getUint32(end + 16, true);
    if (directory + 46 > end || dv.getUint32(directory, true) !== 0x02014b50 || dv.getUint32(directory + 42, true) !== 0 || dv.getUint16(directory + 10, true) !== method) throw new Error('invalid_zip_directory');
    compressed = dv.getUint32(directory + 20, true);
    if (dv.getUint32(directory + 24, true) > 160 * 1024 * 1024 || start + compressed > directory) throw new Error('unsupported_zip_size');
  }
  if (!compressed || start + compressed > buf.length) throw new Error('invalid_zip_size');
  return { payload: buf.slice(start, start + compressed), method };
}

/** Extrai e parseia o COTAHIST em streaming, sem materializar os ~83 MB de texto.
 *  Descomprime e lê linha a linha, guardando só as linhas dos tickers-alvo. */
async function baixarEParsear(nome: string, alvo: Set<string>): Promise<Map<string, Row[]>> {
  const r = await fetch(`${BASE}/${nome}`, { signal: AbortSignal.timeout(45000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  if (!r.body) throw new Error('sem corpo');

  // Descompacta o zip: pula o header local e aplica deflate-raw ao stream.
  // O header do zip do COTAHIST é fixo (nome curto, sem extra), mas para ser
  // robusto lemos os primeiros bytes e calculamos o offset antes de inflar.
  const buf = await boundedBytes(r);
  const { payload, method: metodo } = cotahistPayload(buf);

  const fonte = metodo === 0
    ? new Response(payload).body!
    : new Response(payload).body!.pipeThrough(new DecompressionStream('deflate-raw'));

  // decodifica e quebra em linhas incrementalmente
  const reader = fonte.pipeThrough(new TextDecoderStream('latin1')).getReader();
  const out = new Map<string, Row[]>();
  let resto = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    const texto = resto + value;
    const linhas = texto.split('\n');
    resto = linhas.pop() ?? '';
    for (const l of linhas) acumularLinha(l, alvo, out);
  }
  if (resto) acumularLinha(resto, alvo, out);
  return out;
}

function acumularLinha(l: string, alvo: Set<string>, out: Map<string, Row[]>): void {
  if (l.length < 242 || l.slice(0, 2) !== '01') return;
  if (Number(l.slice(24, 27)) !== 10) return;
  const tk = l.slice(12, 24).replace(/"/g, '').trim();
  if (!alvo.has(tk)) return;
  const fator = Number(l.slice(210, 217)) || 1;
  const d = l.slice(2, 10);
  const row: Row = {
    isin: l.slice(230, 242).trim(),
    date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
    open:  (Number(l.slice(56, 69)) / 100) * fator,
    high:  (Number(l.slice(69, 82)) / 100) * fator,
    low:   (Number(l.slice(82, 95)) / 100) * fator,
    close: (Number(l.slice(108, 121)) / 100) * fator,
    volume: Number(l.slice(152, 170)) || null,
  };
  if (!out.has(tk)) out.set(tk, []);
  out.get(tk)!.push(row);
}

// deno-lint-ignore no-explicit-any
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (!await authorizeServiceJob(req, SUPABASE_URL, SERVICE_KEY)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  try {
    const meses = Number(new URL(req.url).searchParams.get('meses') ?? '1');
    if (!Number.isInteger(meses) || meses < 1 || meses > 13) return Response.json({ error: 'invalid_months' }, { status: 400 });

    const ativos = await pgSelectAtivosBR();
    if (ativos.length === 0) return new Response(
      JSON.stringify({ meses_ok: 0, meses_falha: 0, linhas: 0, erros: [] }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
    const paraInterno = new Map<string, string>(
      ativos.map((a) => [a.provider_symbol ?? a.ticker, a.ticker]),
    );
    const alvo = new Set(paraInterno.keys());

    const hoje = new Date();
    let sucesso = 0, falha = 0, linhas = 0;
    const erros: string[] = [];
    const avisos: string[] = [];

    for (let i = 0; i < meses; i++) {
      const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - i, 1));
      const nome = `COTAHIST_M${String(d.getUTCMonth() + 1).padStart(2, '0')}${d.getUTCFullYear()}.ZIP`;
      try {
        let parsed: Map<string, Row[]>;
        try { parsed = await baixarEParsear(nome, alvo); }
        catch (error) {
          if (i !== 0 || !(error instanceof Error) || error.message !== 'HTTP 404') throw error;
          // Monthly files can lag publication. Keep latest official daily data,
          // explicitly reporting that this fallback does not backfill the month.
          let daily: Map<string, Row[]> | null = null;
          for (let back = 0; back < 10; back++) {
            const day = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate() - back));
            if (day.getUTCMonth() !== hoje.getUTCMonth()) break;
            const dailyName = `COTAHIST_D${String(day.getUTCDate()).padStart(2,'0')}${String(day.getUTCMonth()+1).padStart(2,'0')}${day.getUTCFullYear()}.ZIP`;
            try { daily = await baixarEParsear(dailyName, alvo); if(daily.size){ avisos.push(`monthly_unavailable_daily_only:${dailyName}`); break; } }
            catch (dailyError) { if (!(dailyError instanceof Error) || dailyError.message !== 'HTTP 404') throw dailyError; }
          }
          if (!daily?.size) throw error;
          parsed = daily;
        }

        const upserts: Record<string, unknown>[] = [];
        const identifiers: { ticker: string; isin: string }[] = [];
        for (const [sym, rows] of parsed) {
          const ticker = paraInterno.get(sym)!;
          const latest = [...rows].sort((a, b) => b.date.localeCompare(a.date))[0];
          if (/^BR[A-Z0-9]{9}[0-9]$/.test(latest?.isin ?? '')) identifiers.push({ ticker, isin: latest.isin });
          for (const row of rows) {
            upserts.push({
              ticker, date: row.date,
              open: row.open, high: row.high, low: row.low, close: row.close,
              adjusted_close: row.close, volume: row.volume, source: 'b3_cotahist',
            });
          }
        }
        if (alvo.size > 0 && upserts.length === 0) throw new Error('empty_source_for_catalog');
        // Only current-month identity: historical ticker reuse must not remap a fund.
        if (i === 0 && identifiers.length) {
          const identityResult = await fetch(`${SUPABASE_URL}/rest/v1/asset_market_identifiers?on_conflict=ticker`, {
            method: 'POST', headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify(identifiers), signal: AbortSignal.timeout(15000),
          });
          if (!identityResult.ok) throw new Error('identity_storage_failed');
        }
        for (let j = 0; j < upserts.length; j += 500) {
          await pgUpsertPrecos(upserts.slice(j, j + 500));
        }
        linhas += upserts.length;
        sucesso++;
      } catch (e) {
        falha++; erros.push(`${nome}: ${(e as Error).message}`);
      }
    }

    return new Response(
      JSON.stringify({ meses_ok: sucesso, meses_falha: falha, linhas, erros: erros.slice(0, 10), avisos, cobertura_mensal_completa: avisos.length === 0 && falha === 0 }),
      { status: falha > 0 ? 503 : 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
