# Total investido — correção local de 10/11/2026

## Causa e comportamento

Início/Carteira e Ativos calculavam `quantidade × preço médio × câmbio atual` para posições USD. A atualização do dólar alterava o investido sem movimentação. A série do dashboard ainda limitava o aplicado ao patrimônio, reduzindo o custo exibido quando havia prejuízo.

O custo em BRL agora fica separado da avaliação de mercado:

- Posições BRL com razão de movimentos usam o custo exato dos lançamentos, com despesas e baixa proporcional nas vendas. Sem movimentos, preservam quantidade × preço médio cadastrado. Isso evita o arredondamento intermediário do preço médio de quatro casas.
- Para USD com histórico, cada compra soma `(quantidade × preço + corretagem + imposto da compra) × PTAX histórica da aquisição`. Venda reduz proporcionalmente o custo médio remanescente; preço de venda e despesas da venda não viram custo de aquisição.
- Histórico é ordenado por data/seq e isolado por carteira/ticker. Zeragem encerra o custo do ciclo. Dividendos não alteram quantidade/custo, conforme a convenção atual do cadastro.
- Saldo inicial sem movimentos usa preço médio e referência da data de aquisição. Não reconstrói compras que não existem no histórico.
- Quantidade/custo nativo incompatíveis com a posição, câmbio ausente ou erro de consulta deixam o custo USD indisponível. Não usar cotação atual para completar lacunas. Mantida a regra histórica existente: última PTAX publicada até a data, com tolerância máxima de 10 dias.
- Renda fixa continua pelo principal restante; rendimento e marcação a mercado entram apenas no patrimônio. Pares cripto em BRL não sofrem nova conversão.

A PTAX é uma referência pública histórica, não o câmbio real pago na remessa à Nomad. Igualdade com outro sistema depende da convenção cambial, datas e lançamentos usados nele. Não foram alterados lançamentos nem preenchidas taxas pessoais por suposição.

## Telas e gráficos

Resumo/Início/Carteira e KPIs de Ativos usam a mesma função de custo, com consulta histórica independente dos filtros do gráfico e do câmbio atual. Fechamentos mensais usam câmbio de fechamento somente para o patrimônio; o custo preserva o câmbio de aquisição. A série não limita mais o custo ao patrimônio, e ganho negativo não vira zero no tooltip do gráfico de barras.

## Verificação e pendências

Regressão cobre compras com taxas em datas/câmbios diferentes, venda parcial, zeragem/reentrada, ausência de taxa, histórico incompatível, isolamento de carteiras, cripto BRL e saldo inicial. Integração Início/Ativos varia dólar, cotação e saldo de renda fixa sem movimentos: patrimônio muda de 1100 para 1230, investido permanece 1000. Prejuízo preserva custo 10900 diante de patrimônio 10000.

Homologação local no navegador integrado com a carteira Investidor10, apenas consulta: Início, Posições, Composição e Lançamentos concordaram em patrimônio 18.774,80, investido 18.483,17 e ganho 291,63. Recarga preservou o investido. Gráfico: outubro patrimônio 18.707,89 e novembro 18.774,80, ambos com aplicado 18.483,17. Layout móvel 390×844 conferido; viewport original restaurado.

A conferência detectou diferença de um centavo entre custo do razão mensal e preço médio arredondado do resumo. Corrigida usando razão de movimentos também no custo BRL atual; teste específico adicionado. Evidências locais: `output/qa-total-investido/inicio.png` e `inicio-mobile.png` (não versionadas).

Regressão final: 51 testes aprovados em 8 arquivos. Lint dos arquivos ajustados e build TypeScript/Vite/PWA aprovados. Nenhuma alteração financeira ou importação em produção. Publicação, reteste em produção e comparação com Investidor10 na mesma base ainda pendentes; esta entrega não encerra ALT-01 antes desse reteste.
