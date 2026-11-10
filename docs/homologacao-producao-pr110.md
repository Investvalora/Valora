# Homologação de produção — PR110 — 07/11/2026

Merge `a2c5b0e18a09c9d7b5d30a79e80926ada2360d1d`,17:07 BRT. Consultas somente leitura; carteira Investidor10 preservada.

## Publicado e conferido

- Checks do commit de merge: app e database-isolation aprovados. Status Vercel sucesso no deployment `9DwdijUf1tipiNyMaL3TKkZZKTLV`.
- Navegador integrado autenticado, origem de produção. Início carregou: patrimônio18.637,48 (cripto varia), proventos totais773,60 e12M603,54, lucro748,63. Confirma a separação dos KPIs publicada.
- Importação `/ativos/importar`: destinoInvestidor10 explícito e formulário no padrão visual. Nenhum arquivo enviado ou registro salvo.
- Detalhe CPTS11: cotação7,01, quantidade33, saldo231,33; fundamentos, gráfico e recebimentos importados carregaram. P/VP permanece indisponível. Compatibilidade com schema anterior preserva a tela; isso não confirma enriquecimento CVM.
- Rentabilidade terminou de carregar:24,09%, período07/11/2024–31/10/2026; IPCA30/11/2024–30/09/2026. Sem aviso de histórico incompleto nesta consulta da carteira.

## Pendência de publicação Supabase

- `to_regclass` retornou null para `cvm_fii_reports`, `b3_cash_announcements`, `issuer_dividend_sources`; coluna `fundamentals.cvm_reference_date` ausente.
- Nenhum dos4 novos cron jobs encontrado: sync-cvm-fii, sync-b3-dividends, sync-issuer-dividends, discover-issuer-dividend-sources. Agendamento anterior de cotações pós-fechamento existe e está ativo.
- Lista oficial de Edge Functions não contém as3 funções novas. Funções alteradas nesta PR ainda mostram datas de publicação anteriores ao merge; não afirmar que o backend desta entrega foi publicado.
- Portanto, **frontend publicado; entrega de fontes oficiais ainda incompleta**. Seguir publicação coordenada de `docs/fontes-oficiais-2026-11-07.md`: migration, funções, secret CoinGecko e execução/retentativa dos jobs. Não executado nesta conferência.

Homologação de reautenticação não revogou sessões reais; importação não gravou dados. Esses fluxos mantêm cobertura local/automatizada descrita na PR, sem alegar novo teste destrutivo em produção.

## Publicação Supabase autorizada e executada

- Migration `official_market_sources`, versão remota MCP20261107201659, aplicada. Conteúdo da migration versionada20261107183717 com pausa dos4 cron jobs na mesma transação, até verificar as funções.
- Publicadas: sync-cvm-fii v1, sync-b3-dividends v1, sync-issuer-dividends v1, sync-b3-prices v21, sync-dividends-yahoo v10, sync-global-assets v18, lookup-asset v13, sync-macro-rates v13, sync-treasury-prices v3, calc-fixed-income v13. Preservados os requisitos JWT anteriores; funções novas exigem JWT e autorização de serviço.
- Carga inicial: CVM19301 informes (9 chaves conflitantes excluídas); B3 arquivo diário06/11 com40 preços/identificadores; complemento CVM9 FIIs, repetição0; iShares diretório521,2 fontes,20 eventos; cripto12/12 sem erro. Primeiro lote B3 anúncios3 ativos/13 anúncios sem erros; fila22 ativos retomada automaticamente em lotes de3.
- TFLO ex02/11, pagamento05/11, USD0,171627 confirmado em `dividends`, fonteishares. Não é recebimento líquido pessoal nem foi criado lançamento de pagamento.
- Quatro jobs ativados após sucesso: CVM23:30UTC dias úteis; B3 minutos2-59/5; iShares a cada5 minutos; descoberta iShares21:45UTC diária. Não afirmar conclusão dos22 ativos na primeira execução.
- RLS ativo nas5 novas tabelas. Clientes autenticados sem SELECT nas2 tabelas internas. Advisors preservam avisos anteriores pg_net público e proteção de senhas vazadas; duas novas tabelas internas aparecem como INFO de RLS sem policy por serem exclusivas do servidor, sem acesso cliente.
- Posições67 e lançamentos202 preservaram digest integral antes/depois. Nenhum principal, quantidade, compra ou venda alterado.
- Conferência em produção: CPTS11 agora mostra P/VP0,84 e aviso de VPA complementado pela CVM, competência01/09/2026. Evidência local `output/qa-fontes-oficiais/cvm-producao.png`.

### Correção necessária na publicação B3

A primeira chamada retornou503 com `failed to write whole buffer`. O ZIP diário real usa flag8/data descriptor e tamanho compactado zero no cabeçalho local. O código antigo passava o descriptor e diretório final ao deflate; Node tolerava os bytes adicionais, mas Deno Edge falhava. Leitura corrigida para usar o tamanho do diretório central e limitar o payload ao fluxo comprimido, rejeitando diretório/tamanho inválido e entrada cifrada/não suportada.

Teste usa ZIP deflate com data descriptor, verifica exatamente o tamanho extraído e rejeita diretório inválido. Testes2/2, TypeScript, Deno check e lint aprovados. Reexecução hospedada HTTP200,40 linhas, sem erros; cobertura explicitamente diária, não backfill mensal. Correção publicada na v21 para concluir a carga.

### Limite do recálculo manual

Revisão automática rejeitou chamada combinada que incluía sync-treasury-prices, pois ela recalcula `current_value` e conflita com a restrição anterior de preservar a carteira Investidor10. A chamada não foi executada. Carga B3 foi enviada separadamente, pois apenas altera dados públicos. As novas versões de macro/Tesouro/recálculo estão publicadas; teste manual que grava saldos aguarda autorização específica solicitada ao usuário. Agendamentos preexistentes não foram alterados.

### Recálculo autorizado posteriormente pelo usuário

Usuário confirmou expressamente “Sim, autorizar o recálculo dos saldos”, inclusive Investidor10. Executado sync-treasury-prices:1118 preços salvos, referência06/11/2026,13 posições recalculadas. Retorno503 parcial por um cadastro Tesouro Selic vencimento10/10/2027, quantidade100, sem PU oficial correspondente. Esse cadastro **não pertence à carteira Investidor10**; valor preservado e cadastro não corrigido por suposição. É uma pendência de dados, não publicação faltante.

Carteira Investidor10: três lotes Tesouro mantêm quantidades0,03/0,01/0,14 e valores118,7583/39,5861/78,134, referência06/11; seis lotes RDB somam3011,0208. Atualizações calculadas concluídas nessa carteira. Posições de renda variável67 e lançamentos202 continuam com o digest anterior, inclusive após o recálculo.

Macro HTTP200, sem erros:499 valores CDI,500 Selic,23 IPCA processados; não acionou outro recálculo (`recalculo:null`). Três chamadas sem credencial às novas funções retornaram401. Primeira execução automática iShares registrada com sucesso no cron; aprovação SQL do cron apenas confirma despacho, enquanto a execução HTTP manual e os dados persistidos comprovam a carga.

Permanecem os avisos de segurança preexistentes: [pg_net no schema público](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) e [proteção de senhas vazadas desabilitada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Não alterados nesta publicação.
