---
title: 'Story 5.1 — Criar e Editar Regras de Score'
type: 'feature'
created: '2026-09-11'
status: 'done'
review_loop_iteration: 0
baseline_commit: '6599518249a7b4abbdbaf2777343c58a51ae773f'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problema:** A rota `/score` exibe um placeholder. Não existe nenhuma tabela, módulo ou UI para criar e gerenciar regras de Score Fundamentalista, que são o alicerce da Story 5.2.

**Abordagem:** Criar a migration das tabelas `score_rules` e `user_preferences`, o módulo `src/modules/score/` completo (types, service, hooks, componentes) e a página `/score` com listagem de scores, builder de regras e seleção de score ativo.

## Boundaries & Constraints

**Always:**
- Toda tabela nova tem RLS habilitado sem exceção (AD-6). `score_rules` usa `user_id = auth.uid()` para ALL; `user_preferences` usa `user_id = auth.uid()` para ALL.
- ENUMs de banco: `score_metric ('pl','pvp','roe','dy','debt_equity','net_margin')` e `score_operator ('lt','lte','gt','gte','between')` — exatamente esses valores, definidos na migration.
- Operador `between` requer `threshold_min` e `threshold_max` não nulos; outros operadores requerem apenas `threshold_min` (CHECK no banco + validação no frontend com Zod).
- `points` deve ser `INTEGER` no banco e inteiro no frontend (Zod: `z.number().int()`).
- O usuário pode ter múltiplos scores (um score = conjunto de regras com mesmo `name`). `user_preferences.default_score_rule_id` aponta para o `id` de UMA regra que representa o score ativo — na prática, a Story 5.2 usará isso para identificar o conjunto de regras a aplicar.
- Acesso a dados via TanStack Query; service encapsula o Supabase client. Sem export default; pattern de objeto nomeado.
- Padrão de queryKey: `['score', 'rules', userId]`. Invalidar após create/update/delete.
- Modal usa `src/shared/components/Modal.tsx` com `dismissible={!isSaving}` durante escrita.
- Formulário usa React Hook Form + Zod, exatamente como `AddPositionForm.tsx`.
- A rota `/score` em `src/routes.tsx` substitui o placeholder inline pelo import real.

**Ask First:**
- Agrupar regras por nome de score em um objeto lógico no banco (tabela separada `scores`) versus manter `name` como campo livre em `score_rules`.
- Ordenação de regras dentro de um score importar para o cálculo (hoje a spec assume que não importa — pontos são somados independentemente).

**Never:**
- Criar `database.types.ts` gerado pelo CLI — o projeto usa tipos locais manuais com cast `as unknown as T[]`.
- Criar Edge Function `calculate-score` nesta story — cálculo é responsabilidade da Story 5.2.
- Modificar migrations existentes (001–010).
- Usar Context API para estado global — apenas Zustand ou estado local de componente.
- Exibir ou calcular score de ativo — isso é escopo exclusivo da Story 5.2.

## I/O & Edge-Case Matrix

| Cenário | Input / Estado | Saída / Comportamento | Tratamento de Erro |
|---------|---------------|----------------------|--------------------|
| Criar regra válida (não-between) | name, metric, operator ≠ between, threshold_min numérico, points inteiro | Linha inserida em `score_rules`; lista atualiza | — |
| Criar regra válida (between) | operator = between, threshold_min < threshold_max, points inteiro | Linha inserida; lista atualiza | — |
| Between sem threshold_max | operator = between, threshold_max vazio | Formulário bloqueado com erro de validação visível | — |
| Points não inteiro | points = 1.5 | Formulário bloqueado com mensagem "Pontos devem ser número inteiro" | — |
| Editar regra existente | regra na lista → clique Editar → alterar campo → salvar | Linha atualizada em `score_rules`; lista reflete a mudança | — |
| Excluir regra | regra na lista → clique Excluir → confirmar | Linha removida de `score_rules`; lista atualiza | Confirmação antes de deletar |
| Excluir score ativo | default_score_rule_id aponta para regra excluída | `user_preferences.default_score_rule_id` vira NULL via ON DELETE SET NULL | — |
| Sem regras cadastradas | `score_rules` vazia para o usuário | Mensagem "Nenhuma regra cadastrada" + botão "Criar primeira regra" | — |
| Selecionar score ativo | usuário clica em "Usar este score" em uma regra | Upsert em `user_preferences.default_score_rule_id` | Erro de rede: toast de erro |
| Erro de rede no fetch | Supabase retorna erro | Mensagem inline com botão de retry | retry via `refetch()` |

</frozen-after-approval>

## Code Map

- `supabase/migrations/011_create_score_rules.sql` — **criar**: tabelas `score_rules` e `user_preferences` com ENUMs, CHECK constraints, índices e RLS
- `src/routes.tsx:17` — placeholder `ScorePage` inline — substituir por import de `src/modules/score/components/ScorePage`
- `src/shared/components/Modal.tsx` — componente reutilizável; aceita `isOpen`, `title`, `onClose`, `children`, `dismissible` — usar para o modal do builder
- `src/shared/services/supabaseClient.ts` — singleton `supabase` — importar nos services do módulo score
- `src/modules/portfolio/services/positionService.ts` — padrão canônico de service: objeto nomeado, métodos async, cast `as unknown as T[]`, sem export default
- `src/modules/dividends/hooks/useDividends.ts` — padrão canônico de hook: `queryKey` exportada como função, `enabled: Boolean(userId)`, `staleTime: 5 * 60 * 1000`
- `src/modules/portfolio/components/AddPositionForm.tsx` — padrão canônico de formulário: `useForm<Schema>({ resolver: zodResolver(schema) })`, schema Zod separado, `onSuccess`/`onCancel` como callbacks
- `src/shared/components/Layout.tsx:4` — menu lateral já contém `{ path: '/score', label: 'Score' }` — nenhuma alteração necessária
- `src/modules/score/types.ts` — **criar**: `ScoreMetric`, `ScoreOperator`, `ScoreRule`, `NewScoreRule`, `UpdateScoreRule`, `UserPreferences`
- `src/modules/score/services/scoreService.ts` — **criar**: `scoreService` com `listRules(userId)`, `createRule(userId, payload)`, `updateRule(id, userId, payload)`, `deleteRule(id, userId)`, `getPreferences(userId)`, `upsertPreferences(userId, prefs)`
- `src/modules/score/hooks/useScoreRules.ts` — **criar**: `scoreRulesQueryKey(userId)`, `useScoreRules()`, `useCreateScoreRule()`, `useUpdateScoreRule()`, `useDeleteScoreRule()`
- `src/modules/score/hooks/useScorePreferences.ts` — **criar**: `scorePreferencesQueryKey(userId)`, `useScorePreferences()`, `useUpsertScorePreferences()`
- `src/modules/score/components/ScoreRuleForm.tsx` — **criar**: formulário React Hook Form + Zod; campos: name (text), metric (select), operator (select), threshold_min (number), threshold_max (number, condicional para between), points (number inteiro); `onSuccess`/`onCancel` callbacks
- `src/modules/score/components/ScoreRuleList.tsx` — **criar**: lista de regras com colunas nome, métrica, operador, limiares, pontos, ações (editar/excluir); botão "Usar este score" por linha; "ativo" badge quando `default_score_rule_id` aponta para aquela regra
- `src/modules/score/components/ScorePage.tsx` — **criar**: orquestra `useScoreRules`, `useScorePreferences`, estado do modal, botão "Nova Regra"; estados loading/erro/vazio
- `src/modules/score/utils/scoreValidation.ts` — **criar**: schema Zod `scoreRuleSchema` reutilizado no form e exportado para testes

## Tasks & Acceptance

**Execução:**
- [x] `supabase/migrations/011_create_score_rules.sql` — criar ENUMs `score_metric` e `score_operator`, tabelas `score_rules` e `user_preferences` com CHECK constraints, índices e RLS completo (policy ALL para authenticated com `user_id = auth.uid()`) — base de dados da story
- [x] `src/modules/score/types.ts` — definir `ScoreMetric`, `ScoreOperator`, `ScoreRule` (linha do banco), `NewScoreRule` (omit id/user_id/created_at), `UpdateScoreRule` (Partial<NewScoreRule>), `UserPreferences` — contrato de tipos do módulo
- [x] `src/modules/score/utils/scoreValidation.ts` — schema Zod `scoreRuleSchema` com validação de `between` (threshold_max obrigatório se operator = between), `points` inteiro — lógica de validação isolada e testável
- [x] `src/modules/score/services/scoreService.ts` — `listRules`, `createRule`, `updateRule`, `deleteRule`, `getPreferences`, `upsertPreferences`; tipagem manual, cast `as unknown as T[]`; sem RLS client-side (banco garante) — encapsular acesso ao Supabase
- [x] `src/modules/score/hooks/useScoreRules.ts` — `scoreRulesQueryKey(userId)`, `useScoreRules()`, `useCreateScoreRule()`, `useUpdateScoreRule()`, `useDeleteScoreRule()`; invalidar `scoreRulesQueryKey` após mutações; `staleTime: 5 * 60 * 1000` — hooks de dado do módulo
- [x] `src/modules/score/hooks/useScorePreferences.ts` — `scorePreferencesQueryKey(userId)`, `useScorePreferences()`, `useUpsertScorePreferences()`; invalidar após upsert — gerenciar score ativo
- [x] `src/modules/score/components/ScoreRuleForm.tsx` — React Hook Form + Zod (`scoreRuleSchema`); campo `threshold_max` aparece/oculta condicionalmente conforme `operator === 'between'`; callbacks `onSuccess`/`onCancel`/`onBusyChange` — formulário de criação/edição
- [x] `src/modules/score/components/ScoreRuleList.tsx` — lista de regras; badge "ativo" na regra com `id === default_score_rule_id`; botões Editar (abre modal com dados pré-populados), Excluir (confirmação inline) e "Usar este score" — exibição e ações
- [x] `src/modules/score/components/ScorePage.tsx` — orquestra hooks, modal (`isOpen`, `editingRule`), botão "Nova Regra"; estados: loading (skeleton/texto), erro (inline + retry), vazio ("Nenhuma regra" + CTA) — página principal
- [x] `src/modules/score/utils/scoreValidation.test.ts` — cobrir: between sem threshold_max, points não inteiro, operator não-between com threshold_max ignorado, todos os valores de metric e operator válidos — provar a lógica de validação
- [x] `src/routes.tsx` — substituir placeholder inline `ScorePage` por `import { ScorePage } from './modules/score/components/ScorePage'` — conectar rota real

**Acceptance Criteria:**
- Given usuário autenticado na tela `/score`, when cria uma regra com campos válidos, then a regra aparece na lista sem reload de página e o banco contém a linha em `score_rules` com o `user_id` da sessão.
- Given operador `between`, when `threshold_max` está vazio ao submeter, then o formulário exibe erro de validação e não envia requisição ao banco.
- Given campo `points` preenchido com valor decimal (ex: 1.5), when submeter, then formulário exibe "Pontos devem ser número inteiro" e não salva.
- Given regra existente, when usuário clica Editar, then o formulário abre pré-populado com os dados da regra; ao salvar, a lista reflete os novos valores.
- Given regra existente, when usuário clica Excluir e confirma, then a regra é removida da lista e do banco.
- Given regra excluída era o `default_score_rule_id`, when a exclusão ocorre, then `user_preferences.default_score_rule_id` se torna NULL (via ON DELETE SET NULL do banco).
- Given regra na lista, when usuário clica "Usar este score", then a regra recebe o badge "ativo" e `user_preferences.default_score_rule_id` é atualizado.
- Given usuário sem regras cadastradas, when acessa `/score`, then mensagem clara e CTA de criação são exibidos.
- Given RLS ativo em `score_rules`, when usuário A tentar acessar regras do usuário B diretamente, then o banco retorna vazio (RLS garante isolamento).

## Design Notes

**Agrupamento de regras por "score":**
O banco não tem tabela separada para "scores" — `name` é apenas um campo livre em `score_rules`. Múltiplas regras com o mesmo nome compõem logicamente um score. `user_preferences.default_score_rule_id` aponta para o ID de uma regra (a "representante" do score ativo), e a Story 5.2 buscará todas as regras com o mesmo `name` para calcular o total. Esse design evita uma tabela extra no MVP; se for necessário mudar, o campo `Ask First` cobre isso.

**Condicionalidade do threshold_max:**
```tsx
// ScoreRuleForm.tsx — exibir threshold_max apenas quando operator = 'between'
const operator = watch('operator')
// ...
{operator === 'between' && (
  <input {...register('threshold_max')} type="number" step="any" />
)}
```

**Schema Zod com superRefine:**
```ts
// scoreValidation.ts
const scoreRuleSchema = z.object({
  name: z.string().min(1),
  metric: z.enum(['pl','pvp','roe','dy','debt_equity','net_margin']),
  operator: z.enum(['lt','lte','gt','gte','between']),
  threshold_min: z.number(),
  threshold_max: z.number().optional().nullable(),
  points: z.number().int('Pontos devem ser número inteiro'),
}).superRefine((data, ctx) => {
  if (data.operator === 'between' && (data.threshold_max == null)) {
    ctx.addIssue({ code: 'custom', path: ['threshold_max'], message: 'Obrigatório para operador "entre"' })
  }
})
```

## Verification

**Commands:**
- `pnpm -C "c:\Users\Samuel Leite\wkspaces\Valora" build` -- expected: compila sem erros de TypeScript
- `pnpm -C "c:\Users\Samuel Leite\wkspaces\Valora" lint` -- expected: sem erros nos arquivos novos e em `routes.tsx`
- `pnpm -C "c:\Users\Samuel Leite\wkspaces\Valora" test --run` -- expected: testes de `scoreValidation.test.ts` passam

**Manual checks:**
- Acessar `/score` logado: lista vazia com CTA de criação
- Criar regra com operator=between sem threshold_max: erro de validação aparece
- Criar regra válida: aparece na lista
- Editar regra: modal abre pré-populado; após salvar, lista reflete mudança
- Excluir regra: desaparece da lista
- Clicar "Usar este score": badge "ativo" aparece na regra

## Suggested Review Order

**Schema e contrato de banco**

- Migration: ENUMs, tabelas, CHECK constraints (between + ordem de limiares), RLS e GRANTs.
  [`011_create_score_rules.sql:1`](../../supabase/migrations/011_create_score_rules.sql#L1)

**Contrato de tipos e validação**

- Tipos do módulo: ScoreRule, NewScoreRule, UserPreferences, METRIC_LABELS, OPERATOR_LABELS.
  [`types.ts:1`](../../src/modules/score/types.ts#L1)

- Schema Zod: superRefine para between/threshold_max e points.int(); ponto-chave de validação.
  [`scoreValidation.ts:1`](../../src/modules/score/utils/scoreValidation.ts#L1)

**Acesso a dados**

- Service: listRules, createRule, updateRule, deleteRule, getPreferences, upsertPreferences.
  [`scoreService.ts:1`](../../src/modules/score/services/scoreService.ts#L1)

- Hooks de regras: queryKey, staleTime, invalidação cruzada regras+preferências no delete.
  [`useScoreRules.ts:1`](../../src/modules/score/hooks/useScoreRules.ts#L1)

- Hook de preferências: scorePreferencesQueryKey, upsert do score ativo.
  [`useScorePreferences.ts:1`](../../src/modules/score/hooks/useScorePreferences.ts#L1)

**Componentes de UI**

- Página principal: orquestra hooks, modal, estados loading/erro/vazio.
  [`ScorePage.tsx:1`](../../src/modules/score/components/ScorePage.tsx#L1)

- Formulário: RHF + Zod, threshold_max condicional, onBusyChange para modal dismissível.
  [`ScoreRuleForm.tsx:1`](../../src/modules/score/components/ScoreRuleForm.tsx#L1)

- Lista: tabela com badge ativo, confirmação inline de exclusão, "Usar este score".
  [`ScoreRuleList.tsx:1`](../../src/modules/score/components/ScoreRuleList.tsx#L1)

**Rota**

- Substituição do placeholder inline pelo import real do módulo score.
  [`routes.tsx:15`](../../src/routes.tsx#L15)

**Testes**

- 23 casos: happy paths, between (null/undefined/max≤min), points decimal, nome vazio, enums inválidos.
  [`scoreValidation.test.ts:1`](../../src/modules/score/utils/scoreValidation.test.ts#L1)
