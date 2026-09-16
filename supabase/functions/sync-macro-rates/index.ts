// Edge Function: sync-macro-rates
//
// Sincroniza taxas macroeconômicas (CDI, Selic, IPCA) do Banco Central do Brasil
// para a tabela `macro_rates`. Usadas pela Edge Function `calc-fixed-income`
// para calcular o valor atual das posições de renda fixa.
//
// FONTE: API SGS do Banco Central (pública, sem chave, sem cota)
//   https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados
//   CDI diário  → código 4389 (taxa % a.a., base 252)
//   Selic diária→ código 1178 (taxa % a.a., base 252)
//   IPCA mensal → código 433  (variação % mensal)
//
// O Bolsai era a fonte original mas retorna 403 para /macro no plano free.
// O BCB é a fonte primária dos próprios dados do Bolsai — usar diretamente
// elimina a dependência e a cota.
//
// AGENDAMENTO
//   pg_cron: diário às 20h00 UTC seg–sex

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const BCB_BASE     = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs';
const FETCH_TIMEOUT = 30_000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BcbEntry {
  data: string;   // 'DD/MM/YYYY'
  valor: string;  // número como string (ex: '10.65' ou '0.44')
}

interface UpsertRow {
  series: string;
  date: string;
  value: number;
}

/** Converte 'DD/MM/YYYY' para 'YYYY-MM-DD'. */
function bcbDateToIso(d: string): string {
  const [day, month, year] = d.split('/');
  return `${year}-${month}-${day}`;
}

/**
 * Formata Date como 'DD/MM/YYYY' para o parâmetro da API BCB.
 * A API exige esse formato exato — ISO não é aceito.
 */
function toBcbDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Busca série do BCB por intervalo de datas.
 * Desde 26/03/2025, o endpoint /ultimos/{N} está limitado a N≤20.
 * Usando dataInicial/dataFinal com janela de até 2 anos.
 */
async function bcbFetch(seriesCode: number, daysBack = 730): Promise<BcbEntry[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const today = new Date();
    const from  = new Date(today);
    from.setDate(from.getDate() - daysBack);

    const dataInicial = toBcbDate(from);
    const dataFinal   = toBcbDate(today);

    const url =
      `${BCB_BASE}.${seriesCode}/dados` +
      `?formato=json&dataInicial=${encodeURIComponent(dataInicial)}&dataFinal=${encodeURIComponent(dataFinal)}`;

    const r = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status} para série ${seriesCode}`);
    return await r.json() as BcbEntry[];
  } finally {
    clearTimeout(timer);
  }
}

async function pgUpsertRates(rows: UpsertRow[]): Promise<void> {
  if (!rows.length) return;
  const LOTE = 500;
  for (let i = 0; i < rows.length; i += LOTE) {
    const url = `${SUPABASE_URL}/rest/v1/macro_rates?on_conflict=series,date`;
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows.slice(i, i + LOTE)),
    });
    if (!r.ok) throw new Error(`PostgREST UPSERT ${r.status}: ${(await r.text()).slice(0, 120)}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const resultado: Record<string, number> = {};
  const erros: string[] = [];

  // CDI e Selic: 500 últimos dias úteis (~2 anos)
  // IPCA: 60 últimos meses (~5 anos)
  const series = [
    { name: 'cdi',   code: 4389, daysBack: 730 }, // ~2 anos de CDI diário
    { name: 'selic', code: 1178, daysBack: 730 }, // ~2 anos de Selic diária
    { name: 'ipca',  code:  433, daysBack: 730 }, // ~2 anos de IPCA mensal (~24 meses, suficiente)
  ];

  for (const { name, code, daysBack } of series) {
    try {
      const entries = await bcbFetch(code, daysBack);
      const rows: UpsertRow[] = entries
        .filter(e => e.data && e.valor && !isNaN(parseFloat(e.valor)))
        .map(e => ({
          series: name,
          date: bcbDateToIso(e.data),
          value: parseFloat(e.valor),
        }));

      await pgUpsertRates(rows);
      resultado[name] = rows.length;
    } catch (e) {
      erros.push(`${name}: ${(e as Error).message.slice(0, 120)}`);
    }
  }

  return new Response(
    JSON.stringify({ linhas_gravadas: resultado, erros, executado_em: new Date().toISOString() }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } },
  );
});
