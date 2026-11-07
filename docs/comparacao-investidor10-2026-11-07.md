# Comparação somente leitura — 07/11/2026

Fonte: carteira pública https://investidor10.com.br/wallet/public/1782570/positions e produção Valora, carteira Investidor10. Valores observados durante a mesma conferência; preços podem variar entre leituras.

| Classe | Valora | Investidor10, grupos de posições | Valora menos I10 |
|---|---:|---:|---:|
| Ações BR | 5.236,45 | 5.234,71 | +1,74 |
| FIIs | 5.693,09 | 5.676,98 | +16,11 |
| Stocks | 2.233,32 | 2.250,04 | -16,72 |
| ETFs internacionais | 1.931,92 | 1.933,42 | -1,50 |
| Cripto | 313,34 | 312,59 | +0,75 |
| Tesouro | 235,59 | 237,02 | -1,43 |
| RDB | 3.011,02 | 3.012,78 | -1,76 |
| Total | 18.654,72 | 18.657,54 | -2,82 |

A soma dos saldos de Tesouro apresentados individualmente arredonda a 237,01 no I10; grupo mostra 237,02. Valores de linhas arredondadas podem diferir em centavos da soma das classes.

O cabeçalho I10 mostra 18.680,57: 23,03 acima da soma dos seus próprios grupos de posições. Portanto, a diferença aparente com o cabeçalho é 25,85; 23,03 estão entre as duas representações do I10 e 2,82 entre os totais dos grupos das plataformas. Não foi determinado o motivo interno do I10 (cache, instante/fonte ou regra de totalização); não afirmar que foi comprovado.

Quantidades numéricas dos 30 ativos de renda variável conferidas e iguais: 9 ações, 6 FIIs, 11 stocks, 2 ETFs, BTC e ETH. BTC-BRL/ETH-BRL no Valora correspondem aos ativos cotados em BRL no I10. A diferença de contagem total de ativos não prova lançamento ausente: Valora soma lotes de renda fixa separadamente; I10 agrega RDB e Tesouro.

Exemplos de preço Valora/I10: RADL3 15,12/14,83; TOTS3 32,84/33,14; HGLG11 147,90/146,52; AAPL USD342,37/344,70; BTC BRL417.139,00/416.135,46. Há diferenças de cotações suficientes para explicar diferenças de saldo com as mesmas quantidades. Não foi verificado externamente qual cotação é mais recente/correta. Stocks/ETFs envolvem também câmbio; a taxa exata I10 não estava explícita, portanto não atribuir toda diferença ao câmbio. Tesouro Valora mostra referência oficial de 05/11/2026; não foi exibida referência equivalente no I10. RDB tem diferença de valorização de 1,76; sem comparar lotes/extrato atualizado, não concluir qual cálculo está errado.

Outras bases: valor investido 18.662,45 Valora / 18.670,43 I10 (diferença 7,98). Proventos totais 603,54 / 776,05 (diferença 172,51); 12M 603,54 / 606,00 (diferença 2,46). Isso requer reconciliação de histórico/custos separada de patrimônio e cotação. Rentabilidade Valora usa meses encerrados; não concluir erro a partir de comparação com percentual I10 sem período/metodologia equivalentes.

Nenhum lançamento, posição, regra ou configuração financeira foi alterado. Apenas grupos de apresentação foram expandidos. Viewport de inspeção desktop restaurado.


## Investigação e correções posteriores

### Erros comprovados e corrigidos

1. **KPIs de proventos e lucro**: useDashboard usava apenas a query 1A para recebimentos apresentados como totais. O banco contém 205 recebimentos, total líquido **773,59536**, dos quais **603,54391** nos últimos 365 dias. Agora há query Tudo separada; Dividendos recebidos, Total e Lucro total usam todo o histórico. O painel legado também exibia apenas ganho de capital como Lucro total: corrigido. Consulta vazia bem-sucedida de 12M mostra zero; falha ou carga permanece indisponível. Teste com recebimento anterior a 12M impede regressão. Conferência local: R$773,60 total, R$603,54 12M, lucro R$748,92 com ganho -R$24,67 naquele instante. Essa mudança de frontend ainda depende de PR/merge/deploy.
2. **Cotações BR antes do fechamento**: último cron de intraday terminava 19:30 UTC (16:30 BRT). RADL3/TOTS3/HGLG11 estavam com market_time aproximadamente 19:15 UTC em 06/11. Nova migration aplicada: `sync-br-quotes-post-close`, `30 21,22,23 * * 1-5` (18:30/19:30/20:30 BRT). Reutiliza comando autenticado existente, sem exposição ou troca de credenciais. Execução pontual autorizada: 40 ativos salvos, zero falhas, Yahoo40/brapi0. RADL3 passou 15,12→14,83; TOTS3 32,84→33,14; HGLG11 147,90→146,52; BBAS3 17,06→17,13; WEGE3 48,07→48,19. Coincidem com o I10 observado. Nenhuma posição/lançamento foi editada.
3. **Janela de EUA**: cron `*/5 13-21 * * 1-5` foi estendido a `*/5 13-22 * * 1-5`, cobrindo o fechamento de inverno às 22h UTC. Aplicado e conferido. Isso é prevenção; não é prova de que a AAPL estava errada. Finnhub e consulta pública Yahoo concordaram em **342,37** com data de 06/11; não houve substituição pelo 344,70 do I10.
4. **B3 falso sucesso**: ingestão COTAHIST retornava HTTP200 mesmo com meses falhos. Código local agora retorna503 quando qualquer mês falha e trata fonte sem linhas para catálogo não vazio como falha. Teste cobre erro de download. Ainda não publicado.

### Renda fixa: separar atualização de cálculo e falha parcial

- Reexecução dos jobs oficiais de Tesouro e macro, sem inventar taxas/preços: Tesouro salvou858 registros, último dia06/11, recalculou13 posições. Os lotes da carteira Investidor10 passaram a IPCA total158,3444 e Prefixado78,134, referência06/11. RDB total3011,0208.
- Ambos retornaram503 por falha de recálculo em outro título cadastrado como Tesouro Selic com vencimento10/10/2027, sem preço oficial compatível. Essa falha parcial não impediu os lotes válidos de atualizar. Não alteramos esse cadastro nem presumimos que seja correto.
- BCB SGS4389 consultado de05/11 a07/11 retornou somente05/11, taxa13,65% a.a.; banco está alinhado à disponibilidade oficial. O CDI06/11 ainda não está disponível nessa fonte. Uma diária sobre o saldo do RDB a115% CDI é compatível com a ordem de grandeza de1,76, mas não foi forçada por aproximação. Falta fonte/extrato para cravar igualdade com o I10.
- Tesouro Valora usa PU Base Manhã oficial e quantidade confirmada; a coluna Preço Atual do I10 pode ter outra convenção/instante. Não alterar método para obter igualdade numérica sem comparar a base.

### Proventos que continuam pendentes

- A tela pública I10 mostra JPM pago31/10 (líquido arredondado0,47) e TFLO pago05/11 (líquido arredondado2,03), posteriores à cobertura da importação até26/10.
- Os dados Yahoo persistidos não comprovam essas datas de pagamento: JPM ex_date06/10, USD1,65, payment_date null; TFLO ex_date01/10, USD0,16, payment_date null, sem evento da distribuição nova. Yahoo chart informa data ex, não data de pagamento. A tela de pagos exclui corretamente payment_date null; não preenchê-la com data ex.
- Nasdaq gratuito foi consultado para JPM e respondeu que histórico de símbolos não Nasdaq não estava disponível. Não foi integrado fallback vazio nem inferida retenção cambial. A diferença residual do total I10(776,05) e importadoValora(773,59536) é aproximadamente2,45/2,46; os valores arredondados dos dois eventos somam2,50. É necessária reconciliação de valores líquidos/câmbio, não apenas copiar números arredondados.
- Próxima correção exige uma fonte gratuita de datas reais/valores ou extrato exato para registrar recebimentos. Não declarar cobertura integral nem equivalência100% ao I10 enquanto essa parte estiver aberta.

### Escopo e validação

- Agendamentos já aplicados em produção; correções de UI e falso sucesso B3 locais, sem merge automático. Valores de cotação e renda fixa atualizados pelos jobs existentes.
- TypeScript/build aprovados; testes direcionados15/15; regressão completa acompanhada no log local. Não houve compra, venda, criação ou alteração manual de lançamentos.
- As diferenças do cabeçalho I10 versus seus próprios grupos permanecem externas ao Valora; não ajustar saldo para compensá-las.


Validação final: regressão completa executou1.038 testes;1.037 passaram inicialmente e o teste de autorização de B3 identificou catálogo vazio tentando consultar provedor. Corrigido para no-op200 quando não há ativos, sem download, mantendo503 em falha real. Reteste dos3 arquivos afetados:15 testes aprovados. Build/PWA, TypeScript e lint das alterações aprovados. Esta distinção preserva os testes de autenticação anteriores em vez de enfraquecê-los.

## Nova conferência visual — 07/11, após homologação local

Consulta somente de leitura no navegador integrado: Valora publicado e local exibem os mesmos saldos da carteira Investidor10. Evidências DOM em `output/qa-fontes-oficiais/comparacao-*-dom.txt`. Valores são fotografias de telas, não cotações sincronizadas no mesmo instante.

| Classe | Valora publicado | I10: cabeçalho do grupo | I10 menos Valora |
|---|---:|---:|---:|
| Ações BR | 5.234,71 | 5.234,71 | 0,00 |
| FIIs | 5.676,98 | 5.676,98 | 0,00 |
| Stocks | 2.233,32 | 2.250,04 | 16,72 |
| ETFs US | 1.931,92 | 1.933,42 | 1,50 |
| Criptos | 312,94 | 312,59 | -0,35 |
| Tesouro | 236,48 | 237,02 | 0,54 |
| RDB | 3.011,02 | 3.012,78 | 1,76 |

- Patrimônio: Valora **18.637,37**, I10 **18.680,57**, diferença **43,20**. Soma dos grupos do I10: **18.657,54**, ficando **23,03** abaixo do próprio patrimônio. Diferença entre os totais dos grupos: **20,17**. Não compensar esta divergência interna do I10 no Valora.
- Stocks: mesmas quantidades, preços diferentes nos onze ativos. Exemplos USD Valora/I10: AAPL342,37/344,70; JPM334,49/339,38; META610,15/618,48; AMZN259,30/262,97. Isso comprova divergência de cotação, não qual provedor está incorreto. Verificação independente anterior de AAPL apoiou o valor do Valora.
- ETFs: IVV738,68 e TFLO50,57 coincidem em USD nas duas telas, com quantidades iguais. Conversão/apresentação em BRL permanece divergente; comparar câmbio e precisão antes de modificar preços.
- Criptos: BTC416.649,00/416.337,33 e ETH12.280,15/12.284,65 em BRL, quantidades iguais. As próprias linhas do I10 somam312,78, enquanto o grupo mostra312,59; fotografia possivelmente não atômica/cache. Não usar esse grupo como reconciliação exata de centavos.
- Tesouro: I10 PU IPCA3.966,08 e Prefixado559,82; Valora continua na referência oficial06/11, PU Base Manhã. RDB permanece no cálculo anteriormente confirmado pelo usuário. Não houve alteração para forçar igualdade.
- Valor investido também ainda difere:18.662,45/18.670,43, residual7,98. Correção de cotação não reconcilia custo histórico.

Conclusão: **diferença não totalmente sanada**. Ações BR/FIIs já coincidem; restam conciliar instantes/fontes de stocks, câmbio, bases de renda fixa, custo histórico e recebimentos líquidos. Novas integrações oficiais permanecem locais, aguardando publicação coordenada; não declarar efeito em produção antes disso.

## Auditoria externa das divergências

Consulta independente em07/11, somente leitura. Arquivo `output/qa-fontes-oficiais/yahoo-reconciliacao.json` contém resposta pública Yahoo consultada nesta rodada. A consulta ao banco confirmou os13 preços em USD persistidos via Finnhub, referência06/11; todos coincidem com o `regularMarketPrice` do Yahoo. Portanto, não há evidência para trocar esses preços pelos apresentados no I10 como fechamento regular.

| Ativo | Valora/Finnhub e Yahoo (USD) | I10 observado (USD) |
|---|---:|---:|
| AAPL |342,37|344,70|
| AMZN |259,30|262,97|
| COST |1.053,56|1.060,79|
| GOOGL |284,78|287,05|
| JPM |334,49|339,38|
| KO |95,67|96,10|
| MA |652,70|657,16|
| MCD |276,52|277,26|
| META |610,15|618,48|
| NU |12,03|12,08|
| NVDA |186,64|187,75|
| IVV |738,68|738,68|
| TFLO |50,57|50,57|

Confirmações adicionais em fontes dos emissores: [Apple](https://investor.apple.com/stock-price/default.aspx), [JPMorgan](https://jpmorganchaseco.gcs-web.com/ir/shareholder-information/overview/) e [Meta](https://investor.atmeta.com/stock-info/default.aspx) publicam os mesmos fechamentos do Valora. Os valores do I10 não correspondem ao fechamento regular verificado; não foi identificada a referência temporal/metodologia interna do I10. Não chamar de erro matemático sem essa informação.

### Conversão em reais

[Banco Central — fechamento PTAX06/11](https://ptax.bcb.gov.br/ptax_internet/consultarUltimaCotacaoDolar.do): compra5,5007, venda**5,5013**. Serviço do Valora prioriza PTAX venda. Recomputando as quantidades e preços visíveis:

- Stocks: USD405,962107434 ×5,5013 = BRL2233,3193416, que arredonda exatamente ao saldo Valora2233,32.
- A troca apenas dos preços das11 stocks pelos valores I10, mantendo PTAX, acrescentaria17,3327167. O grupo I10 está16,72 acima: residual de conversão/apresentação cerca de-0,61.
- ETFs: USD351,1747096773 ×5,5013 = BRL1931,9174303, que arredonda exatamente ao Valora1931,92. Grupo I101933,42 implica taxa aproximada5,50558 com esses mesmos preços/quantidades. Stocks I10 implicam aproximadamente5,49980. Essas são taxas inferidas dos grupos arredondados, não taxas comprovadamente usadas internamente; os grupos podem ter sido calculados em momentos distintos.

Conclusão de conversão: **aritmética do Valora reproduzida e compatível com a PTAX oficial**. Igualar ao I10 exigiria mudar a convenção cambial/instante, não corrigir multiplicação.

### Renda fixa

Arquivo oficial do [Tesouro Transparente](https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv), consultado novamente:

- IPCA2029 em06/11: PU Compra3971,58; PU Venda/Base3958,61. Banco Valora3958,61. Quantidade0,04 =>158,3444.
- Prefixado2031 em06/11: PU Compra560,82; PU Venda/Base558,10. Banco Valora558,10. Quantidade0,14 =>78,134.
- Soma Valora236,4784; I10 usa3966,08 e559,82 =>237,018. Diferença0,5396 é de referência do PU, não quantidade ou multiplicação. Os PUs do I10 não coincidem com Compra/Venda/Base Manhã desse arquivo nessa data.
- [BCB SGS4389](https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados?formato=json&dataInicial=05/11/2026&dataFinal=07/11/2026) consultado novamente só retornou05/11,13,65%. Banco Valora CDI termina05/11; não há taxa publicada06/11 nessa consulta.
- Um dia adicional com a última taxa conhecida a115% CDI rende3011,0208 × ((1+0,1365)^(1/252)-1) ×1,15 = **1,7586241**, levando a3012,7794241 => **3012,78**, exatamente o saldo exibido no I10 após arredondamento. Forte evidência de uma diária a mais/antecipada por repetição da taxa anterior. Não prova o algoritmo do I10; falta extrato do emissor ou metodologia dele. Não antecipamos essa diária no Valora.

### Responsabilidade e limites

- **Valora validado:** fechamentos USD dos13 ativos, conversão atual por PTAX e marcação Tesouro por PU Base oficial. Ações BR/FIIs já iguais na comparação.
- **I10 divergente da referência verificada:** preços das11 stocks em relação ao fechamento regular; total do cabeçalho23,03 acima dos grupos. A razão do cabeçalho permanece indeterminada (não excluir caixa, cache ou regra própria sem evidência).
- **Convenção/tempo, sem defeito comprovado:** câmbio dos grupos I10, PUs de Tesouro e diária do RDB; criptos exigem mesmo timestamp para comparação justa.
- **Pendências reais do Valora continuam separadas:** novos recebimentos líquidos posteriores à importação ainda sem reconciliação; custo histórico7,98; integração oficial local ainda precisa de publicação. Não dizer que o projeto inteiro está100% correto apenas por validar o patrimônio.

Nenhuma cotação, lançamento, taxa ou saldo foi modificado nesta auditoria.
