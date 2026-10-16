# Implementation Report — Nova regra de score

## Arquivos criados / modificados

| Arquivo | Ação |
|---|---|
| `src/modules/score/components/ScorePreviewPanel.tsx` | Criado |
| `src/modules/score/components/ScoreRulePage.tsx` | Criado |
| `src/routes.tsx` | Modificado (lazy import + 2 novas rotas) |
| `src/modules/analise/components/AnaliseScore.tsx` | Modificado (modal → navigate) |

### `ScorePreviewPanel.tsx`
Painel de pré-visualização em tempo real com:
- Busca carteira ativa via `useWallets()`, posições via `usePositions(walletId)`, fundamentals via `useFundamentals(tickers)`.
- Card da regra com nome do score, condição formatada e badge de pontos.
- Lista de ativos da carteira com ícone circular verde/cinza, ticker, valor da métrica e status "Atende · +N" ou "Não atende · 0".
- Box de impacto no score: antes (X regras · Y pontos) → depois (X+1 regras · Y+Z pontos).
- Estados de loading (skeleton), carteira vazia e regra incompleta tratados.

### `ScoreRulePage.tsx`
Página dedicada de criação e edição com:
- `useParams()` para detectar modo criação vs. edição.
- `react-hook-form` + `zodResolver(scoreRuleSchema)` para validação.
- Toggle pill "Score existente" / "Criar novo score" para seleção do score.
- Campos: métrica, operador, threshold_min, threshold_max (só para `between`), pontos.
- Botões: "Criar regra" / "Salvar alterações", "Criar e adicionar outra" (só criação), "Cancelar".
- Breadcrumb clicável `← Análise › Score Fundamentalista`.
- `ScorePreviewPanel` ao lado do form (desktop) / abaixo (mobile).
- Acessibilidade: `htmlFor`/`id` nos labels/inputs, `aria-invalid`, `aria-busy`, `role="alert"`.

### `routes.tsx`
- Lazy import de `ScoreRulePage` já presente.
- Rotas `analise/score/nova` e `analise/score/:id/editar` adicionadas como irmãs do grupo `analise` dentro de `<Route path="/" element={<AppShellNovo />}>`.

### `AnaliseScore.tsx`
- `useNavigate` adicionado, estados/funções de modal removidos.
- Botão "+ Nova regra" navega para `/analise/score/nova`.
- Botão de editar regra navega para `/analise/score/${rule.id}/editar`.
- Botão "Criar primeira regra →" navega para `/analise/score/nova`.
- Bloco JSX de `<Modal>` e imports de `Modal`/`ScoreRuleForm`/`useState` removidos.

## Resultado do build

```
pnpm run build  →  Exit Code: 0
✓ 2945 modules transformed.
✓ built in 8.21s
PWA: 26 arquivos em cache
```

Zero erros de TypeScript. Zero erros de build.

## Resultado dos testes

```
pnpm run test:run  →  Exit Code: 0
Test Files  36 passed (36)
     Tests  531 passed (531)
```

Todos os 531 testes passaram sem falhas.
