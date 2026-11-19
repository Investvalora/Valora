# Homologação PR174 — 18/11/2026

Merge `ef0b2d370a117b567e01309871d2f802cb140a5c`. Checks da PR, execuções
da main e deploy Vercel do merge aprovados.

## Banco

Migration `indicator_asset_classes` aplicada em produção depois da validação
QA registrada na entrega. Consultas sem escrita confirmaram:

- ROE de FII incompatível e observado nulo; DY de FII permitido.
- Dívida/PL Yahoo150 preservado como150; fonte brapi rejeitada para essa métrica.
- Helper sem acesso anon; monitor sem execução para authenticated.
- Monitor publicado chama o validador com a classe do cadastro.
- Nenhuma regra existente incompatível encontrada na consulta de auditoria.

Não foi executado manualmente o monitor global em produção para gerar avisos.
Regressões de cruzamento, mudança de classe e deduplicação foram realizadas no QA.

## Android físico

Galaxy A31, PWA standalone. Worker antigo `valora-static-81fb7cba756c` observado
antes da recarga. Após recarga normal e observação, cache novo
`valora-static-1a17e2f907ec`, worker ativado e cache anterior removido.
Nenhuma chamada manual a registration.update, limpeza de dados ou reinstalação
nesta homologação. Isso comprova a atualização nesta abertura; não representa
teste de30min em segundo plano nem garante atualização em qualquer rede.

Score abriu sem erros. Consulta real de fundamentos incluindo FK assets/type
respondeu200. No detalhe AAPL, composição do score mostrou condição5% e observado
27,604%, DY7% e0,31%, P/VP sem percentual e score final1. Captura inspecionada,
conteúdo legível dentro da tela. Gerenciamento de regras abriu sem erros e sua
consulta respondeu200. Nenhuma regra ou lançamento salvo.

Evidências locais no workspace principal: output/phone-pr174-before.json,
phone-pr174-worker.json, phone-pr174-score.json, phone-pr174-breakdown.json,
phone-pr174-score.png e phone-pr174-alerts.json.

Entrega homologada nesse escopo. Comparação controlada de desempenho e cobertura
dos fornecedores continuam separadas.
