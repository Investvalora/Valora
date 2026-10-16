# Implementation Report — Nova regra de score

## Arquivos criados/modificados

| Arquivo | Status |
|---|---|
| `src/modules/score/components/ScorePreviewPanel.tsx` | Criado |
| `src/modules/score/components/ScoreRulePage.tsx` | Criado |
| `src/routes.tsx` | Modificado (lazy import + rotas `analise/score/nova` e `analise/score/:id/editar`) |
| `src/modules/analise/components/AnaliseScore.tsx` | Modificado (modal removido, navigate adicionado) |

## Resultado do build

```
pnpm run build → Exit Code: 0
✓ 2945 modules transformed.
✓ built in 8.98s
0 erros de TypeScript
0 erros de build
```

Artefatos gerados incluem `ScoreRulePage-BKTEFyER.js` (12.05 kB gzip 3.80 kB) e `AnaliseScore-CyrLUp5i.js` (5.22 kB gzip 1.93 kB).

## Resultado dos testes

```
Test Files  36 passed (36)
     Tests  531 passed (531)
  Duration  24.38s
Exit Code: 0
```

## Detalhes de implementação

### ScorePreviewPanel.tsx
- Busca carteira ativa via `useWallets()`, posições via `usePositions(walletId)`, fundamentals via `useFundamentals(tickers)`.
- Constrói `ScoreRule` temporária com os props recebidos e avalia cada posição via `evaluateRule()`.
- Exibe: card da regra com nome, condição formatada e badge de pontos; lista de ativos com status 'Atende / Não atende'; box de impacto no score mostrando antes → depois.
- Estado de loading com skeleton, estado vazio informativo, regra incompleta com mensagem indicativa.

### ScoreRulePage.tsx
- Página dedicada (não modal) nas rotas `/analise/score/nova` e `/analise/score/:id/editar`.
- Toggle `'existing' | 'new'` para escolher score existente (select) ou criar novo (input texto).
- `react-hook-form` + `zodResolver(scoreRuleSchema)` com `watch()` para preview em tempo real.
- `onSubmit` → `navigate('/analise/score')` após sucesso.
- "Criar e adicionar outra" → salva e reseta o formulário.
- "Cancelar" → `navigate('/analise/score')`.
- Modo edição: `reset()` ao carregar a regra existente; estados de loading/not-found tratados.

### routes.tsx
- Lazy import de `ScoreRulePage` adicionado junto aos imports de Análise.
- Rotas `analise/score/nova` e `analise/score/:id/editar` adicionadas como irmãs de `analise`, dentro de `<Route path="/" element={<AppShellNovo />}>`, para não herdar o layout de tabs da `AnalisePage`.

### AnaliseScore.tsx
- Removidos: `useState` para modal, `isModalOpen`/`editingRule`/`modalBusy`, funções `openNewRule`/`openEditRule`/`closeModal`, bloco JSX `<Modal>`, imports `Modal` e `ScoreRuleForm`.
- Adicionado: `useNavigate`, navegação direta para `/analise/score/nova` e `/analise/score/${rule.id}/editar`.
