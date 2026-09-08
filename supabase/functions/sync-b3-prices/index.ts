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
//   verify_jwt=true (configurado no deploy). Exige JWT do projeto. Como a anon
//   key é um JWT válido e pública, isto barra varredura anônima mas não quem
//   leia o bundle do front. Para agendamento interno, invocada com a service
//   role key, que nunca sai do servidor.
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
  const url = `${SUPABASE_URL}/rest/v1/assets`
    + `?select=ticker,provider_symbol&active=eq.true&type=in.(stock_br,fii,bdr)`;
  const r = await fetch(url, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!r.ok) throw new Error(`PostgREST select ${r.status}: ${(await r.text()).slice(0, 120)}`);
  return await r.json();
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
  date: string; open: number; high: number; low: number; close: number; volume: number | null;
}

/** Extrai e parseia o COTAHIST em streaming, sem materializar os ~83 MB de texto.
 *  Descomprime e lê linha a linha, guardando só as linhas dos tickers-alvo. */
async function baixarEParsear(nome: string, alvo: Set<string>): Promise<Map<string, Row[]>> {
  const r = await fetch(`${BASE}/${nome}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  if (!r.body) throw new Error('sem corpo');

  // Descompacta o zip: pula o header local e aplica deflate-raw ao stream.
  // O header do zip do COTAHIST é fixo (nome curto, sem extra), mas para ser
  // robusto lemos os primeiros bytes e calculamos o offset antes de inflar.
  const buf = new Uint8Array(await r.arrayBuffer());
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (dv.getUint32(0, true) !== 0x04034b50) throw new Error('não é ZIP');
  const metodo = dv.getUint16(8, true);
  const inicio = 30 + dv.getUint16(26, true) + dv.getUint16(28, true);
  const compLen = dv.getUint32(18, true);
  const payload = buf.subarray(inicio, compLen > 0 ? inicio + compLen : undefined);

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
  if (l.length < 170 || l.slice(0, 2) !== '01') return;
  if (Number(l.slice(24, 27)) !== 10) return;
  const tk = l.slice(12, 24).replace(/"/g, '').trim();
  if (!alvo.has(tk)) return;
  const fator = Number(l.slice(210, 217)) || 1;
  const d = l.slice(2, 10);
  const row: Row = {
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

  try {
    const meses = Math.min(Number(new URL(req.url).searchParams.get('meses') ?? '1'), 13);

    const ativos = await pgSelectAtivosBR();
    const paraInterno = new Map<string, string>(
      ativos.map((a) => [a.provider_symbol ?? a.ticker, a.ticker]),
    );
    const alvo = new Set(paraInterno.keys());

    const hoje = new Date();
    let sucesso = 0, falha = 0, linhas = 0;
    const erros: string[] = [];

    for (let i = 0; i < meses; i++) {
      const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - i, 1));
      const nome = `COTAHIST_M${String(d.getUTCMonth() + 1).padStart(2, '0')}${d.getUTCFullYear()}.ZIP`;
      try {
        const parsed = await baixarEParsear(nome, alvo);

        const upserts: Record<string, unknown>[] = [];
        for (const [sym, rows] of parsed) {
          const ticker = paraInterno.get(sym)!;
          for (const row of rows) {
            upserts.push({
              ticker, date: row.date,
              open: row.open, high: row.high, low: row.low, close: row.close,
              adjusted_close: row.close, volume: row.volume, source: 'b3_cotahist',
            });
          }
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
      JSON.stringify({ meses_ok: sucesso, meses_falha: falha, linhas, erros: erros.slice(0, 10) }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
