// Edge Function: sync-global-assets (minimal cold-start version)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  // Responde imediatamente para evitar timeout
  const response = new Response(new ReadableStream({
    async start (controller) {
      const encoder = new TextEncoder();
      try {
        const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
        const { data: assets } = await supabase.from('assets').select('ticker, provider_symbol, quote_provider').eq('active', true).in('quote_provider', [
          'finnhub',
          'coingecko',
          'awesomeapi'
        ]);
        if (!assets?.length) {
          controller.enqueue(encoder.encode(JSON.stringify({
            total: 0,
            success: 0,
            failed: 0,
            errors: []
          })));
          controller.close();
          return;
        }
        let success = 0, failed = 0;
        const errors = [];
        const apiKey = Deno.env.get('FINNHUB_API_KEY');
        // Processa tudo em paralelo - sem rate limit agressivo
        await Promise.all(assets.map(async (asset)=>{
          try {
            let res;
            if (asset.quote_provider === 'finnhub' && apiKey) {
              res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${asset.provider_symbol}&token=${apiKey}`, {
                signal: AbortSignal.timeout(3000)
              });
              const json = await res.json();
              if (json.c) {
                await supabase.from('price_history').upsert({
                  ticker: asset.ticker,
                  date: new Date().toISOString().split('T')[0],
                  close: json.c,
                  open: json.o,
                  high: json.h,
                  low: json.l,
                  volume: json.v || null,
                  source: 'api_finnhub'
                }, {
                  onConflict: 'ticker,date'
                });
                success++;
                return;
              }
            } else if (asset.quote_provider === 'coingecko') {
              const cgKey = Deno.env.get('COINGECKO_API_KEY');
              res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${asset.provider_symbol}&vs_currencies=usd`, {
                headers: cgKey ? {
                  'x-cg-demo-api-key': cgKey
                } : {},
                signal: AbortSignal.timeout(3000)
              });
              const json = await res.json();
              const price = json[asset.provider_symbol]?.usd;
              if (price) {
                await supabase.from('price_history').upsert({
                  ticker: asset.ticker,
                  date: new Date().toISOString().split('T')[0],
                  close: price,
                  open: price,
                  high: price,
                  low: price,
                  volume: null,
                  source: 'api_coingecko'
                }, {
                  onConflict: 'ticker,date'
                });
                success++;
                return;
              }
            } else if (asset.quote_provider === 'awesomeapi') {
              res = await fetch(`https://economia.awesomeapi.com.br/json/last/${asset.provider_symbol}`, {
                signal: AbortSignal.timeout(3000)
              });
              const json = await res.json();
              const key = asset.provider_symbol.replace('-', '');
              const price = parseFloat(json[key]?.bid);
              if (price) {
                await supabase.from('price_history').upsert({
                  ticker: asset.ticker,
                  date: new Date().toISOString().split('T')[0],
                  close: price,
                  open: price,
                  high: price,
                  low: price,
                  volume: null,
                  source: 'api_awesomeapi'
                }, {
                  onConflict: 'ticker,date'
                });
                success++;
                return;
              }
            }
          } catch  {}
          failed++;
          errors.push(asset.ticker);
        }));
        controller.enqueue(encoder.encode(JSON.stringify({
          total: assets.length,
          success,
          failed,
          errors: errors.slice(0, 10)
        })));
      } catch (error) {
        controller.enqueue(encoder.encode(JSON.stringify({
          error: error.message
        })));
      }
      controller.close();
    }
  }), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff'
    }
  });
  return response;
});
