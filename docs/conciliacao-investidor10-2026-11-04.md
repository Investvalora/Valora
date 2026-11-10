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

## Nova comparação após publicar Yahoo como primeira fonte

Recorte posterior, sem escritas: Valora R$ 18.624,64 contra resumo I10 R$ 18.456,38, diferença R$ 168,26. Dados intradiários capturados em momentos próximos, não uma fotografia atômica entre provedores.

Detalhes por classe (Valora / I10 / diferença): ações 5.288,64 / 5.288,45 / +0,19; FIIs 5.517,00 / 5.531,25 / -14,25; stocks 2.273,16 / 2.260,00 / +13,16; ETFs 1.966,82 / 1.942,44 / +24,38; criptos 331,06 / 331,20 / -0,14; RDB 3.005,75 / 2.977,47 / +28,28; Tesouro 242,21 / 235,17 / +7,04. Soma da diferença entre posições: R$ 58,66.

Os detalhes I10 somam R$ 18.565,98, R$ 109,60 acima do próprio resumo de R$ 18.456,38. Assim, 168,26 = 58,66 entre posições + 109,60 entre resumo e detalhes I10. A causa interna dessa inconsistência no I10 não foi estabelecida; não assumir erro de importação do Valora nem sincronismo entre endpoints.

Quantidades internacionais observadas conferem com o Valora (11 stocks). Preços intradiários diferem: exemplos NU 12,04 Valora vs 11,95 I10; MCD 279,03 vs 276,47. As posições BR também exibem diferenças pequenas de preço, agora sem o antigo desvio do VGHF11. Não há conciliação definitiva de PM/custos (valor investido difere R$ 12,24), convenções de renda fixa e câmbio. Sem alterações de transações, taxas ou saldos para forçar igualdade.
## Auditoria completa de atualização — recorte de 04/11, aproximadamente 16h40–17h10 BRT

Leitura de produção e da carteira pública, sem alterar saldos. Capturas não simultâneas; preços intradiários não devem ser usados como reconciliação contábil definitiva.

### Valora: horário confirmado por grupo

- Todos os 30 ativos negociados da carteira têm último preço com data 04/11; nenhum continua em 02/11.
- Nove ações BR e seis FIIs: Yahoo, gravação 16h30; market_time 16h13–16h15. Há atraso intradiário, mas o antigo bloqueio de dias foi resolvido.
- Onze stocks e dois ETFs: Finnhub, gravação 15h50. Não há market_time armazenado: o horário de coleta não prova o horário do negócio do provedor.
- BTC-BRL e ETH-BRL: CoinGecko, gravação 15h50, também sem market_time.
- Causa confirmada: cron internacional vai de 12h30 a 18h50 UTC, de cinco em cinco minutos em dias úteis. Última execução 04/11 18h50 UTC succeeded. Não existem execuções posteriores no agendamento atual. Portanto para às 15h50 BRT, deixando o restante da sessão americana e criptos fora da janela.
- Renda fixa: nove aplicações ativas atualizadas em 03/11 17h15 BRT; cron diário ativo às 20h15 UTC (17h15 BRT). Antes desse horário em 04/11, o saldo do dia anterior corresponde à cadência configurada.

### Preços observados por ativo

Valores BR em reais; internacionais em dólares. A coluna I10 é current_price exibido nos detalhes, não o valor usado no resumo.

| Ativo BR | Valora | I10 |
|---|---:|---:|
| BBAS3 | 16.47 | 16.44 |
| BBSE3 | 37.8 | 37.93 |
| CXSE3 | 20.75 | 20.76 |
| ITSA3 | 13.19 | 13.19 |
| KLBN4 | 3.6 | 3.64 |
| RADL3 | 15.37 | 15.45 |
| SAPR11 | 30.66 | 30.87 |
| TOTS3 | 33.36 | 33.45 |
| WEGE3 | 50.29 | 50.27 |
| CPTS11 | 7 | 7.02 |
| GARE11 | 7.95 | 7.97 |
| HGLG11 | 144.2 | 144.09 |
| MXRF11 | 8.39 | 8.38 |
| VGHF11 | 4.06 | 4.06 |
| XPSF11 | 5.93 | 5.97 |

| Ativo internacional | Valora | I10 |
|---|---:|---:|
| AAPL | 352.89 | 352.52 |
| AMZN | 267.86 | 266.65 |
| COST | 1049.79 | 1049.56 |
| GOOGL | 290.73 | 292.4 |
| JPM | 350.98 | 350.57 |
| KO | 96.18 | 96.05 |
| MA | 668.09 | 668.56 |
| MCD | 279.03 | 276.47 |
| META | 630.39 | 630.46 |
| NU | 12.04 | 11.95 |
| NVDA | 203.53 | 202.8 |
| IVV | 771.16 | 757.88 |
| TFLO | 50.5401 | 50.53 |

| Cripto em BRL | Valora | I10 |
|---|---:|---:|
| BTC | 438961 | 438307 |
| ETH | 13237.72 | 13219.43 |

ITSA3 e VGHF11 coincidem no recorte; diferenças nos demais não provam, isoladamente, qual provedor está mais novo. A resposta pública de posições BR do I10 não inclui timestamp da cotação. Logo não é possível ordenar a atualidade de cada preço entre plataformas apenas por serem diferentes.

### Investidor10: resumo e detalhes não usam a mesma base

Após recarregar a página, resumo permanece R$ 18.456,38. Composição do resumo: ações 5.211,47; FIIs 5.558,04; stocks 2.201,06; ETFs 1.949,89; cripto 323,28; renda fixa 2.977,47; Tesouro 235,17. Cabeçalhos de detalhes mostram respectivamente 5.288,45; 5.531,25; 2.260,00; 1.942,44; 331,20; 2.977,47; 235,17. Eles somam 18.565,98.

Além disso, a API pública summary/actives devolve campos equity_brl e equity_total diferentes no mesmo ativo: WEGE3 equity_brl 1.490,40 versus equity_total 1.508,10 (30 × 50,27); BBAS3 997,35 versus 1.002,84 (61 × 16,44). Isso demonstra bases distintas dentro do I10; a causa interna e o horário dessas bases não são expostos. Não atribuir toda a diferença a atraso do Valora.

### Renda fixa e câmbio: diferenças ainda não resolvidas por atualização

- RDB: Valora 3.005,75; I10 2.977,47; delta +28,28. Principal Valora 2.974,67. A data de atualização do I10 e sua memória de cálculo não estão disponíveis no resumo público; não há prova suficiente para dizer que o I10 está errado ou que apenas recalcular elimina o delta.
- Tesouro: Valora 242,21 versus I10 235,17, delta +7,04. O Valora usa estimativa contratual com taxas aproximadas autorizadas na importação; igualdade com preço de mercado não é esperada.
- Câmbio Valora prioriza PTAX e mantém a consulta por uma hora; não representa necessariamente dólar intradiário. Sem taxa/timestamp explícitos do I10 na captura, a parcela exata de câmbio da diferença fica pendente.
- Valor investido difere em 12,24; exemplos de PM divergente: BBAS3 19,79 vs 19,89; WEGE3 38,92 vs 38,93; HGLG11 152,40 vs 152,44; IVV 696,83 vs 696,87. Cotações novas não corrigem custo histórico. É necessário conciliar lançamentos e custos antes de qualquer alteração.

### Pendências objetivas

1. Corrigir janela do cron global para cobrir a sessão americana e definir atualização de cripto fora dos dias úteis.
2. Guardar timestamp real dos provedores internacionais; distinguir coleta de horário do preço.
3. Mostrar fonte, horário e natureza do câmbio/saldo na interface.
4. Conciliar custo histórico divergente e memória de cálculo do RDB, sem copiar saldo para forçar igualdade.
5. Manter separada a pendência de rentabilidade histórica: IPCA de outubro ainda não disponível no recorte consultado, embora outubro esteja fechado.

## Validação direta dos preços contra provedores — cerca de 16h51 BRT

Consulta somente leitura dos 30 registros em produção, seguida de chamadas públicas ao Yahoo (chart 5d/1d e 1d/1m) para 28 ações/FIIs/stocks/ETFs, e CoinGecko para as duas criptos. Nenhum preço foi sobrescrito.

- Os 15 preços BR armazenados estão dentro das faixas de negociação de um minuto próximas ao market_time registrado, com arredondamento à precisão monetária. Isso confirma coerência com a própria fonte Yahoo; não constitui validação independente contra o registro oficial B3. Exemplos: VGHF11 4,06, BBAS3 16,47, WEGE3 50,29 e XPSF11 5,93. A consulta mais recente já retorna outros valores porque o mercado continuou negociando.
- Os 13 preços internacionais foram consultados também no Yahoo, como segunda fonte ao Finnhub. São próximos das cotações do mesmo dia e das barras em torno da coleta das 15h50; não são coincidências exatas em todos os casos. O Finnhub não teve seu timestamp real persistido, portanto não é possível certificar cada preço como negócio no segundo exato da coleta. Não foi encontrada discrepância grande de escala/moeda/símbolo nesse conjunto.
- IVV: Valora 771,16; Yahoo atual 771,07 às 16h51 BRT. Yahoo registra fechamento anterior de 03/11 em 757,88, exatamente o preço observado no I10. Neste ativo, há evidência concreta de referência do dia anterior no I10, enquanto Valora usa cotação do dia atual.
- TFLO: Valora 50,5401; Yahoo atual 50,55; fechamento anterior Yahoo 50,53, igual ao preço observado no I10. A barra Yahoo das 15h48 inclui exatamente 50,5401.
- Exemplos de segunda fonte: AAPL Valora 352,89 versus Yahoo atual 352,638; AMZN 267,86 versus 268,46; MCD 279,03 versus 281,04; NU 12,04 versus 12,025. As comparações atuais têm aproximadamente uma hora de diferença da coleta Valora, logo não são testes de igualdade no mesmo instante.
- Criptos: CoinGecko atual BTC/BRL 436.532 e ETH/BRL 13.146,72, versus Valora 438.961 e 13.237,72 coletados às 15h50. A chamada pública atual não fornece o snapshot antigo; os valores antigos não foram certificados historicamente. Confirma-se que já não representam a cotação mais recente, não que houve erro de conversão.

Conclusão limitada à evidência: os preços BR são coerentes com sua fonte e horário; os internacionais são corroborados por segunda fonte, com IVV e TFLO mostrando referência anterior no I10. Não se pode descartar todo problema no Valora: o cron global termina cedo, não guarda timestamp real dos preços globais e as criptos estão desatualizadas. Câmbio, RDB, Tesouro e custo histórico precisam de validação própria e não são certificados por esta checagem de preços.

## Fechamento da investigação — criptos, câmbio e renda fixa

Consultas adicionais somente leitura, em 04/11/2026. Sem modificar dados financeiros ou agendamentos.

### Criptos confirmadas no horário histórico

CoinGecko /coins/bitcoin/market_chart e /coins/ethereum/market_chart, vs_currency=brl, days=1, retornaram pontos exatamente às 18h50 UTC (15h50 BRT): BTC 438.982,442547 e ETH 13.234,606304. Valora: BTC 438.961 e ETH 13.237,72. Desvios de -0,004885% e +0,023527%, respectivamente, compatíveis com amostras diferentes dentro do mesmo minuto; não são valores históricos idênticos certificados tick a tick.

Quantidades confirmadas no banco: BTC-BRL 0,00061788 e ETH-BRL 0,00451994. Quantidade × preço resulta em 271,23 e 59,83, respectivamente. Usando os pontos históricos, seriam 271,24 e 59,82: soma arredondada igual de 331,06. O valor do ativo é obtido diretamente em BRL no CoinGecko; não aplica câmbio USD adicional. Não foi encontrado erro de moeda, escala ou multiplicação. O problema confirmado é atualização: cron compartilhado para às 15h50 e roda só em dias úteis, deixando cripto parada fora dessa janela.

### Câmbio confirmado, com natureza distinta de dólar em tempo real

Consulta direta à API PTAX do BCB retornou 5,4778 na referência 04/11/2026 13:05:19. Esse valor reproduz os saldos capturados: AAPL 0,0661 × 352,89 × 5,4778 = 127,7753217 (127,78); IVV 0,24564543 × 771,16 × 5,4778 = 1.037,670225 (1.037,67). Portanto não se observou conversão dupla nem fallback fixo de 5 nesses saldos. A PTAX é uma referência, não o dólar spot do instante. A taxa exata e o horário usados no I10 não foram certificados; não atribuir toda diferença internacional a câmbio.

### RDB: aritmética reproduzida, insumo incompleto

Recálculo independente em SQL do fator diário 1 + [(1 + CDI a.a./100)^(1/252) - 1] × 1,15 reproduziu a quatro casas decimais os seis saldos armazenados, usando as datas e taxas existentes. Isso valida a execução aritmética sobre os insumos cadastrados, não a equivalência com extrato bancário ou todas as convenções de contagem.

Entretanto macro_rates termina em 30/10 para CDI. A API oficial SGS 4389 já retorna 03/11 em 13,65% a.a. Um fator adicional desse dia elevaria o saldo bruto agregado de 3.005,7512 para aproximadamente 3.007,5067 (+1,76), mantidas as demais premissas. Não é correção aplicada, nem valor bancário certificado. O cron macro está ativo às 17h BRT e o recálculo às 17h15; no recorte anterior a essas execuções, o insumo de 03/11 ainda falta. Não há evidência suficiente para declarar falha do job atual sem observar a execução posterior. A diferença de 28,28 contra I10 não é explicada apenas por esse dia e exige memória de cálculo/eventos da origem.

### Tesouro e histórico

O Valora é uma estimativa contratual, com taxas aproximadas autorizadas na importação. Prefixado aproxima dias úteis por dias corridos × 252/365, sem calendário real de feriados; IPCA+ aplica fatores mensais e spread, sem reproduzir preço oficial de mercado. Não certificar seus saldos como valor de resgate do Tesouro. A API oficial SGS 433 consultada ainda termina em setembro; a ausência de outubro não é, nesse recorte, um valor oficial que deixou de ser importado. Isso deve ser diferenciado do CDI de 03/11, que já está disponível.

### Conclusão final

Não foi encontrado erro grosseiro nos preços de mercado da carteira nem na conversão BRL das criptos. O I10 mantém referências distintas entre resumo, classes e linhas; IVV e TFLO exibiram preços iguais ao fechamento anterior. O Valora também tem pendências reais: janela global curta, cripto sem atualização contínua, ausência de timestamp real dos preços globais, CDI de 03/11 ainda ausente na captura e aproximações de renda fixa. Assim, está descartada a hipótese de que toda divergência seja uma cotação incorreta do Valora, mas não está provada a correção integral de seus saldos. RDB, custo histórico e equivalência de convenções continuam sem conciliação definitiva; não ajustar quantidades ou saldos para igualar o I10.
