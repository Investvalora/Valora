# Cobertura Mastercard (MA) — investigação de 11/11/2026

## Achados confirmados

1. A Nasdaq de dividendos tem cobertura apenas para símbolos listados Nasdaq. MA é listada NYSE; a consulta de identidade retorna `isNasdaqListed=false`. Não remover essa proteção nem tratar MA como Nasdaq para conseguir resultados.
2. O histórico do RI Mastercard respondeu HTTP403/“Just a moment...” na consulta automática. Isso é bloqueio da origem, não ausência de dividendo. Não contornar CAPTCHA ou fabricar identidade de navegador.
3. Há um conflito real na regra de conciliação: o banco contém MA ex 10/01/2025 e o comunicado do emissor informa record 09/01/2025, USD0,76, pagamento 07/02/2025. O RPC atual procura ex <= record e, por isso, não encontra esse evento.
4. A data ex existente é válida. O fechamento extraordinário das bolsas no luto por Jimmy Carter em 09/01/2025 levou as datas ex dessa sessão para 10/01/2025. Não corrigir o evento para 09/01 por suposição.
5. O calendário público mais recente de MA já está registrado: ex/record 09/10/2026, pagamento 09/11/2026, USD0,87, fonte `mastercard_ri`. Há sete eventos confirmados desde 2025; o evento de janeiro é o único sem pagamento nesse conjunto consultado. Isso não confirma líquido pessoal.

## Caminho gratuito para correção

- Preservar a data ex e suportar exceções de calendário comprovadas na conciliação. Não afrouxar para qualquer ex > record. Essa exceção deve ter fonte e teste; eventos não conciliados devem ficar identificados individualmente, sem confundir falta de cobertura antiga com falha de todos os eventos novos.
- Manter RI como fonte primária e acrescentar comunicados oficiais em CDN como alternativa de documento: PDF Mastercard em `s25.q4cdn.com/479285134/files/doc_news/` respondeu HTTP200/application/pdf (98.265 bytes no documento consultado). O documento confirmado é o anúncio de fevereiro de 2026 para pagamento em maio, não prova descoberta do último trimestre. Não fixar uma única URL como se fosse feed atualizado.
- A descoberta dos próximos documentos precisa de índice/feed verificado e parsing estrito de emissor, classe, declaração, record, pagamento e valor. Validar ligações a arquivos novos; nenhum link deve ser inventado por padrão de nome.
- SEC `data.sec.gov/submissions/CIK0001141391.json` respondeu HTTP200, identificando Mastercard Inc/MA e filings recentes. É alternativa primária gratuita para descobrir documentos de divulgação, mas a disponibilidade de cada documento, as datas de pagamento e a antecedência dos anúncios ainda precisam validação. O endpoint de submissions por si só não fornece o calendário de pagamentos.

Não implementado/publicado nesta investigação. Nenhum evento, quantidade, lançamento, retenção ou recebimento pessoal alterado. O adaptador Nasdaq em desenvolvimento continua corretamente recusando MA.

## Correção aplicada após autorização

Em 11/11, o responsável solicitou aplicar a correção. Migration local `20261111223409_mastercard_ex_date_exception.sql` testada e aplicada no Supabase com registro `20261111223653`:

- RPC aceita somente a exceção MA record09/01/2025 → ex10/01/2025, preservando a ex-date e a igualdade do valor. Demais datas posteriores ao record continuam bloqueadas.
- Reparo pontual do anúncio público existente, somente se fonte Yahoo e record/pagamento ausentes: pagamento07/02/2025, record09/01/2025, USD0,76 e fonte `mastercard_ri`, com URL do comunicado oficial. Consulta após aplicação confirmou os cinco campos e ex10/01 preservada.
- Nenhum `wallet_income`, lançamento, quantidade, imposto ou saldo pessoal foi modificado. EXECUTE permanece indisponível para `authenticated`.
- Teste SQL local com ROLLBACK passou: conciliação, repetição, valor diferente, data fora da exceção e pagamento previamente confirmado. Testada também a migration real duas vezes: primeiro reparo afetou uma fixture; reexecução preservou pagamento já confirmado. Suite de 27 testes aprovada e scan de segredos sem achados. Teste SQL integrado à CI.

Essa atualização substitui a ausência de implementação da exceção mencionada acima. O HTTP403 do RI e a descoberta automática de novos documentos oficiais continuam pendentes; o reparo histórico não encerra essa limitação e não introduz um PDF fixo como feed.

## Fontes primárias

- [Nasdaq Trader ECA2024-632 — mudança de ex-date para 10/01/2025](https://www.nasdaqtrader.com/TraderNews.aspx?id=ECA2024-632).
- [NYSE/ICE — fechamento de 09/01/2025](https://ir.theice.com/press/news-details/2024/The-New-York-Stock-Exchange-Will-Close-Markets-on-January-9-to-Honor-the-Passing-of-Former-President-Jimmy-Carter-on-National-Day-of-Mourning/default.aspx).
- [Mastercard — declaração de dezembro de 2024, record e pagamento de 2025](https://investor.mastercard.com/investor-news/investor-news-details/2024/Mastercard-Board-of-Directors-Announces-Quarterly-Dividend-and-12-Billion-Share-Repurchase-Program/default.aspx).
- [Mastercard — declaração de setembro de 2026](https://investor.mastercard.com/investor-news/investor-news-details/2026/Mastercard-Board-of-Directors-Announces-Quarterly-Dividend-d3ed32e33/default.aspx).
- [PDF oficial disponível em CDN](https://s25.q4cdn.com/479285134/files/doc_news/Mastercard-Board-of-Directors-Announces-Quarterly-Dividend-2026.pdf).
- [SEC — submissions Mastercard](https://data.sec.gov/submissions/CIK0001141391.json).
