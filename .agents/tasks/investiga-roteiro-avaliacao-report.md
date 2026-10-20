# Relatório — Adequação do Projeto Valora ao Roteiro de Avaliação de Qualidade de Software

> Investigação READ-ONLY do repositório em `c:\Users\Samuel Leite\wkspaces\Valora`
> Branch inspecionada: `main` (último commit `2026-10-18`, merge PR #57)
> Restrições respeitadas: nenhum build/teste executado, nenhum arquivo do projeto modificado.

---

## Resposta Resumida (TL;DR)

O Valora **já contempla integralmente** os Blocos 1 e 2 (caracterização e levantamento de funcionalidades), e dispõe de **matéria-prima abundante** para os Blocos 3, 4, 5 e 6 — mas **em formatos que não são os do roteiro acadêmico**. Em síntese:

- **Bloco 1 (Caracterização): COMPLETO** — `README.md`, `contexto.md` e `VALORA_COMPILADO_COMPLETO.md` cobrem nome, objetivo e funcionalidades.
- **Bloco 2 (Funcionalidades): PARCIAL→COMPLETO** — existem 10 protótipos HTML em `prototypes/valor_*.html` e 16 requisitos funcionais (RF01–RF16) em `contexto.md`, mas **não há uma tabela F01/F02/...** no formato pedido.
- **Bloco 3 (Casos de Teste): PARCIAL** — existem **519–531 testes automatizados** (vitest) em **41 arquivos** (documentado em `investigate-tests-report.md`), **superando o mínimo de 20** em quantidade bruta. **Faltam**: casos documentados no template acadêmico (ID, descrição, passos, resultado esperado/obtido, status Aprovado/Reprovado/Bloqueado) e **evidências em print** — não há nenhuma imagem de evidência no projeto (apenas os ícones PWA).
- **Bloco 4 (Defeitos): PARCIAL** — existem **~21 "findings" de revisão de código** distribuídos em 8 arquivos `*review*.json` + 3 problemas em `investigate-rotas-report.md`, **superando o mínimo de 10**. **Faltam**: o template "Defeitos Detectados" (Passos para Reprodução, Resultado Esperado/Obtido, Evidência .jpg/.png, Prioridade, Status).
- **Bloco 5 (Métricas): PARCIAL** — `investigate-tests-report.md` traz uma tabela de métricas próxima, mas **não no formato exato** do roteiro (falta Defeitos Encontrados, Defeitos Críticos, Taxa de Aprovação %).
- **Bloco 6 (Avaliação da Qualidade): AUSENTE** — não há análise formal de Funcionalidade/Confiabilidade/Usabilidade/Eficiência/Manutenibilidade. Há subsídio nos RNF (`contexto.md`) e nas revisões.
- **Análise dos Resultados: PARCIAL** — `investigate-tests-report.md` tem seções de "Pontos Fortes", "Lacunas" e "Recomendações", mas sem "Impactos" consolidados.
- **Conclusão Crítica: AUSENTE** — não há conclusão crítica formal sobre a qualidade do software.

**Contagem exata dos quantitativos obrigatórios:**

| Quantitativo obrigatório | Mínimo | Situação atual | Atingiu? |
|---|---|---|---|
| Casos de teste | 20 | 519–531 testes automatizados executados (vitest), 41 arquivos `.test.ts/tsx` + 4 suítes SQL de RLS. **0** casos no template acadêmico. | Quantidade bruta: ✅ sim. No formato exigido: ❌ não. |
| Defeitos documentados | 10 | ~21 findings de code-review (8 arquivos `*review*.json`) + 3 problemas em `investigate-rotas-report.md` com severidade. **0** no template "Defeitos Detectados". | Quantidade bruta: ✅ sim. No formato exigido: ❌ não. |
| Evidências de execução (prints) | todas as reprovações | **0** imagens de evidência no projeto (único `.png`: ícones PWA `public/icons/valora-192.png` e `valora-512.png`). | ❌ não. |
| Tabela de métricas de qualidade | — | Tabela parcial em `investigate-tests-report.md`; formato exato do roteiro: **ausente**. | ❌ não. |
| Conclusão crítica | — | Ausente. | ❌ não. |

> Aviso metodológico: por restrição da investigação (não rodar builds/testes), as contagens de testes (519/531) são **as registradas na documentação** (`investigate-tests-report.md` de 07/10/2026 e `nova-regra-score-review.md`), não uma re-execução. A contagem de arquivos `.test.*` (41) e a enumeração de findings são **contagens diretas feitas nesta investigação** sobre o estado atual do `main`.

---

## Detalhamento por Bloco do Roteiro

### BLOCO 1 — Caracterização do Sistema — Status: COMPLETO

O que **existe**:
- **Nome do sistema:** "Valora" — `README.md` (linha 1), `contexto.md` §1, `VALORA_COMPILADO_COMPLETO.md` §"Visão Geral".
- **Objetivo do sistema:** `contexto.md` §2 ("centralizar informações financeiras relevantes e apresentar uma experiência visual moderna para apoio à decisão do investidor"); reforçado em `VALORA_COMPILADO_COMPLETO.md` ("plataforma web de análise de carteira de investimentos focada em transparência, decisão fundamentada e visualização clara de dados").
- **Principais funcionalidades:** `contexto.md` §3 (escopo funcional) lista cadastro, login, painel de carteira, patrimônio, proventos e rentabilidade; `VALORA_COMPILADO_COMPLETO.md` §"Telas Concluídas" detalha cada tela.

Arquivos-fonte:
- `c:\Users\Samuel Leite\wkspaces\Valora\README.md`
- `c:\Users\Samuel Leite\wkspaces\Valora\contexto.md`
- `c:\Users\Samuel Leite\wkspaces\Valora\VALORA_COMPILADO_COMPLETO.md`

O que **falta**: nada estrutural. Opcionalmente, condensar as três informações em um único parágrafo de abertura do PDF final (já há material suficiente).

---

### BLOCO 2 — Levantamento das Funcionalidades — Status: PARCIAL (fácil de completar)

O que **existe**:
- **10 protótipos HTML** representando as telas/funcionalidades do sistema em `c:\Users\Samuel Leite\wkspaces\Valora\prototypes\`:
  - `valor_login.html` — Login
  - `valor_cadastro.html` — Cadastro de usuário
  - `valor_carteira.html` — Carteira
  - `valor_patrimonio.html` — Patrimônio
  - `valor_proventos.html` — Proventos
  - `valor_rentabilidade.html` — Rentabilidade
  - `valor_score.html` — Score fundamentalista
  - `valor_preco_teto.html` — Preço-teto / valuation
  - `valor_estrategias.html` (e `valor_estrategias (1).html`) — Estratégias
  - `valor_ativo.html` — Detalhe de ativo
- **16 requisitos funcionais numerados (RF01–RF16)** e **6 requisitos não funcionais (RNF01–RNF06)** em `contexto.md` §4, mapeando diretamente para login, cadastro, consulta, alteração, exclusão (CRUD de posições/transações/regras de score/alertas) — atendendo o exemplo mínimo do roteiro.
- **Descrição tela a tela** em `contexto.md` §5 e `VALORA_COMPILADO_COMPLETO.md`.
- Módulos de domínio implementados em `src/modules/` (auth, portfolio, wealth, dividends, performance, score, valuation, alerts, assets, analise, desempenho, ativos, inicio, preferences, dashboard) — confirmando que as funcionalidades existem em código, não só em protótipo.

O que **falta**:
- Uma **tabela formal F01/F02/...** no formato exato do roteiro (ID | Funcionalidade). Hoje a lista está como RF01–RF16 (requisitos) e como protótipos soltos, não como tabela de funcionalidades F0x.

Como completar (não implementar agora): montar a tabela F01..F10+ mapeando cada protótipo HTML/RF a um ID, ex. F01 Login (`valor_login.html`/RF02), F02 Cadastro (`valor_cadastro.html`/RF01), F03 Consulta de Carteira (`valor_carteira.html`/RF04–RF08), F04 Consulta de Patrimônio (`valor_patrimonio.html`/RF09–RF10), F05 Consulta de Proventos (`valor_proventos.html`/RF11–RF12), F06 Consulta de Rentabilidade (`valor_rentabilidade.html`/RF13–RF14), F07 Score (`valor_score.html`), F08 Preço-teto (`valor_preco_teto.html`), F09 Estratégias (`valor_estrategias.html`), F10 Detalhe de Ativo (`valor_ativo.html`), mais as alterações/exclusões (CRUD de regras de score em `src/modules/score/hooks/useScoreRules.ts`, CRUD de alertas em `src/modules/alerts/services/alertsService.ts`, CRUD de posições em `src/modules/portfolio/services/positionService.ts`).

---

### BLOCO 3 — Especificação e Execução de Testes — Status: PARCIAL

O que **existe** (infraestrutura de testes automatizados, robusta):
- **Runner:** vitest 2.1.9 + @testing-library/react 16.1.0 + jsdom 25.0.1 (em `package.json` devDependencies).
- **Scripts:** `test` (`vitest`), `test:run` (`vitest run`), `test:rls` (`node supabase/tests/run-rls-tests.mjs`) em `package.json`.
- **Configuração:** `vite.config.ts` (TZ `America/Sao_Paulo`, setup em `src/test/setup.ts`).
- **41 arquivos de teste** `.test.ts/tsx` em `src/` (contagem direta nesta investigação). Relatório `investigate-tests-report.md` (07/10/2026) registra **519 testes passando / 0 falhando em 35 arquivos**; `nova-regra-score-review.md` registra **531 testes**. Cobertura: lógica de negócio (Bazin, performance, wealth, score, dividendos), componentes React, hooks, e **testes de RLS em SQL** (`supabase/tests/010_positions_rls_test.sql`, `020_transactions_rls_test.sql`, `021_alerts_rls_test.sql`, `030_market_seed_rls_test.sql`).
- **Relatório de testes consolidado:** `c:\Users\Samuel Leite\wkspaces\Valora\.agents\tasks\investigate-tests-report.md` — contém contagem por arquivo, tipos de teste, pontos fortes, lacunas e recomendações.
- **Histórico de correções:** `fix-tests-verification.md` (519 passaram após correção de 15 falhas) e `fix-tests-plan.md`.

O que **falta**:
- **Casos de teste no template acadêmico** (ID, Descrição, Passos, Resultado Esperado, Resultado Obtido, Status Aprovado/Reprovado/Bloqueado, Evidências). Os testes existentes são código automatizado, não documentos de caso de teste em linguagem de usuário. **0 casos no formato do roteiro.**
- **Evidências em print (screenshots):** **nenhuma** imagem de evidência no projeto. A busca por `.png/.jpg/.jpeg/.gif/.webp` fora de `node_modules`/`dist` retornou apenas `public/icons/valora-192.png` e `valora-512.png` (logos PWA).
- **Testes E2E no browser:** inexistentes. `investigate-tests-report.md` confirma "Sem testes e2e". `VALORA_COMPILADO_COMPLETO.md` lista "Testes E2E" apenas como itens **TODO não concluídos** (checkboxes `[ ]` em sprints 2, 5 e seção E2E). Não há `playwright.config.*`, `cypress.config.*` nem `*.spec.*`.
- **Status "Bloqueado":** não há caso documentado com esse status.

Observação sobre o quantitativo: o número de testes automatizados (519–531) **excede largamente** o mínimo de 20; o gargalo é o **formato documental**, não a quantidade. Os testes automatizados podem ser convertidos/adaptados em casos de teste documentados.

---

### BLOCO 4 — Registro de Defeitos — Status: PARCIAL

O que **existe** (findings de revisão de código + investigações de bugs, com severidade implícita/explícita):

Defeitos documentados em arquivos `*review*.json` (estrutura `findings[]`) e `*review*.md`:

| # | Arquivo | Qtd findings | Veredito | Natureza |
|---|---|---|---|---|
| 1 | `.agents/tasks/review.json` (desktop novo fluxo) | 3 | APPROVED | Rotas visao-geral inacessíveis; valorInvestidoBRL duplicado; botões Filtrar/Exportar CSV sem handler |
| 2 | `.agents/tasks/fix-tests-review.json` | 2 | APPROVED | useAddPosition behavioral regression; ASSET_CLASS_LABEL type loosening |
| 3 | `.agents/tasks/fi-td-review.json` | 7 | CHANGES_REQUESTED | Campos RF não persistidos; TD com rate 0/sem maturity; variantes _juros indistinguíveis; RF permite principal zero; sem testes das novas forms; label Taxa ignora indexador; selector variable-income sem ticker |
| 4 | `.agents/tasks/nova-regra-score-review.json` | 2 | CHANGES_REQUESTED | Troca de modo não limpa `name`; onSubmitAndAddAnother não reseta scoreMode |
| 5 | `.agents/tasks/2026-10-15-224651-review.md` | 2 | NEEDS_CHANGES | Name residual no toggle; ScorePreviewPanel largura fixa (overflow mobile) |
| 6 | `.agents/tasks/mobile-layout-review.json` | 2 | APPROVED | HomeRoute redireciona mobile p/ /carteira (legado); pb-[calc(5rem+...)] reserva 24px extras |
| 7 | `.agents/tasks/visao-geral-review.json` | 2 | APPROVED | Label "Rentabilidade total" enganoso; derivação duplicada em AnaliseVisaoGeral |
| 8 | `.agents/tasks/mobile-desempenho-analise-review.json` | 1 | APPROVED | KPI "Último mês" deriva de monthlyTableData (dado potencialmente stale) |
| 9 | `.agents/tasks/investigate-rotas-report.md` | 3 (com Severidade Crítico/Alto/Baixo) | — | LoginForm `navigate('/carteira')` rota removida (Crítico); manifest `start_url /carteira` (Alto); `navigation.tsx` path /carteira legado (Baixo) |

Total bruto: **~21 findings de revisão + 3 problemas de rotas = ~24 itens**, com leve sobreposição entre #4 e #5 (ambos cobrem o "name residual no toggle" do score) e entre #6 e #9 (ambos tratam da rota `/carteira` removida, em locais distintos do código — `HomeRoute` vs `LoginForm.onSuccess`). **Distinct ≈ 20–22**, superando o mínimo de 10.

O que **falta**:
- **Template "Defeitos Detectados"** do roteiro: cada defeito precisa de Título, **Passos para Reprodução** (numerados, em ações de usuário), **Resultado Esperado**, **Resultado Obtido**, **Evidência .jpg/.png**, **Severidade** (Alta/Média/Baixa), **Prioridade** (Alta/Média/Baixa), **Status** (Aberto/Em Andamento/Concluído). Os findings atuais trazem descrição técnica e às vezes severidade, mas **não** passos em linguagem de usuário, **não** resultado esperado/obtido no formato, **não** prioridade, **não** status (Aberto/Em Andamento/Concluído) e **não** evidência em imagem.
- **Evidências em imagem:** inexistentes (mesma lacuna do Bloco 3).

Observação sobre o quantitativo: a quantidade bruta de defeitos (~20+) **excede** o mínimo de 10; o gargalo é novamente o **formato** e a **evidência visual**.

---

### BLOCO 5 — Métricas de Qualidade — Status: PARCIAL

O que **existe**:
- Tabela de métricas em `investigate-tests-report.md` (seção "Resultado Atual"): Status geral (VERDE/zero falhas), Arquivos de teste (35→41), Testes executados (519→531), Testes passando (519), Testes falhando (0), Suites (151), Duração média (~23s).

O que **falta** (colunas exatas do roteiro):
- **Casos de Teste Executados** — existe (519–531).
- **Casos Aprovados** — existe (519, dado 0 falhas).
- **Casos Reprovados** — existe (0).
- **Defeitos Encontrados** — **não existe** na tabela (precisa derivar dos ~20+ findings do Bloco 4).
- **Defeitos Críticos** — **não existe** (precisa classificar; `investigate-rotas-report.md` já marca 1 como "Crítico").
- **Taxa de Aprovação (%)** — **não existe** como percentual (facilmente calculável: ~100% na suite atual, ou 519/519).

Como completar: montar a tabela única do roteiro com os 6 indicadores, preenchendo os 3 que faltam a partir dos findings do Bloco 4 e do cálculo da taxa.

---

### BLOCO 6 — Avaliação da Qualidade do Sistema — Status: AUSENTE

O que **existe** (subsídio, não a análise formal):
- RNF01–RNF06 em `contexto.md` §4.2 (responsividade, design dark, componentes reutilizáveis, navegação rápida, síntese de info, acessibilidade básica).
- Pontos fortes e lacunas em `investigate-tests-report.md` (cobertura de lógica, RLS, acessibilidade como asserção, tratamento de erro/loading).
- Findings de usabilidade/responsividade nas revisões mobile (`mobile-layout-review.md`, `mobile-desempenho-analise-review.md`).

O que **falta** — a análise formal dos 5 atributos:
1. **Funcionalidade:** atende aos requisitos? (parcialmente respondível pelos 41 arquivos de teste + 16 RF)
2. **Confiabilidade:** falhas frequentes? (a suite está 0 falhas, mas há findings como regressão do useAddPosition)
3. **Usabilidade:** interface intuitiva? (revisões mobile indicam pontos de atrito)
4. **Eficiência:** desempenho adequado? (sem dados de performance beyond build time)
5. **Manutenibilidade:** problemas corrigíveis? (findings de duplicação de código indicam oportunidades)

Nenhum desses 5 pontos tem um parágrafo de análise escrito no formato do roteiro.

---

### ANÁLISE DOS RESULTADOS — Status: PARCIAL

O que **existe**:
- **Pontos Fortes:** `investigate-tests-report.md` §"Pontos Fortes" (5 itens: cobertura de lógica, RLS, acessibilidade, cenários de erro/loading, timezone fixado, dublê Supabase).
- **Não Conformidades:** `investigate-tests-report.md` §"Lacunas Identificadas" (4 itens) + findings de revisão.
- **Recomendações:** `investigate-tests-report.md` §"Recomendações" + recomendações em cada `*review*.md` e em `investigate-rotas-report.md`.

O que **falta**:
- **Impactos:** consequências dos defeitos para os usuários — **não há** seção consolidada (apenas inferências espalhadas, ex.: "tela em branco" no relatório de rotas).
- Consolidação em uma única seção "Análise dos Resultados" no PDF final.

---

### CONCLUSÃO CRÍTICA — Status: AUSENTE

O que **existe**: nada em formato de conclusão crítica formal sobre a qualidade do software.

O que **falta**: parágrafo/section de conclusão crítica obrigatória (item 5 dos "Quantitativos Obrigatórios").

---

## Lacunas Consolidadas a Preencher (para entregar o trabalho conforme o roteiro)

Ordenadas por esforço (do mais fácil, aproveitando o que já existe, ao que exige criar do zero):

1. **[Baixo esforço] Bloco 1 — já está completo.** Apenas consolidar no PDF.
2. **[Baixo esforço] Bloco 2 — montar a tabela F01..F10+.** Material 100% disponível (protótipos HTML + RF01–RF16 em `contexto.md` + módulos em `src/modules/`). É reformatar, não descobrir.
3. **[Médio esforço] Bloco 3 — converter ~20+ casos de teste automatizados no template acadêmico.** Selecionar 20 casos representativos da suite vitest (login/cadastro/CRUD de posições/score/alertas já cobertos por `AddPositionForm.test.tsx`, `AlertsPage.test.tsx`, `scoreCalculation.test.ts`, etc.), documentá-los com ID (CT01…), descrição, passos, resultado esperado/obtido, status. Resultado: "Aprovado" para os que passam; criar alguns "Reprovado"/"Bloqueado" a partir dos findings de revisão.
4. **[Médio-esforço ALTO] Bloco 3 — produzir evidências em print.** Hoje **zero**. Exige executar o app (`pnpm dev`) e capturar telas dos testes (especialmente os reprovados). É o item que mais demanda trabalho manual e não pode ser automatizado a partir do que existe.
5. **[Médio esforço] Bloco 4 — converter ~10+ findings de revisão no template "Defeitos Detectados".** Material bruto abundante (~20+ findings). Reescrever 10 deles com Título, Passos para Reprodução (em ações de usuário), Resultado Esperado/Obtido, Severidade, Prioridade, Status. Priorizar os de severidade alta: regressão do `useAddPosition` (`fix-tests-review.json`), login→`/carteira` (`investigate-rotas-report.md`, Crítico), e os 7 do `fi-td-review.json`.
6. **[Médio esforço] Bloco 4 — evidência .jpg/.png por defeito.** Mesma dependência de prints do item 4.
7. **[Baixo esforço] Bloco 5 — montar a tabela de métricas única.** 3 das 6 linhas já existem em `investigate-tests-report.md`; as outras 3 (Defeitos Encontrados, Defeitos Críticos, Taxa de Aprovação %) derivam do Bloco 4.
8. **[Médio esforço] Bloco 6 — escrever a análise dos 5 atributos.** Sem código novo; redação apoiada em RNF (`contexto.md`), findings e relatório de testes.
9. **[Baixo esforço] Análise dos Resultados — consolidar.** Reaproveitar "Pontos Fortes"/"Lacunas"/"Recomendações" de `investigate-tests-report.md`; acrescentar "Impactos".
10. **[Baixo esforço] Conclusão Crítica — redigir.** Síntese final a partir de tudo acima.

---

## Recomendação Prática de Prioridade

**O que é mais fácil de completar com o que já existe (formato/consolidação, sem criar do zero):**
- Blocos 1, 2, 5, 6, Análise e Conclusão — são majoritariamente **redação e reformatagem** sobre material já existente (`contexto.md`, `VALORA_COMPILADO_COMPLETO.md`, `investigate-tests-report.md`, findings de revisão). Podem ser fechados em poucas horas de trabalho editorial.

**O que exige criar do zero (maior esforço):**
- **Evidências em print (BLOCOS 3 e 4)** — é o calcanhar de Aquiles. Hoje não há **nenhuma** imagem de evidência. Exige subir o app (`pnpm dev`), reproduzir manualmente cada caso de teste e cada defeito, e capturar `.png`. Sem isso, dois dos cinco critérios de avaliação (Execução 1,5 + Registro de Defeitos 1,5 = 3,0 de 8,0) ficam comprometidos, mesmo com a quantidade de testes/defeitos já excedendo os mínimos.
- **Casos de teste e defeitos no template acadêmico** — o conteúdo existe (519–531 testes; ~20+ findings), mas a **reescrita no template** (passos em linguagem de usuário, resultado esperado/obtido, status, prioridade) é trabalho manual de documentação que não pode ser apenas copiado do código.

**Sequência sugerida para a entrega:**
1. Primeiro, resolver o gargalo visual: subir o app e capturar prints (bloqueia Blocos 3 e 4).
2. Em paralelo, montar Blocos 1, 2, 5, 6, Análise e Conclusão (só redação sobre o existente).
3. Converter 20 casos de teste (vitest → template) e 10 defeitos (findings → template), anexando os prints capturados.
4. Montar a tabela final de métricas com os números reais.

---

## Mapeamento para os Critérios de Avaliação (pesos)

| Critério | Peso | Cobertura atual | Gap principal |
|---|---|---|---|
| Levantamento das Funcionalidades | 1,5 | Alta (material existe, falta tabela F0x) | Reformatar |
| Especificação dos Casos de Teste | 2,0 | Baixa no formato (alta em quantidade) | Documentar 20 casos no template |
| Execução dos Testes | 1,5 | Média (519–531 executados, sem prints) | Evidências em print |
| Registro e Classificação dos Defeitos | 1,5 | Baixa no formato (~20 findings, sem template/prints) | Template + prints |
| Análise dos Resultados e Recomendações | 1,5 | Média (pontos fortes/lacunas existem) | Impactos + conclusão |
| **Total** | **8,0** | — | — |

---

## Fontes verificadas (caminhos absolutos)

Documentação de produto/sistema:
- `c:\Users\Samuel Leite\wkspaces\Valora\README.md`
- `c:\Users\Samuel Leite\wkspaces\Valora\contexto.md`
- `c:\Users\Samuel Leite\wkspaces\Valora\VALORA_COMPILADO_COMPLETO.md`

Protótipos de tela (funcionalidades):
- `c:\Users\Samuel Leite\wkspaces\Valora\prototypes\valor_login.html`, `valor_cadastro.html`, `valor_carteira.html`, `valor_patrimonio.html`, `valor_proventos.html`, `valor_rentabilidade.html`, `valor_score.html`, `valor_preco_teto.html`, `valor_estrategias.html`, `valor_ativo.html`

Testes (infraestrutura e relatórios):
- `c:\Users\Samuel Leite\wkspaces\Valora\package.json` (scripts `test`, `test:run`, `test:rls`)
- `c:\Users\Samuel Leite\wkspaces\Valora\vite.config.ts`
- `c:\Users\Samuel Leite\wkspaces\Valora\src\` (41 arquivos `.test.ts/tsx`)
- `c:\Users\Samuel Leite\wkspaces\Valora\supabase\tests\` (4 suítes SQL de RLS + `run-rls-tests.mjs`)
- `c:\Users\Samuel Leite\wkspaces\Valora\.agents\tasks\investigate-tests-report.md`
- `c:\Users\Samuel Leite\wkspaces\Valora\.agents\tasks\fix-tests-verification.md`
- `c:\Users\Samuel Leite\wkspaces\Valora\.agents\tasks\fix-tests-plan.md`

Defeitos (revisões de código e investigações):
- `c:\Users\Samuel Leite\wkspaces\Valora\.agents\tasks\review.json` / `2026-10-07-183813-review.md`
- `c:\Users\Samuel Leite\wkspaces\Valora\.agents\tasks\fix-tests-review.json` / `fix-tests-review.md`
- `c:\Users\Samuel Leite\wkspaces\Valora\.agents\tasks\fi-td-review.json` / `fi-td-review.md`
- `c:\Users\Samuel Leite\wkspaces\Valora\.agents\tasks\nova-regra-score-review.json` / `nova-regra-score-review.md`
- `c:\Users\Samuel Leite\wkspaces\Valora\.agents\tasks\2026-10-15-224651-review.md`
- `c:\Users\Samuel Leite\wkspaces\Valora\.agents\tasks\mobile-layout-review.json` / `mobile-layout-review.md`
- `c:\Users\Samuel Leite\wkspaces\Valora\.agents\tasks\visao-geral-review.json` / `visao-geral-review.md`
- `c:\Users\Samuel Leite\wkspaces\Valora\.agents\tasks\mobile-desempenho-analise-review.json` / `mobile-desempenho-analise-review.md`
- `c:\Users\Samuel Leite\wkspaces\Valora\.agents\tasks\investigate-rotas-report.md`

Imagens (evidências): nenhuma além de `c:\Users\Samuel Leite\wkspaces\Valora\public\icons\valora-192.png` e `valora-512.png` (logos PWA, não evidências de teste).

## Limites desta investigação

- Os números de testes (519/531) vêm da **documentação** do projeto, não de re-execução (restrição de não rodar testes). A contagem de arquivos `.test.*` (41) e a enumeração de findings são contagens diretas sobre o estado atual do `main`.
- Não foi verificada a execução real de `pnpm test:rls` (depende de Supabase local); apenas confirmada a existência dos arquivos.
- A sobreposição exata entre findings de revisão (defeitos duplicados entre `nova-regra-score-review` e `2026-10-15-224651-review`) foi inferida pela leitura, não por diff automático.
