# Cobertura MA e conciliação — 12/11/2026

## Alternativa gratuita implementada localmente

O RI Mastercard continua HTTP403. O comunicado original distribuído pela Business Wire está acessível na Nasdaq com HTTP200. A página pública de MA usa o componente reference-group, que importa getPressReleases e consulta `/api/news/topic/press_release?q=symbol:MA|assetclass:stocks&limit=100&offset=0`. A rota reference-group genérica no HTML retornou conteúdo AAPL; foi descartada, não usada como identidade MA.

O novo coletor usa o feed por símbolo, filtra o título exato da declaração e `ma|stocks`, vincula data do índice à URL e ao identificador Business Wire, confirma Mastercard/NYSE:MA e Source: Mastercard Investor Relations no corpo. Consulta no máximo100 itens e dois comunicados recentes, com resposta2MB/timeout15s/sem redirecionamentos. Não executa JavaScript da página nem usa chaves públicas embutidas.

Consulta real aprovada encontrou dois comunicados:29/09, corte09/10, pagamento09/11;16/06, corte09/07, pagamento07/08. Ambos USD0,87 por ação. Sem ex retornada pelo parser. O banco só completa calendário se houver uma única âncora ex real para valor/data compatíveis; seed não serve de âncora, conflitos preservam o dado existente e não marcam sucesso. Sem ex disponível, mantém conflito em vez de criar direito presumido.

Prévia CI passa a consultar o feed publicamente; lote autenticado mantém OIDC/lease existentes. Requer revisão/merge, migration e publicação da função internacional. Acesso hospedado e replay SQL precisam ser aprovados antes de ativar. Docker local ficou em starting sem API; não foi usado banco de produção para testar a migration.

Atualização da validação: Docker recuperado; migration aplicada somente no banco local. Fixture MA e regressões JPM/simulados aprovadas com ROLLBACK.33 testes de parser/coletor/endpoint/histórico de recebimentos aprovados. Consulta pública real MA confirmou os dois comunicados. Probe hospedado e publicação continuam pendentes.

## Líquido pessoal MA conciliado

Titular confirmou no chat: pagamento09/11, bruto USD0,06, imposto USD0,02, líquido USD0,04. Conferência prévia encontrou zero recebimentos nessa data e0,06394 ações antes da ex09/10. Registro parcial Nomad adicionado idempotentemente somente nessa carteira/ativo/data, com quantidade histórica e valor público0,87. Não altera os pagamentos anteriores importados em BRL nem cobre globalmente outros ativos nesse dia. Teste de merge de histórico verifica substituição da estimativa apenas desse evento e uso do líquido sem nova retenção.

## COST e Selic: limites restantes

O [comunicado oficial Costco](https://investor.costco.com/news/news-details/2026/Costco-Wholesale-Corporation-Declares-30-Special-Cash-Dividend-and-Reauthorizes-Stock-Repurchase-Program/default.aspx) confirma USD30/corte24/11/pagamento04/12, sem ex explícita. Nasdaq continua retornando o regular USD1,47, sem o especial. Serviços terceiros indicam24/11, mas essa indicação não foi promovida para cálculo sem confirmação independente homologada. Anúncio permanece pendente.

Cadastro Selic2027-10-10/quantidade100 é de outra conta e anteriormente não reconhecido; nenhuma evidência nova permite corrigir identidade ou quantidade. Preservado. A última execução macro observada é11/11 às20h, anterior à v16. Próxima execução12/11 às17h Brasília, repetição20h. A conferência desta rodada ocorreu antes desses horários; não declarar mensagem observada em execução que ainda não ocorreu.

## Finnhub

Especificação embutida na [documentação oficial](https://finnhub.io/docs/api/stock-dividends) marca `/stock/dividend` como Premium Access Required e `/stock/dividend2` como Premium required. O schema contempla ex/registro/pagamento, mas chave gratuita não comprova acesso a esses endpoints. Não fornece o crédito líquido pessoal Nomad nem título Tesouro brasileiro. Sem integração paga adicionada.

## Pesquisa de alternativa gratuita adicional

[Alpha Vantage DIVIDENDS](https://www.alphavantage.co/documentation/#dividends) documenta histórico e distribuições futuras declaradas, com chave gratuita, sem rótulo Premium nessa seção. [Limite oficial](https://www.alphavantage.co/support/#api-key):25 consultas/dia; projetos open-source/educacionais verificados podem solicitar expansão, sem assumir aprovação automática. Teste com chave demo retornou apenas orientação para criar chave própria: MA/COST ainda não homologados nessa fonte. Não foi criada conta, usada chave de outro serviço nem feita integração sem dados reais. [Termos](https://www.alphavantage.co/terms_of_service/) pedem contato para uso comercial; chave gratuita não implica autorização de redistribuição pelo Valora.

[Marketstack](https://marketstack.com/pricing/) lista Splits & Dividends no Free,100 consultas/mês,1 ano de histórico e uso não comercial. Menor margem para catálogo compartilhado; também precisa chave e validação do endpoint/campos/eventos atuais. [FMP Basic](https://site.financialmodelingprep.com/pricing-plans) divulga limites de símbolos e respostas/calendário; não comprova cobertura irrestrita de MA/COST. Nenhum fornecedor único gratuito comprovado para todos os itens. Alpha Vantage é candidata de dados públicos, não substituto de extrato pessoal ou correção de identidade Selic.
