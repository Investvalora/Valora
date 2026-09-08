#!/usr/bin/env node
/**
 * Ingestão de histórico de preços — Story 2.1b
 *
 * Popula `price_history` com 12 meses de série diária para os ativos do catálogo.
 *
 * ESTRATÉGIA POR PROVEDOR
 *
 *   brapi (stock_br, fii, bdr)
 *     O plano gratuito limita o range a 3mo — confirmado empiricamente: `range=1y`
 *     retorna "O range 1y não está disponível no seu plano. Ranges permitidos:
 *     1d, 5d, 1mo, 3mo". Então buscamos 3 meses REAIS (OHLCV + adjustedClose) e
 *     preenchemos os ~9 meses anteriores por simulação, marcada `source='synthetic'`.
 *
 *   twelvedata (stock_us, reit)
 *     `/time_series` com outputsize=365 cobre 12 meses reais no plano Basic.
 *     Limite: 8 créditos/min, 800/dia. O script respeita com pausa entre chamadas.
 *
 *   coingecko (crypto)
 *     `/market_chart?days=365&interval=daily` funciona sem chave. Devolve apenas
 *     fechamento — `high`/`low` ficam NULL em vez de receber valor inventado.
 *
 * SOBRE A SIMULAÇÃO
 *
 * O trecho sintético é um random walk ancorado no primeiro fechamento real,
 * caminhando para trás, com volatilidade estimada a partir dos retornos diários
 * do trecho real do próprio ticker. O PRNG é semeado pelo ticker, então
 * reexecuções produzem a mesma série — necessário para reprodutibilidade.
 *
 * Fins de semana são excluídos. Feriados da B3 não são: a série sintética terá
 * alguns dias que o mercado real não teve. Aceitável para dado explicitamente
 * marcado como simulado.
 *
 * USO
 *   node scripts/seed-price-history.mjs [--only=brapi|twelvedata|coingecko] [--dry-run]
 *
 * Variáveis de ambiente (ou .env, que está no .gitignore):
 *   SUPABASE_ACCESS_TOKEN  Personal Access Token — supabase.com/dashboard/account/tokens
 *   SUPABASE_PROJECT_REF   opcional; default é o ref do projeto Valora
 *   BRAPI_API_KEY          brapi.dev/dashboard
 *   TWELVEDATA_API_KEY     twelvedata.com (aceita também TWELVEDATA_API)
 *   COINGECKO_API_KEY      opcional — o endpoint usado funciona sem chave
 */

import fs from 'node:fs';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'zawjqzekqfnmvwglahnk';
const MESES = 12;

// ─── configuração ──────────────────────────────────────────────────────────

function carregarEnv() {
  const env = {};
  try {
    for (const linha of fs.readFileSync('.env', 'utf8').split('\n')) {
      const m = linha.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (m) env[m[1]] = m[2].trim().replace(/^["']|["'],?$/g, '').replace(/,$/, '');
    }
  } catch { /* .env é opcional */ }
  return env;
}

function obterPat(env) {
  const tok = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;
  if (!tok) {
    throw new Error(
      'SUPABASE_ACCESS_TOKEN não definido.\n'
      + '  Gere um Personal Access Token em https://supabase.com/dashboard/account/tokens\n'
      + '  e exporte no ambiente ou adicione ao .env (que está no .gitignore).'
    );
  }
  return tok;
}

const env = carregarEnv();
const PAT = obterPat(env);
const args = process.argv.slice(2);
const somente = args.find(a => a.startsWith('--only='))?.split('=')[1];
const dryRun = args.includes('--dry-run');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const txt = await r.text();
  let j;
  try { j = JSON.parse(txt); } catch { throw new Error(`resposta não-JSON: ${txt.slice(0, 200)}`); }
  if (j && j.message) throw new Error(j.message.slice(0, 300));
  return j;
}

// ─── utilitários de série ──────────────────────────────────────────────────

const iso = d => d.toISOString().slice(0, 10);
const ehFimDeSemana = d => d.getUTCDay() === 0 || d.getUTCDay() === 6;

/** PRNG determinístico (mulberry32) semeado por string. */
function prng(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Desvio-padrão dos log-retornos diários de uma série de fechamentos. */
function volatilidadeDiaria(closes) {
  if (closes.length < 3) return 0.02;
  const r = [];
  for (let i = 1; i < closes.length; i++) r.push(Math.log(closes[i] / closes[i - 1]));
  const m = r.reduce((a, b) => a + b, 0) / r.length;
  const v = r.reduce((a, b) => a + (b - m) ** 2, 0) / (r.length - 1);
  return Math.max(Math.sqrt(v), 0.004);
}

/**
 * Gera série sintética caminhando para trás a partir de `ancora`.
 * Retorna linhas em ordem cronológica crescente.
 */
function retroceder(ticker, ancoraData, ancoraClose, sigma, volumeMediano, ateData) {
  const rand = prng(`valora:${ticker}`);
  const gauss = () => {
    const u = Math.max(rand(), 1e-9), v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const linhas = [];
  let close = ancoraClose;
  const d = new Date(ancoraData + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  const limite = new Date(ateData + 'T00:00:00Z');

  while (d >= limite) {
    if (!ehFimDeSemana(d)) {
      // caminha para trás: o fechamento anterior é o atual descontado do retorno
      close = close / Math.exp(gauss() * sigma);
      const amp = Math.abs(gauss()) * sigma * 0.6;
      const open = close * (1 + gauss() * sigma * 0.3);
      const high = Math.max(open, close) * (1 + amp);
      const low = Math.min(open, close) * (1 - amp);
      linhas.push({
        date: iso(d),
        open: open.toFixed(4),
        high: high.toFixed(4),
        low: low.toFixed(4),
        close: close.toFixed(4),
        adjusted_close: close.toFixed(4),
        volume: volumeMediano ? Math.round(volumeMediano * (0.6 + rand() * 0.8)) : null,
        source: 'synthetic',
      });
    }
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return linhas.reverse();
}

function mediana(nums) {
  const a = nums.filter(Number.isFinite).sort((x, y) => x - y);
  return a.length ? a[Math.floor(a.length / 2)] : null;
}

// ─── provedores ────────────────────────────────────────────────────────────

async function buscarBrapi(ativo) {
  const key = env.BRAPI_API_KEY;
  if (!key) throw new Error('BRAPI_API_KEY ausente no .env');
  const url = `https://brapi.dev/api/quote/${ativo.provider_symbol}`
    + `?range=3mo&interval=1d&token=${key}`;
  const r = await fetch(url);
  const j = await r.json();
  if (j.error) throw new Error(j.message?.slice(0, 120) || 'erro brapi');
  const h = j.results?.[0]?.historicalDataPrice || [];
  if (!h.length) throw new Error('sem historicalDataPrice');
  return h.map(p => ({
    date: iso(new Date(p.date * 1000)),
    open: p.open?.toFixed(4) ?? null,
    high: p.high?.toFixed(4) ?? null,
    low: p.low?.toFixed(4) ?? null,
    close: p.close.toFixed(4),
    adjusted_close: (p.adjustedClose ?? p.close).toFixed(4),
    volume: p.volume ?? null,
    source: 'brapi',
  }));
}

async function buscarTwelveData(ativo) {
  // aceita variantes de nomenclatura da chave
  const key = env.TWELVEDATA_API_KEY || env.TWELVE_DATA_API_KEY || env.TWELVEDATA_API;
  if (!key) throw new Error('chave do Twelve Data ausente no .env (TWELVEDATA_API_KEY | TWELVEDATA_API)');
  const url = `https://api.twelvedata.com/time_series?symbol=${ativo.provider_symbol}`
    + `&interval=1day&outputsize=400&apikey=${key}`;
  const r = await fetch(url);
  const j = await r.json();
  if (j.status === 'error') throw new Error(j.message?.slice(0, 140) || 'erro twelvedata');
  if (!j.values?.length) throw new Error('sem values');
  return j.values.reverse().map(v => ({
    date: v.datetime,
    open: Number(v.open).toFixed(4),
    high: Number(v.high).toFixed(4),
    low: Number(v.low).toFixed(4),
    close: Number(v.close).toFixed(4),
    adjusted_close: Number(v.close).toFixed(4),
    volume: v.volume ? Math.round(Number(v.volume)) : null,
    source: 'twelvedata',
  }));
}

async function buscarCoinGecko(ativo) {
  const key = env.COINGECKO_API_KEY;
  const url = `https://api.coingecko.com/api/v3/coins/${ativo.provider_symbol}`
    + `/market_chart?vs_currency=usd&days=365&interval=daily`;
  const r = await fetch(url, { headers: key ? { 'x-cg-demo-api-key': key } : {} });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const { prices } = await r.json();
  const porDia = new Map();
  for (const [ts, p] of prices) porDia.set(iso(new Date(ts)), p);
  const dias = [...porDia.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  let anterior = null;
  return dias.map(([d, p]) => {
    const close = Number(p).toFixed(4);
    const open = anterior === null ? close : Number(anterior).toFixed(4);
    anterior = p;
    // high/low NULL: o free do CoinGecko não entrega OHLC diário.
    return { date: d, open, high: null, low: null, close,
             adjusted_close: close, volume: null, source: 'coingecko' };
  });
}

const PROVEDORES = {
  brapi:      { buscar: buscarBrapi,      pausaMs: 700,   completarComSintetico: true },
  twelvedata: { buscar: buscarTwelveData, pausaMs: 8000,  completarComSintetico: false },
  coingecko:  { buscar: buscarCoinGecko,  pausaMs: 1500,  completarComSintetico: false },
};

// ─── execução ──────────────────────────────────────────────────────────────

const nulo = v => (v === null || v === undefined ? 'NULL' : v);

async function gravar(ticker, linhas) {
  const vals = linhas.map(l =>
    `('${ticker}','${l.date}',${nulo(l.open)},${nulo(l.high)},${nulo(l.low)},`
    + `${l.close},${nulo(l.adjusted_close)},${nulo(l.volume)},'${l.source}')`
  );
  // lotes para não estourar o tamanho da requisição
  const LOTE = 400;
  for (let i = 0; i < vals.length; i += LOTE) {
    await sql(`INSERT INTO public.price_history
      (ticker,date,open,high,low,close,adjusted_close,volume,source)
      VALUES ${vals.slice(i, i + LOTE).join(',')}
      ON CONFLICT (ticker,date) DO NOTHING;`);
  }
}

const inicio = new Date();
inicio.setUTCMonth(inicio.getUTCMonth() - MESES);
const DATA_INICIO = iso(inicio);

const ativos = await sql(
  `select ticker, quote_provider, provider_symbol, type from assets
   where active order by quote_provider, ticker;`
);

console.log(`janela alvo: ${DATA_INICIO} .. ${iso(new Date())}`);
console.log(`${ativos.length} ativos no catálogo${somente ? ` (filtro: ${somente})` : ''}`);
if (dryRun) console.log('MODO DRY-RUN: nada será gravado\n');

const resumo = { ok: 0, falhou: 0, linhasReais: 0, linhasSinteticas: 0, erros: [] };

for (const a of ativos) {
  if (somente && a.quote_provider !== somente) continue;
  const prov = PROVEDORES[a.quote_provider];
  if (!prov) { console.log(`  ${a.ticker.padEnd(8)} provedor '${a.quote_provider}' sem implementação`); continue; }

  try {
    let linhas = await prov.buscar(a);

    // Corta ao alvo de 12 meses: o Twelve Data devolve mais do que a janela
    // (outputsize=400 ≈ 19 meses), e classes diferentes precisam de séries
    // comparáveis para os gráficos e para o AC.
    linhas = linhas.filter(l => l.date >= DATA_INICIO);
    if (!linhas.length) throw new Error('nenhum ponto dentro da janela alvo');

    const reais = linhas.length;
    let sinteticas = 0;

    if (prov.completarComSintetico && linhas[0].date > DATA_INICIO) {
      const closes = linhas.map(l => Number(l.close));
      const extra = retroceder(
        a.ticker, linhas[0].date, Number(linhas[0].close),
        volatilidadeDiaria(closes),
        mediana(linhas.map(l => Number(l.volume))),
        DATA_INICIO
      );
      linhas = [...extra, ...linhas];
      sinteticas = extra.length;
    }

    if (!dryRun) await gravar(a.ticker, linhas);
    resumo.ok++; resumo.linhasReais += reais; resumo.linhasSinteticas += sinteticas;
    console.log(`  ${a.ticker.padEnd(8)} ${String(linhas.length).padStart(3)} dias`
      + ` (${reais} real${sinteticas ? ` + ${sinteticas} sint` : ''})`
      + `  ${linhas[0].date} .. ${linhas[linhas.length - 1].date}`);
  } catch (e) {
    resumo.falhou++; resumo.erros.push(`${a.ticker}: ${e.message}`);
    console.log(`  ${a.ticker.padEnd(8)} FALHOU -> ${e.message}`);
  }
  await sleep(prov.pausaMs);
}

console.log(`\nok=${resumo.ok} falhou=${resumo.falhou}`
  + ` linhas_reais=${resumo.linhasReais} linhas_sinteticas=${resumo.linhasSinteticas}`);
if (resumo.erros.length) {
  console.log('\nerros:');
  for (const e of resumo.erros) console.log('  ' + e);
}
