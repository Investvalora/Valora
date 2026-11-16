# Falha internacional PG — 16/11/2026

## Evidência da produção (somente leitura)

[Run 43788678050](https://github.com/Investvalora/Valora/actions/runs/43788678050), SHA f5e0e1e, iniciou em 16/11 às 01:51 UTC (15/11 às 22:51 Brasília). O coletor falhou em 39s com `provider_event_conflict` em Alpha/PG; seis lotes públicos passaram. Quatro conflitos `cross_provider` ficaram preservados. A run posterior 43832971351 passou, mas pulou fornecedores; não comprova resolução de PG.

| Data ex observada pelos fornecedores | Declaração | Pagamento | SEC/Alpha USD | Marketstack USD | Yahoo USD |
|---|---|---|---:|---:|---:|
| 2026-01-23 | 2026-01-13 | 2026-02-17 | 1.0568 | 1.06 | 1.057 |
| 2026-04-24 | 2026-04-14 | 2026-05-15 | 1.0885 | 1.09 | 1.089 |
| 2026-07-24 | 2026-07-14 | 2026-08-17 | 1.0885 | 1.09 | 1.089 |
| 2026-10-23 | 2026-10-13 | 2026-11-16 | 1.0885 | 1.09 | 1.089 |

## Fontes primárias conferidas

- [Janeiro, 8-K](https://www.sec.gov/Archives/edgar/data/80424/000008042426000002/pg-20260113.htm)
- [Abril, 8-K](https://www.sec.gov/Archives/edgar/data/80424/000008042426000048/pg-20260414.htm)
- [Julho, 8-K](https://www.sec.gov/Archives/edgar/data/80424/000008042426000082/pg-20260714.htm)
- [Outubro, 8-K](https://www.sec.gov/Archives/edgar/data/80424/000008042426000214/pg-20261013.htm)

SEC confirma valor, declaração, record e pagamento. A data ex permanece ancorada nos eventos independentes; não é inferida de record.

## Correção

A migration `reconcile_pg_official_precision` adiciona quatro revisões oficiais privadas. Libera apenas observações Alpha em quarentena que correspondam exatamente aos fatos revisados, sem editar snapshots prévios. A função de revisão permite para PG somente o arredondamento Yahoo de três casas, mantendo bloqueio para qualquer outra diferença de valor ou calendário. Guarda `prior_row`, fonte e revisão dos conflitos.

O finisher existente já sabe conciliar precisão inferior contra evidência primária, mas essa evidência ainda não estava registrada para PG. Não se desativa a falha geral nem se adota tolerância arbitrária.

Não altera transações, posições, recebimentos ou quantidades. Não limpa histórico de erros nem quotas. A publicação deve ser seguida por uma execução dirigida Alpha/PG na versão mesclada.

## Validação local concluída

- Migration aplicada somente no banco isolado `supabase_db_valora-provider-qa`.
- 22 baterias SQL do CI aprovadas, incluindo PG, WMT, adjudicação primária, filas, quotas e isolamento.
- PG: quatro conflitos reproduzidos; revisão repetida sem duplicação; mesmo lote Alpha repetido com zero conflitos. Diferenças reais de valor, pagamento e fonte continuam bloqueadas.
- Fixture com compra e dividendo pessoal: hashes de transações, posições e recebimentos preservados; snapshots Marketstack preservados.
- Vitest: 270 testes em 29 arquivos aprovados.
- `git diff --check` aprovado.

Docker terminou a recuperação; o bloqueio anterior foi resolvido. Nenhuma migration, reexecução de fornecedor ou alteração financeira foi realizada em produção nesta investigação. Falta publicar a correção e repetir o lote dirigido em produção.
