# Exceção Tesouro — 12/11/2026

Auditoria somente leitura confirmou um lote tesouro_selic, vencimento2027-10-10, quantidade100, sem correspondência na tabela treasury_prices e sem last_updated_at. É o cadastro anteriormente não reconhecido pelo responsável; não foi atribuído à Investidor10 nem alterado. Ausência na base não prova que nunca existiu um título, mas impede usar outro vencimento por aproximação.

Os três lotes confirmados da Investidor10 (IPCA2029, quantidades0,03/0,01; Prefixado2031,0,14) têm preço oficial10/11 e recálculo automático11/11 às20h Brasília. A falha é específica do cadastro sem referência, não interrupção geral dos preços.

Correção local: diferencia consulta vazia de cotação incompatível/antiga e orienta conferir título, vencimento e quantidade no extrato. Resposta malformada também gera diagnóstico. Preserva saldo; não usa preço de outro vencimento, não remove cadastro e não retorna a uma taxa presumida.12 testes de handler/marcação aprovados. Publicação pendente; dados cadastrais continuam aguardando evidência do titular da conta.

Cron internacional: nova consulta por evento schedule continua sem execuções. Mantém-se pendência operacional; nenhum dispatch manual foi usado para simular recorrência.

## Consolidação das prioridades nesta PR

Regressão ampliada:44 testes de cálculo/Tesouro/SEC/endpoint aprovados, incluindo resposta vazia, malformada e preço antigo sem PATCH ou fallback contratual. Esta PR encerra a investigação da causa e melhora o diagnóstico; não regulariza o cadastro desconhecido sem extrato.

Reconsulta gratuita em12/11: Nasdaq info confirma MA/NYSE/Common Stock, mas a resposta de dividendos não traz rows; relaxar a checagem Nasdaq não forneceria calendário. Índice anual Mastercard2026 e tabela de dividendos continuam HTTP403 na consulta direta Node. O [comunicado oficial de29/09](https://investor.mastercard.com/investor-news/investor-news-details/2026/Mastercard-Board-of-Directors-Announces-Quarterly-Dividend-d3ed32e33/default.aspx) consultável via busca confirma USD0,87/corte09/10/pagamento09/11, já cadastrados; não informa líquido do cliente. Acesso pela ferramenta de busca não prova disponibilidade no coletor.

Nasdaq COST continua com último anúncio regular USD1,47/ex30/10/pagamento13/11; não há especial USD30 nessa resposta. A data ex do especial continua não confirmada, sem promoção para cálculo. Não inferir pela regra geral de liquidação nem usar terceiros sem fonte independente homologada.

Pendências que não podem ser encerradas nesta entrega: execução schedule internacional observada; descoberta MA acessível ao coletor; ex oficial do especial; extrato do líquido MA e confirmação do cadastro Selic pelo titular. A PR reúne correção verificável e evidências dessas dependências, sem apresentar todas como resolvidas.
