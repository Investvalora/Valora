# Atualização PWA, contrato do score e Tesouro — 18/11/2026

## Alterações locais

- PWA busca atualização ao registrar, retomar a aba e recuperar conexão;
  enquanto visível também verifica a cada30min. Chamadas concorrentes e
  repetidas no intervalo são bloqueadas. Falha preserva worker ativo e tenta
  posteriormente. Não limpa dados, não remove registro e não recarrega formulários.
- Score passa a receber a classe de `assets` pela FK de `fundamentals` (conferida
  em produção). Usa o catálogo para impedir ROE de FII, por exemplo, preservando
  DY compatível. Detalhamento formata unidades pelo catálogo, sem converter limites.
- Duas regressões da atualização PWA e regressões de consulta/cálculo aprovadas;
  conjunto focado inicial:35testes. TypeScript e lint aprovados.
- Regressão ampliada de score, catálogo, estratégias e atualização:100testes
  aprovados em13arquivos.
- Outros13testes de alertas/estratégias e2testes do detalhamento do score
  aprovados. Build Vite/PWA concluído e ambos os geradores SQL sincronizados.
- Classes permitidas centralizadas em `classes.json`, consumidas pelo catálogo
  TypeScript e pela migration gerada. Criação/edição de alertas e monitor usam
  o mesmo contrato, inclusive após reclassificação do ativo. Contrato antigo de
  unidade/fonte preservado, sem editar migrations aplicadas.
- Geradores antigo e novo conferidos com `--check`; verificação adicionada ao CI.
- Migration aplicada somente ao banco `supabase_db_valora-provider-qa`.
  `indicator_asset_classes.sql` e `configured_alert_rules.sql` passaram com
  rollback dos dados: reclassificação, fontes, unidades, permissões, isolamento,
  cruzamento de condições e deduplicação. Nenhuma migration histórica alterada.
- Revisão dos seis indicadores atuais concluída para os caminhos verificados:
  fundamentos usam catálogo e classe; score passou a receber a classe; estratégias
  recebem valores filtrados pelo catálogo; formulário, trigger e monitor de alertas
  compartilham classes permitidas. Isso não valida novos indicadores ou todas as
  fontes de mercado. Publicação e reteste integrado permanecem pendentes.
- Reteste de atualização automática no aparelho depende da publicação deste código.

## Diagnóstico de Tesouro consultado em produção

Logs de18/11 entre08h29 e08h40 de Brasília: `sync-treasury-prices` respondeu200
em4987ms e `calc-fixed-income` respondeu200 em1417ms. A função de sincronização
propaga erros de recálculo como503, portanto o resultado conjunto200 confirma
que o fluxo agendado terminou sem erros reportados nesse ciclo.

Tabela de preços atualizada às08h30:04, com1145linhas nas últimas24h e referência
mais recente17/11. Posições Tesouro ativas atualizadas novamente no ciclo das17h:
três com quantidade de títulos usam marcação de mercado; três sem quantidade
usam método contratual. Selic contratual sem data de preço não foi classificada
automaticamente como erro nem teve quantidade inventada. Somente consulta;
nenhum recálculo manual nem alteração cadastral nesta verificação.

Atualização automática de preços e diagnóstico desse ciclo confirmados;
continua acompanhamento operacional normal, sem garantia de disponibilidade futura.
