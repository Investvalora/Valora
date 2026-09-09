---
title: 'Story 2.4 — Composição por Classe e Exposição Internacional'
type: 'feature'
created: '2026-09-09'
status: 'done'
baseline_commit: 'ec72e07b540824d55343cc4ee6cb1bd6100bd39a'
review_loop_iteration: 1
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A Carteira já mostra patrimônio total e a lista de posições (2.3), mas não responde "como meu patrimônio está distribuído". O usuário não vê o peso de cada classe de ativo (Ações BR, FIIs, BDRs, Stocks US, REITs, Cryptos) nem quanto do patrimônio está exposto ao exterior — a diversificação fica invisível.

**Approach:** Agregar as linhas já derivadas por `derivePositionRows` (`marketValueBRL` por posição, já convertido para BRL) por `asset.type`, numa função pura e compartilhada (`composition.ts`) que também calcula a exposição internacional = (BDR + Stocks US + REITs + Crypto) / total. Um `CompositionCard` com gráfico de pizza (Recharts, lazy-loaded) na `CarteiraPage` renderiza as fatias por classe, o valor total em destaque, o % de exposição internacional e o tooltip por fatia com valor em R$ e ticker principal da classe. Tudo client-side, sem migration nem query nova.

## Boundaries & Constraints

**Always:**
- Reaproveitar a derivação da 2.3: a composição consome `derived.rows`/`derived.totalBRL` de `derivePositionRows`, nunca recalcula valor de mercado nem reconverte USD por conta própria. Só posições com `marketValueBRL !== null` entram na composição — posição sem cotação é lacuna, não R$ 0.
- Regras de classe e exposição internacional vivem em código compartilhado e testável (`composition.ts`), não embutidas no componente: os cards do Épico 3 reusam exatamente essa lógica (Cross-Story Dependencies do épico). Rótulos das 6 classes centralizados num único mapa.
- Exposição internacional = soma dos `marketValueBRL` de `bdr + stock_us + reit + crypto`, dividida pelo total em BRL da carteira. Toda a aritmética em BRL.
- Percentuais por classe somam 100% sobre o total avaliado; classe sem posição não aparece na pizza. Formatação `pt-BR`.
- Degradar sem apagar: total zero (nenhuma posição avaliada) mostra lacuna honesta, não uma pizza vazia afirmando "0%". Gráfico lazy-loaded via `React.lazy` + `Suspense` (padrão do épico: gráficos lazy).
- Acessibilidade: o card não pode depender só do SVG da pizza — legenda/tabela textual com classe, valor em R$ e % legível por leitor de tela e navegável por teclado; contraste WCAG AA (piso `gray-400` sobre `dark-bg`). Cores por classe com contraste suficiente e distinguíveis.
- Imports relativos (sem alias `@/`); `import type` para tipos (`tsc -b` roda `strict`/`noUnusedLocals`).

**Ask First:**
- Adicionar `type` a `PositionRow` e populá-lo em `derivePositionRows` (mexe no contrato de saída da 2.3, já validado): necessário porque hoje a linha carrega `currency` mas não a classe. Preferir isto a re-derivar a partir de `PositionWithAsset` no card.
- Introduzir qualquer dependência de charting além do Recharts já presente (2.12.7).

**Never:**
- Fora de escopo: CSV/`transactions` (2.5), alertas (2.6), export (2.7), tela de patrimônio do Épico 3. Não criar migration, tabela, view nem query nova — a composição é pura agregação client-side sobre o que a 2.3 já busca.
- Não duplicar a lógica de classe/exposição dentro do componente nem em outro módulo — fonte única em `composition.ts`.
- Não contar posição sem `marketValueBRL` como zero no numerador/denominador; não interpolar.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Carteira diversificada | posições `stock_br`, `fii`, `bdr` com `marketValueBRL` conhecido | Pizza com 3 fatias; % por classe somando 100%; total em destaque; exposição internacional = peso do `bdr` | N/A |
| Só ativos BR | `stock_br` + `fii` avaliados | Exposição internacional = 0%; pizza com 2 fatias | N/A |
| Só ativos estrangeiros | `stock_us` + `crypto` avaliados | Exposição internacional = 100% | N/A |
| Classe sem posição | nenhuma posição `reit` | Classe `REITs` não aparece na pizza nem na legenda | N/A |
| Ticker principal da classe | classe `fii` com HGLG11 (maior `marketValueBRL`) e outro menor | Tooltip da fatia FIIs mostra valor R$ da classe e ticker HGLG11 | N/A |
| Posição sem cotação | `stock_br` com `marketValueBRL === null` | Não entra em nenhuma fatia nem no total da composição | Lacuna honesta |
| Total zero | nenhuma posição avaliada (todas sem cotação) | Card mostra lacuna ("—" / mensagem), sem pizza; sem `0%` nem divisão por zero | Sem erro |
| Sem posições | carteira vazia | Card de composição não é renderizado (igual ao card de patrimônio) | N/A |
| `type` ausente no catálogo | `asset` nulo / `type` nulo numa posição avaliada | Agrupa em bucket "Outros" ou é excluída de forma consistente e testada; nunca quebra a soma | Tratada explicitamente |

</frozen-after-approval>

## Code Map

Reuso (base da 2.3, ler antes de escrever):
- `src/modules/portfolio/positionRows.ts` -- `derivePositionRows()` L~120 retorna `{ rows, totalBRL, missingValueCount, usesUSDRate }`; cada `PositionRow` já tem `marketValueBRL` (BRL, USD convertido) e `currency`. **Falta `type`** na linha — adicionar `position.asset?.type ?? null` no map (duas ocorrências: objeto `partial` e spread final). `toNumber` reusável.
- `src/modules/portfolio/types.ts` -- `AssetType` (L5, 6 valores) espelha `public.asset_type`. `PositionRow` (final) tem `currency` mas não `type`: adicionar `type: AssetType | null`. Novos tipos de composição (`AssetClassSlice`, `CompositionSummary`) aqui.
- `src/modules/portfolio/components/CarteiraPage.tsx` -- L~60 já calcula `derived = derivePositionRows(...)`; `hasPositions`; `brlFormatter`. **Alterar**: renderizar `<CompositionCard>` (recebe `rows` + `totalBRL` já prontos) logo após o card "Patrimônio total" (L~110), gateado por `hasPositions`. Não re-derivar.
- `src/shared/components/Tooltip.tsx` -- `Tooltip({ label, children })` clicável em portal; disponível se for necessário tooltip acessível fora do Recharts. O tooltip por fatia usa o `<Tooltip>` custom do Recharts (conteúdo próprio).

Criar:
- `src/modules/portfolio/composition.ts` -- `deriveComposition(rows: PositionRow[], totalBRL: number): CompositionSummary` puro: agrupa `marketValueBRL` por `type` (ignora `null`), calcula `percent` por classe, `internationalPercent` (bdr+stock_us+reit+crypto)/total, `topTicker` por classe (maior `marketValueBRL`); `ASSET_CLASS_LABEL: Record<AssetType,string>`, `INTERNATIONAL_TYPES`, ordem de exibição das classes. Fonte única reusada pelo Épico 3.
- `src/modules/portfolio/composition.test.ts` -- cobre a matriz de I/O (soma 100%, exposição 0/100%, classe ausente, ticker principal, lacuna, total zero, `type` nulo). Guards provados por mutação.
- `src/modules/portfolio/components/CompositionCard.tsx` -- apresentacional; recebe `rows`/`totalBRL`, chama `deriveComposition`, renderiza pizza Recharts (lazy) + legenda textual acessível + total em destaque + linha de exposição internacional + tooltip por fatia (valor R$ + ticker principal). Total zero → lacuna.
- `src/modules/portfolio/components/CompositionCard.test.tsx` -- renderização: legenda com classes/valores, exposição internacional, lacuna em total zero, ausência quando sem valor. Mockar `ResponsiveContainer`/lazy chart se o SVG do Recharts não medir em jsdom.

Testes/infra existentes a observar:
- `src/modules/portfolio/components/CarteiraPage.test.tsx` -- L~20 `CATALOG_ASSET`/`CREATED_ROW` já trazem `type`. Fixtures de composição podem seguir esse molde; adicionar asserção do card sem quebrar os testes atuais.
- `vite.config.ts` -- `TZ: 'America/Sao_Paulo'` fixado (irrelevante aqui, mas o setup de teste é o mesmo).

Banco: nenhuma mudança (leitura já feita pela 2.3).

## Tasks & Acceptance

**Execution:**
- [ ] `src/modules/portfolio/types.ts` -- adicionar `type: AssetType | null` a `PositionRow` e os tipos `AssetClassSlice` (`type`, `label`, `valueBRL`, `percent`, `topTicker`) e `CompositionSummary` (`slices`, `totalBRL`, `internationalPercent`, `internationalValueBRL`) -- contrato partilhado entre derivação, card e Épico 3
- [ ] `src/modules/portfolio/positionRows.ts` -- popular `type` (`position.asset?.type ?? null`) nas linhas derivadas, sem alterar nenhum outro campo nem a soma do total -- a composição precisa da classe; mudança aditiva ao contrato da 2.3
- [ ] `src/modules/portfolio/composition.ts` -- `deriveComposition(rows, totalBRL)` puro (agrupa por `type` ignorando `marketValueBRL` nulo, `percent` por classe, `internationalPercent`, `topTicker`), `ASSET_CLASS_LABEL`, `INTERNATIONAL_TYPES`, `ASSET_CLASS_ORDER` -- fonte única reusável; classe sem posição some; total ≤ 0 → summary vazio sem divisão por zero
- [ ] `src/modules/portfolio/components/CompositionCard.tsx` -- card apresentacional: pizza Recharts lazy (`React.lazy`+`Suspense`), legenda textual acessível (classe, R$, %), total em destaque, exposição internacional %, tooltip por fatia (R$ + ticker principal); total zero → lacuna honesta -- gráficos lazy; a11y não depende do SVG. **Distinguir carregamento de ausência** (achado da iteração 1): recebe `isQuotesLoading` do pai e, enquanto cotações/taxa USD estão em voo, mostra "Carregando composição..." em vez de afirmar "Nenhuma posição com cotação disponível" — espelha o guard do card de patrimônio da 2.3. **Região nomeada por `aria-labelledby`** (aponta para o próprio heading, não duplica texto em `aria-label`). **Ressalva de excluídas vem do pai** (`missingValueCount` de `derived`), não recontada como `=== null` no componente — assim lacuna por `NaN` também conta. **Gráfico lazy dentro de ErrorBoundary** que degrada para a legenda: falha ao baixar o chunk do Recharts não derruba a Carteira nem esconde os números acessíveis
- [ ] `src/modules/portfolio/components/CarteiraPage.tsx` -- renderizar `<CompositionCard rows={derived.rows} totalBRL={derived.totalBRL} isQuotesLoading={quotesQuery.isLoading || usdRateQuery.isLoading} missingValueCount={derived.missingValueCount} />` após o card de patrimônio, gateado por `hasPositions`, reusando o `derived` existente -- sem re-derivar; passa carregamento e contagem de excluídas já calculados no pai para o card não recomputar nem divergir
- [ ] `src/modules/portfolio/composition.test.ts` -- cobrir a matriz de I/O (soma 100%, exposição 0%/100%, classe ausente, ticker principal, posição sem cotação fora da conta, total zero, `type` nulo) -- guards da aritmética provados por mutação
- [ ] `src/modules/portfolio/components/CompositionCard.test.tsx` -- legenda lista classes com valor/%, exibe exposição internacional, mostra lacuna em total zero, não renderiza fatia de classe ausente; **estado de carregamento mostra "Carregando composição..." e não a mensagem de ausência** (achado da iteração 1); **ErrorBoundary degrada para a legenda** quando o chart lazy falha -- comportamento visível sem depender do SVG

**Acceptance Criteria:**
- Dado um usuário com posições de diferentes `asset.type` avaliadas, quando visualiza a Carteira, então um gráfico de pizza mostra o % por classe (Ações BR, FIIs, BDRs, Stocks US, REITs, Cryptos) e os percentuais das classes presentes somam 100% (FR-8).
- Dada a mesma carteira, quando o card renderiza, então a exposição internacional exibida é igual a (BDR + Stocks US + REITs + Crypto) / patrimônio total em BRL, e o valor total da carteira aparece em destaque.
- Dado o passar do mouse/foco sobre uma fatia, quando o tooltip abre, então mostra o valor em R$ da classe e o ticker principal (maior `marketValueBRL`) daquela classe.
- Dada uma posição sem cotação (`marketValueBRL === null`), quando a composição é calculada, então ela não entra em nenhuma fatia nem na exposição internacional (nunca contada como 0).
- Dada uma carteira sem nenhuma posição avaliada (total zero), quando o card renderiza, então exibe lacuna honesta em vez de pizza vazia, sem erro de divisão por zero.
- Dado `pnpm build`, `pnpm lint` e `pnpm test:run`, quando rodam, então todos passam sem erro.

## Spec Change Log

- **2026-09-09 — iteração 1.**
  **Achado que disparou:** `bad_spec` (severidade alta) — o card afirmava "Nenhuma posição com cotação disponível" durante a janela em que as cotações/taxa USD ainda estão em voo (verificado por execução: `hasPositions` fica verdadeiro assim que as posições carregam, mas `derived.totalBRL` só deixa de ser 0 quando as cotações chegam). O card de patrimônio irmão, na mesma tela, suprime exatamente essa afirmação enquanto `quotesQuery.isLoading || usdRateQuery.isLoading`; a 2.4 copiou a redação do aviso mas não o guard de carregamento. A spec original só distinguia "total zero" de "sem posições", nunca o estado de carregamento — daí ser correção de spec, não patch.
  **O que foi emendado (fora do bloco congelado):** task do `CompositionCard` e da `CarteiraPage` passam a exigir `isQuotesLoading` com mensagem "Carregando composição..."; nova Design Note "Carregamento não é ausência"; task de teste cobre o estado em voo. Aproveitou-se o mesmo loopback para dobrar achados de baixo custo e alta coerência que a re-derivação deve absorver: `aria-labelledby` em vez de `aria-label` duplicado; ressalva de excluídas consumindo `derived.missingValueCount` (conta lacuna por `NaN`, não só `=== null`); ErrorBoundary ao redor do gráfico lazy degradando para a legenda.
  **Estado ruim evitado:** o card gritando "sem cotação" a cada carregamento normal, contradizendo o patrimônio ao lado e treinando o usuário a desconfiar do próprio dado; queda da Carteira inteira se o chunk do Recharts falhar; contagem de excluídas divergindo entre os dois cards.
  **Achados classificados como não-problema desta story:** cast `as unknown as PositionWithAsset[]` em `positionService` (pré-existente → deferido); arredondamento por maior-resto, fatia negligenciável `<0,1%`, agregação por ticker no `topTicker` (impossível: `(user_id,ticker)` é único), exaustividade de `INTERNATIONAL_TYPES`/`ASSET_CLASS_ORDER` (já pega em build pelo `Record<AssetType,…>` de rótulos/cores), `Object.freeze` no singleton vazio — rejeitados como ruído/over-engineering para o MVP.
  **KEEP — deve sobreviver à re-derivação:** `composition.ts` como fonte única pura (rótulos, `INTERNATIONAL_TYPES`, `ASSET_CLASS_ORDER`, cores) reusável pelo Épico 3; a regra de exposição internacional decidida por **classe e não por moeda** (BDR em BRL conta como exterior) com o teste de mutação que a prova; consumir `derived.rows`/`derived.totalBRL` em vez de re-derivar (total do card idêntico ao do patrimônio por construção); lacuna honesta (`—`) em vez de `0%`/pizza vazia quando não há nada avaliado; `topTicker` por maior `marketValueBRL` com desempate alfabético; SVG fora da árvore de acessibilidade com a legenda textual como fonte; dublê de `ResizeObserver` no setup para o Recharts montar em jsdom.

## Design Notes

- **Fonte única da classe (por que `composition.ts` e não no componente).** A Cross-Story Dependency do épico é explícita: "As regras de classe de ativo e exposição internacional da 2.4 reaparecem nos cards do Épico 3 — devem viver em código compartilhado, não duplicadas." Por isso a agregação, os rótulos e o conjunto de classes internacionais ficam numa função pura importável, e o card é só apresentação.
- **Reusar `derived`, não `PositionWithAsset`.** `derivePositionRows` já resolveu o problema difícil (conversão USD, guardas de valor ≤ 0, lacuna vs zero). Recalcular no card duplicaria essa lógica e arriscaria divergir do total do card de patrimônio. Daí a composição consumir `rows`/`totalBRL` prontos — a única adição ao contrato é o campo `type`.
- **Recharts em jsdom.** `ResponsiveContainer` mede 0×0 em jsdom e a pizza não desenha, então os testes não podem assertar sobre paths do SVG. A a11y e os testes se apoiam numa legenda textual (classe + R$ + %) sempre presente; o SVG é enriquecimento visual. Se o import lazy do gráfico atrapalhar o teste, mockar o componente de chart.
- **Total zero.** Com `totalBRL <= 0`, `deriveComposition` retorna `slices: []` e `internationalPercent: 0` (ou `null`) — o card decide mostrar lacuna. Espelha o padrão do card de patrimônio da 2.3 (`totalLabel = '—'`).
- **Carregamento não é ausência (achado da iteração 1).** `totalBRL === 0` acontece em dois estados distintos: (a) as cotações ainda não chegaram, (b) chegaram e nenhuma serve. O card não pode afirmar "Nenhuma posição com cotação disponível" no estado (a) — isso pisca uma acusação falsa em todo carregamento de página com posições, e contradiz o card de patrimônio ao lado, que suprime a mesma afirmação enquanto `quotesQuery.isLoading || usdRateQuery.isLoading`. O card recebe `isQuotesLoading` e, em voo, mostra "Carregando composição...". A distinção reforça a boundary congelada "Degradar sem apagar" — não a contradiz.

## Verification

**Commands:**
- `pnpm lint` -- expected: sem erros/at warnings novos
- `pnpm build` -- expected: `tsc -b` + build Vite sem erro (pega `import type` faltando e campo `type` inconsistente)
- `pnpm test:run` -- expected: verde, incluindo `composition.test.ts`, `CompositionCard.test.tsx` e os testes existentes de `CarteiraPage`/`positionRows` intactos

## Suggested Review Order

**Regras de negócio (o coração da story)**

- Ponto de entrada: agregação por classe, exposição internacional e ticker principal, tudo aqui.
  [`composition.ts:126`](../../src/modules/portfolio/composition.ts#L126)

- Exposição internacional decidida por CLASSE e não por moeda — BDR em BRL conta como exterior.
  [`composition.ts:99`](../../src/modules/portfolio/composition.ts#L99)

- Desempate alfabético do "principal": independe da ordem em que o banco devolveu as linhas.
  [`composition.ts:152`](../../src/modules/portfolio/composition.ts#L152)

**Fiação na página (reuso da derivação da 2.3)**

- Card consome `rows`/`totalBRL`/`missingValueCount` já derivados — total idêntico ao patrimônio por construção.
  [`CarteiraPage.tsx:190`](../../src/modules/portfolio/components/CarteiraPage.tsx#L190)

- Campo `type` aditivo à linha derivada; não altera total nem peso.
  [`positionRows.ts:112`](../../src/modules/portfolio/positionRows.ts#L112)

**UI, acessibilidade e resiliência**

- Carregamento não é ausência: `isQuotesLoading` evita acusar "sem cotação" durante o fetch.
  [`CompositionCard.tsx:132`](../../src/modules/portfolio/components/CompositionCard.tsx#L132)

- ErrorBoundary degrada o gráfico para a legenda; a legenda vive fora da fronteira.
  [`CompositionCard.tsx:56`](../../src/modules/portfolio/components/CompositionCard.tsx#L56)

- Região nomeada por `aria-labelledby`; legenda textual é a fonte acessível, SVG fica `aria-hidden`.
  [`CompositionCard.tsx:118`](../../src/modules/portfolio/components/CompositionCard.tsx#L118)

- Gráfico lazy em módulo próprio (chunk separado do Recharts); tooltip com valor e ticker principal.
  [`CompositionPieChart.tsx:63`](../../src/modules/portfolio/components/CompositionPieChart.tsx#L63)

**Periféricos (tipos e testes)**

- Tipos novos: `AssetClassKey`, `AssetClassSlice`, `CompositionSummary`; `type` em `PositionRow`.
  [`types.ts:84`](../../src/modules/portfolio/types.ts#L84)

- Matriz de I/O provada por mutação (soma 100%, exposição 0/100%, lacuna, total zero, `type` nulo).
  [`composition.test.ts:1`](../../src/modules/portfolio/composition.test.ts#L1)

- Estado de carregamento, ErrorBoundary e legenda acessível sem depender do SVG.
  [`CompositionCard.test.tsx:1`](../../src/modules/portfolio/components/CompositionCard.test.tsx#L1)

- Integração na Carteira: total compartilhado com patrimônio e exposição internacional com ativo USD.
  [`CarteiraPage.test.tsx:659`](../../src/modules/portfolio/components/CarteiraPage.test.tsx#L659)
