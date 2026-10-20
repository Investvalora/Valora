# Nova tela de criação/edição de regra de score

A implementação substitui o fluxo antigo de modal inline por duas páginas dedicadas: `ScoreRulePage` para criação e edição de regras, e `ScorePreviewPanel` como painel lateral de pré-visualização em tempo real. As rotas foram adicionadas como irmãs do grupo `analise` para não herdar as abas de navegação da `AnalisePage`, e o `AnaliseScore` foi refatorado para navegar ao invés de abrir modais. O build passa com 0 erros e 531 testes.

Watch for: **troca de modo no toggle não limpa o campo `name`** — digitar um nome em `'new'` e trocar para `'existing'` sem selecionar nada envia o nome digitado, criando silenciosamente um score novo no modo errado (confirmed). **`onSubmitAndAddAnother` não reseta o `scoreMode`** — após salvar e resetar, o toggle pode ficar dessincronizado do valor real no form (confirmed).

**Verdict**: NEEDS_CHANGES

---

## High-level view

O layout desktop/mobile está correto: `flex-col md:flex-row` no container, `ScorePreviewPanel` com `w-full md:w-auto` no wrapper mobile e `w-[420px] flex-shrink-0` no próprio painel.

O campo `name` é compartilhado entre os dois modos do toggle, mas cada modo usa uma estratégia diferente de controle — o `<select>` usa `setValue` manual, o `<input>` usa `register`. A troca de modo não limpa o campo, então o valor do modo anterior vaza para o submit.

O `ScorePreviewPanel` avalia cada posição corretamente via `evaluateRule()`, com guards `Number.isFinite()` que impedem que NaN de inputs vazios vaze para a lógica. As rotas estão corretamente posicionadas fora do group `analise`, com a rota estática `analise/score/nova` antes da dinâmica `analise/score/:id/editar`.

---

<details>
<summary>Issues (2)</summary>

1. **Troca de modo não limpa `name`** — Usuário digita um nome em modo `'new'`, troca para `'existing'` sem selecionar nada no select, e clica em submit. O `watchedName` ainda carrega o nome digitado, o schema Zod aceita, e a regra é criada com esse nome — funcionalmente criando um score novo pelo caminho errado. Chamar `setValue('name', '')` ao trocar o `scoreMode` corrige.

2. **`onSubmitAndAddAnother` não reseta `scoreMode`** — Após `reset({ operator: 'gte', metric: 'dy', name: '' })`, o estado `scoreMode` permanece como estava. Se o usuário estava em `'new'`, o toggle continua mostrando "Criar novo score" mas `name` está vazio — o input fica visível porém sem valor, o que é consistente. Se estava em `'existing'`, o select pode exibir a última seleção visualmente enquanto `watchedName` é `''`. Adicionar `setScoreMode('existing')` ao reset retorna ao estado inicial padrão e elimina a dessincronização.

</details>

<details>
<summary>Details</summary>

### Assimetria de controle no campo `name`

No modo `'existing'`, o select é controlado manualmente: `value={watchedName}` com `onChange={(e) => setValue('name', e.target.value, { shouldValidate: true })}`. No modo `'new'`, o input usa `register('name')` diretamente. Os dois modos competem pelo mesmo campo `name` no form, e a troca entre eles não dispara nenhum `setValue` para limpar o estado anterior.

Cenário: usuário digita `"Dividendos Conservador"` em modo `'new'`, percebe que o score já existe, troca para `'existing'`, mas não abre o select. O `watchedName` continua `"Dividendos Conservador"`. O submit cria a regra com esse nome — que por acaso já existe — mas a intenção do usuário era selecionar um score existente. O comportamento correto é limpar `name` ao trocar de modo:

```tsx
onClick={() => {
  setScoreMode('existing')
  setValue('name', '', { shouldValidate: false })
}}
```

### `onSubmitAndAddAnother` e o `scoreMode` desatualizado

```tsx
reset({ operator: 'gte', metric: 'dy', name: '' })
setGlobalError('')
// ← scoreMode não é resetado
```

O `scoreMode` é um estado React separado do react-hook-form. Após o reset, o form está em estado inicial mas o toggle pode estar em `'new'`. Se o próximo uso for para criar uma regra em um score existente, o usuário tem que manualmente trocar o toggle de volta — o que contradiz a UX de "adicionar outra" que assume que o contexto é reutilizado. Adicionar `setScoreMode('existing')` junto ao reset.

### Cobertura de testes

Nenhum teste unitário foi criado para `ScorePreviewPanel` ou `ScoreRulePage`. O `ScorePreviewPanel` tem lógica não trivial de avaliação — o mapa de fundamentals, a guarda `isRuleComplete`, e o cálculo "antes → depois" do impacto são todos testáveis com mocks de `useWallets`, `usePositions` e `useFundamentals`. Os novos componentes ficam sem cobertura de regressão.

</details>

---

<details>
<summary>File map</summary>

| Arquivo | O que mudou |
|---|---|
| `src/modules/score/components/ScorePreviewPanel.tsx` | Criado — painel de preview com avaliação de posições via `evaluateRule()` |
| `src/modules/score/components/ScoreRulePage.tsx` | Criado — página de criação/edição com react-hook-form + zod + toggle de modo |
| `src/routes.tsx` | Lazy import de `ScoreRulePage` + rotas irmãs do grupo `analise` |
| `src/modules/analise/components/AnaliseScore.tsx` | Modal e `ScoreRuleForm` removidos, substituídos por `navigate()` |

</details>
