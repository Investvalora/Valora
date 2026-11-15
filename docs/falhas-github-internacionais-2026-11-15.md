# Prioridade: falhas do workflow internacional — 15/11/2026

Quatro execuções agendadas com falha examinadas diretamente pelos logs:

| Run | Horário Brasília | Causas que geraram exit 1 |
| --- | --- | --- |
| [43574203166](https://github.com/Investvalora/Valora/actions/runs/43574203166) | 14/11 05h06 | WMT `nasdaq_invalid_date`; JPM `sec_response_too_large` |
| [43607661636](https://github.com/Investvalora/Valora/actions/runs/43607661636) | 14/11 11h58 | WMT `nasdaq_invalid_date`; JPM `sec_response_too_large` |
| [43653257107](https://github.com/Investvalora/Valora/actions/runs/43653257107) | 14/11 20h26 | WMT `nasdaq_invalid_date` |
| [43670327979](https://github.com/Investvalora/Valora/actions/runs/43670327979) | 15/11 00h00 | JPM `sec_response_too_large` |

Não eram falhas de deploy nem cotas tratadas como erro: os logs mostram causas por ativo. META/V `sec_partial_coverage`, Nasdaq `identity_unsupported` e falta de orçamento não geraram essas falhas. Runs posteriores 43705292278 e 43741123035 passaram, mas não constituem reteste dirigido dos mesmos ativos.

## O que a PR160 já resolveu

- SEC/JPM: índice de 4,7 MB e 26.513 entradas ultrapassava os limites antigos. Publicação e reteste real de dois filings em produção aprovados, sem erro de leitura.
- WMT: uma linha `N/A` bloqueava o lote. Agora aproveita quatro linhas completas, registra uma lacuna parcial e mantém a ausência explícita. Porém a homologação encontrou três conflitos de precisão reais, então o workflow ainda pode sinalizar falha para WMT. O conflito não será escondido da classificação de falhas.

## Correção adicional preparada

O [comunicado oficial Walmart de 19/02/2026](https://corporate.walmart.com/news/2026/02/19/walmart-raises-annual-dividend-to-0-99-per-share-marking-53rd-consecutive-year-of-dividend-increases) declara quatro parcelas de USD 0,2475 e informa registro/pagamento. Alpha/Nasdaq ancoram a data ex independentemente; não foi inferida do registro. O [10-Q oficial](https://stock.walmart.com/sec-filings/all-sec-filings/content/0000104169-26-000154/wmt-20260731.htm) confirma o mesmo valor e calendário.

Migration adiciona quatro revisões oficiais WMT e permite corrigir apenas `yahoo` 0,248 que corresponda exatamente ao arredondamento em três casas do oficial 0,2475, com calendário compatível. Preserve o registro anterior em `issuer_dividend_reconciliations.prior_row`, snapshots dos fornecedores e recebimentos pessoais. Qualquer outro valor, fonte ou data continua bloqueado. Atualiza o valor no upsert apenas depois de validar esses guardas; os cinco eventos já revisados continuam protegidos pelas regras anteriores.

## Homologação local

- Nova migration aplicada somente no QA isolado.
- Teste reproduziu os três históricos arredondados, conciliou quatro eventos sem duplicação e repetiu o lote Nasdaq parcial: **zero conflitos**, `nasdaq_partial_coverage` preservado pela declaração ausente.
- Testes negativos: 0,249, fonte diferente de Yahoo e pagamento divergente recusados.
- Compra e dividendo pessoais sintéticos preservados por hash; teste com rollback.
- 21 baterias SQL de CI aprovadas; teste anterior limitado aos cinco eventos do seu fixture para não depender de novas revisões adicionadas ao catálogo.

Correção desta branch ainda não publicada. Após merge/aplicação, fazer um reteste dirigido WMT e uma execução do workflow na versão nova. Um workflow posterior verde sozinho não garante que passou pelo mesmo ticker. Não reexecutar versões antigas apenas para tentar obter verde nem remover o sinal de conflitos econômicos.
