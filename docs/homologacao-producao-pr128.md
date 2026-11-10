# Homologação de produção — PR128 — 10/11/2026

Merge confirmado: `3821cab1e007a0c905e08526ddc19a941b843a3b`. Checks app, database-isolation, migration-replay e deployment Vercel aprovados. Conferência autenticada no navegador integrado, sem alterar posições, compras, vendas ou receitas pessoais da carteira Investidor10.

## Conferido

- Desempenho › Proventos: gráfico novo, legendas, aviso de cobertura e tooltip publicados. Período Tudo R$ 804,55; 1 ano R$ 632,01. Separação de líquido importado e estimativa bruta preservada.
- Novembro: R$ 30,92 recebidos e R$ 0,00 em pagamentos futuros datados disponíveis. Aviso de anúncios sem data visível; zero não representa garantia de ausência de pagamentos.
- Filtro GARE11: novembro R$ 15,19, sem alteração do histórico. Filtro restaurado. Tooltip abre pelo clique e fecha com Escape.
- Responsividade em viewport 390 × 844: largura da página 390; tooltip de x=49 a x=279. Emulação de navegador, não teste físico de PWA.
- Início: valor investido R$ 18.483,17 antes e depois do reload; patrimônio R$ 18.772,61 na captura. Proventos totais R$ 804,55 consistentes com a página dedicada.
- Importar transações: seletor explícito de formato numérico e instruções publicados. Apenas leitura, sem importar CSV na carteira real.
- Reload das páginas autenticadas carregou normalmente; sem reprodução do erro de recurso JavaScript durante esta conferência. Isso não substitui teste de atualização de PWA antigo em aparelho físico.

## Publicação ainda pendente

**Atualização posterior:** função, migration e cron publicados e executados após o relato de ausência da previsão de novembro. O gráfico passou a apresentar R$ 34,89 a receber e total mensal R$ 65,81. A leitura de avisos multiclasses de HGLG11 foi ajustada e testada. Ver `correcao-proventos-2026-11-10.md`. O diagnóstico abaixo registra o estado encontrado na primeira homologação, antes dessa publicação.

Consulta somente leitura no Supabase confirmou: Edge Function `sync-dividend-payments` ausente; `public.dividend_payment_sources` inexistente; cron `sync-dividend-payments` ausente. O merge do frontend e o replay de migration no CI não aplicam esses componentes no projeto hospedado.

Publicar a função e depois aplicar a migration `20261110211841_confirmed_dividend_payment_sources.sql`; acompanhar execução e conflitos conforme `correcao-proventos-2026-11-10.md`. A consulta automática Mastercard tem limitação HTTP 403 já documentada. Assim, comportamento do frontend aprovado nesta conferência, mas automação completa do calendário ainda não homologada em produção.
