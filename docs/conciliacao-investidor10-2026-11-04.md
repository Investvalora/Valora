# Comparação de valores — 04/11/2026

Leitura da carteira pública Investidor10 1782570 e da carteira Investidor10 no Valora. Sem mudanças financeiras. Totais observados: Investidor10 R$ 18.456,38; Valora R$ 18.901,45 (diferença R$ 445,07). Valores intradiários podem mudar; resumo e posições do Investidor10 também apresentaram referências diferentes.

## Evidência de rede do Valora

Respostas HTTP 200 de price_history, capturadas após recarga pelo navegador integrado. VGHF11: close 4,80, date 2026-11-02, source brapi, updated_at 2026-11-02T17:00:40Z. Histórico de 30/10 também 4,80, source brapi_seed. GARE11 8,20; MXRF11 8,88; WEGE3 48,36, todos com último registro em 02/11. Não vieram preços brasileiros de 03/11 ou 04/11 na consulta. Stocks de fonte finnhub e criptos coingecko tinham registros em 04/11.

Portanto, a divergência não é apenas cache do navegador: o próprio backend entrega preços brasileiros com data anterior. O mecanismo que interrompeu/deixou de avançar a sincronização (job, função ou provedor) ainda exige logs do servidor; não atribuir falha específica sem evidência.

## Exemplos conciliados

- VGHF11: ambas as posições têm 254 cotas e PM R$ 6,18; I10 usa R$ 4,06 (saldo R$ 1.031,24), Valora R$ 4,80 (R$ 1.219,20). Diferença de R$ 187,96 explicada integralmente pelo preço.
- FIIs da tabela I10: MXRF11 1.574,54; GARE11 1.458,51; VGHF11 1.031,24; HGLG11 723,40; XPSF11 512,56; CPTS11 231,00. Soma R$ 5.531,25. Valora R$ 5.883,46: diferença R$ 352,21 nesse recorte. Não confundir com composição do resumo I10 de R$ 5.558,04.
- RDB: I10 R$ 2.977,47, Valora R$ 3.005,75. No Valora, seis aplicações totalizam principal R$ 2.974,67 e foram recalculadas em 03/11 às 20:15 UTC. Não é saldo parado desde outubro. Diferença de R$ 28,28 ainda depende da comparação das bases/eventos da origem e convenção de rendimento.
- Tesouro: I10 R$ 235,17, Valora R$ 242,21. Valora calcula estimativa contratual com taxas aproximadas autorizadas na importação (IPCA 7,19/7,83 e pré 13,12); não reproduz marcação a mercado. Não presumir igualdade dos saldos.

Nenhuma evidência de quantidade divergente no VGHF11. Não concluída conciliação completa de todos os ativos, custos e câmbio. Não alterar transações ou copiar preços do I10 automaticamente para forçar igualdade.

## Causa da falha automática confirmada no servidor

Após reconectar Supabase: jobs brapi ativos, execuções cron succeeded. Respostas pg_net recentes: 40 ativos, quatro gravados, 36 falhas, HTTP 200. Consulta diagnóstica única de VGHF11 ao provedor usando a credencial existente do Vault (sem expor seu valor) retornou HTTP 429, code MONTHLY_LIMIT_EXCEEDED, consumo 15.000/15.000 do plano gratuito. Provedor informa renovação em 2026-11-08T00:36:38Z (07/11 às 21:36:38 de Brasília).

Versão publicada da função: v7. Tenta seed de 3 meses em cada ativo contado com menos de três pontos; enumeração de price_history sem paginação pode truncar contagens e classificar ativos antigos como novos. Respostas repetidas indicam 36 novos a cada execução. Trata falhas do provedor como null, descarta status/motivo e retorna HTTP 200 com falhas. Não foi alterado agendamento, credencial, plano ou função nesta investigação.
