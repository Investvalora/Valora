# Relatório de Investigação — Rotas de Navegação

**Data:** investigação do repositório em c:\Users\Samuel Leite\wkspaces\Valora

---

## Resposta Resumida

O usuário foi redirecionado para `/carteira` após o login porque o `LoginForm.tsx` tem um `navigate('/carteira')` hardcoded no callback `onSuccess`. A rota `/carteira` **não existe mais** em `routes.tsx` — o app foi migrado para o novo fluxo com rota `/inicio` como home pós-login. Além disso, o `manifest.webmanifest` também aponta `start_url` para `/carteira`, o que causa o mesmo problema em usuários que instalaram o app como PWA.

**O problema ocorre especificamente ao fazer login em outro navegador/dispositivo** porque nesse caso o navegador não tem histórico de sessão e o único destino possível é o que o `LoginForm` especifica explicitamente.

---

## Evidências

### 1. LoginForm — redirect hardcoded para rota inexistente

**Arquivo:** `src/modules/auth/components/LoginForm.tsx`, **linha 30**

```tsx
onSuccess: (data) => {
  setUser(data.user)
  setSession(data.session)
  navigate('/carteira')   // ← PROBLEMA PRINCIPAL: rota removida
},
```

A rota `/carteira` não está registrada em `src/routes.tsx`. O React Router não encontra nenhum `<Route path="carteira">`, portanto o usuário cai em uma tela em branco (sem match, sem 404 configurado).

### 2. routes.tsx — rota `/carteira` ausente

**Arquivo:** `src/routes.tsx`

O arquivo define as seguintes rotas protegidas (dentro de `AppShellNovo`):
- `/inicio` (home atual, via `InicioPage`)
- `/patrimonio`, `/proventos`, `/rentabilidade`, `/score`, `/estrategias`, `/alertas`, `/lancamentos`, `/conta`
- `/ativo/:ticker`
- `/ativos`, `/ativos/posicoes`, `/ativos/composicao`, `/ativos/lancamentos`
- `/desempenho`, `/desempenho/visao-geral`, `/desempenho/rentabilidade`, `/desempenho/proventos`
- `/analise`, `/analise/visao-geral`, `/analise/score`, `/analise/alertas`
- A rota raiz `/` redireciona para `/inicio` via `<Navigate to="/inicio" replace />`

**`/carteira` não está em nenhum lugar desta lista.**

### 3. manifest.webmanifest — start_url desatualizado

**Arquivo:** `public/manifest.webmanifest`, **linha 6**

```json
"start_url": "/carteira",
```

Usuários que instalaram o app como PWA (Progressive Web App) também serão mandados para `/carteira` ao abrir o app — o mesmo problema de outra forma.

### 4. navigation.tsx — item de nav legado apontando para `/carteira`

**Arquivo:** `src/shared/layout/navigation.tsx`, **linha 12**

```tsx
export const navigationItems: NavigationItem[] = [
  { path: '/carteira', label: 'Carteira', icon: Wallet },  // ← rota inexistente
  { path: '/lancamentos', label: 'Lançamentos', icon: FileText },
  // ...
]
```

Este array é consumido por `Sidebar.tsx` (o layout antigo). O `Sidebar` antigo ainda existe em `src/shared/layout/Sidebar.tsx` e é referenciado por `AppShell.tsx` → `Layout.tsx`. Porém, **`AppShell` não aparece mais em `routes.tsx`** — o app usa `AppShellNovo`. Isso significa que este item de `/carteira` no `navigation.tsx` não está sendo renderizado na UI atual, mas o arquivo está desatualizado e pode causar confusão.

### 5. PublicOnlyRoute — redirect pós-login correto

**Arquivo:** `src/modules/auth/components/PublicOnlyRoute.tsx`, **linha 18**

```tsx
if (isAuthenticated) {
  return <Navigate to="/inicio" replace />
}
```

Este redirect está correto. Se um usuário autenticado tentar acessar `/login`, ele vai para `/inicio`. O problema é que o `LoginForm` controla o redirect após submit e ignora esta lógica.

### 6. Navegação atual (novo fluxo) — correto

**`SidebarNovo`** usa `navItemsNovo` de `src/shared/layout/navNovo.tsx`:
- `/inicio`, `/ativos`, `/desempenho`, `/analise` — todos existentes

**`MobileNav`** usa array local:
- `/inicio`, `/ativos`, `/desempenho`, `/analise` — todos existentes

### 7. CarteiraPage ainda existe como componente, mas sem rota

**Arquivo:** `src/modules/portfolio/components/CarteiraPage.tsx`

O componente `CarteiraPage` ainda existe e tem testes (`CarteiraPage.test.tsx`), mas **não é importado nem registrado em `routes.tsx`**. A tela foi substituída pelo novo fluxo (possivelmente distribuída entre `InicioPage`, `AtivosPage` etc.).

### 8. Sem localStorage/cookies de rota

Não foi encontrado nenhum código que salve ou restaure a última rota visitada em `localStorage` ou `sessionStorage`. O único armazenamento persistente de rota é:
- `valora-selected-wallet` em `localStorage` (Zustand persist) — salva apenas a carteira selecionada pelo usuário, não a rota.

---

## Resumo dos Problemas

| # | Arquivo | Linha | Problema | Severidade |
|---|---------|-------|----------|------------|
| 1 | `src/modules/auth/components/LoginForm.tsx` | 30 | `navigate('/carteira')` — rota removida | **Crítico** |
| 2 | `public/manifest.webmanifest` | 6 | `"start_url": "/carteira"` — PWA aponta para rota removida | **Alto** |
| 3 | `src/shared/layout/navigation.tsx` | 12 | `path: '/carteira'` no array de navegação legado | Baixo (não renderizado na UI atual) |

---

## Conclusões

O usuário que fez login em outro navegador não tinha histórico nem sessão anterior — o único redirect possível era o do `LoginForm.onSuccess`, que aponta diretamente para `/carteira`. Como essa rota não existe mais, o React Router simplesmente não renderiza nada (tela em branco ou 404 silencioso).

Em navegadores/dispositivos já usados anteriormente, o comportamento pode parecer correto porque o browser pode ter cacheado a última URL visitada e o React Router redireciona de lá para onde o usuário estava, mascarando o bug.

---

## Recomendações de Correção

### Fix 1 — `LoginForm.tsx` (crítico, resolver imediatamente)

Trocar o redirect de `/carteira` para `/inicio`:

```tsx
// antes
navigate('/carteira')

// depois
navigate('/inicio')
```

**Arquivo:** `src/modules/auth/components/LoginForm.tsx`, linha 30

### Fix 2 — `manifest.webmanifest` (alto)

Atualizar o `start_url` para a rota real de entrada:

```json
// antes
"start_url": "/carteira"

// depois
"start_url": "/inicio"
```

**Arquivo:** `public/manifest.webmanifest`, linha 6

### Fix 3 — `navigation.tsx` (limpeza)

Remover ou atualizar o item `/carteira` no array legado, ou deletar o arquivo inteiro se `Sidebar.tsx` / `AppShell.tsx` / `Layout.tsx` não tiverem mais uso. Verificar se há testes que dependem de `Layout` antes de remover.

```tsx
// remover esta linha
{ path: '/carteira', label: 'Carteira', icon: Wallet },
```

**Arquivo:** `src/shared/layout/navigation.tsx`, linha 12

### Verificação pós-fix

Após as correções, testar:
1. Login em aba anônima / outro dispositivo → deve chegar em `/inicio`
2. PWA instalado → ao abrir deve iniciar em `/inicio`
3. `npx vitest run` deve continuar passando (nenhum teste de rota depende de `/carteira` nos arquivos de rota principais)
