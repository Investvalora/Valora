# AtualizaÃ§Ã£o de mercado e renda fixa â€” 04/11/2026

CorreÃ§Ãµes publicadas no Supabase, sem alterar quantidades, custos ou lanÃ§amentos.

- Stocks/ETFs e cÃ¢mbio: coleta a cada cinco minutos entre 13h e 21h55 UTC em dias Ãºteis (10hâ€“18h55 de BrasÃ­lia). Janela cobre o fechamento americano nos dois regimes de horÃ¡rio; o timestamp real evita fabricar uma sessÃ£o em feriados.
- Criptos: lote separado a cada dez minutos, 24 horas por dia, inclusive fins de semana. Uma chamada CoinGecko por lote, IDs deduplicados, preÃ§os na moeda cadastrada e last_updated_at persistido. Aproximadamente 4.320 chamadas em 30 dias, alÃ©m de eventuais chamadas manuais; sujeito Ã  disponibilidade e Ã  cota do provedor.
- IngestÃ£o global: preserva data/horÃ¡rio real; rejeita preÃ§o invÃ¡lido e horÃ¡rio ausente/futuro; proteÃ§Ã£o transacional impede sobrescrever cotaÃ§Ãµes mais recentes ou oficiais. Preserva campos OHLC e volume. Endpoints de manutenÃ§Ã£o restritos Ã  credencial interna validada.
- Taxas: importaÃ§Ã£o Ã s 17h e segunda passagem Ã s 20h de BrasÃ­lia, em dias Ãºteis. RecÃ¡lculo encadeado somente depois da gravaÃ§Ã£o bem-sucedida de todas as sÃ©ries. Removido recÃ¡lculo independente que podia preceder o tÃ©rmino da importaÃ§Ã£o. Erros parciais retornam HTTP 503.

## ValidaÃ§Ã£o

Cinco testes de datas, validaÃ§Ã£o de cotaÃ§Ãµes, separaÃ§Ã£o de provedores e sequÃªncia macro/recÃ¡lculo passaram. Os 14 testes existentes do fallback tambÃ©m passaram durante a implementaÃ§Ã£o. TypeScript passou. Testes SQL de cronologia, isolamento de permissÃ£o, agendamento e OHLC executados com rollback.

Migration market_refresh_windows e migration complementar preserve_global_quote_fields aplicadas. FunÃ§Ãµes publicadas: sync-global-assets v17; sync-macro-rates v12.

ExecuÃ§Ã£o manual 510: 48 de 49 ativos atualizados. Todos os 15 ativos internacionais/criptos da carteira Investidor10 receberam atualizaÃ§Ã£o; stocks e ETFs com market_time 18h BRT, criptos por volta de 18h53. TOT retornou falha do provedor. Cadastro TOT tem nome Lionshares U.S. Equity Total Return ETF, provider_symbol TOT, sem posiÃ§Ã£o em nenhuma carteira. NÃ£o associar automaticamente Ã  antiga TotalEnergies nem desativar sem investigar sua identidade.

ExecuÃ§Ã£o manual 511: HTTP 200; CDI 500 registros, Selic 501 e IPCA 23; 13 aplicaÃ§Ãµes recalculadas, sem erros. Banco passou a ter CDI atÃ© 03/11 e Selic atÃ© 04/11. RDB da Investidor10 passou de 3.005,7512 para 3.007,5068. IPCA ainda termina em setembro, conforme disponibilidade oficial consultada.

## Limites que permanecem

RDB nÃ£o foi conciliado com extrato bancÃ¡rio ou memÃ³ria de cÃ¡lculo do Investidor10. Tesouro mantÃ©m estimativa contratual e taxas aproximadas previamente autorizadas, sem marcaÃ§Ã£o a mercado. Custos histÃ³ricos divergentes nÃ£o foram alterados. NÃ£o afirmar equivalÃªncia integral entre plataformas. O aviso de histÃ³rico incompleto por IPCA ainda depende de tratamento prÃ³prio de disponibilidade das sÃ©ries.

## Verificação posterior

Cron internacional executou às 18h55 BRT; 36 dos 37 ativos desse lote foram atualizados, mantendo somente a falha de TOT. Cron cripto executou às 19h, mas a resposta HTTP foi 503 por falha na consulta ao provedor (cron succeeded indica apenas disparo, não sucesso da API). Nova execução manual 515 retornou HTTP 200: 12 criptos atualizadas, zero falhas. Os preços válidos anteriores são preservados em falhas. A v17 expõe apenas códigos seguros para esse diagnóstico. Não afirmar disponibilidade ininterrupta de um serviço externo com base em uma execução bem-sucedida.

Nenhuma mudança visual foi necessária. PR e merge não foram realizados nesta etapa; alterações locais de favoritos, relatórios anteriores e configuração de outras ferramentas foram preservadas.

## Investigação TOT versus TOTS3

Há evidência de relação histórica: lookup-asset documenta retorno incorreto do provedor (pedido TOTS3, resposta TOT) e rejeita símbolo diferente do solicitado. A versão publicada também contém essa proteção. Sem o log original de cadastro, não é possível provar que esse foi o evento que criou TOT.

Hoje são registros separados: TOTS3 é TOTVS S.A., stock_br, BRL, provider_symbol TOTS3; TOT é Lionshares U.S. Equity Total Return ETF, etf_us, USD, provider_symbol TOT. TOT foi criado em 15/09 às 17h59 UTC e TOTS3 às 18h11 UTC. TOT não tem posições, lançamentos, alertas, favoritos ou proventos de carteira. TOTS3 tem 18 ações na Investidor10, PM 28,36, com cotação Yahoo 33,36 no recorte de 04/11 às 16h15 BRT.

A falha TOT não afeta a posição TOTS3 nem os saldos atuais. Pode ser resíduo da identificação antiga; não foi renomeado, apagado ou desativado nesta investigação.

Cadastro TOT desativado em produção por migration condicional deactivate_unused_tot_catalog_entry, sem exclusão de histórico. Verificado TOTS3 ativo e símbolo TOTS3 preservado.
