# FNET: identidade atual e anúncios sem data ex

Implementação local em `codex/fnet-identity-evidence`, ainda sem publicação.

## Causa encontrada

XPML11 tem ISIN B3 `BRXPMLCTF000`. O histórico local da CVM contém dois CNPJs associados a esse ISIN; a descoberta antiga exigia um único CNPJ em todo o histórico, portanto não criava a tarefa FNET. O período de referência mais recente disponível (outubro/2026, entregue em 13/11) contém apenas `28757546000100`, também confirmado no aviso FNET.

A descoberta agora considera somente o período de referência mais recente já entregue e não futuro. Se esse período ainda contiver dois CNPJs, continua bloqueada. A regra vale para todos os FIIs, sem lista de tickers. A leitura do documento continua exigindo ticker, ISIN e CNPJ exatos: a escolha do informe recente não elimina a validação independente do aviso.

## Preservação do aviso

Fonte primária: https://fnet.bmfbovespa.com.br/fnet/publico/exibirDocumento?cvm=true&id=1387873

- XPML11: COM 17/11/2026, pagamento 25/11/2026, R$0,80/cota.
- XPML13 e XPML15 são recibos distintos, com valores diferentes. Fixture real verifica que seus valores não são aplicados ao XPML11.
- O documento não informa aprovação nem data ex. Não se transforma a data da informação em aprovação nem o dia seguinte à COM em ex.

Uma nova tabela conserva cada evidência por ticker e URL do documento, com CNPJ/ISIN, COM, pagamento e valor. Documentos diferentes permanecem separados; repetição idêntica na interface não soma valores. Alteração de datas/valor no mesmo documento gera conflito e não sobrescreve a evidência anterior. Travamento por documento serializa gravações concorrentes.

Sem âncora independente de ex, o coletor retorna `pending_ex`, preserva o aviso e pode concluir a consulta sem tratá-la como falha de transporte. Múltiplas âncoras ou pagamentos conflitantes continuam conflitos. Quando uma âncora real aparece, a conciliação existente enriquece o calendário; o aviso conciliado deixa a lista pendente.

A seção existente “Anúncios com data ex a confirmar” passa a incluir FNET em BRL, com COM, declaração desconhecida e link oficial. Não calcula quantidade, líquido ou total a receber e não inclui o aviso em gráfico/DY. Usuários autenticados somente leem avisos públicos; gravação e conciliação continuam exclusivas do serviço.

## Demais pendências revisitadas

- **BB:** FAQ atual encontrado em https://investors.blackberry.com/faq. O tópico “Dividends for Shareholders” aparece sem resposta substantiva (traço). Não confirma política futura; não criar política de não distribuir com base nisso.
- **PERT:** https://www.otcmarkets.com/stock/pert/quote continua identificando Permanent Technologies e declarando não conseguir confirmar divulgação pública atual. O documento oficial adicional localizado é uma carta de 2017 (https://www.otcmarkets.com/file/company/financial-report/169365/content), insuficiente para calendário atual. Agregadores que dizem não pagar não substituem divulgação primária.
- **PR USD0,03:** continua sem comprovação primária. O 10-Q em https://www.sec.gov/Archives/edgar/data/1658566/000165856626000124/pr-20260930.htm permanece incompatível com promover um pagamento adicional não declarado; hold preservado. Ausência de confirmação não comprova erro definitivo do fornecedor.

## Rollout

1. Validar e mergear a PR.
2. Aplicar `20261119144100_fnet_pending_payment_evidence.sql` antes do frontend que lê a nova tabela.
3. Publicar `sync-dividend-payments` para expor `pending_ex` no diagnóstico; sem novos secrets.
4. Executar a rotina e confirmar descoberta automática de XPML11, parsing e armazenamento do aviso real; conferir o frontend autenticado. Não importar recebimentos para isso.

Nenhuma alteração de dados ou deploy realizado em produção nesta implementação. Correção preparada não equivale a calendário XPML11 completo: ainda falta evidência independente de ex para incluir em totais. Avisos substituídos/cancelados exigem revisão da evidência; não se somam documentos nem se presume que a fonte garante cobertura integral.

## Verificação

Regressões cobrem descoberta com CNPJ histórico divergente, bloqueio de identidade atual ambígua, repetição de documento, conflito imutável, ausência de ex fabricada, conciliação posterior, papel service_role, leitura autenticada e preservação dos dados financeiros. Casos de interface cobrem BRL, declaração ausente, links e ausência de total pessoal. Regressão Mastercard permanece preservada.

Resultado local: 26 testes em seis arquivos passaram; regressão SQL nova e regressão Mastercard passaram no banco QA isolado. Tipos, lint dos arquivos frontend alterados, build Vite/PWA e scanner de segredos aprovados. Conferência visual autenticada da nova seção fica para a homologação; não foi usado o banco de produção como ambiente de escrita de teste.
