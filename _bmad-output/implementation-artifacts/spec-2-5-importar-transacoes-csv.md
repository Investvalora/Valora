---
title: 'Story 2.5 (frontend) — Importar transações via CSV'
type: 'feature'
created: '2026-09-10'
status: 'done'
baseline_commit: '69d35760adfec9db0c6088421bca1966b6942ff8'
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-5-transactions-schema-e-recalculo.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A fundação server-side da Story 2.5 já grava transações e recalcula posições, mas o usuário ainda não consegue importar o CSV exportado pela corretora. Sem um fluxo de validação e correção antes da confirmação, arquivos brasileiros podem gerar transações inválidas ou difíceis de diagnosticar.

**Approach:** Implementar um fluxo protegido de upload, validação, preview corrigível e confirmação em lote para CSV de até 1000 transações. As linhas confirmadas serão gravadas na tabela `transactions`, deixando o trigger existente recalcular `positions`. Documentar no `.env.example` somente as variáveis públicas necessárias ao cliente Supabase.

## Boundaries & Constraints

**Always:** aceitar UTF-8 com BOM e ISO-8859-1/Windows-1252; detectar separador `;` e decimal `,`; exigir colunas `data, ticker, tipo, quantidade, preço, corretagem`; contar linhas antes do parse completo; limitar a 1000 transações e exibir no máximo 500 no preview; erros devem informar linha, coluna, problema e exemplo; tipos aceitos são `buy`, `sell`, `dividend`, `jcp` e `bonus`; ticker ausente no catálogo fica corrigível ou pulável; confirmar apenas linhas válidas e inserir com o `user_id` da sessão, nunca do CSV; invalidar posições após sucesso.

**Ask First:** alterar o contrato da migration 007, permitir quantidade zero, aceitar colunas adicionais obrigatórias ou adicionar dependência externa de parser/decodificação que mude o bundle significativamente.

**Never:** inserir linhas inválidas, confiar apenas na FK para validar ticker, expor service role key no frontend, fazer importação parcial silenciosa, alterar a migration 007 ou substituir o recálculo server-side por cálculo no cliente.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|----------------------------|----------------|
| CSV válido | Até 1000 linhas no formato brasileiro | Preview das linhas e confirmação em lote | N/A |
| Arquivo grande | 1001 ou mais transações | Rejeitado antes do parse completo | Mensagem com limite 1000 |
| Encoding/separador | BOM, acentos, `;`, decimal `,` | Valores aparecem corretamente no preview | Erro localizado se ilegível |
| Linha inválida | Data, tipo, número ou coluna ausente | Linha destacada e editável | Linha, coluna, problema e exemplo |
| Ticker desconhecido | Ativo fora de `assets` | Linha marcada para corrigir ou pular | Não confirmar enquanto inválida |
| Confirmação | Linhas válidas selecionadas | Inserção atômica e sucesso com contagem | Falha sem sucesso falso; manter preview |

</frozen-after-approval>

## Code Map

- `src/modules/portfolio/components/CarteiraPage.tsx` -- ponto de entrada existente para a ação de importação e feedback pós-sucesso.
- `src/routes.tsx` -- rotas protegidas da carteira; deve receber a tela/fluxo de importação sem duplicar o `Layout`.
- `src/modules/portfolio/schemas/positionSchema.ts` -- parsing pt-BR e regras de datas/números a reutilizar ou extrair.
- `src/modules/portfolio/hooks/usePositions.ts` e `useAddPosition.ts` -- padrão de sessão, mutation e invalidação de query.
- `src/modules/portfolio/services/positionService.ts` -- padrão de service Supabase; o novo service deve inserir `transactions` em lote.
- `src/modules/portfolio/types.ts` -- contratos de posição existentes; adicionar tipos de transação/importação.
- `supabase/migrations/007_create_transactions.sql` -- contrato final de `transactions`, enum e trigger; somente leitura, sem alteração.
- `.env.example` e `src/vite-env.d.ts` -- documentar e tipar somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`; não criar segredo frontend.
- `package.json` -- dependências e comandos atuais (`pnpm test:run`, `pnpm lint`, `pnpm build`).

## Tasks & Acceptance

**Execution:**
- [x] `src/modules/portfolio/csv/*` -- parser, normalização de encoding/separador, schema e erros localizados -- validar o formato brasileiro antes da confirmação.
- [x] `src/modules/portfolio/types.ts` -- tipos de transação, linha de preview e payload -- manter contrato explícito com a migration 007.
- [x] `src/modules/portfolio/services/transactionsService.ts` -- validar tickers no catálogo e inserir linhas confirmadas em lote -- preservar RLS e atomicidade.
- [x] `src/modules/portfolio/hooks/useImportTransactions.ts` -- mutation autenticada e invalidação de `['portfolio','positions']` -- atualizar a carteira após o trigger.
- [x] `src/modules/portfolio/components/TransactionImportPage.tsx` e `CarteiraPage.tsx` -- upload, preview de 500 linhas, edição inline, seleção/pulo e estados acessíveis -- completar o fluxo sem importação parcial silenciosa.
- [x] `src/routes.tsx` -- rota protegida para importação -- manter navegação e layout existentes.
- [x] `.env.example` e `src/vite-env.d.ts` -- documentar/tipar as variáveis públicas usadas pelo Supabase -- impedir configuração insegura.
- [x] `src/modules/portfolio/**/__tests__/*` -- cobrir limite, encoding, decimal, erros localizados, ticker desconhecido e confirmação -- provar a matriz de edge cases.

**Acceptance Criteria:**
- Dado um CSV brasileiro válido, quando o usuário corrige ou confirma o preview, então somente as linhas selecionadas são inseridas em `transactions` e a carteira é atualizada.
- Dado um arquivo acima de 1000 linhas, quando selecionado, então o fluxo informa o limite antes do parse completo e não envia dados.
- Dada uma linha inválida ou ticker desconhecido, quando o preview é exibido, então o erro informa linha/coluna/problema/exemplo e a linha pode ser corrigida ou pulada.
- Dado um usuário autenticado, quando confirma a importação, então o payload usa o usuário da sessão e nunca aceita `user_id` do arquivo.
- Dada uma falha no INSERT, quando a confirmação termina, então o fluxo mostra erro sem declarar sucesso nem ocultar o preview.

## Verification

**Commands:**
- `pnpm test:run` -- expected: testes de CSV e regressão passam.
- `pnpm lint` -- expected: sem erros novos.
- `pnpm build` -- expected: TypeScript e Vite compilam.

## Suggested Review Order

**Fluxo de importação**

- A tela coordena upload, preview, correção, seleção e confirmação.
  [TransactionImportPage.tsx:30](../../src/modules/portfolio/components/TransactionImportPage.tsx#L30)

- A carteira oferece a entrada do fluxo sem duplicar sua lógica de upload.
  [CarteiraPage.tsx:125](../../src/modules/portfolio/components/CarteiraPage.tsx#L125)

**Parsing e validação**

- O parser normaliza encoding, formato brasileiro, datas e limites antes da gravação.
  [csvParser.ts:103](../../src/modules/portfolio/csv/csvParser.ts#L103)

- O service valida o catálogo e preserva a seleção antes do lote autenticado.
  [transactionsService.ts:16](../../src/modules/portfolio/services/transactionsService.ts#L16)

**Persistência e integração**

- A mutation usa a sessão e invalida posições após o trigger server-side.
  [useImportTransactions.ts:14](../../src/modules/portfolio/hooks/useImportTransactions.ts#L14)

- A rota mantém o importador dentro da proteção e do layout da carteira.
  [routes.tsx:37](../../src/routes.tsx#L37)

**Provas e configuração**

- Os testes cobrem encoding, limite, preview, erros localizados e datas inválidas.
  [csvParser.test.ts:1](../../src/modules/portfolio/csv/csvParser.test.ts#L1)

- A configuração documenta somente credenciais públicas do cliente Supabase.
  [.env.example:3](../../.env.example#L3)