# Epic 5 Context: Score Fundamentalista Customizável

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Permitir que o usuário crie regras personalizadas de análise fundamentalista (P/L, ROE, DY, etc.), combine-as em um score e aplique esse score na tela Carteira para identificar ativos alinhados com sua estratégia. O score é calculado on-demand a cada request, sem persistência do resultado — apenas as regras ficam salvas no banco.

## Stories

- Story 5.1: Criar e Editar Regras de Score
- Story 5.2: Aplicar Score na Carteira

## Requirements & Constraints

**Funcionais:**
- Usuário cria scores com nome e um ou mais regras; cada regra define: métrica (`pl`, `pvp`, `roe`, `dy`, `debt_equity`, `net_margin`), operador (`lt`, `lte`, `gt`, `gte`, `between`), limiar(es) e pontos inteiros.
- Múltiplos scores por usuário. Um score pode ser marcado como ativo via `user_preferences.default_score_rule_id`.
- Usuário pode editar e excluir regras existentes.
- Score total = soma dos pontos das regras cuja condição é satisfeita pelo ativo.
- Ativo sem `fundamentals` exibe "N/A". Fundamentals com `updated_at` > 90 dias exibem flag "⚠️ Dados antigos".
- A lista de posições pode ser ordenada por score crescente/decrescente quando score ativo está selecionado.

**Não-funcionais:**
- Cálculo para 50 ativos ≤ 1s (NFR-2).
- Validação: limiar não numérico ou pontos não inteiros bloqueiam o save.
- Operator `between` requer `threshold_min` e `threshold_max`; demais operadores requerem apenas `threshold_min` (com `threshold_max` NULL).

**Dados seed já existentes (Story 3.1 — done):**
- Tabela `fundamentals` com indicadores trimestrais (P/L, P/VP, ROE, DY, Dívida/PL, Margem Líquida, LPA, VPA) para os 51 ativos, `source = 'seed'`.

## Technical Decisions

**Score on-demand, sem persistência de resultado (AD-9):**
O cálculo roda via Supabase Edge Function `calculate-score` (já prevista em `supabase/functions/calculate-score/`) ou Postgres Function. Regras (`score_rules`) são persistidas; o resultado não é armazenado. TanStack Query pode fazer cache com `staleTime` curto (≤ 5 min).

**Schema (já definido na arquitetura):**
- `score_rules`: `id`, `user_id`, `name`, `metric score_metric`, `operator score_operator`, `threshold_min`, `threshold_max`, `points INTEGER`, `created_at`. RLS: `user_id = auth.uid()`.
- `user_preferences`: `user_id PK`, `default_score_rule_id UUID REFERENCES score_rules(id) ON DELETE SET NULL`, `valuation_method`, `preferred_currency`, `updated_at`. RLS: `user_id = auth.uid()`.
- ENUMs já definidos: `score_metric ('pl','pvp','roe','dy','debt_equity','net_margin')` e `score_operator ('lt','lte','gt','gte','between')`.

**Módulo frontend:** `src/modules/score/` com estrutura:
- `components/`: `ScoreRuleBuilder.tsx`, `ScoreRuleList.tsx`, `ScoreDisplay.tsx`
- `hooks/`: `useScoreRules.ts`, `useCalculateScore.ts`
- `services/`: `scoreService.ts`
- `types/`: `score.types.ts`

**Acesso a dados:** via hooks TanStack Query. Query keys sugeridas: `['score', 'rules', userId]` e `['score', 'calculate', userId, scoreId]`. Invalidar `['score', 'rules', userId]` após create/update/delete.

**Integração com tela Carteira:** o módulo `score` expõe o score calculado; o módulo `portfolio` consome via hook sem acoplar lógica de cálculo.

**RLS obrigatório:** `score_rules` e `user_preferences` têm RLS ativo por `user_id = auth.uid()`. Nenhum dado de score de outro usuário deve ser acessível.

**Verificar se tabelas já existem:** checar migrations existentes antes de criar nova migration para `score_rules` e `user_preferences` — o schema já foi definido na architecture spine e pode ter sido criado nas migrations de épicos anteriores.

## UX & Interaction Patterns

- Tela `/score` (rota já no menu lateral): lista de scores existentes + botão "Novo Score".
- Builder de regras: formulário com selects para métrica e operador, inputs numéricos para limiar(es) e pontos. Ao trocar operador, campos de limiar se adaptam (1 campo para `lt/lte/gt/gte`, 2 campos para `between`).
- Score ativo selecionável via dropdown na tela Carteira; ao selecionar, coluna de score aparece ao lado de cada posição.
- Score "N/A" para ativos sem fundamentals — não deve bloquear a exibição das demais posições.

## Cross-Story Dependencies

- **Story 3.1 (done):** tabela `fundamentals` com seed é pré-requisito. Verificar que a tabela existe e está populada antes de implementar o cálculo.
- **Story 2.3 (done):** tela Carteira já existe; Story 5.2 adiciona coluna de score a ela sem reescrever o componente.
- **Stories 5.1 → 5.2:** Story 5.2 depende das tabelas e do hook de regras criados em 5.1.
- **Épico 6 (backlog):** `user_preferences` também persiste `valuation_method` — não apagar ou recriar a tabela se ela já existir de épicos anteriores.
