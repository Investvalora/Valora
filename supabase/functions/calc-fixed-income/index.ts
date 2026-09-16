// Edge Function: calc-fixed-income
//
// Calcula o valor atual de todas as posições de renda fixa ativas de um usuário
// e atualiza o campo `current_value` em `fixed_income_positions`.
//
// REQUEST
//   POST /functions/v1/calc-fixed-income
//   Auth: Bearer <user JWT>  (verify_jwt = true)
//   Body: {} (vazio — user_id vem do JWT)
//
// RESPONSE 200
//   { "posicoes_atualizadas": 3, "erros": [], "executado_em": "..." }
//
// FÓRMULAS
//
//   Prefixado / Selic
//     fator_diário = (1 + taxa_aa/100) ^ (1/252)
//     valor_atual  = principal × fator_diário ^ dias_úteis
//
//   CDI pós-fixado  (CDB/LCI/LCA % CDI)
//     Para cada dia na janela [application_date, hoje]:
//       fator_dia = (1 + (pct_cdi/100) × (cdi_aa/100)) ^ (1/252)
//     valor_atual = principal × ∏ fator_dia
//     (aproximado: usa CDI médio do período quando série diária está disponível)
//
//   IPCA+ prefixado
//     fator_ipca   = ∏ (1 + ipca_mes/100) sobre meses completos
//     fator_spread = (1 + spread_aa/100) ^ (dias_corridos/365)
//     valor_atual  = principal × fator_ipca × fator_spread
//
// LIMITAÇÕES
//   - Não desconta IR (tributação regressiva de 22,5% → 15% por prazo)
//   - Não aplica IOF (incide só nos primeiros 30 dias — desprezível no MVP)
//   - Usa dias corridos para IPCA/prefixado e dias úteis aproximados para CDI
//   - CDI diário: usa a taxa anualizada do dia e converte para diária (base 252)
//
// VARIÁVEIS DE AMBIENTE
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (lê macro_rates e fi_positions de qualquer usuário)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── tipos ────────────────────────────────────────────────────────────────

interface FiPosition {
  id: string;
  user_id: string;
  type: string;
  indexer: string;
  rate: number;       // % CDI, spread IPCA+, ou taxa prefixada (% a.a.)
  principal: number;
  application_date: string; // YYYY-MM-DD
}

interface MacroRate {
  series: string;
  date: string;
  value: number;
}

// ─── PostgREST helpers ────────────────────────────────────────────────────

async function pgGetPositions(userId: string): Promise<FiPosition[]> {
  const url =
    `${SUPABASE_URL}/rest/v1/fixed_income_positions` +
    `?user_id=eq.${userId}&active=eq.true` +
    `&select=id,user_id,type,indexer,rate,principal,application_date`;
  const r = await fetch(url, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!r.ok) throw new Error(`PostgREST GET positions ${r.status}`);
  return r.json();
}

async function pgGetMacroRates(
  series: string,
  fromDate: string,
  toDate: string,
): Promise<MacroRate[]> {
  const url =
    `${SUPABASE_URL}/rest/v1/macro_rates` +
    `?series=eq.${series}&date=gte.${fromDate}&date=lte.${toDate}` +
    `&order=date.asc&limit=2000`;
  const r = await fetch(url, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!r.ok) throw new Error(`PostgREST GET macro_rates ${r.status}`);
  return r.json();
}

async function pgUpdateCurrentValue(
  positionId: string,
  currentValue: number,
): Promise<void> {
  const url =
    `${SUPABASE_URL}/rest/v1/fixed_income_positions` +
    `?id=eq.${positionId}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      current_value: parseFloat(currentValue.toFixed(4)),
      last_updated_at: new Date().toISOString(),
    }),
  });
  if (!r.ok) throw new Error(`PostgREST PATCH ${r.status}`);
}

// ─── utilitários de data ──────────────────────────────────────────────────

/** Diferença em dias corridos entre duas datas ISO. */
function diasCorridos(from: string, to: string): number {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/** Diferença em dias úteis aproximados (252/ano, sem considerar feriados). */
function diasUteis(from: string, to: string): number {
  const corridos = diasCorridos(from, to);
  // Aproximação: 252 dias úteis / 365 dias corridos = 0,6904
  return Math.round(corridos * (252 / 365));
}

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── calculadoras por indexador ───────────────────────────────────────────

/**
 * Prefixado e Selic: juros compostos com taxa anual fixa.
 * fator = (1 + taxa_aa/100)^(du/252)
 */
function calcPrefixado(principal: number, rateAa: number, from: string): number {
  const du = diasUteis(from, hoje());
  if (du <= 0) return principal;
  const fator = Math.pow(1 + rateAa / 100, du / 252);
  return principal * fator;
}

/**
 * CDI pós-fixado: % do CDI diário acumulado.
 * Para cada dia com cotação disponível, aplica o fator diário.
 * Dias sem cotação (fins de semana, feriados) são ignorados — o CDI
 * só acumula em dias úteis.
 */
async function calcCdi(
  principal: number,
  pctCdi: number,
  from: string,
): Promise<number> {
  const rates = await pgGetMacroRates('cdi', from, hoje());
  if (!rates.length) {
    // Sem dados: usa CDI médio aproximado de 10,5% a.a. como fallback
    const fallbackAa = 10.5;
    const du = diasUteis(from, hoje());
    return principal * Math.pow(1 + (pctCdi / 100) * (fallbackAa / 100), du / 252);
  }
  let fatorAcum = 1;
  for (const { value } of rates) {
    // value = CDI anualizado em % a.a.
    // fator diário = (1 + pctCdi/100 × cdi_aa/100)^(1/252)
    const fatorDia = Math.pow(1 + (pctCdi / 100) * (value / 100), 1 / 252);
    fatorAcum *= fatorDia;
  }
  return principal * fatorAcum;
}

/**
 * IPCA+: IPCA acumulado (produto dos fatores mensais) × spread prefixado.
 * O IPCA é mensal e cada registro representa a variação % do mês.
 */
async function calcIpca(
  principal: number,
  spreadAa: number,
  from: string,
): Promise<number> {
  const rates = await pgGetMacroRates('ipca', from, hoje());
  // Produto dos fatores mensais de IPCA
  let fatorIpca = 1;
  for (const { value } of rates) {
    fatorIpca *= 1 + value / 100;
  }
  // Spread prefixado pro-rata sobre dias corridos
  const dc = diasCorridos(from, hoje());
  const fatorSpread = dc > 0 ? Math.pow(1 + spreadAa / 100, dc / 365) : 1;
  return principal * fatorIpca * fatorSpread;
}

// ─── dispatcher por tipo ──────────────────────────────────────────────────

async function calcularValor(pos: FiPosition): Promise<number> {
  const { indexer, rate, principal, application_date } = pos;

  switch (indexer) {
    case 'pre':
      return calcPrefixado(principal, rate, application_date);
    case 'selic':
      // Selic: usa taxa média do período (similar ao prefixado mas com dados reais)
      return calcPrefixado(principal, rate, application_date);
    case 'cdi':
      return calcCdi(principal, rate, application_date);
    case 'ipca':
      return calcIpca(principal, rate, application_date);
    default:
      return principal; // indexador desconhecido: retorna principal sem rendimento
  }
}

// ─── handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // Extrai user_id do JWT (Supabase injeta automaticamente quando verify_jwt=true)
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Autenticação necessária.' }),
      { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }

  // Decodifica o JWT para obter o sub (user_id) sem verificar assinatura
  // (a verificação já foi feita pelo runtime Supabase via verify_jwt=true)
  let userId: string;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    userId = payload.sub as string;
    if (!userId) throw new Error('sub ausente');
  } catch {
    return new Response(
      JSON.stringify({ error: 'JWT inválido.' }),
      { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const positions = await pgGetPositions(userId);
    if (!positions.length) {
      return new Response(
        JSON.stringify({ posicoes_atualizadas: 0, erros: [], executado_em: new Date().toISOString() }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    let atualizadas = 0;
    const erros: string[] = [];

    for (const pos of positions) {
      try {
        const valor = await calcularValor(pos);
        await pgUpdateCurrentValue(pos.id, valor);
        atualizadas++;
      } catch (e) {
        erros.push(`${pos.id}: ${(e as Error).message.slice(0, 120)}`);
      }
    }

    return new Response(
      JSON.stringify({
        posicoes_atualizadas: atualizadas,
        erros: erros.slice(0, 10),
        executado_em: new Date().toISOString(),
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
