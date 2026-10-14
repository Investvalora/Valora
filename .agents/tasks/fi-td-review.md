# Renda Fixa and Tesouro Direto forms in AddTransactionModal

This change adds a "Tipo de ativo" selector and two conditional forms to the add-transaction modal so fixed-income (Renda Fixa) and government-bond (Tesouro Direto) positions can be recorded without a ticker. The selector appears only when the modal opens with an empty ticker; when a ticker is pre-filled the existing variable-income form renders exactly as before. Renda Fixa submits through `useAddFixedIncomePosition` with the indexador derived read-only from the selected title type, and Tesouro Direto maps its `_juros` variants down to the base bond types. Both new paths fire `useCalcFixedIncome` after a successful insert.

Watch for: Tesouro Direto positions are stored with `rate: 0` and `maturity_date: null`, discarding the coupon and maturity; the `forma` and `liquidez_diaria` fields in the Renda Fixa form are collected but never sent to the backend; the `_juros` variants collapse into indistinguishable base rows; the new forms have no test coverage.

**Verdict**: NEEDS_CHANGES

## High-level view

The selector is a pure UI discriminator — `FormCategory = AssetType | 'tesouro_direto'` — that decides which of three form branches renders. The variable-income branch is unchanged for the pre-filled-ticker path; the only new behavior there is a read-only "Tipo de ativo" box that now reflects the chosen category when the ticker is empty. The two new branches own their own `useForm` instances and validation schemas, so they don't interfere with the existing equity form's state.

Submission is split across two mutation hooks held at the top of the main component: `useAddTransaction` for equities and `useAddFixedIncomePosition` for both new forms. `isSaving` ORs both pending flags so the modal stays locked and non-dismissible during either save. After an FI insert succeeds, `useCalcFixedIncome` is fired to refresh current values, then the modal closes.

The Renda Fixa payload maps the UI fields onto `NewFixedIncomePosition` with the indexador derived from the title type via `FIXED_INCOME_TYPE_INDEXER`. The Tesouro Direto payload is more lossy: it hardcodes `rate: 0` and `maturity_date: null`, and collapses the `tesouro_ipca_juros` / `tesouro_pre_juros` selections onto `tesouro_ipca` / `tesouro_pre`, so the "com Juros Semestrais" distinction disappears in storage.

<details>
<summary>Issues (7)</summary>

1. **Renda Fixa fields collected but not persisted** — `forma` and `liquidez_diaria` are in the schema and the UI but absent from the submit payload, and `fixed_income_positions` has no columns for them, so they're silently dropped. Remove them from the form or extend the type/payload and table to persist them.
2. **Tesouro Direto stores rate 0 and no maturity** — the TD payload hardcodes `rate: 0` and `maturity_date: null`; `rate` is carried on `FixedIncomeRow`, so TD rows show 0% with no maturity. Add rate and maturity inputs, or confirm `calc-fixed-income` reconstructs them from market data and that the table tolerates a 0/null display.
3. **Tesouro Direto `_juros` variants become indistinguishable** — `tesouro_ipca_juros` and `tesouro_pre_juros` map to the same `type` and `name` as their base titles, so two different bonds store identical rows. Carry the variant in `name` (e.g. "...com Juros Semestrais") or add a distinguishing column.
4. **Renda Fixa allows a zero-principal position** — `valor` is optional and `principal: values.valor ?? 0`; the calc guards division-by-zero, but the saved row is a 0-value position with no return. Make `valor` required for a meaningful fixed-income record.
5. **No tests for the new forms** — the category switching, both payload shapes, the TD type map, indexador derivation, validation errors, and the `isSaving` lock have no coverage; the 519 passing tests are the pre-existing suite. Add component tests for the new paths.
6. **Taxa label ignores per-indexador semantics** — the Renda Fixa "Taxa" label is static ("Taxa" + "%") though a rate means different things per indexador (% do CDI, % a.a., spread IPCA); the module already defines `FIXED_INCOME_RATE_LABEL` for this and doesn't use it. Drive the label from the selected indexador.
7. **Variable-income selector options hit a no-ticker dead end** — in the empty-ticker path the selector offers Ações BR, FIIs, etc., which render the equity form that has no ticker input and would submit `ticker: ''`. Hide the variable-income options in this selector or add a ticker entry to that branch.

</details>

<details>
<summary>Details</summary>

### Pre-filled ticker path

The selector is gated on `ticker === ''`, so it never appears for a pre-filled ticker and `showEquityForm` reduces to `ticker !== ''`. The one expression that moved is the read-only "Tipo de ativo" box, which now branches on `ticker !== ''` before falling back to `selectedCategory`; for a non-empty ticker it evaluates to `assetType ? ASSET_TYPE_LABELS[assetType] : '—'` — identical to the old expression (confirmed against the base commit).

### Category selector and the empty-ticker variable-income dead end

The selector lists every `AssetType` plus `tesouro_direto`. Selecting `fixed_income` or `tesouro_direto` swaps in the dedicated forms; selecting any variable-income category (Ações BR, FIIs, …) renders the equity form. That equity form has no ticker input — the Ativo box is read-only and displays the `ticker` prop, which is `''` here — so a variable-income selection presents a form whose submit would send `ticker: ''` to `addManualTransaction`. The empty-ticker equity submit itself pre-dates this change (the global "sem ticker pré-selecionado" modal in `LancamentosPage` already passed `ticker=""`), so the underlying failure isn't new; what's new is the selector offering those categories as a starting point with no way to capture a ticker. Likely worth hiding the variable-income options in the empty-ticker selector, or adding a ticker entry to that branch.

### Renda Fixa payload and the dropped fields

The Renda Fixa form validates `emissor`, `tipo_titulo`, `taxa`, `forma`, `valor`, `liquidez_diaria`, `transaction_date`, and `maturity_date`, then builds a `NewFixedIncomePosition` from only `emissor`, `tipo_titulo`, `taxa`, `valor`, `transaction_date`, and `maturity_date`. `forma` and `liquidez_diaria` never reach the payload, and `fixedIncomeService.addPosition` inserts exactly the `NewFixedIncomePosition` fields — there are no `forma` or `liquidez_diaria` columns to receive them. Confirmed: the user can toggle "Liquidez diária" and pick a "Forma" and neither is stored. `forma` is at least derivable from the title type's indexador (cdb_cdi → CDI → pós-fixado), so dropping it is redundant rather than lossy; `liquidez_diaria` is a genuine attribute that's lost entirely. Separately, `valor` is optional and `principal: values.valor ?? 0`, so a save with no value produces a 0-principal row — degenerate (the calc guards division-by-zero, so it shows 0 value and null return rather than crashing) but useless.

One gap on the same form: the Taxa label is static ("Taxa" + "%", placeholder "110"), but a rate means different things per indexador — "% do CDI" for CDI titles, "% a.a." for prefixados, a spread for IPCA. The module already defines `FIXED_INCOME_RATE_LABEL` for exactly this disambiguation and the form doesn't use it, so a user could enter 110 expecting 110% a.a. on a prefixado.

### Tesouro Direto payload loses rate, maturity, and variant identity

The Tesouro Direto form collects ativo, date, quantity, price, and outros_custos, then maps:

```
tesouro_selic      -> tesouro_selic
tesouro_ipca       -> tesouro_ipca
tesouro_pre        -> tesouro_pre
tesouro_ipca_juros -> tesouro_ipca   (name "Tesouro IPCA+")
tesouro_pre_juros  -> tesouro_pre    (name "Tesouro Prefixado")
```

The payload sets `rate: 0` and `maturity_date: null` unconditionally, and `name` comes from `FIXED_INCOME_TYPE_LABEL[dbType]`. Two consequences. First, the `_juros` variants collapse onto the same `type` and `name` as their base titles — a "Tesouro IPCA+ com Juros Semestrais" and a plain "Tesouro IPCA+" store identical rows, so a user holding both can't tell them apart and two distinct bonds become one. The commit calls the type mapping deliberate (the DB CHECK only allows the base types), and that constraint is fair; the name collision, though, follows from using the base label rather than the selected one, and it's fixable without touching the type — carry the variant in the `name` string. Second, `rate` is carried on `FixedIncomeRow` and `maturity_date` on the row, so every Tesouro Direto position will display 0% with no maturity regardless of the bond's coupon and term. For an instrument whose coupon and maturity define it, storing neither is a data-integrity gap; either capture them in the form or confirm `calc-fixed-income` reconstructs them from market data and that the table can tolerate a 0/null display.

### Test coverage

No test references `AddTransactionModal`, `RendaFixaForm`, `TesouroDiretoForm`, `useAddFixedIncomePosition`, or `useCalcFixedIncome`. The 519/519 reported by the commit is the pre-existing suite; nothing exercises the new selector, the conditional rendering, the Renda Fixa payload mapping, the Tesouro Direto `dbTypeMap`, the indexador derivation, validation error paths, or the `isSaving` lock. The clean build confirms types but not behavior. A test asserting the submitted payload shape would have caught the dropped `forma`/`liquidez_diaria` directly.

</details>

<details>
<summary>File map</summary>

`src/modules/portfolio/components/AddTransactionModal.tsx` — added the `FormCategory` selector, `rendaFixaSchema`/`tesouroDiretoSchema`, the `RendaFixaForm` and `TesouroDiretoForm` components, and conditional rendering in the main modal; wired `useAddFixedIncomePosition`/`useCalcFixedIncome` and combined `isSaving`. (714 insertions, 138 deletions; the only file in the commit.)

Full diff: `git show 018a1a0 -- src/modules/portfolio/components/AddTransactionModal.tsx`

</details>
