# Implementation Plan — Nova regra de score

## Contexto relevante descoberto na exploração

- `routes.tsx`: todas as rotas ficam dentro de `<Route path="/" element={<AppShellNovo />}>`. As sub-rotas de `analise` ficam dentro de `<Route path="analise" element={<AnalisePage />}>` — portanto as novas rotas de criação/edição devem ser **irmãs** desse grupo, não filhas, para não herdar o layout de tabs da AnalisePage.
- `AppShellNovo.tsx`: renderiza um `<main>` com `<Outlet />`. As novas páginas vão ocupar esse `Outlet` diretamente, sem tabs de navegação.
- `types.ts`: exporta `METRIC_LABELS`, `OPERATOR_LABELS`, `ScoreMetric`, `ScoreOperator`, `ScoreRule`.
- `scoreCalculation.ts`: `evaluateRule(rule, value)` avalia uma regra contra um número; `applyScoreRules` aplica várias de uma vez.
- `scoreValidation.ts`: `scoreRuleSchema` (zod) e `ScoreRuleFormValues` — reutilizar sem alteração.
- `useScoreRules.ts`: exporta `useScoreRules`, `useCreateScoreRule`, `useUpdateScoreRule`, `groupRulesByName`.
- `useFundamentals.ts`: `useFundamentals(tickers: string[])` — retorna `{ data: FundamentalsRow[] }`.
- `useWallets.ts`: `useWallets()` retorna `{ selectedWallet, wallets, ... }` — `selectedWallet.id` é a carteira ativa.
- `usePositions.ts`: `usePositions(walletId?)` retorna `{ data: PositionWithAsset[] }`.
- `PositionWithAsset`: extende `Position` com `asset: Asset | null`; `Position.ticker` é o campo relevante.
- `ScoreRuleForm.tsx`: componente antigo baseado em modal — será substituído pelo `ScoreRulePage.tsx` de página inteira; o arquivo em si será mantido pois é importado pelo `AnaliseScore.tsx` atual (que nesta tarefa vai deixar de usá-lo).
- `AnaliseScore.tsx`: usa `useState` + `Modal` + `ScoreRuleForm` para criar/editar — ambos serão removidos.
- Build: `pnpm run build` em `c:\Users\Samuel Leite\wkspaces\Valora`.

---

## Plano

- [ ] 1. Criar `ScorePreviewPanel.tsx`
      Criar o componente de pré-visualização que recebe os campos do formulário como props e mostra (a) o card da regra, (b) impacto em cada ativo da carteira ativa, (c) box de impacto no score.

      **Lógica interna:**
      - Chamar `useWallets()` para obter `selectedWallet`.
      - Chamar `usePositions(selectedWallet?.id)` para obter as posições; extrair tickers únicos via `positions.map(p => p.ticker)`.
      - Chamar `useFundamentals(tickers)` para obter fundamentals.
      - Quando `metric` e `operator` não forem `''` e `thresholdMin` for válido, montar um objeto `ScoreRule` temporário (com `id: ''`, `user_id: ''`, `created_at: ''`, `name: scoreName`, campos da prop) e passar para `evaluateRule(tempRule, metricValue)` por posição.
      - `formatCondition`: montar string legível usando `METRIC_LABELS[metric]` e símbolos do operador (`<`, `≤`, `>`, `≥`, `entre X e Y`).
      - Impacto: somar `existingRulesInScore.length` e `existingRulesInScore.reduce((s,r)=>s+r.points,0)` para o "antes"; "depois" adiciona +1 regra e +`points` pontos.
      - Estado de loading: mostrar skeleton quando `isLoading` de positions ou fundamentals for `true`.

      **Design — seguir exatamente as especificações do prompt:**
      - Container `bg-[#1B1B1B] border border-white/[0.08] rounded-[14px] p-6 w-[420px] flex-shrink-0`
      - Card da regra com `bg-[rgba(121,135,255,0.08)] border border-[rgba(121,135,255,0.5)] rounded-[12px] px-[18px] py-[16px]`
        - Nome do score: `text-[#B8C0FF] text-[12px]`
        - Condição: `text-white text-[22px] font-semibold`
        - Badge pontos: `bg-[rgba(51,170,59,0.18)] text-[#63D16B] px-3 py-1 rounded-[8px] text-[14px] font-semibold`
      - Label 'Como ficaria na sua carteira': `text-white/50 text-[12px]`
      - Lista de ativos: ícone circular verde `bg-[rgba(99,209,107,0.16)]` ou cinza `bg-white/[0.08]`, ticker + valor da métrica, badge 'Atende · +N' verde (`text-[#63D16B]`) ou 'Não atende · 0' cinza (`text-white/30`)
      - Separadores `border-t border-white/[0.07]` entre linhas
      - Box impacto: `bg-white/[0.04] border border-white/10 rounded-[12px] px-4 py-[14px]`
        - Label 'Impacto no score': `text-white/50 text-[12px]`
        - Texto: antes em `text-white/50`, seta `→` em `text-white/30`, depois em `text-white font-semibold`

      **Tratar casos especiais:**
      - Carteira vazia ou sem fundamentals: mostrar mensagem informativa suave ('Sem ativos na carteira ativa').
      - Regra incompleta (campos faltando): ocultar a lista de ativos e mostrar apenas o card da regra com os campos que já foram preenchidos.

      **Arquivo a criar:** `src/modules/score/components/ScorePreviewPanel.tsx`

      **Verificar:** `pnpm run build` sem erros de TypeScript.

---

- [ ] 2. Criar `ScoreRulePage.tsx`
      Criar a página completa de criação/edição de regra de score. Depende do item 1 (importa `ScorePreviewPanel`).

      **Estrutura e comportamento:**
      - `useParams<{ id?: string }>()` — `id` undefined = modo criação, string = modo edição.
      - Modo edição: buscar a regra existente com `useScoreRules()` filtrando por `id`. Se `id` presente mas regra não encontrada ainda (loading), mostrar spinner. Se regra não encontrada após carregado, mostrar mensagem de erro.
      - Toggle de "Em qual score esta regra entra?": `useState<'existing' | 'new'>('existing')` local.
        - `'existing'`: `<select>` populado com `Array.from(groupRulesByName(rules).keys())`. Quando o usuário escolhe um score, preenche `name` no form.
        - `'new'`: `<input type="text">` para digitar novo nome, ligado a `register('name')` diretamente.
      - Form com `useForm<ScoreRuleFormValues>({ resolver: zodResolver(scoreRuleSchema), defaultValues: { operator: 'gte', metric: 'dy' } })`.
      - Modo edição: `reset()` com os valores da regra assim que ela carregar (via `useEffect` na regra, seguindo o padrão de `ScoreRuleForm.tsx`).
      - `watch()` todos os campos: `name, metric, operator, threshold_min, threshold_max, points`.
      - `existingRulesInScore`: filtrar `rules` pelo `name` selecionado (excluindo a própria regra em edição por `rule.id !== id`).
      - `onSubmit`: payload com `threshold_max: null` quando operador não é `'between'`. Chamar `createRule.mutateAsync` ou `updateRule.mutateAsync`. Após sucesso, `navigate('/analise/score')`.
      - "Criar e adicionar outra": mesmo payload, após sucesso chama `reset()` e mantém na página.
      - "Cancelar": `navigate(-1)`.

      **Design — cabeçalho:**
      - Breadcrumb: `<button onClick={() => navigate('/analise/score')} className="flex items-center gap-1.5 text-[#8F8F8F] text-[13px]">← Análise › Score Fundamentalista</button>`
      - Título: `text-white text-[32px] font-bold` — 'Nova regra de score' ou 'Editar regra de score'
      - Subtítulo: `text-white/50 text-[14px]` — 'Defina as condições e pontuação para avaliar seus ativos.'

      **Design — painel esquerdo ('Dados da regra'):**
      - Container: `bg-[#1B1B1B] border border-white/[0.08] rounded-[14px] p-7`
      - Título 'Dados da regra': `text-white font-semibold text-[16px] mb-5`
      - Toggle pill "Em qual score esta regra entra?":
        - Label: `text-white/60 text-[12px] mb-2`
        - Container: `bg-[#393939] border border-[#7A7A7A]/50 rounded-[20px] p-[3px] flex`
        - Aba ativa: `bg-white/[0.16] rounded-[17px] flex-1 text-white text-[12px] font-medium py-[7px] text-center transition-colors`
        - Aba inativa: `flex-1 text-[#8F8F8F] text-[12px] py-[7px] text-center transition-colors`
      - Labels de campo: `text-white/60 text-[12px] mb-1.5 block`
      - Inputs/selects: `bg-[#585960] border border-[#7B7C83] rounded-[9px] h-[42px] px-3 text-white text-[14px] w-full focus:outline-none focus:ring-1 focus:ring-[rgba(121,135,255,0.5)]`
      - Linha métrica + operador: `grid grid-cols-2 gap-3`
      - Linha threshold_min + points: `grid grid-cols-2 gap-3`
      - Quando `operator === 'between'`: mostrar campo `threshold_max` em linha adicional com label 'Valor máximo'
      - Dica: `text-white/40 text-[12px] mt-2`
      - Erros de validação: `text-red-400 text-[11px] mt-1`
      - Divisor: `<hr className="border-none bg-white/[0.08] h-px w-full my-5" />`
      - Botão 'Criar regra' (ou 'Salvar alterações' no modo edição): `bg-[#2B6DB0] h-[46px] px-[18px] rounded-[8px] text-white font-semibold text-[15px] hover:bg-[#2460A0] transition-colors disabled:opacity-50`
      - Botão 'Criar e adicionar outra' (somente no modo criação): `border border-white/25 h-[46px] px-[18px] rounded-[8px] text-white font-medium text-[14px] hover:bg-white/[0.05] transition-colors disabled:opacity-50`
      - Botão 'Cancelar': `border border-white/25 h-[46px] px-[18px] rounded-[8px] text-white font-medium text-[15px] hover:bg-white/[0.05] transition-colors`
      - Botões em linha: `flex gap-3 flex-wrap`

      **Layout responsivo:**
      - Desktop: `<div className="flex gap-6 items-start">` — painel esquerdo `flex-1 min-w-0`, `ScorePreviewPanel` à direita `w-[420px] flex-shrink-0`
      - Mobile: `<div className="flex flex-col gap-6">` — `ScorePreviewPanel` abaixo do painel esquerdo (via `md:` breakpoint)

      **Acessibilidade:**
      - `htmlFor` em todos os `<label>` com `id` correspondente nos inputs.
      - `aria-invalid` nos campos com erro.
      - `role="alert"` nas mensagens de erro.
      - `disabled` e `aria-busy` nos botões durante submit.

      **Arquivo a criar:** `src/modules/score/components/ScoreRulePage.tsx`

      **Verificar:** `pnpm run build` sem erros de TypeScript.

---

- [ ] 3. Atualizar `routes.tsx`
      Adicionar lazy import de `ScoreRulePage` e duas novas rotas como irmãs do grupo `analise`, dentro de `<Route path="/" element={<AppShellNovo />}>`.

      **Mudanças exatas:**

      Adicionar junto aos outros lazy imports de Análise:
      ```tsx
      const ScoreRulePage = lazy(() =>
        import('./modules/score/components/ScoreRulePage').then((m) => ({ default: m.ScoreRulePage }))
      )
      ```

      Adicionar as rotas **dentro de** `<Route path="/" element={<AppShellNovo />}>` e **fora de** `<Route path="analise" element={<AnalisePage />}>`, como irmãs desse grupo:
      ```tsx
      <Route
        path="analise/score/nova"
        element={<Suspense fallback={<LoadingFallback />}><ScoreRulePage /></Suspense>}
      />
      <Route
        path="analise/score/:id/editar"
        element={<Suspense fallback={<LoadingFallback />}><ScoreRulePage /></Suspense>}
      />
      ```

      **Atenção:** a rota `analise/score/nova` deve ser declarada ANTES de `analise/score/:id/editar` para evitar conflito de params.

      **Arquivo a modificar:** `src/routes.tsx`

      **Verificar:** `pnpm run build` sem erros de TypeScript e TypeScript não reclamar de import.

---

- [ ] 4. Atualizar `AnaliseScore.tsx`
      Substituir a abertura de modal por navegação para as novas páginas; remover código de modal.

      **Mudanças exatas:**
      1. Adicionar `import { useNavigate } from 'react-router-dom'` no topo.
      2. Dentro do componente `AnaliseScore`, adicionar: `const navigate = useNavigate()`.
      3. Remover states relacionados ao modal: `isModalOpen`, `editingRule`, `modalBusy` e seus `useState`.
      4. Remover funções: `openNewRule`, `openEditRule`, `closeModal`.
      5. Substituir `onClick={openNewRule}` no botão `+ Nova regra` por `onClick={() => navigate('/analise/score/nova')}`.
      6. Substituir `onClick={() => onEdit(rule)}` em `ScoreGroupCard` por `onClick={() => navigate(\`/analise/score/${rule.id}/editar\`)}` — isso requer mudar a prop `onEdit` de `ScoreGroupCard` para receber a callback diretamente no `onEdit` já existente (não quebra a API do `ScoreGroupCard`, pois o valor passado muda mas a assinatura `(rule: ScoreRule) => void` é mantida).
      7. Substituir `onClick={openNewRule}` no botão "Criar primeira regra →" do estado vazio por `onClick={() => navigate('/analise/score/nova')}`.
      8. Remover o bloco JSX `<Modal ...><ScoreRuleForm .../></Modal>` no final do return.
      9. Remover imports não mais usados: `useState`, `Modal`, `ScoreRuleForm`. Manter `Pencil`, `Trash2`, `useScoreRules`, `useDeleteScoreRule`, `groupRulesByName`, `useScorePreferences`, `useUpsertScorePreferences`, `METRIC_LABELS`, `OPERATOR_LABELS`, `ScoreRule`.

      **Arquivo a modificar:** `src/modules/analise/components/AnaliseScore.tsx`

      **Verificar:** `pnpm run build` deve completar sem erros de TypeScript.

---

## Verificação final

Após concluir todos os 4 itens:

1. Rodar `pnpm run build` em `c:\Users\Samuel Leite\wkspaces\Valora`.
2. Confirmar 0 erros de TypeScript e 0 erros de build.
3. Corrigir quaisquer erros antes de reportar conclusão.
4. Reportar arquivos criados/modificados e resultado do build.

## Ordem de dependência

```
Item 1 (ScorePreviewPanel.tsx) ← sem dependência nova
Item 2 (ScoreRulePage.tsx)     ← depende do Item 1
Item 3 (routes.tsx)            ← depende do Item 2
Item 4 (AnaliseScore.tsx)      ← independente dos demais, pode ser feito em paralelo com item 1
```

Item 4 pode ser feito em qualquer momento porque não depende dos novos componentes.
Item 3 deve ser feito após o Item 2 estar criado (para o lazy import resolver).
