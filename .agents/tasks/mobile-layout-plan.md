# Implementation Plan — Mobile Layout Revisão Geral

**Objetivo:** corrigir os 4 problemas reportados:
1. Nav bar sobrepõe conteúdo (padding insuficiente no `<main>`)
2. Títulos muito no canto (padding horizontal inconsistente em `InicioPage`)
3. Proporções não dinâmicas (`KpiBarAtivos` overflow em 375px, `DesempenhoProventos` KPI bar quebra em mobile, `AtivosLancamentos` div mobile malformada)
4. Inconsistências de estilo entre páginas (`ScorePage` mobile usa estilos antigos; `SubTabBar` sem scroll horizontal)

Build: `pnpm run build` (TypeScript + Vite)
Testes: `pnpm run test:run` (vitest)

---

## Item 1 — AppShellNovo.tsx: aumentar padding-bottom do `<main>`

**Problema atual:**
```tsx
<main className="min-w-0 flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] md:px-10 md:pb-10 md:pt-0">
```
`4.5rem` (72px) é insuficiente — a nav tem 56px de altura + o botão flutuante sobrepõe. Com `5rem` (80px) há folga suficiente para o conteúdo não ficar sob a nav.

**Correção:**
```tsx
<main className="min-w-0 flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] md:px-10 md:pb-10 md:pt-0">
```

**Arquivo:** `src/shared/layout/AppShellNovo.tsx`

**Verify:** `pnpm run build` — build sem erros TypeScript. Visualmente: scroll da página não termina sob a nav bar em nenhum tamanho de tela mobile.

---

## Item 2 — MobileNav.tsx: altura dinâmica e botão flutuante bem posicionado

**Problema atual:**
```tsx
<div className="flex h-[56px] items-end bg-[#1e1e1e] pb-[env(safe-area-inset-bottom)]">
```
A div tem altura fixa `h-[56px]`, mas o `pb-[env(safe-area-inset-bottom)]` empurra o conteúdo para baixo. A altura real da barra precisa ser `56px + safe-area-inset-bottom` para não cortar os ícones em iPhones com notch.

Além disso, o botão flutuante usa `bottom-[calc(0.75rem+env(safe-area-inset-bottom))]` mas com o nav expandido pelo safe area o cálculo de centralização fica errado. O correto é alinhar verticalmente ao centro da área de 56px da barra (não contando o safe area).

Os itens de nav não têm `min-w-0` — em telas de 375px com 2 itens por lado e um placeholder central de 72px, podem transbordar.

**Correção — div da barra:**

Trocar `h-[56px] items-end` por altura dinâmica via `style` para que a barra cresça organicamente:
```tsx
<nav
  aria-label="Navegação principal"
  className="fixed inset-x-0 bottom-0 z-30 md:hidden"
  style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
>
  {/* ── Barra ── */}
  <div className="flex h-14 items-center bg-[#1e1e1e]">
```
> `h-14` = 56px. O `paddingBottom` na `<nav>` expande a área clicável no iPhone sem deslocar os ícones.

**Botão flutuante** — ajustar `bottom` para centralizar nos 56px:
```tsx
className="
  absolute bottom-[calc(env(safe-area-inset-bottom)+0.125rem)]
  left-1/2 -translate-x-1/2
  flex h-[52px] w-[52px] items-center justify-center
  rounded-full bg-[#3273B1]
  shadow-[0_4px_20px_rgba(50,115,177,0.5)]
  transition-all active:scale-95
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40
"
```
> `bottom` de `0.75rem` → `0.125rem` para que o botão fique centralizado na barra de 56px (centro em 28px, botão 52px → margem = 2px acima do chão da barra).

**NavLinks** — adicionar `min-w-0` para não transbordar em 375px:
```tsx
className={({ isActive }) =>
  `flex min-w-0 flex-col items-center justify-center gap-[3px] pb-2 pt-1 text-[10px] font-normal leading-none transition-colors ${
    isActive ? 'text-white' : 'text-[#666]'
  }`
}
```
(aplicar em ambos os `.map()` — esquerda e direita)

**Arquivo:** `src/shared/layout/MobileNav.tsx`

**Verify:** `pnpm run build` — sem erros. Em DevTools com viewport 375px, a nav bar não corta ícones e o botão + aparece centrado visualmente.

---

## Item 3 — InicioPage.tsx: remover estilo fantasma da saudação e garantir KpiCard sem overflow

**Problema atual — bloco de saudação:**
```tsx
<div className="relative flex items-end overflow-hidden rounded-[22px] bg-[#131313] py-6 pl-2 md:py-8">
```
- `bg-[#131313]` e `rounded-[22px]` criam um card visualmente separado que não existe no Figma — o fundo é o mesmo da página.
- `pl-2` adiciona padding extra além do `px-4` que o pai (`AppShellNovo`) já fornece.

**Correção:**
```tsx
<div className="flex items-end py-6 md:py-8">
```

**Problema atual — grid de KpiCards:**

O `InicioPage` aplica `px-4` no wrapper externo:
```tsx
<div className="flex flex-col gap-5 px-4 pt-4 md:px-0 md:pt-2">
```
Isso é correto. Os KpiCards herdam esse contexto. Porém `KpiCard` usa `px-[18px]` fixo — em 375px com 2 colunas e `gap-3`, cada card tem ~(375-32-12)/2 = ~165px de largura. Não há overflow aqui. Manter como está.

**Arquivo:** `src/modules/inicio/components/InicioPage.tsx`

**Verify:** `pnpm run build` — sem erros. Visualmente: a saudação não tem card com fundo separado — integra naturalmente com o fundo da página.

---

## Item 4 — SubTabBar.tsx: adicionar scroll horizontal no mobile

**Problema atual:**
```tsx
<div className="flex gap-6 border-b border-white/[0.08]" role="tablist">
```
Sem `overflow-x-auto`, em telas de 375px com 3 tabs de texto longo, as tabs podem quebrar linha ou transbordar.

**Correção:**
```tsx
<div
  className="flex gap-6 overflow-x-auto border-b border-white/[0.08] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
  role="tablist"
>
```
> Usa Tailwind arbitrary values para esconder a scrollbar mantendo o scroll funcional. `overflow-x-auto` garante scroll horizontal; as classes `[scrollbar-width:none]` e `[&::-webkit-scrollbar]:hidden` removem a scrollbar visualmente.

**Arquivo:** `src/modules/ativos/components/SubTabBar.tsx`

**Verify:** `pnpm run build` — sem erros. Em DevTools 375px, as 3 tabs de "Lançamentos" etc. ficam em linha única e roláveis.

---

## Item 5 — KpiBarAtivos.tsx: tornar responsivo em mobile (wrap + scroll)

**Problema atual:**
```tsx
<div
  className="
    rounded-xl border border-white/[0.08] bg-[#1A1A1A]
    px-6 py-4 flex items-center gap-0
  "
>
```
Quatro KPIs em linha + botão "Resumo completo" em `flex` fixo = overflow/truncamento garantido em 375px. Os separadores verticais (`self-stretch border-r`) também atrapalham quando quebram linha.

**Correção** — tornar scrollável horizontalmente no mobile, mantendo layout desktop:
```tsx
<div
  className="
    overflow-x-auto rounded-xl border border-white/[0.08] bg-[#1A1A1A]
    [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
  "
>
  <div className="flex min-w-max items-center gap-0 px-6 py-4">
```
> `min-w-max` na div interna faz ela expandir para acomodar todos os KPIs sem quebrar linha. `overflow-x-auto` na div externa permite scroll. Desktop não é afetado pois a div interna cabe naturalmente.

Remover o botão "Resumo completo" do fluxo principal para não forçar `min-w-max` desnecessariamente — colocá-lo fora da div scrollável como linha separada no mobile:

Porém alterar o layout do botão mudaria a interface para o usuário. Como a instrução diz para não alterar comportamentos visíveis, aplicar apenas o scroll sem mover o botão. O `min-w-max` garante que o botão não quebre — em desktop ele já funciona.

**Arquivo:** `src/modules/ativos/components/KpiBarAtivos.tsx`

**Verify:** `pnpm run build` — sem erros. Em DevTools 375px, a KPI bar no Ativos rola horizontalmente sem overflow.

---

## Item 6 — DesempenhoProventos.tsx: KPI bar do topo quebrando em mobile

**Problema atual:**
```tsx
<div className="rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-6 py-4 flex items-center gap-0">
```
Quatro divisões horizontais com divisores verticais em `flex` sem wrap — mesmo problema que KpiBarAtivos: overflow em 375px.

**Correção** — mesmo padrão de scroll horizontal:
```tsx
<div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#1A1A1A] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
  <div className="flex min-w-max items-center gap-0 px-6 py-4">
```
E o fechamento correspondente: fechar a div interna antes de fechar a div externa. Requer ajustar o JSX de fechamento.

**Arquivo:** `src/modules/desempenho/components/DesempenhoProventos.tsx`

**Verify:** `pnpm run build` — sem erros. Em DevTools 375px, a KPI bar dos proventos rola horizontalmente.

---

## Item 7 — AtivosLancamentos.tsx: corrigir div mobile malformada

**Problema atual:**
```tsx
{/* Mobile: lista de cards */}
<div className="block md:hidden flex flex-col gap-2 p-3">
```
`block` e `flex` são classes conflitantes. `block` define `display: block`, mas em seguida `flex` sobrescreve para `display: flex`. No mobile (sem `md:hidden`), a div é `flex`. Isso é funcional mas semanticamente incorreto e gera lint warnings. Também falta o wrapper correto — `flex-col` precisa ser parte de um container flex.

**Correção:**
```tsx
{/* Mobile: lista de cards */}
<div className="flex flex-col gap-2 p-3 md:hidden">
```

**Arquivo:** `src/modules\ativos\components\AtivosLancamentos.tsx`

**Verify:** `pnpm run build` — sem erros TypeScript/lint.

---

## Item 8 — ScorePage.tsx: alinhar layout mobile ao padrão do novo fluxo

**Problema atual — layout mobile:**
```tsx
if (isMobile) {
  return (
    <div className="flex flex-col gap-4 px-4 pb-6 pt-4">
```
- Aplica `px-4` próprio, mas está sendo renderizada dentro do `AppShellNovo` que **não** aplica `px-4` no `<main>` (só `md:px-10`). Portanto o `px-4` aqui está correto e necessário para este componente que tem seu próprio roteamento mobile fora do novo shell de páginas.

Verificando `routes.tsx` (não lido ainda) — ScorePage provavelmente está em rota separada. Vamos confirmar onde ela está montada para decidir se precisamos do `px-4` ou não.

**Decisão após análise:** Como `ScorePage` tem dois layouts distintos (`isMobile` branch), e o mobile usa `px-4` em vez de herdar do shell (como as outras páginas fazem), padronizar para usar os mesmos tokens de estilo:

```tsx
// Título no mobile — alinhar para text-[22px] igual às outras páginas
<h1 className="text-[22px] font-semibold text-white">Score Fundamentalista</h1>
// Era: text-[24px]
```

O restante do layout mobile do ScorePage (`px-4 pb-6 pt-4`, cards com `rounded-[10px]`) usa estilos legados diferentes das demais páginas do novo fluxo. Como ScorePage tem rota própria e o usuário pediu para verificar consistências, alinhar apenas o tamanho do título para ficar consistente com AnalisePage, AtivosPage, DesempenhoPage — todos usam `text-[22px] font-semibold`.

**Arquivo:** `src/modules/score/components/ScorePage.tsx`

**Verify:** `pnpm run build` — sem erros.

---

## Item 9 — AnalisePage.tsx, DesempenhoPage.tsx, AtivosPage.tsx: verificar padding dos shells

**Análise:**
Todos os três já aplicam corretamente:
```tsx
<div className="flex flex-col gap-5 px-4 pt-4 md:px-0 md:pt-2">
```
E todas as sub-rotas (`AnaliseScore`, `AnaliseAlertas`, `DesempenhoRentabilidade`, `DesempenhoProventos`, `AtivosPosicoes`, `AtivosComposicao`, `AtivosLancamentos`) têm como wrapper raiz:
```tsx
<div className="flex flex-col gap-5">
```
Sem `px-4` próprio — herdam corretamente do shell pai. **Nenhuma alteração necessária nesses arquivos.**

---

## Resumo de alterações por arquivo

| # | Arquivo | Tipo de mudança | Impacto |
|---|---------|----------------|---------|
| 1 | `src/shared/layout/AppShellNovo.tsx` | `pb-[calc(4.5rem+...)]` → `pb-[calc(5rem+...)]` | Fix: nav não sobrepõe conteúdo |
| 2 | `src/shared/layout/MobileNav.tsx` | Estrutura da nav + botão flutuante + min-w-0 | Fix: altura dinâmica + centralização |
| 3 | `src/modules/inicio/components/InicioPage.tsx` | Remove `bg-[#131313] rounded-[22px] pl-2` da saudação | Fix: consistência visual |
| 4 | `src/modules/ativos/components/SubTabBar.tsx` | Adiciona `overflow-x-auto` + hide scrollbar | Fix: scroll horizontal mobile |
| 5 | `src/modules/ativos/components/KpiBarAtivos.tsx` | Wraps em div scrollável | Fix: KPI bar sem overflow em 375px |
| 6 | `src/modules/desempenho/components/DesempenhoProventos.tsx` | Wraps KPI bar em div scrollável | Fix: mesma correção do KpiBarAtivos |
| 7 | `src/modules/ativos/components/AtivosLancamentos.tsx` | `block md:hidden flex` → `flex md:hidden` | Fix: classes conflitantes |
| 8 | `src/modules/score/components/ScorePage.tsx` | `text-[24px]` → `text-[22px]` no título mobile | Fix: consistência de estilo |

---

## Detalhes completos de código — antes × depois

### 1. AppShellNovo.tsx

**ANTES:**
```tsx
<main className="min-w-0 flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] md:px-10 md:pb-10 md:pt-0">
```

**DEPOIS:**
```tsx
<main className="min-w-0 flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] md:px-10 md:pb-10 md:pt-0">
```

---

### 2. MobileNav.tsx

**ANTES:**
```tsx
export function MobileNav({ alertCount, onNovoLancamento }: MobileNavProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 md:hidden"
    >
      {/* ── Barra ── */}
      <div className="flex h-[56px] items-end bg-[#1e1e1e] pb-[env(safe-area-inset-bottom)]">
        {/* Lado esquerdo */}
        <div className="flex flex-1 items-center justify-around">
          {NAV_ITEMS.filter((i) => i.side === 'left').map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-[3px] pb-2 pt-1 text-[10px] font-normal leading-none transition-colors ${
                  isActive ? 'text-white' : 'text-[#666]'
                }`
              }
```

*(e o mesmo padrão para o lado direito)*

```tsx
      {/* ── Botão + flutuante ── */}
      <button
        ...
        className="
          absolute bottom-[calc(0.75rem+env(safe-area-inset-bottom))]
          ...
        "
      >
```

**DEPOIS:**
```tsx
export function MobileNav({ alertCount, onNovoLancamento }: MobileNavProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* ── Barra ── */}
      <div className="flex h-14 items-center bg-[#1e1e1e]">
        {/* Lado esquerdo */}
        <div className="flex flex-1 items-center justify-around">
          {NAV_ITEMS.filter((i) => i.side === 'left').map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex min-w-0 flex-col items-center justify-center gap-[3px] pb-2 pt-1 text-[10px] font-normal leading-none transition-colors ${
                  isActive ? 'text-white' : 'text-[#666]'
                }`
              }
```

*(e o mesmo `min-w-0` para o lado direito)*

```tsx
      {/* ── Botão + flutuante ── */}
      <button
        ...
        className="
          absolute bottom-[calc(env(safe-area-inset-bottom)+0.125rem)]
          ...
        "
      >
```

---

### 3. InicioPage.tsx

**ANTES:**
```tsx
{/* ── Saudação ── */}
<div className="relative flex items-end overflow-hidden rounded-[22px] bg-[#131313] py-6 pl-2 md:py-8">
  <div>
    <h1 className="text-[26px] font-medium leading-none text-white md:text-[32px]">
```

**DEPOIS:**
```tsx
{/* ── Saudação ── */}
<div className="flex items-end py-6 md:py-8">
  <div>
    <h1 className="text-[26px] font-medium leading-none text-white md:text-[32px]">
```

---

### 4. SubTabBar.tsx

**ANTES:**
```tsx
<div className="flex gap-6 border-b border-white/[0.08]" role="tablist">
```

**DEPOIS:**
```tsx
<div
  className="flex gap-6 overflow-x-auto border-b border-white/[0.08] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
  role="tablist"
>
```

---

### 5. KpiBarAtivos.tsx

**ANTES:**
```tsx
return (
  <div
    className="
      rounded-xl border border-white/[0.08] bg-[#1A1A1A]
      px-6 py-4 flex items-center gap-0
    "
  >
    {/* KPI 1 — Patrimônio total */}
    <div className="flex flex-1 flex-col gap-0.5 pr-6">
```

*(... conteúdo interno ...)*

```tsx
      Resumo completo &gt;
      </button>
  </div>
)
```

**DEPOIS:**
```tsx
return (
  <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#1A1A1A] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <div className="flex min-w-max items-center gap-0 px-6 py-4">
      {/* KPI 1 — Patrimônio total */}
      <div className="flex flex-1 flex-col gap-0.5 pr-6">
```

*(... conteúdo interno idêntico ...)*

```tsx
        Resumo completo &gt;
        </button>
    </div>
  </div>
)
```

---

### 6. DesempenhoProventos.tsx

**ANTES:**
```tsx
{/* ── KPI bar ── */}
<div className="rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-6 py-4 flex items-center gap-0">
  <div className="flex flex-1 flex-col gap-0.5 pr-6">
```

*(... conteúdo interno ...)*

```tsx
        </select>
      </div>
    </div>
```

**DEPOIS:**
```tsx
{/* ── KPI bar ── */}
<div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#1A1A1A] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
  <div className="flex min-w-max items-center gap-0 px-6 py-4">
    <div className="flex flex-1 flex-col gap-0.5 pr-6">
```

*(... conteúdo interno idêntico ...)*

```tsx
          </select>
        </div>
      </div>
    </div>
```

> **Atenção ao balanceamento de tags**: abrir uma div extra requer fechar uma div extra no final do bloco KPI bar. O conteúdo interno não muda — apenas o wrapper externo ganha a div de scroll.

---

### 7. AtivosLancamentos.tsx

**ANTES:**
```tsx
{/* Mobile: lista de cards */}
<div className="block md:hidden flex flex-col gap-2 p-3">
```

**DEPOIS:**
```tsx
{/* Mobile: lista de cards */}
<div className="flex flex-col gap-2 p-3 md:hidden">
```

---

### 8. ScorePage.tsx

**ANTES:**
```tsx
{/* Título */}
<div className="flex flex-col gap-1">
  <h1 className="text-[24px] font-semibold text-white">Score Fundamentalista</h1>
```

**DEPOIS:**
```tsx
{/* Título */}
<div className="flex flex-col gap-1">
  <h1 className="text-[22px] font-semibold text-white">Score Fundamentalista</h1>
```

---

## Ordem de implementação (por dependência)

1. **Item 1** (AppShellNovo) — independente, corrige o bug mais impactante imediatamente.
2. **Item 2** (MobileNav) — independente, corrige o bug de altura da nav.
3. **Item 4** (SubTabBar) — independente, corrige scroll das sub-tabs.
4. **Item 5** (KpiBarAtivos) — independente, corrige overflow dos KPIs de Ativos.
5. **Item 6** (DesempenhoProventos) — independente, mesmo padrão do item 5.
6. **Item 3** (InicioPage) — independente, correção visual da saudação.
7. **Item 7** (AtivosLancamentos) — independente, cleanup de classes conflitantes.
8. **Item 8** (ScorePage) — independente, alinhamento de estilo de título.

Todos os itens são independentes entre si. A ordem sugerida é do maior impacto para o menor.

## Verificação final

Após todas as alterações:
```
pnpm run build
```
Deve completar sem erros TypeScript. Nenhum arquivo de teste existente cobre diretamente esses componentes de layout (apenas `AppShellNovo.test.tsx` e `Layout.test.tsx` existem em shared). Rodar:
```
pnpm run test:run
```
para garantir que nenhum teste existente quebrou.
