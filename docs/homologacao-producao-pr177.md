# Homologação de produção — PR177

19/11/2026, aproximadamente 12h54 de Brasília.

- PR: https://github.com/Investvalora/Valora/pull/177 . Merge `5941894d3035fe6696097856f504dfc182144305`, 12h48 de Brasília.
- Vercel do merge: sucesso. Security and regression `44558936620`: sucesso. International announcements `44559055822`: sucesso.
- Migration local `20261119144100_fnet_pending_payment_evidence.sql` aplicada pelo MCP como `fnet_pending_payment_evidence`; histórico remoto versão `20261119154948`. Sem reparo de histórico.
- Função `sync-dividend-payments` publicada com dependências locais, versão 10, ativa, hash `42d9f35d4f2a2bc4b605932dbae51d930f5e4706c4870a62e699b3a431580865`. Autorização interna preservada; nenhum secret novo.

## Execução real

Uma chamada à rotina por `net.http_post`, request 14141, retornou HTTP200, sem timeout: processed=1, enriched=1, pending_ex=2, conflicts=0, failed=0, received_income_created=0.

XPML11 foi descoberto automaticamente como FNET, CNPJ `28757546000100`, ISIN `BRXPMLCTF000`; last_error nulo, last_success_at `2026-11-19T15:51:31.982Z`. Preservados três documentos oficiais:

| Documento | COM | Pagamento | R$/cota |
|---|---|---|---:|
| 1387873 | 17/11/2026 | 25/11/2026 | 0,80 |
| 1353605 | 16/10/2026 | 23/10/2026 | 0,92 |
| 1324029 | 18/09/2026 | 25/09/2026 | 0,92 |

Não foi criada linha de dividendos de novembro: a data ex permanece sem confirmação e não foi inferida da COM. Ausência de ex é pendência de evidência, não falha de transporte. O enriquecimento existente de outubro não altera créditos pessoais.

Fingerprint transactions/positions/wallet_income antes da migration e após a rotina: `d51816838e8092245dc7abdeb432d78d`, idêntico. RLS ativa, leitura autenticada permitida; anon sem SELECT e authenticated sem INSERT. Sem documentos duplicados por ticker/URL. Advisors preservam os avisos existentes, sem nova exposição da tabela.

## Interface

Produção autenticada na carteira Investidor10: Proventos pagos e Anunciados/a receber carregaram, seção “Anúncios com data ex a confirmar” menciona SEC/FNET, filtro XPML mostra ausência no escopo da carteira e aviso de que isso não comprova ausência de pagamentos. Console sem erros capturados. Bundle `/assets/index-09C8eq7L.js`.

Há zero posições positivas de XPML11 nas carteiras. Por isso o cartão real desse ativo não aparece no filtro por posições; não foi criada posição de teste. Renderização do cartão FNET em BRL, COM/declaração desconhecida, ausência de total pessoal e link oficial estão cobertas pelos testes locais/CI. Não se declara teste visual real desse cartão em produção nem novo teste em aparelho físico.

Continuam abertas as confirmações externas de ex XPML11, política futura BB, calendário PERT e evento PR USD0,03. A entrega de descoberta e preservação FNET foi publicada e validada, sem declarar cobertura completa.
