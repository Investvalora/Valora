# Mobile Layout — Revisão de responsividade e navbar

As mudanças ajustam o layout mobile do novo fluxo (AppShellNovo + MobileNav) para corrigir sobreposição de navbar, padding lateral e consistência tipográfica entre as quatro telas principais: Início, Ativos, Desempenho e Análise.

**Watch for:**
- `HomeRoute` redireciona mobile para `/carteira` (fluxo legado), então `InicioPage` e a `MobileNav` nunca são vistas em mobile via rota `/inicio` — **confirmed**.
- `pb-[calc(5rem+env(safe-area-inset-bottom))]` no `<main>` reserva 80px, contra 56px da navbar; folga de 24px não bloqueia, mas é perceptível em telas curtas — **confirmed**.
- Botão flutuante: `bottom: 2px` sem safe-area é geometricamente correto (centro do botão de 52px cai em 28px = centro da barra de 56px) — **confirmed**.

**Verdict**: APPROVED

---

## High-level view

O `AppShellNovo` usa `pb-[calc(5rem+env(safe-area-inset-bottom))]` no `<main>` (80px + safe-area) contra a navbar de 56px. A folga de 24px previne sobreposição mas é perceptível como espaço extra em telas curtas. A safe-area é estendida por um `<div>` separado abaixo dos ícones, evitando que ela comprima a altura visual da barra.

O `px-4` fica exclusivamente nos wrappers das páginas-pai. As sub-rotas herdam esse padding via `<Outlet>` sem adicionar o próprio, então não há acumulação.

`HomeRoute` redireciona mobile para `/carteira` (fluxo legado), de modo que `InicioPage` e a `MobileNav` ficam fora do caminho navegável em mobile quando o usuário chega por `/inicio`. As rotas `/ativos`, `/desempenho` e `/analise` chegam ao novo fluxo corretamente; só a rota de início está desconectada.

As classes `md:` permanecem intactas em todos os arquivos modificados.

<details>
<summary>Issues (2)</summary>

1. **`HomeRoute` redireciona mobile para `/carteira`** — em mobile, `isMobile` redireciona `/inicio` para `/carteira` (CarteiraPage, fluxo legado sem MobileNav). A `InicioPage` e a nova navbar ficam inacessíveis em mobile via rota `/inicio`. Remover o redirect ou apontar para `InicioPage` em mobile.

2. **`pb-[calc(5rem+...)]` reserva 24px extras** — a folga entre o padding-bottom do `<main>` (80px) e a navbar (56px) é visível em telas com pouco conteúdo em 375px. Não bloqueia, mas pode ser reduzida para `pb-[calc(3.5rem+env(safe-area-inset-bottom))]` se o espaço incomodar.

</details>

<details>
<summary>Details</summary>

### Padding-bottom do main e sobreposição da navbar

O `<main>` usa `pb-[calc(5rem+env(safe-area-inset-bottom))]` (80px fixo + safe-area). A navbar ocupa 56px (`h-14`) + safe-area em `<div>` separado. A folga de 24px é conservadora — sem sobreposição — mas gera espaço em branco perceptível abaixo do último item em telas com pouco conteúdo a 375px.

A estratégia de separar a barra (56px fixo) da safe-area (div de extensão de fundo) é o padrão correto: evita que a safe-area reduza visualmente a área dos ícones.

### Botão flutuante — alinhamento vertical

`h-[52px]` + `bottom-[calc(env(safe-area-inset-bottom)+0.125rem)]`. Com `safe-area-inset-bottom = 0`: centro do botão em `2 + 26 = 28px`, centro da barra em `56/2 = 28px` — coincidentes. O `0.125rem` (2px) é o offset exato de `(h-14 − h-[52px]) / 2`.

### Padding lateral e títulos

As quatro páginas-pai usam `px-4 pt-4` em mobile, `md:px-0 md:pt-2` em desktop. Sub-rotas não têm `px-` próprio, então herdam via `<Outlet>` sem acumulação. Nenhum texto chega na borda.

`AtivosPage`, `AnalisePage` e `DesempenhoPage` têm `text-[22px] font-semibold` — consistentes. `InicioPage` usa `text-[26px] font-medium` com comentário inline justificando a diferença (saudação vs. título de seção).

### SubTabBar e overflow horizontal

`overflow-x-auto` com scrollbar oculta. Com 3 tabs por tela, não há overflow a 375px. O scroll lateral por touch ainda funciona.

### `HomeRoute` e rota `/inicio` em mobile

```tsx
function HomeRoute() {
  const isMobile = useIsMobile()
  return isMobile ? <Navigate to="/carteira" replace /> : <InicioPage />
}
```

Em mobile, `/inicio` redireciona para `/carteira`, que renderiza `CarteiraPage` — a página do fluxo legado, sem `MobileNav`. O fluxo novo com a nova navbar só fica acessível em mobile via navegação direta às rotas `/ativos`, `/desempenho`, `/analise`. A `InicioPage` nunca é vista em mobile. Se a intenção era migrar completamente para o novo fluxo, o `HomeRoute` precisa remover o redirect ou apontar para `InicioPage` em mobile também.

### Classes `md:` intactas

Verificadas: `AppShellNovo` (`md:px-10 md:pb-10 md:pt-0`), as quatro páginas-pai (`md:px-0 md:pt-2`), `AtivosLancamentos` (`hidden md:block` / `block md:hidden`), `DesempenhoRentabilidade` (`hidden md:table-cell`). Nenhuma removida.

</details>

---

<details>
<summary>Arquivos revisados</summary>

| Arquivo | O que mudou |
|---|---|
| `src/shared/layout/AppShellNovo.tsx` | `pb-[calc(5rem+env(safe-area-inset-bottom))]` no `<main>` |
| `src/shared/layout/MobileNav.tsx` | Altura dinâmica com safe-area-inset-bottom; botão flutuante centralizado |
| `src/modules/inicio/components/InicioPage.tsx` | `px-4 pt-4 md:px-0 md:pt-2` no wrapper raiz |
| `src/modules/analise/components/AnalisePage.tsx` | `px-4 pt-4 md:px-0 md:pt-2`; `text-[22px] font-semibold` no título |
| `src/modules/desempenho/components/DesempenhoPage.tsx` | `px-4 pt-4 md:px-0 md:pt-2`; `text-[22px] font-semibold` no título |
| `src/modules/ativos/components/AtivosPage.tsx` | `px-4 pt-4 md:px-0 md:pt-2`; `text-[22px] font-semibold` no título |
| `src/modules/ativos/components/SubTabBar.tsx` | `overflow-x-auto` adicionado |
| Sub-rotas (AtivosPosicoes, AtivosComposicao, AtivosLancamentos, DesempenhoRentabilidade, DesempenhoProventos, AnaliseScore, AnaliseAlertas) | Sem `px-` próprio; herdam padding da página-pai via `<Outlet>` |

</details>
