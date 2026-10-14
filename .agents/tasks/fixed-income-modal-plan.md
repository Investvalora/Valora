# Implementation Plan — Renda Fixa & Tesouro Direto in AddTransactionModal

## Context

The task is entirely contained in one component file:
`src/modules/portfolio/components/AddTransactionModal.tsx`.

When `ticker === ''` the modal currently renders a read-only "Tipo de ativo" display
and a read-only ticker badge.  This flow is used from `LancamentosPage.tsx` and
`AtivosLancamentos.tsx`.  The existing form always submits through `useAddTransaction`
(equity/variable-income path).  The new work adds a conditional branch:
- when the user selects `fixed_income` → show the Renda Fixa fields and submit via
  `useAddFixedIncomePosition`
- when the user selects `tesouro_direto` (a new UI-only key) → show Tesouro Direto
  fields and also submit via `useAddFixedIncomePosition`
- all other types → existing variable-income form (no change)

Existing patterns to follow:
- `INPUT_CLASS`, `LABEL_CLASS`, `ERROR_CLASS` constants already defined in the file
- `useForm` + `zodResolver` + `z.object` for form validation (RHF + Zod)
- 2-column `grid grid-cols-2 gap-3` for field rows
- `useAddFixedIncomePosition` from `hooks/useFixedIncomePositions.ts` for submission
- `FIXED_INCOME_TYPE_INDEXER`, `FIXED_INCOME_TYPE_LABEL` from `../types`
- `useCalcFixedIncome` called after successful fixed-income save (see `AddFixedIncomeForm.tsx`)
- No new dependencies are needed

---

## Plan

- [ ] 1. Add `tesouro_direto` UI discriminator and extend `ASSET_TYPE_LABELS`

  The existing `AssetType` does not include a `tesouro_direto` key — Tesouro Direto is
  stored as specific `FixedIncomeType` values (`tesouro_selic`, `tesouro_ipca`,
  `tesouro_pre`).  The selector needs a UI-only category for it.  Introduce a local
  `FormCategory` union type:
  ```ts
  type FormCategory = AssetType | 'tesouro_direto'
  ```
  Extend `ASSET_TYPE_LABELS` (or add a separate `CATEGORY_LABELS` record) to include
  `'tesouro_direto': 'Tesouro Direto'`.

  Files: `src/modules/portfolio/components/AddTransactionModal.tsx`

  Verify: `pnpm run build` — 0 TS errors.

- [ ] 2. Convert the "Tipo de ativo" display into a `<select>` when `ticker === ''`

  Currently when `ticker === ''` the "Tipo de ativo" area is a read-only div showing
  `ASSET_TYPE_LABELS[assetType] ?? '—'`.  Change it so:
  - When `ticker !== ''`: keep the existing read-only display (no behaviour change).
  - When `ticker === ''`: render a `<select>` bound to a local `useState<FormCategory | ''>` 
    called `selectedCategory` (default `''`).  Options:
    ```
    <option value="">Selecione</option>
    <option value="stock_br">Ações BR</option>
    <option value="fii">FIIs</option>
    <option value="bdr">BDRs</option>
    <option value="stock_us">Stocks US</option>
    <option value="etf_us">ETFs</option>
    <option value="reit">REITs</option>
    <option value="crypto">Criptomoedas</option>
    <option value="fixed_income">Renda Fixa</option>
    <option value="tesouro_direto">Tesouro Direto</option>
    ```
  - The ticker/autocomplete field (the read-only ticker badge) should remain visible
    below the selector only when a variable-income category is selected (i.e., not
    `fixed_income` and not `tesouro_direto` and not `''`).
  - Reset `selectedCategory` to `''` whenever `isOpen` or `ticker` changes
    (add it to the existing `useEffect` that calls `reset()`).

  Files: `src/modules/portfolio/components/AddTransactionModal.tsx`

  Verify: `pnpm run build` — 0 TS errors.

- [ ] 3. Conditionally render the three form bodies

  Below the category selector, render content based on `selectedCategory` (when
  `ticker === ''`) or the existing layout (when `ticker !== ''`):

  **Variable-income path** (existing layout — `ticker !== ''` OR `selectedCategory`
  is a non-fixed-income type):
  - Show the existing "Ativo info (read-only)", date/quantity, price/fee, and total
    value rows exactly as today.  No change.

  **Renda Fixa path** (`selectedCategory === 'fixed_income'`):
  - Show a new `<RendaFixaFields>` inline section (or inline JSX) with its own
    `useForm` instance using the Zod schema described in item 4.
  - Hide the buy/sell tab strip (Renda Fixa is always a "compra"/"aplicação").

  **Tesouro Direto path** (`selectedCategory === 'tesouro_direto'`):
  - Show a new `<TesouroDiretoFields>` inline section with its own `useForm` instance
    using the Zod schema described in item 5.
  - Hide the buy/sell tab strip.

  Files: `src/modules/portfolio/components/AddTransactionModal.tsx`

  Verify: `pnpm run build` — 0 TS errors.

- [ ] 4. Implement the Renda Fixa form schema + fields + submission

  Add inside `AddTransactionModal.tsx` (keep everything in one file to match the
  existing pattern):

  **Zod schema `rendaFixaSchema`:**
  ```ts
  const rendaFixaSchema = z.object({
    emissor:          z.string().min(1, 'Informe o emissor'),
    tipo_titulo:      z.enum(['cdb_cdi','cdb_pre','lci_cdi','lca_cdi','lci_pre','lca_pre'],
                       { required_error: 'Selecione o tipo' }),
    indexador:        z.enum(['CDI','IPCA','Prefixado','SELIC'],
                       { required_error: 'Selecione o indexador' }),
    taxa:             z.number({ invalid_type_error: 'Informe um número' })
                       .min(0, 'Deve ser ≥ 0'),
    forma:            z.enum(['pos_fixado','pre_fixado','hibrido']).optional(),
    valor:            z.number({ invalid_type_error: 'Informe um número' })
                       .positive('Deve ser maior que zero').optional(),
    liquidez_diaria:  z.boolean().optional().default(false),
    transaction_date: z.string().min(1, 'Data obrigatória'),
    maturity_date:    z.string().optional(),
  })
  ```

  **Fields (2-column grid layout matching the rest of the form):**
  Row 1: Emissor (text) | Tipo de título (select: CDB CDI, CDB Pré, LCI CDI, LCA CDI, LCI Pré, LCA Pré)  
  Row 2: Indexador (select: CDI, IPCA, Prefixado, SELIC) | Taxa (number with `%` badge on the right)  
  Row 3: Forma (select, optional: Pós-fixado, Prefixado, Híbrido) | Valor (R$ number, optional)  
  Row 4: Data da transação (date) | Data de vencimento (date, optional)  
  Row 5: Liquidez diária checkbox (full width, `accent-nf-blue` class on input)

  Note: `valor` maps to `principal` in `NewFixedIncomePosition`.  The indexador
  field is UI-only; the actual `FixedIncomeIndexer` is derived from `tipo_titulo`
  using `FIXED_INCOME_TYPE_INDEXER[tipo_titulo]` exactly as `AddFixedIncomeForm` does.

  **Submission:**
  Call `useAddFixedIncomePosition()` and `useCalcFixedIncome()` (both at the top of
  the component alongside the existing `useAddTransaction`).  On submit:
  ```ts
  const payload: NewFixedIncomePosition = {
    name: values.emissor,
    type: values.tipo_titulo as FixedIncomeType,
    indexer: FIXED_INCOME_TYPE_INDEXER[values.tipo_titulo as FixedIncomeType],
    rate: values.taxa,
    principal: values.valor ?? 0,
    application_date: values.transaction_date,
    maturity_date: values.maturity_date ?? null,
  }
  addFixedIncomePosition.mutate(payload, { onSuccess: () => { calcValues(); onClose() } })
  ```

  Files: `src/modules/portfolio/components/AddTransactionModal.tsx`

  Verify: `pnpm run build` — 0 TS errors.

- [ ] 5. Implement the Tesouro Direto form schema + fields + submission

  **Zod schema `tesouroDiretoSchema`:**
  ```ts
  const tesouroDiretoSchema = z.object({
    ativo:            z.enum(['tesouro_selic','tesouro_ipca','tesouro_pre',
                              'tesouro_ipca_juros','tesouro_pre_juros'],
                       { required_error: 'Selecione o ativo' }),
    transaction_date: z.string().min(1, 'Data obrigatória'),
    quantity:         z.number({ invalid_type_error: 'Informe um número' })
                       .min(0.01, 'Mínimo 0,01'),
    price:            z.number({ invalid_type_error: 'Informe um número' })
                       .min(0, 'Deve ser ≥ 0'),
    outros_custos:    z.number({ invalid_type_error: 'Informe um número' })
                       .min(0).optional().default(0),
  })
  ```

  Note: `tesouro_ipca_juros` and `tesouro_pre_juros` are display-only labels for
  "Tesouro IPCA+ com Juros Semestrais" and "Tesouro Prefixado com Juros Semestrais".
  They both map to `tesouro_ipca` and `tesouro_pre` respectively in the DB, since the
  `FixedIncomeType` enum doesn't have separate entries for the semi-annual variants.
  Mapping at submission time:
  ```ts
  const dbType: FixedIncomeType = {
    tesouro_selic:     'tesouro_selic',
    tesouro_ipca:      'tesouro_ipca',
    tesouro_pre:       'tesouro_pre',
    tesouro_ipca_juros:'tesouro_ipca',
    tesouro_pre_juros: 'tesouro_pre',
  }[values.ativo]
  ```

  **Fields (2-column grid layout):**
  Row 1: Ativo (select, full-width): Tesouro Selic, Tesouro IPCA+, Tesouro Prefixado, Tesouro IPCA+ com Juros Semestrais, Tesouro Prefixado com Juros Semestrais  
  Row 2: Data da transação (date) | Quantidade (number, min 0.01, step 0.01)  
  Row 3: Preço R$ (number) | Outros custos R$ (number, optional)  
  Row 4: Valor total (calculated = quantity × price + outros_custos, read-only display — same style as the existing "Valor total" row in the equity form)

  **Submission:**
  The `principal` to store = `quantity × price` (the cost basis); `outros_custos` is
  informational and can be added to `principal` or stored separately — use
  `quantity * price + (outros_custos ?? 0)` as `principal`.  Rate defaults to 0 since
  Tesouro rates change daily and will be updated by the calc edge function.
  ```ts
  const payload: NewFixedIncomePosition = {
    name: FIXED_INCOME_TYPE_LABEL[dbType],
    type: dbType,
    indexer: FIXED_INCOME_TYPE_INDEXER[dbType],
    rate: 0,
    principal: values.quantity * values.price + (values.outros_custos ?? 0),
    application_date: values.transaction_date,
    maturity_date: null,
  }
  addFixedIncomePosition.mutate(payload, { onSuccess: () => { calcValues(); onClose() } })
  ```

  Files: `src/modules/portfolio/components/AddTransactionModal.tsx`

  Verify: `pnpm run build` — 0 TS errors.

- [ ] 6. Verify no regressions in existing variable-income path

  The equity form (when `ticker !== ''` or when a variable-income category is
  selected) must behave exactly as before.  Specifically:
  - `useAddTransaction` is the only hook called on submit
  - The buy/sell tab, date, quantity, price, fee and total are all present
  - The read-only "Tipo de ativo" display still works when `ticker !== ''`

  Files: none (read-only verification step)

  Verify:
  1. `pnpm run build` — 0 TypeScript errors, build completes successfully.
  2. `pnpm run test:run` — all 519 tests pass (no regressions; no AddTransactionModal
     tests exist today, so this confirms nothing broke in dependent modules).

---

## Design decisions

- **Single file, not a new component**: The task spec calls out `AddTransactionModal.tsx`
  as the main file to modify.  Splitting into `RendaFixaFields.tsx` and
  `TesouroDiretoFields.tsx` would be cleaner but is unnecessary complexity for this
  scope.  The precedent of keeping the entire form logic in one file exists in
  `AddFixedIncomeForm.tsx` (180 lines, all in one component).

- **Two separate `useForm` instances**: Renda Fixa and Tesouro Direto have incompatible
  schemas.  The cleanest approach is to have each rendered conditionally inside its
  own `<form>` block (replacing the existing `<form>`).  The three forms (equity,
  Renda Fixa, Tesouro Direto) are mutually exclusive.

- **No new types in `types.ts`**: `FormCategory` and the `tesouroDiretoSchema` `ativo`
  enum (with `tesouro_ipca_juros` / `tesouro_pre_juros`) are UI-only and live in the
  component file.  The canonical `FixedIncomeType` in `types.ts` is not changed —
  the Tesouro variants with juros semestrais are mapped down to the two existing DB
  values at submission time.

- **Hook calls at component level**: Both `useAddFixedIncomePosition()` and
  `useCalcFixedIncome()` are called unconditionally at the top of
  `AddTransactionModal` (next to the existing `useAddTransaction()`).  React rules
  prohibit conditional hook calls.

- **`isSaving` state**: The modal's disabled/loading state should check all three
  mutations: `addTransaction.isPending || addFixedIncomePosition.isPending`.
