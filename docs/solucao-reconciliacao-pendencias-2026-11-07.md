# Soluções verificadas — 07/11/2026

Pesquisa e teste de acesso de fontes; não equivale a integração publicada.

## 1. Datas e valores brutos dos proventos

Fontes primárias gratuitas confirmadas:

- JPM: https://jpmorganchaseco.gcs-web.com/ir/shareholder-information/dividend-history/ informa declaração15/09/2026, ex/record06/10/2026, pagamento31/10/2026 e USD1,65. O acesso direto desta página retorna403 no ambiente de teste. Alternativa oficial testada HTTP200: https://www.jpmorganchase.com/ir/news/2026/jpmc-declares-increased-common-stock-dividend-9-15 , com data de pagamento e valor confirmados no HTML. O comunicado informa record date; cruzar ex_date com histórico, não inventar data ex a partir de record date.
- TFLO: https://www.ishares.com/us/products/260652/ishares-treasury-floating-rate-bond-etf , tabela Distributions. Record/ex02/11/2026, pagamento05/11/2026, distribuição USD0,171627/cota. Acesso direto HTTP200, valor localizado no HTML público. A ex-date é02/11, diferente do30/10 mostrado no I10; não copiar a data do I10 sem validação.

Solução de integração: adaptadores por emissor com URLs permitidas, validação de cabeçalhos, moeda USD, datas independentes, número positivo e ticker correto. Deduplicar por ticker/ex_date/tipo; fonte oficial complementa pagamento sem Yahoo sobrescrever campos confirmados. Registrar referência e proveniência, com cache/consulta diária e timeout. Se HTML mudar ou houver conflito, manter o registro anterior e reportar atualização parcial. Não usar regex genérica para extrair qualquer número de um comunicado nem interpretar texto remoto como instrução. Os testes de HTTP comprovam viabilidade atual, não estabilidade de API pública.

Usar dados públicos como anúncio bruto, não como comprovante de crédito na conta. O líquido exige retenção efetiva, eventual tarifa, data de crédito e câmbio da corretora. PTAX histórica serve como conversão de referência, não garante igualdade com o câmbio efetivamente aplicado. Reutilizar histórico importado prioritário e permitir confirmação de recebimento/extrato. Não presumir30% de retenção universal, nem arredondar valores por ação antes de multiplicar.

## 2. CDI e recálculo

BCB SGS4389 é a série anualizada usada pelo cálculo atual. A consulta05–07/11 retornou somente05/11,13,65%. Atraso da publicação exige manter o saldo até a última data realmente coberta, mostrar a referência do índice e recálculo pendente, e repetir após publicação. Diferenciar sábado/feriado sem taxa esperada de dia útil ainda não publicado; não criar taxa faltante copiando o dia anterior. Cron já tenta20h e23h UTC; agregar nova tentativa no dia útil seguinte e sinalizar atraso sem alegar gravação atualizada integralmente.

Achado adicional: `calcCdi` em `supabase/functions/calc-fixed-income/index.ts` usa fallback fixo10,5% a.a. se não há nenhuma linha. Não acionado no RDB analisado, pois a série existe. Remover fallback, manter saldo anterior e retornar diagnóstico de taxa ausente; exigir cobertura compatível com o intervalo. A data de execução `last_updated_at` não comprova atualização econômica até o dia atual: separar data de execução e referência efetiva. Alinhar cálculo atual e histórico.

## 3. Tesouro sem preço compatível

Validar tipo e vencimento contra catálogo oficial ao cadastrar, mantendo a possibilidade de cadastro contratual conforme o fluxo atual e sem exigir quantidade fictícia. Para marcação a mercado, validar quantidade exata e título oficial antes de gravar. Em cadastros legados incompatíveis, orientar revisão com extrato e não corrigir vencimento por aproximação. Retornar lista de sucessos/falhas por lote: falha de um título não deve impedir outros títulos nem ser confundida com falha do download inteiro.

## 4. Publicação e conclusão

As correções de KPI e observabilidade de B3 já locais exigem revisão, commit e PR; merge permanece com o responsável. Agendamentos de pós-fechamento BR/EUA já aplicados. Nenhum recebimento novo, custo, quantidade ou vencimento foi alterado nesta pesquisa.

Ordem recomendada: remover fallback fictício/explicitar referência CDI → integrar anúncios oficiais e preservar datas confirmadas → confirmar recebimentos líquidos → validar catálogo de Tesouro e erros por lote → publicar e retestar.


## Implementação preventiva iniciada

- Recálculo CDI sem série agora lança diagnóstico por lote e não grava saldo fictício a10,5%. Mesma data de aplicação/referência mantém principal. Taxa negativa/não finita é recusada. Indexador desconhecido também não grava principal como se fosse saldo calculado. Demais lotes continuam processando. Não equivale à validação de todas as lacunas internas da série: calendário, data efetiva e cobertura parcial continuam pendentes.
- Sincronização Yahoo diferencia resposta válida vazia de HTTP inválido, erro de payload/rede e falha de armazenamento. Falha por ticker retorna failed/errors e HTTP503, sem apagar registros anteriores nem declarar todos sincronizados. Mensagens não incluem URLs privadas ou credenciais. Pagamentos sem data continuam sem ser tratados como recebimentos comprovados.
- Testes direcionados4/4 aprovados, lint sem erros e diff conferido. Mudanças locais; não houve deploy nesta etapa.

## Contrato para integrar emissores sem regressão

1. Eventos públicos guardam ticker, ex_date, record_date, payment_date, moeda, valor bruto por unidade, URL/fonte, instante de coleta e versão do parser.
2. Atualização atômica por chave de evento, prioridade de fontes explícita e preservação de campos confirmados. Repetir job não duplica; fonte vazia/indisponível não apaga. Datas conflitantes vão para diagnóstico, não substituição silenciosa.
3. Recebimentos da carteira permanecem separados. Quantidade elegível vem do histórico na data ex; bruto estimado não substitui líquido importado. Retenção, tarifas e câmbio exigem dados do usuário/extrato ou premissas claramente identificadas como estimativa.
4. Primeiro integrar adaptador iShares com fixture do HTML público (tabela Distributions) e adaptador JPM para comunicados oficiais permitidos, com teste do caminho403 da página histórica. Não depender só de um título/URL fixo por distribuição nem tentar contornar bloqueio.
5. Cron usa cache, timeout e repetição limitada; painel deve mostrar última tentativa, referência dos dados, cobertura e falhas por ticker/lote. Agendamento existente que apenas recebe request_id não deve ser usado como prova de ingestão concluída.
6. Testes obrigatórios: reexecução idempotente; fonte cai; HTML muda; pagamento futuro; ex diferente de record; USD/BRL; posição vendida; importação líquida não sobrescrita; taxa CDI ausente/parcial; título Tesouro inválido sem impedir os demais.


## Abrangência por classe — consulta de07/11/2026

As proteções de fonte/data, idempotência, falha parcial e preservação de registros confirmados devem valer para todos os ativos/contas. A integração de pagamentos vale apenas para ativos distribuidores, e cada adaptador serve a um provedor/emissor, não automaticamente ao mercado inteiro.

Carteira Investidor10:9 açõesBR,6 FIIs,11 stocks,2 ETFsUS,2 criptosBRL; renda fixa6 lotesRDB,2IPCA e1Prefixado. Não é necessário criar30 integrações independentes: regras comuns, adaptadores por fonte e compatibilidade por classe.

Não é só JPM/TFLO: eventos Yahoo recentes (ex_date>=27/10) sem payment_date encontrados para CXSE3, GARE11, HGLG11, MXRF11, VGHF11, XPSF11 e COST. Ausência de data não comprova falha de crédito nem que o pagamento já ocorreu; exige enriquecimento antes de classificar como pago. ETFsUS distribuidores também precisam de fonte de pagamento, embora a consulta recente não tenha retornado o novo eventoTFLO. Yahoo fornece data ex, não garantia de pagamento.

- AçõesBR/FIIs/BDRs/ETFBR distribuidores: fonte com calendário local real; conferir cobertura das integraçõesBR existentes. ETFsBR não fazem parte do filtro atual de sincronização de dividendos, portanto adicionar apenas quando houver distribuição compatível confirmada.
- Stocks/REITs/ETFUS distribuidores: calendário do emissor/provedor e moedaUSD; iShares cobre seus próprios fundos, JPM cobreJPM, sem prometer cobertura dos11stocks.
- Criptomoedas: proteções de cotação/câmbio se aplicam; esta integração de dividendos não cobre staking/airdrops, que não fazem parte do fluxo atual.
- CDI: proteção de série aplica a CDB/RDB/LCI/LCA indexadosCDI de todas as contas; não depende do emissor. IPCA/Selic precisam validação própria, sem reutilizar calendário/dadosCDI por suposição.
- Prefixado: taxa contratada, datas e eventos; não consultarCDI por rotina.
- Tesouro marcado a mercado: título/vencimento/quantidade e PU oficial; não aplicar fallbackCDI ao preço ausente.

Priorizar completar fonte e referência de pagamento nas classes da carteira com lacunas comprovadas, mantendo o histórico importado e recebimento líquido separado. Esta auditoria foi somente leitura.

## Automação para todo o catálogo — investigação

Os 40 ativos de uma execução não são uma lista fixa que deva ser mantida manualmente. A sincronização BR seleciona o catálogo ativo por classe e já pagina em lotes de500. Entretanto, o prazo de execução de cotações é limitado; um catálogo maior exige continuação persistida. Dividendos Yahoo, fundamentos Yahoo e seleção de ativos globais ainda fazem consultas sem paginação explícita, portanto não comprovam cobertura integral de um catálogo grande. Dividendos percorrem os tickers sequencialmente; aumentar apenas o limite da consulta não resolve o tempo máximo de execução.

O fluxo após compra/importação já solicita sincronização por ticker, com deduplicação e cache de15 minutos no cliente. Isso ajuda ativos recém-adicionados, mas não substitui um agendamento independente do navegador nem garante recuperação de falhas.

Plano recomendado, ainda não implementado nesta investigação:

- [ ] Fila persistente por ativo e recurso (cotação, histórico, fundamentos e anúncios), independente da carteira. Cadastro/reativação de ativo e primeira compra devem inserir ou antecipar tarefas idempotentes.
- [ ] Workers com paginação ordenada, lotes limitados por tempo e cota do provedor, reserva de tarefas com vencimento, continuação persistida e repetição com espera progressiva. Reinício não deve abandonar sempre os últimos tickers do catálogo.
- [ ] Priorizar ativos usados em posições/favoritos e dados ausentes ou vencidos, mantendo varredura periódica dos demais ativos ativos. Uma coleta pública atende todas as contas; não consultar o mesmo ticker uma vez por usuário.
- [ ] Resolver fontes por classe, bolsa, moeda e capacidade do provedor. Adaptadores de emissores complementam provedores amplos, sem condicionar o motor aos tickers desta carteira. Ativos sem distribuição não entram artificialmente na fila de dividendos.
- [ ] Persistir última tentativa, último sucesso, referência efetiva, próximo processamento e motivo de indisponibilidade por recurso. Separar ausência confirmada de eventos de fonte indisponível ou cobertura ainda desconhecida.
- [ ] Preservar datas/valores confirmados, validar conflitos e não transformar anúncio bruto em recebimento líquido comprovado. Reexecução, concorrência, queda de fonte e catálogo maior que uma página precisam de testes.

Fontes adicionais pesquisadas: Alpha Vantage documenta DIVIDENDS para eventos históricos e declarados (https://www.alphavantage.co/documentation/), mas a chave demo recusou a consulta de exemplo, logo payload e cobertura não foram homologados. O suporte informa25 chamadas gratuitas/dia para a maioria dos conjuntos (https://www.alphavantage.co/support/); isso exige cache e distribuição das tarefas, não permite prometer atualização diária de todo o mercado. Bolsai documenta datas de pagamento para dividendos e distribuições de FIIs (https://api.usebolsai.com/docs); requer chave e confirmação de plano/cobertura antes de adotá-la. Brapi documenta dividendos em planos pagos (https://brapi.dev/faq/como-os-dados-de-dividendos-dos-planos-pagos-me-ajudam), portanto as chaves atuais não comprovam acesso a esse módulo.

Conclusão: a automação pode ser geral para todos os ativos suportados, inclusive futuros cadastros, mas universalidade do processamento não significa disponibilidade universal de dados gratuitos. Esta etapa documentou a solução e os limites; não publicou fila, novos provedores ou mudanças nas carteiras.

## Fontes sem mensalidade — verificação documental adicional

Verificação em07/11/2026; preços e planos podem mudar. Consulta de documentação não equivale a teste de integração autenticada.

| Fonte | Uso adequado | Gratuidade e limites verificados |
| --- | --- | --- |
| B3 COTAHIST | Histórico diário de ativos negociados na B3, coleta em arquivo e ingestão compartilhada | Arquivos públicos, sem chave; histórico desde1986. Preços não ajustados por proventos/bonificações: tratar eventos separadamente. https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/historico/ |
| B3 Empresas Listadas | Comunicados e formulários padronizados de proventos em dinheiro | Consulta pública oficial; exige resolução de companhia/classe e parser, não é promessa de API com SLA nem cobertura imediata de todos os fundos. https://clientes.b3.com.br/w/disponibilizacao-no-site-b3-do-formulario-de-proventos-em-dinheiro-das-companhias-listadas |
| CVM | Demonstrações e informes mensais de FIIs para fundamentos | Dados abertos em lote. Informe mensal de FII atualizado semanalmente, sujeito à competência/reapresentação; não substitui calendário de pagamento recém-anunciado. https://dados.cvm.gov.br/dataset/fii-doc-inf_mensal |
| BCB SGS / serviços de câmbio | CDI, Selic, IPCA e conversão histórica de referência | Serviços públicos oficiais; consultar intervalos e respeitar publicação/referência. Câmbio oficial não comprova câmbio efetivamente aplicado pela corretora. https://www.bcb.gov.br/gestao_site/webservices.asp?frame=1 |
| Tesouro Transparente | PU e taxas por título/vencimento | CSV público diário, licença ODbL declarada na página do recurso. https://www.tesourotransparente.gov.br/ckan/dataset/taxas-dos-titulos-ofertados-pelo-tesouro-direto/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1 |
| Alpha Vantage | Candidato para anúncios históricos/futuros internacionais via DIVIDENDS | Documentação oferece chave gratuita; suporte informa25 chamadas/dia para a maioria dos dados. Demo recusou exemplo; cobertura, campos e acesso do endpoint com chave própria continuam pendentes. https://www.alphavantage.co/documentation/ e https://www.alphavantage.co/support/ |
| CoinGecko Demo | Cotações de criptos em moedas suportadas | Página atual informa10.000 chamadas/mês,100/min e atribuição obrigatória; requer chave. Consultar permissões e histórico disponível no plano antes de integrar. https://www.coingecko.com/en/api/pricing |
| RI dos emissores/gestores | Complemento de anúncios e datas de pagamento | Páginas públicas sem mensalidade nos exemplos JPM/iShares já testados. Adaptadores por família de site, URLs permitidas e diagnóstico de alteração do HTML; não há garantia universal. |

Recursos que não devem ser contados como solução gratuita para proventos:

- Bolsai:200 chamadas/dia no Free, fundamentos/preços atuais e Tesouro do dia. Documentação marca Dividendos como PRO; não assumir que a chave gratuita libera calendários. https://api.usebolsai.com/docs
- Brapi: página atual informa15.000 chamadas/mês,1 ativo por requisição, histórico até3 meses no Free e cotações básicas/sandbox. Dividendos constam nos planos pagos. https://brapi.dev/pricing
- HG Brasil: documentação do endpoint stock_dividends exige Professional ou superior; nova documentação exige plano compatível. https://console.hgbrasil.com/documentation/finance e https://hgbrasil.com/docs/finance/dividends/
- Yahoo: acesso técnico sem cobrança não significa autorização de redistribuição. A ajuda oficial proíbe redistribuir informações disponibilizadas pelo Yahoo Finance. Não classificar como fonte aberta ou contrato gratuito garantido para um aplicativo publicado. https://help.yahoo.com/kb/finance/article-exchanges-data-delays-sln2310.html

Recomendação sem mensalidade: priorizar arquivos oficiais compartilhados (B3/CVM/BCB/Tesouro), complementar calendários internacionais com emissores e avaliar Alpha Vantage com cache e orçamento diário. Cron/fila deve conhecer cota, cobertura e permissão de cada fonte. Resta homologar extração dos documentos B3/Fundos.NET e cobertura internacional; não declarar proventos universais resolvidos. Nenhuma chave foi criada, plano contratado ou configuração de produção alterada nesta pesquisa.

## Atualização após autorização para implementar

Implementadas localmente as integrações descritas em [fontes oficiais](fontes-oficiais-2026-11-07.md): proventos estruturados de ações BR com fila e ISIN, informes CVM de FIIs por arquivo, descoberta automática de ETFs iShares e fila de distribuições, proteção contra sobrescrita pelo Yahoo, paginação/identificadores B3, validação BCB e ampliação da coleta recente de Tesouro. CoinGecko aceita o nome real da chave local `COINGECKO_KEY`, com consulta autenticada HTTP200. Não houve aplicação definitiva da nova migration nem deploy nesta etapa; testes SQL foram integralmente revertidos. Cobertura ainda não universal: detalhes e pendências no documento da implementação.
