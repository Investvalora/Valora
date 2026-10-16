# Relatório de Implementação — Nova regra de score

## Arquivos criados/modificados

### Criados
- `src/modules/score/components/ScorePreviewPanel.tsx`
  - Painel de pré-visualização em tempo real
  - Busca carteira ativa via `useWallets()`, posições via `usePositions(walletId)`, fundamentals via `useFundamentals(tickers)`
  - Avalia cada ativo da carteira com `evaluateRule()` contra a regra temporária construída dos props
  - Exibe card da regra com nome, condição formatada e badge de pontos
  - Lista ativos com ícone circular verde/cinza, ticker, valor da métrica e status Atende/Não atende
  - Box de impacto no score mostrando antes → depois (N regras · Y pontos)
  - Trata loading com skeleton, carteira vazia e regra incompleta

- `src/modules/score/components/ScoreRulePage.tsx`
  - Página dedicada (rota `/analise/score/nova` e `/analise/score/:id/editar`)
  - `useParams()` para detectar modo criação vs. edição
  - Toggle pill "Score existente" / "Criar novo score" com `useState<'existing' | 'new'>`
  - `useForm` com `zodResolver(scoreRuleSchema)`
  - `watch()` de todos os campos passados para `ScorePreviewPanel` em tempo real
  - Botões: "Criar regra", "Criar e adicionar outra" (somente criação), "Cancelar"
  - Layout responsivo: `flex-row` no desktop com painel preview à direita, `flex-col` no mobile
  - Acessibilidade: `htmlFor`/`id`, `aria-invalid`, `role="alert"`, `disabled`/`aria-busy`

### Modificados (já estavam atualizados de etapas anteriores)
- `src/routes.tsx`
  - Lazy import `ScoreRulePage` já presente
  - Rotas `analise/score/nova` e `analise/score/:id/editar` já declaradas como irmãs do grupo `analise`

- `src/modules/analise/components/AnaliseScore.tsx`
  - Modal e states de modal já removidos
  - `navigate('/analise/score/nova')` e `navigate(\`/analise/score/${rule.id}/editar\`)` já presentes
  - Imports de `Modal` e `ScoreRuleForm` já removidos

## Resultado do build

```
pnpm run build
✓ 2945 modules transformed
✓ built in 8.19s
Exit Code: 0
```

Sem erros de TypeScript. Apenas aviso de chunk size (index.js > 500 kB) — pré-existente, fora do escopo desta tarefa.

## Resultado dos testes

```
pnpm run test:run
Test Files  36 passed (36)
     Tests  531 passed (531)
Exit Code: 0
```

Todos os 531 testes passaram sem nenhuma falha.
