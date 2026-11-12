# Descoberta SEC compartilhada de dividendos

## Escopo da entrega

Adicionar uma segunda fila ao coletor internacional: descobre anúncios pelo catálogo SEC ticker/CIK e pelos formulários8-K recentes. Não existe lista dos ativos da carteira nem configuração manual de CIK por ticker. A fila considera o catálogo de ações americanas USD ativo (`stock_us`); ETFs, outros formulários e classes incompatíveis não estão incluídos nesta primeira etapa.

É uma camada de descoberta, não uma substituição automática de elegibilidade. Os anúncios ficam em `sec_dividend_announcements`, com moeda USD, classificação `regular`/`special`, documento e `ex_status=unconfirmed`. Não são inseridos em `dividends` ou `wallet_income`; o frontend atual não soma esse ledger, que também não participa de DY/Bazin. A ex-date, quantidade elegível e líquido pessoal não são inferidos. Exibição dedicada dos pendentes e conciliação com uma ex independente continuam como etapa seguinte.

## Fontes e identidade

- [Catálogo SEC de empresas/tickers/bolsas](https://www.sec.gov/files/company_tickers_exchange.json): uma correspondência exata normalizando somente ponto/hífen de classe; bolsa NYSE/Nasdaq e CIK numérico. Rejeita ausência e ambiguidade.
- [Submissions API](https://www.sec.gov/search-filings/edgar-application-programming-interfaces): confirma CIK/ticker antes de descobrir links. Últimos120 dias,8-K não emendado com item8.01; até quatro documentos por ativo/execução.
- Documento em caminho Archives derivado somente do accession e primaryDocument publicados, com allowlist de host/path, sem redirecionamento. CIK e ticker também são conferidos nos campos DEI do próprio documento.

O parser aceita dois formatos estritos de declaração efetiva de dividendo em dinheiro por ação ordinária. Não tenta interpretar todo texto financeiro. Declaração não suportada fica diagnosticada; exceder a janela de quatro documentos marca cobertura parcial. Nenhum anúncio encontrado numa janela não comprova ausência de dividendos. Um8-K sem item8.01 ou um comunicado somente em anexo pode continuar fora da descoberta.

Requisições sequenciais com intervalo250ms, identificação explícita de coletor e contato público do Valora, timeout15s e limite4MB. A [política SEC](https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data) pede User-Agent identificado e no máximo10 requisições/segundo. Sem chave, conta paga, proxy ou CAPTCHA.

## Segurança e operação

Uma tarefa SEC por execução, em fila separada da Nasdaq/JPM. Mesmo endpoint/OIDC restrito à main/workflow; lease aleatório de dez minutos e uso único. CIK persistido não pode mudar silenciosamente. Conflito em anúncio existente não sobrescreve documento/valor. Tarefas sem acesso público; anúncios públicos somente leitura por authenticated. Não recebe dados pessoais ou credencial permanente no runner.

Sucesso da consulta aguarda24h; erro/parcial aguarda6h. Cobertura parcial não atualiza last_success_at. Falha na coleta primária não impede a tentativa SEC, mas continua deixando o job com falha. Workflow com orçamento de cinco minutos para as duas fontes e identidade temporária existente.

## Homologação local

Consulta real sem gravação para COST descobriu CIK0000909832 e dois documentos:

- [8-K10/11/2026](https://www.sec.gov/Archives/edgar/data/909832/000090983226000134/cost-20261107.htm): especial USD30, corte24/11, pagamento04/12.
- [8-K14/10/2026](https://www.sec.gov/Archives/edgar/data/909832/000090983226000096/cost-20261014.htm): regular USD1,47, corte30/10, pagamento13/11.

Nenhum deles produziu ex-date no parser. Dois documentos inspecionados, sem truncamento ou formato não suportado.

70 testes de parser/coletor/endpoint aprovados; TypeScript, ESLint e Deno check aprovados. Migration e fixture SQL aprovadas no Docker local, com ROLLBACK: identidade, token incorreto/repetido, idempotência, conflito, acesso e zero criação de provento elegível. O teste de fonte real hospedada é obrigatório na PR antes da ativação.

## Publicação

Ainda não publicado. Após revisão/merge: aplicar `20261112011747_sec_dividend_discovery.sql`, publicar o endpoint internacional atualizado e validar primeiro o probe público; depois priorizar um ticker apenas na fila técnica e executar um lote OIDC. Conferir ledger, idempotência, ausência de escrita em dividendos/recebimentos e limites antes de homologar produção. Nenhum saldo, lançamento ou recebimento alterado nesta implementação.

Não encerra MA/403 nem garante calendário antecipado de todo emissor. Inclui a capacidade comum de consultar qualquer ativo compatível sem adaptador por carteira; ampliações de formato ficam testáveis e compartilhadas.
