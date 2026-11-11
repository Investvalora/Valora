# Homologação de produção PR132/133 — 11/11/2026

## Resultado

PR132 publicada e conferida. CDI da PR133 ainda não publicado: essa PR foi mergeada na branch `codex/prioridades-dados-csv` depois do merge da PR132 na main. A main está em `4cb3a588`, sem o commit CDI `615e3fd`. Aberta [PR134](https://github.com/Investvalora/Valora/pull/134) para encaminhar esse delta à main. Não declarar a homologação CDI de produção concluída.

## CSV e sincronização de pagamentos

- CI da main `4cb3a588` aprovada; deploy Vercel concluído.
- Navegador integrado em `https://investvalora.vercel.app/ativos/importar`, conta autenticada e carteira Investidor10: arquivo fictício com excesso de casas em quantidade, preço e corretagem gerou erros por coluna, zero linhas selecionadas e confirmação desabilitada. Arquivo de 1.001 linhas rejeitado antes da prévia. Nenhuma confirmação de importação executada.
- Migration `import_numeric_precision` aplicada no Supabase, registrada como versão `20261111214904` (arquivo local correspondente `20261111210332_import_numeric_precision.sql`). Consulta de `pg_get_functiondef` confirmou a guarda de precisão/quantidade. `anon` não possui EXECUTE na importação.
- Função `sync-dividend-payments` publicada a partir dos arquivos da main, versão 3 ativa. Mantidos `verify_jwt=false` e verificação interna exata do token de serviço. Requisição POST sem credencial retornou HTTP401 `unauthorized`.
- Não foi criada carteira, lançado movimento, modificado recebimento pessoal ou recalculado saldo. A migration substitui validação da função de importação, sem reescrever lançamentos existentes.

## Limites e próximos passos

- Testes de persistência/atomicidade da migration passaram em banco descartável na CI. Na produção, homologação de interface e inspeção da função, sem inserir dados financeiros de teste na carteira.
- Falha Mastercard ainda registrada com o código antigo e sem sucesso. Nova versão detalhará a próxima tentativa; não foi acionada sincronização global manual só para testar essa classificação.
- Após merge da PR134, publicar `calc-fixed-income` com calendário/módulos compartilhados e conferir os resultados por lote antes de declarar encerrado o critério CDI.
- Evidência visual local não versionada: `output/qa-pr132/producao-limit1001.png`.
