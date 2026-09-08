# Epic 2 Context: Gestão Completa de Carteira

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Este épico entrega o núcleo funcional do Valora: a carteira consolidada do investidor. O usuário passa a cadastrar posições manualmente ou importá-las via CSV de transações, visualizar a lista consolidada com valor de mercado, peso relativo e variação, entender a diversificação por classe de ativo e exposição internacional, e receber alertas de inconsistências nos dados (posição sem transações, dividendo esperado não recebido, cotação desatualizada). É a primeira tela pós-login e a base sobre a qual os épicos de patrimônio, proventos, rentabilidade, score e preço-teto se apoiam. Também estabelece o catálogo de ativos seed e o histórico de preços que alimentam todas as telas subsequentes, além da rastreabilidade de origem de dados e a exportação em CSV.

## Stories

- Story 2.1a: Schema e Catálogo de Ativos — **done** (2026-09-08)
- Story 2.1b: Histórico de Preços de 12 Meses — **blocked** (credenciais de API)
- Story 2.2: Adicionar Posição Manual
- Story 2.3: Visualizar Lista de Posições com Rastreabilidade
- Story 2.4: Composição por Classe e Exposição Internacional
- Story 2.5: Importar Transações via CSV
- Story 2.6: Lista de Alertas, Badge e Geração On-Demand
- Story 2.7: Exportar Relatórios em CSV

## Requirements & Constraints

- Posições e transações são dados privados: cada usuário só acessa suas próprias linhas. Posição é única por `(user_id, ticker)`; quantidade > 0 e preço médio ≥ 0.
- Tickers só podem referenciar ativos existentes no catálogo; ticker desconhecido deve avisar o usuário e oferecer busca, sem quebrar o fluxo.
- Lista de posições exibe cotação atual (último fechamento), valor de mercado, peso relativo e variação; ordenação padrão por peso decrescente, com opções por ticker e variação. Cotação com mais de 1 dia recebe flag de "cotação antiga".
- Toda cotação/dado exibido deve mostrar origem (`source`) e data de atualização (rastreabilidade).
- Composição por classe cobre: Ações BR, FIIs, BDRs, Stocks US, REITs, Cryptos. Exposição internacional = soma (BDR + stocks US + REITs + crypto) ÷ patrimônio total.
- Importação CSV: colunas `data, ticker, tipo, quantidade, preço, corretagem`. Valida formato, exibe preview com correção inline, reporta erros com linha/coluna e exemplo esperado. Limite MVP: 1000 transações por arquivo; preview de até 500 linhas em <2s.
- Alertas cobrem inconsistência, oportunidade e evento; status `novo|lido|ignorado`. Alertas duplicados (mesmo tipo + ticker + usuário) não são recriados enquanto o anterior estiver ativo. Badge no menu mostra contagem de "novos".
- Exportação CSV funcional para as tabelas exibidas (até 1000 linhas em <2s). Botões "Sincronizar dados" e "Gerar insights" são placeholders ("Em breve") no MVP.
- Metas de performance: lista de 50 posições ≤2s (p95); geração de alertas para 50 ativos <5s; seed completo <30s.
- Contraste do tema dark deve atender WCAG 2.1 AA; navegação por teclado funcional.

## Technical Decisions

- **Módulo alvo:** `portfolio/` (posições, transações, importação CSV, composição) e `alerts/`. Seguir a estrutura de módulos autocontidos (`components/`, `hooks/`, `services/`, `types/`).
- **Dados:** acesso exclusivamente via hooks TanStack Query (`useQuery`/`useMutation`); services encapsulam chamadas Supabase. Query keys estruturadas `['portfolio', 'positions', userId]`. Após mutations, invalidar cache em vez de usar Realtime — exceto alertas, candidatos a subscription.
- **Cálculos híbridos:** soma de patrimônio, peso relativo, agrupamento por classe, exposição internacional, ganho de capital % e ordenação/filtros são client-side. Preço médio ponderado (transações → posição) e geração de alertas são server-side.
- **Tabelas privadas com RLS (`user_id = auth.uid()`):** `positions`, `transactions`, `alerts`. Tabelas públicas sem RLS, leitura autenticada: `assets`, `price_history`.
- **Posições independentes de transações:** posição pode existir sozinha (gera alerta "sem transações"). Quando há transações para um ticker+usuário, preço médio ponderado e quantidade líquida são recalculados no servidor.
- **Alertas on-demand:** Edge Function `generate-alerts` (em `supabase/functions/generate-alerts/`) varre posições/transações do usuário, é idempotente e protegida por auth; cliente invalida `['alerts', userId]` após sucesso.
- **Cotação USD:** hook `useUSDRate()` consome a AwesomeAPI com `staleTime` 1h, fallback para R$5,00 e badge "taxa USD aproximada" em falha.
- **Enums relevantes:** `transaction_type (buy|sell|dividend|jcp|bonus)`, `alert_type (inconsistency|opportunity|event)`, `alert_status (new|read|ignored)`, `asset_type (stock_br|fii|bdr|stock_us|reit|crypto)`.
- **Performance:** índices em `(user_id, ticker)`; queries limitadas a 50 posições no MVP; gráficos lazy-loaded.

## Cross-Story Dependencies

- Story 2.1a (schema + catálogo) está **concluída**, o que **destrava a 2.2 imediatamente**: a 2.2 só precisa de `assets` para validar ticker. Story 2.1b (histórico de 12 meses) está bloqueada em credenciais e afeta apenas a 2.3, que lê cotações de `price_history` — hoje só os 6 ativos de cripto têm série completa.
- Story 2.3 e 2.4 dependem de posições cadastradas em 2.2. A conversão USD em 2.3 usa o hook AwesomeAPI (compartilhado, também usado por patrimônio/rentabilidade).
- Story 2.5 (importação CSV) alimenta o recálculo de posições e habilita dados de dividendos consumidos pelos Épicos 3 e 4.
- Story 2.6 depende de posições/transações e da tabela `alerts`; a detecção de "dividendo esperado" pressupõe dados de dividendos (seed no Épico 3) para ser plena.
- Story 2.7 reutiliza o padrão de exportação CSV adotado por outras telas (Proventos no Épico 3).
- Depende do Épico 1 (autenticação, layout com menu lateral e tabela `users`) já concluído.
