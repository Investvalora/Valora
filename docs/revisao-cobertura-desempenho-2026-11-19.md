# Revisão de cobertura e desempenho — 19/11/2026

## Alterações preparadas, ainda não publicadas

- **GOOG:** Nasdaq identifica corretamente a ação como `Class C Capital Stock`, rejeitada pelo contrato antigo `Common Stock`. Aceitação ampliada para esse tipo exato, mantendo ticker, listagem Nasdaq e assetClass STOCKS obrigatórios. Sem exceção por ticker; preferenciais, ETF e Capital Stock genérico continuam recusados. Identidade nova validada na resposta real da Nasdaq e em testes.
- **GOOG futuro:** SEC confirma US$ 0,22 para classes A/B/C, pagamento 14/12 e registro 07/12. Data ex 07/12 verificada especificamente no endpoint GOOG da Nasdaq, sem copiar GOOGL. A declaração Nasdaq 27/10 foi preservada no excerto; declaração oficial 28/10 mantida na revisão.
- **RA:** comunicado do próprio fundo no GlobeNewswire declara os três pagamentos Q4 de US$ 0,118. Dezembro (ex/registro 10/12, pagamento 24/12) faltava no Valora. Outubro e novembro mantêm os valores existentes.
- **GGG:** comunicado confirma US$ 0,295 em 04/11. Data ex 19/10 conferida na tabela hospedada pelo RI e na observação Alpha. Preparada revisão oficial preservando a observação arredondada da Marketstack.
- Revisões explícitas de data ex passam a aceitar evidência curada do emissor ou da bolsa, sem fabricar uma segunda observação de fornecedor. Exigem snapshot normalizado coerente e URL atribuída. Revisões antigas continuam exigindo evidência independente; conflitos econômicos e datas divergentes continuam bloqueados. A tabela de revisões não é gravável por usuários autenticados.

Fontes:

- GOOG: https://www.sec.gov/Archives/edgar/data/1652044/000165204426000080/googexhibit991q32026.htm e https://api.nasdaq.com/api/quote/GOOG/dividends?assetclass=stocks; identidade em https://api.nasdaq.com/api/quote/GOOG/info?assetclass=stocks.
- RA: https://www.globenewswire.com/news-release/2026/09/25/3369341/0/en/brookfield-real-assets-income-fund-inc-declares-q4-2026-distribution-schedule.html.
- GGG: https://investors.graco.com/news-releases/news-release-details/graco-announces-regular-quarterly-dividend-51 e https://investors.graco.com/stock-information/dividend-history.

## Investigação sem confirmação suficiente

- **BB:** anual de 2026 confirma ausência de pagamentos nos três exercícios anteriores. Não foi localizada uma declaração atual explícita sobre política futura. A política de 2018 não foi reutilizada como atual; nenhuma classificação de não pagadora foi criada por inferência. Fonte: https://www.sec.gov/Archives/edgar/data/1070235/000107023526000039/bbry-20260228.htm.
- **PERT:** OTC confirma Permanent Technologies, Inc. no Expert Market, com cotações não solicitadas e sem confirmar divulgação pública atual. Site histórico tinelok.com não acessível na consulta. Isso não comprova calendário nem política de não pagar. Fonte: https://www.otcmarkets.com/stock/pert/quote.
- **PR/Marketstack US$ 0,03:** o 10-Q mais recente declara US$ 0,16 no trimestre e US$ 0,48 nos nove meses. Não confirma o evento extra com pagamento em 10/07. Retenção preservada; não promover nem somar ao calendário. Fonte: https://www.sec.gov/Archives/edgar/data/1658566/000165856626000124/pr-20260930.htm.

## Auditoria do catálogo ativo

Escopo internacional monitorado: 47 emissores; 32 têm pelo menos um evento não sintético com valor e pagamento, 13 têm política revisada de não distribuir caixa e dois permanecem sem confirmação (BB/PERT). Ter histórico não significa calendário futuro integral.

BMN e CR já possuem eventos oficiais futuros. SAP preserva a revisão oficial apesar da divergência dos fornecedores. ITA/RA podem ter resposta vazia em um fornecedor e dados em outra fonte. PRT publica datas planejadas de novembro/dezembro com valor em branco: não criar pagamento com zero nem estimar valor como anunciado. GGG/META/PG/VG sem novo anúncio localizado não devem receber eventos futuros inferidos da frequência.

Brasil: os 22 ativos `stock_br` ativos possuem fonte de pagamento ao considerar conjuntamente `dividends` e `b3_cash_announcements`. Contar somente `dividends` daria falso diagnóstico de 3/22. Isso não prova que todos os eventos e âncoras de data ex estejam completos. Dos 14 FIIs ativos, 13 têm evento com pagamento; XPML11 ficou sem pagamento nessa leitura.

**Nova lacuna concreta — XPML11:** aviso do administrador no FNET `1387873` confirma R$ 0,80 por cota XPML11, data COM 17/11, pagamento 25/11 e ISIN BRXPMLCTF000. O mesmo documento contém recibos XPML13/XPML15 com outros valores, que não podem ser aplicados ao XPML11. O banco possui histórico Yahoo sem pagamento e sem a nova data ex. Falta integrar essa evidência ao calendário com identidade e data COM corretas, sem inventar aprovação/data ex. Nenhuma escrita em produção foi realizada nesta revisão. Fonte: https://fnet.bmfbovespa.com.br/fnet/publico/exibirDocumento?id=1387873.

Consulta ao chart público Yahoo `XPML11.SA`, range 1mo, interval 1d, events div, confirmou identidade/currency BRL e retornou apenas R$ 0,92 com timestamp 19/10/2026 às 13:00 UTC. Não retornou a data ex de novembro. Não usar as datas de agregadores como se fossem evidência oficial nem a data da informação FNET como decisão do conselho.

## Comparação histórica pelo CDN

Previews protegidos autenticados pelo responsável no mesmo Android Chrome, com a mesma conta. Antes: PR173 head `7be96049baa3634730fd38aeba80ac085ca69bac`; depois: PR175 head `a79c5e4`. As árvores de código de PR173 head e merge não diferem em src/scripts.

- Antes: https://investvalora-git-codex-tooltip-wrapper-followup-investvalora.vercel.app/.
- Depois: https://investvalora-git-codex-coverage-receipt-rec-e19a6d-investvalora.vercel.app/.
- Ordem ABBA, aquecimento por bloco e recargas normais; worker e cache HTTP preservados em ambas as origens. Não se desativou proteção Vercel nem se copiou sessão. Transporte Wi-Fi confirmado na rodada; sem alteração de rede pelo agente.
- Android Galaxy A31, viewport 411 px; ambos em Chrome normal (`standalone=false`), worker controlador ativo e transferência observada do bundle principal igual a zero (cache aquecido).

| Medida | Anterior | Atual |
|---|---:|---:|
| Amostras válidas | 5 | 6 |
| FCP mediano | 460 ms | 466 ms |
| FCP mínimo–máximo | 384–2.216 ms | 360–544 ms |
| Indicador visual mediano | 753 ms | 717 ms |
| Indicador visual mínimo–máximo | 716–2.613 ms | 614–893 ms |
| Respostas de erro Supabase observadas | 0 | 0 |
| Exceções JavaScript observadas | 0 | 0 |

A última amostra anterior mudou para `/ativos/posicoes` e foi excluída pelo critério de rota. Uma reposição perdeu a resposta CDP e não entrou no conjunto. As duas aberturas lentas válidas permaneceram. A diferença nas medianas não demonstra ganho; a menor dispersão atual nesta amostra não estabelece causalidade.

O indicador visual marca texto de patrimônio e um valor monetário, não conclusão de todas as consultas nem TTI. São origens distintas no mesmo serviço CDN, com aquecimento equivalente; não é comparação de inicialização fria nem do PWA instalado antigo versus novo. A referência instalada atual em produção permanece registrada separadamente. Dados técnicos brutos e amostras excluídas ficam no workspace principal em `output/phone-cdn-comparison-reviewed.json`, fora do Git.

## Validação

- 29 testes de contrato/coleção passaram; identidade GOOG confirmada com resposta real.
- Migration e teste novo aprovados no QA isolado: evidência explícita, idempotência, precisão, declaração divergente preservada, bloqueio de sobrescrita não revisada, isolamento da tabela e preservação de registros financeiros e evidências originais.
- Regressões SQL de precisão PG e revisões prioritárias de caixa passaram, incluindo retenção PR US$ 0,03.
- Tipos e lint do teste aprovados. Nenhum recebimento privado, transação ou posição alterado em produção.
- Pendentes publicação da correção, integração XPML11 e as confirmações externas listadas acima. Não declarar cobertura integral encerrada.
