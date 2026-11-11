# Homologação de produção PR134 — 11/11/2026

## Publicação confirmada

- PR134 mergeada na main `c9a5e333b5242bb0a39a3c46b5ec32650645164c`, incluindo o commit CDI que antes havia ficado na branch intermediária.
- `calc-fixed-income` publicada a partir da main, versão 15 ACTIVE, `verify_jwt=true`. Incluídos `_shared/cdi.ts`, `_shared/bankingHolidays.ts` e `_shared/treasury.ts`.
- POST sem autenticação na URL pública retornou HTTP401 no gateway. Nenhuma credencial exposta.
- Checks da PR134 e deploy Vercel aprovados; CI específica do merge na main ainda em andamento no momento desta conferência.

## Dados de produção, sem gravação

Consulta somente leitura encontrou 540 referências CDI, última 10/11/2026. Snapshot dessa série executado no Deno com o mesmo módulo publicado, sem acesso de escrita ao banco:

| Aplicação | Corte exclusivo | Taxas aplicáveis | Última referência | Cobertura |
|---|---|---:|---|---|
| 21/07/2025 | 19/09/2025 | 44 | 18/09/2025 | Completa |
| 19/09/2026 | 11/11/2026 | 35 | 10/11/2026 | Completa |
| 30/09/2026 | 11/11/2026 | 28 | 10/11/2026 | Completa |
| 15/10/2026 | 11/11/2026 | 18 | 10/11/2026 | Completa |
| 28/10/2026 | 11/11/2026 | 9 | 10/11/2026 | Completa |
| 30/10/2026 | 11/11/2026 | 7 | 10/11/2026 | Completa |

Os seis intervalos distintos cobrem os sete cadastros CDI consultados, incluindo um vencido; isso não implica que todos devam sofrer novo recálculo. Referência do corte não foi antecipada para o dia da execução.

## Operação e limites

- Agendamentos `sync-macro-rates-diario` (20h UTC) e `sync-macro-rates-retry` (23h UTC) ativos e com recálculo configurado. No fuso de Brasília: 17h e 20h, em dias de semana.
- Nenhum saldo foi recalculado manualmente, nenhum lançamento ou recebimento alterado. A preservação de saldo nas lacunas foi comprovada no handler local com armazenamento simulado, não por criar lacuna artificial em produção.
- Publicação, autenticação e compatibilidade da série real verificadas. Resta acompanhar o próximo recálculo automático da versão 15 e seus erros por lote; não afirmar sucesso dessa execução antes de observá-la.
- Calendário ANBIMA precisa revisão anual e após mudanças legais. A cobertura verificada é 2001–2030; fora dela, a função preserva saldo e informa indisponibilidade.
