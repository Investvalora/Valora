#!/usr/bin/env node
/**
 * Ingestão de preços B3 via COTAHIST oficial — Story 2.8 (carga local)
 *
 * Substitui o histórico dos ativos BR (stock_br, fii, bdr) por dado oficial da
 * B3, eliminando o preenchimento sintético que o limite de 3 meses do plano
 * gratuito da brapi obrigava.
 *
 * FONTE
 *   Séries históricas do mercado à vista, publicadas pela própria B3:
 *   https://bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_M{MMAAAA}.ZIP
 *   Sem chave, sem quota, sem cadastro. Arquivo mensal ~8 MB compactado.
 *
 * VALIDACAO
 *   Comparado contra o brapi em janela sobreposta (jul/2026): 138 de 138
 *   fechamentos idênticos ao centavo. O parser e a fonte estão corretos.
 *
 * LIMITACAO
 *   COTAHIST é preço BRUTO — sem ajuste por proventos/desdobramento. O
 *   adjusted_close é gravado igual ao close aqui; o ajuste real depende do
 *   histórico de dividendos (Épico 3) e será calculado quando essa fonte
 *   existir. Marcado source='b3_cotahist'.
 *
 * LAYOUT (registro tipo 01, posições 1-indexed do manual COTAHIST)
 *   02-10 data AAAAMMDD | 13-24 codNeg | 25-27 tpmerc (10=vista)
 *   57-69 abertura | 70-82 máximo | 83-95 mínimo | 109-121 último
 *   153-170 quantidade | 211-217 fator de cotação
 *   Preços vêm em centavos (dividir por 100).
 *
 * USO
 *   node scripts/ingest-cotahist.mjs [--meses=13] [--dry-run] [--validar]
 *
 * Ambiente: SUPABASE_ACCESS_TOKEN (PAT), SUPABASE_PROJECT_REF (opcional)
 */

import fs from 'node:fs';
import zlib from 'node:zlib';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'zawjqzekqfnmvwglahnk';
const BASE = 'https://bvmf.bmfbovespa.com.br/InstDados/SerHist';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const validar = args.includes('--validar');
const meses = Number(args.find(a => a.startsWith('--meses='))?.split('=')[1] || 13);

function obterPat() {
  const env = {};
  try {
    for (const l of fs.readFileSync('.env', 'utf8').split('\n')) {
      const m = l.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (m) env[m[1]] = m[2].trim().replace(/^["']|["'],?$/g, '').replace(/,$/, '');
    }
  } catch {}
  const tok = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;
  if (!tok) throw new Error('SUPABASE_ACCESS_TOKEN não definido (ambiente ou .env)');
  return tok;
}
const PAT = obterPat();

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const txt = await r.text();
  let j; try { j = JSON.parse(txt); } catch { throw new Error(`resposta não-JSON: ${txt.slice(0, 200)}`); }
  if (j && j.message) throw new Error(j.message.slice(0, 300));
  return j;
}

// ─── parsing ────────────────────────────────────────────────────────────────

/** Extrai OHLCV de um TXT COTAHIST, apenas para os tickers pedidos. */
function parsearCotahist(txt, tickers) {
  const alvo = new Set(tickers);
  const linhas = txt.split('\n');
  const out = new Map(); // ticker -> [{date, open, high, low, close, volume}]
  for (const l of linhas) {
    if (l.length < 170 || l.slice(0, 2) !== '01') continue;
    if (Number(l.slice(24, 27)) !== 10) continue; // mercado à vista
    const tk = l.slice(12, 24).replace(/"/g, '').trim();
    if (!alvo.has(tk)) continue;
    const fator = Number(l.slice(210, 217)) || 1;
    const d = l.slice(2, 10);
    const row = {
      date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
      open:  (Number(l.slice(56, 69)) / 100) * fator,
      high:  (Number(l.slice(69, 82)) / 100) * fator,
      low:   (Number(l.slice(82, 95)) / 100) * fator,
      close: (Number(l.slice(108, 121)) / 100) * fator,
      volume: Number(l.slice(152, 170)) || null,
    };
    if (!out.has(tk)) out.set(tk, []);
    out.get(tk).push(row);
  }
  return out;
}

async function baixarMes(ano, mes) {
  const nome = `COTAHIST_M${String(mes).padStart(2, '0')}${ano}.ZIP`;
  const r = await fetch(`${BASE}/${nome}`);
  if (!r.ok) throw new Error(`${nome}: HTTP ${r.status}`);
  const zipBuf = Buffer.from(await r.arrayBuffer());
  // Zip do COTAHIST: um único arquivo, deflate. Extrai sem dependência externa
  // localizando o primeiro local file header e inflando o payload.
  return extrairUnicoTxt(zipBuf, nome);
}

/** Extrai o único .TXT de um zip simples (um membro, método deflate ou store). */
function extrairUnicoTxt(buf, nome) {
  if (buf.readUInt32LE(0) !== 0x04034b50) throw new Error(`${nome}: não é ZIP`);
  const metodo = buf.readUInt16LE(8);
  const nomeLen = buf.readUInt16LE(26);
  const extraLen = buf.readUInt16LE(28);
  const inicio = 30 + nomeLen + extraLen;
  const compLen = buf.readUInt32LE(18);
  const payload = buf.subarray(inicio, compLen > 0 ? inicio + compLen : undefined);
  const raw = metodo === 0 ? payload : zlib.inflateRawSync(payload);
  return raw.toString('latin1');
}

// ─── execução ─────────────────────────────────────────────────────────────

const ativosBR = await sql(
  `select ticker, provider_symbol from assets
   where type in ('stock_br','fii','bdr') and active order by ticker;`
);
const tickers = ativosBR.map(a => a.provider_symbol || a.ticker);
// mapa provider_symbol -> ticker interno (iguais no nosso catálogo, mas explícito)
const paraInterno = new Map(ativosBR.map(a => [a.provider_symbol || a.ticker, a.ticker]));
console.log(`${tickers.length} ativos BR no catálogo`);

// meses a baixar, do corrente para trás
const hoje = new Date();
const janela = [];
for (let i = 0; i < meses; i++) {
  const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - i, 1));
  janela.push([d.getUTCFullYear(), d.getUTCMonth() + 1]);
}
const dataInicio = (() => {
  const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - (meses - 1), 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
})();

const serie = new Map(); // ticker interno -> Map(date -> row)
for (const [ano, mes] of janela) {
  try {
    const txt = await baixarMes(ano, mes);
    const parsed = parsearCotahist(txt, tickers);
    let linhas = 0;
    for (const [sym, rows] of parsed) {
      const interno = paraInterno.get(sym);
      if (!serie.has(interno)) serie.set(interno, new Map());
      for (const r of rows) { serie.get(interno).set(r.date, r); linhas++; }
    }
    console.log(`  ${ano}-${String(mes).padStart(2, '0')}  ${linhas} linhas`);
  } catch (e) {
    console.log(`  ${ano}-${String(mes).padStart(2, '0')}  FALHOU: ${e.message}`);
  }
}

// ─── validação contra o que já existe (brapi) ───────────────────────────────
if (validar) {
  const amostraDatas = await sql(
    `select ticker, date::text, close from price_history
     where source='brapi' order by random() limit 200;`
  );
  let ok = 0, dif = 0;
  for (const r of amostraDatas) {
    const s = serie.get(r.ticker);
    const c = s?.get(r.date)?.close;
    if (c === undefined) continue;
    if (Math.abs(c - Number(r.close)) < 0.01) ok++;
    else { dif++; if (dif <= 5) console.log(`  DIVERGE ${r.ticker} ${r.date}: cotahist=${c.toFixed(2)} brapi=${r.close}`); }
  }
  console.log(`\nvalidação vs brapi: ${ok} idênticas, ${dif} divergentes`);
}

// ─── gravação: substitui o histórico BR ─────────────────────────────────────
const nulo = v => (v === null || v === undefined ? 'NULL' : v);
let totalLinhas = 0;
for (const s of serie.values()) totalLinhas += s.size;
console.log(`\n${serie.size} ativos, ${totalLinhas} linhas de dado oficial B3`);

if (dryRun) { console.log('DRY-RUN: nada gravado'); process.exit(0); }

// Remove o histórico antigo dos BR (brapi + synthetic) na janela, depois insere.
// Feito por ticker para manter as transações pequenas.
for (const [ticker, mapa] of serie) {
  await sql(`DELETE FROM price_history
    WHERE ticker='${ticker}' AND source IN ('brapi','synthetic') AND date >= '${dataInicio}';`);
  const rows = [...mapa.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  const vals = rows.map(r =>
    `('${ticker}','${r.date}',${r.open.toFixed(4)},${r.high.toFixed(4)},${r.low.toFixed(4)},`
    + `${r.close.toFixed(4)},${r.close.toFixed(4)},${nulo(r.volume)},'b3_cotahist')`
  );
  const LOTE = 400;
  for (let i = 0; i < vals.length; i += LOTE) {
    await sql(`INSERT INTO public.price_history
      (ticker,date,open,high,low,close,adjusted_close,volume,source)
      VALUES ${vals.slice(i, i + LOTE).join(',')}
      ON CONFLICT (ticker,date) DO UPDATE SET
        open=EXCLUDED.open, high=EXCLUDED.high, low=EXCLUDED.low,
        close=EXCLUDED.close, adjusted_close=EXCLUDED.adjusted_close,
        volume=EXCLUDED.volume, source=EXCLUDED.source, updated_at=now();`);
  }
  console.log(`  ${ticker.padEnd(8)} ${rows.length} dias  ${rows[0].date}..${rows[rows.length-1].date}`);
}
console.log('\nconcluído.');
