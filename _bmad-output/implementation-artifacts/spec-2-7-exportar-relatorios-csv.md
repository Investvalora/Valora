---
title: 'Story 2.7 — Exportar relatórios em CSV'
type: 'feature'
created: '2026-09-10'
status: 'done'
baseline_commit: '623d3d04dfee4edf5c3fa4de0421076468c7ece7'
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-6-alertas-badge-geracao-on-demand.md'

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A carteira pode ser consultada na tela, mas o usuário ainda não consegue levar os mesmos números para análise externa ou arquivo pessoal. O relatório precisa refletir a tabela exibida, sua ordenação e suas lacunas honestas.

**Approach:** Adicionar uma exportação client-side da tabela de posições em CSV brasileiro, com escaping correto, BOM UTF-8, download acessível e nome de arquivo previsível. A exportação usará as linhas derivadas e ordenadas da carteira, sem nova fonte de cálculo; as ações de sincronização e geração de insights serão exibidas como “Em breve”.

## Boundaries & Constraints

**Always:** colunas da tabela exibida na mesma ordem; separador `;`; UTF-8 com BOM; campos sempre escapados quando necessário; valores formatados em pt-BR e lacunas como `—`; respeitar a ordenação ativa; máximo de 1000 linhas; download em menos de 2 segundos para 1000 linhas; não incluir `user_id`, service role ou dados de outra conta; feedback de sucesso/erro acessível; botão exportar desabilitado sem linhas.

**Ask First:** alterar o formato para XLSX/PDF, incluir transações ou alertas no mesmo arquivo, buscar mais de 1000 posições ou mudar as colunas exibidas sem atualizar o contrato da tabela.

**Never:** recalcular valores de mercado no exportador, exportar números crus divergentes da tela, concatenar CSV sem escaping, bloquear a UI com chamada de rede, ou fingir que “Sincronizar dados” e “Gerar insights” já funcionam.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|----------------------------|----------------|
| Carteira com posições | Linhas ordenadas na tabela | Download CSV com cabeçalho e mesmas colunas/ordem | N/A |
| Campo especial | Nome com `;`, aspas ou quebra de linha | Campo entre aspas e aspas duplicadas | Arquivo continua legível |
| Lacunas | Cotação/valor/peso ausente | Célula contém `—`, sem zero inventado | N/A |
| Carteira vazia | Nenhuma linha | Botão desabilitado ou ausente | Nenhum download vazio |
| Ações futuras | Sincronizar/insights | Exibe “Em breve” | Não faz chamada nem altera dados |
| Limite | Até 1000 linhas | Download termina em menos de 2s | Linhas acima do limite não entram |

</frozen-after-approval>

## Code Map

- `src/modules/portfolio/components/CarteiraPage.tsx` -- possui linhas derivadas/ordenadas e cabeçalho para inserir a ação de exportação.
- `src/modules/portfolio/components/PositionsTable.tsx` -- autoridade visual das colunas e formatação exibida.
- `src/modules/portfolio/positionRows.ts` -- produz `PositionRow` e ordenação atual sem recalcular no exportador.
- `src/modules/portfolio/types.ts` -- contrato de `PositionRow`, moedas, lacunas e métricas.
- `src/modules/portfolio/components/CarteiraPage.test.tsx` e `PositionsTable.test.tsx` -- testes de derivação, ordenação, formatação e estados vazios.
- `src/modules/portfolio/services/positionService.ts` e `usePositions.ts` -- limites e acesso autenticado existentes; não alterar RLS.
- `src/shared/components/Layout.tsx` -- padrão visual de ações e navegação da área autenticada.
- `_bmad-output/implementation-artifacts/epic-2-context.md` -- requisitos de CSV, limite e performance da exportação.

## Tasks & Acceptance

**Execution:**
- [x] `src/modules/portfolio/export/positionsCsv.ts` -- serializar cabeçalho/linhas com `;`, BOM, escaping e limite -- manter CSV compatível com Excel brasileiro.
- [x] `src/modules/portfolio/components/CarteiraPage.tsx` -- adicionar exportar, sincronizar e insights “Em breve” -- expor ações sem alterar a tabela.
- [x] `src/modules/portfolio/export/positionsCsv.test.ts` -- cobrir colunas, escaping, lacunas, limite e performance -- provar a matriz de I/O.
- [x] `src/modules/portfolio/components/CarteiraPage.test.tsx` -- testar download e estados das ações -- garantir que a exportação usa linhas ordenadas e não chama rede.
- [x] `src/modules/portfolio/types.ts` -- adicionar tipos auxiliares somente se necessários -- preservar o contrato de `PositionRow`.

**Acceptance Criteria:**
- Dada uma carteira com posições, quando o usuário exporta, então baixa um CSV UTF-8 com BOM, separador `;`, cabeçalho e colunas na mesma ordem da tabela.
- Dado nome ou valor contendo `;`, aspas ou quebra de linha, quando exportado, então o campo é escapado e pode ser reimportado sem deslocar colunas.
- Dada uma lacuna na tabela, quando exportada, então o CSV contém `—` e não um zero ou `NaN`.
- Dada uma carteira vazia, quando a tela é exibida, então exportar não permite download sem dados.
- Dado “Sincronizar dados” ou “Gerar insights”, quando acionado, então a interface informa “Em breve” sem chamada de rede.
- Dadas até 1000 linhas, quando exportadas, então a operação termina em menos de 2 segundos.

## Verification

**Commands:**
- `pnpm test:run` -- expected: testes de exportação e regressão passam.
- `pnpm lint` -- expected: sem erros nos arquivos alterados.
- `pnpm build` -- expected: TypeScript e Vite compilam.

## Suggested Review Order

**Serialização do relatório**

- O serializador preserva colunas, formatação brasileira, lacunas e limite.
  [positionsCsv.ts:108](../../src/modules/portfolio/export/positionsCsv.ts#L108)

- O download cria Blob UTF-8, nomeia o arquivo e libera recursos mesmo em erro.
  [positionsCsv.ts:118](../../src/modules/portfolio/export/positionsCsv.ts#L118)

**Integração na carteira**

- A exportação usa as mesmas linhas derivadas e ordenadas exibidas na tabela.
  [CarteiraPage.tsx:86](../../src/modules/portfolio/components/CarteiraPage.tsx#L86)

- As ações futuras apenas exibem “Em breve”, sem disparar sincronização ou insights.
  [CarteiraPage.tsx:155](../../src/modules/portfolio/components/CarteiraPage.tsx#L155)

**Provas**

- Os testes cobrem BOM, escaping, lacunas, limite, performance e download real.
  [positionsCsv.test.ts:26](../../src/modules/portfolio/export/positionsCsv.test.ts#L26)

- A carteira prova ordenação, estado vazio e ausência de rede nas ações futuras.
  [CarteiraPage.test.tsx:637](../../src/modules/portfolio/components/CarteiraPage.test.tsx#L637)