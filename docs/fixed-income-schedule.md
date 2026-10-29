# Recálculo diário da renda fixa

Aplicado em produção em 28/10/2026.

- Job: `recalculate-fixed-income-daily`, todos os dias às 20:15 UTC (17:15 de Brasília), após a sincronização macro das 20:00 UTC nos dias úteis.
- Destino: `calc-fixed-income` v6, com verificação JWT mantida. A credencial interna exata do runtime ou do Vault autoriza o lote global; sessões comuns continuam restritas ao próprio usuário.
- Credenciais são lidas no Vault pelo job, sem novos segredos no frontend. A RPC `authorize_fixed_income_job` compara somente SHA-256 e permite execução apenas a `service_role`.
- O lote consulta posições ativas em páginas de 500 e preserva eventos, principal e vencimento. Não modifica as fórmulas de rendimento existentes. Fins de semana usam os índices disponíveis, sem criar taxas diárias fictícias.
- Verificação inicial pela mesma chamada do job: HTTP 200, sete posições atualizadas, nenhum erro; timestamps conferidos no banco em 28/10/2026 às 19:58 de Brasília. A primeira execução automática futura ainda depende do próximo horário agendado.
- Diagnóstico: consultar `cron.job_run_details` para disparo e `net._http_response` para retorno HTTP e `erros` da função. Sucesso do cron sozinho não comprova sucesso da requisição assíncrona.
- Para pausar: `select cron.unschedule('recalculate-fixed-income-daily');`. O cálculo manual continua funcionando.

Atualizar o banco não força a atualização instantânea de uma tela já aberta. O fluxo existente de consulta/cache do frontend permanece nesta entrega.
