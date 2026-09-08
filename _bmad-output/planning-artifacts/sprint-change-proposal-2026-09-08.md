# Sprint Change Proposal — Valora

**Data:** 2026-09-08
**Autor:** correct-course (modo Batch)
**Épico afetado:** Épico 2 — Gestão Completa de Carteira
**Story gatilho:** 2.1 — Catálogo de Ativos e Histórico de Preços Seed
**Classificação de escopo:** Moderado (reorganização de backlog + emenda a duas decisões de arquitetura ADOPTED)

---

## 1. Resumo do problema

Ao iniciar a implementação da Story 2.1, uma auditoria do banco hospedado
(`valorainvest`, ref `zawjqzekqfnmvwglahnk`) revelou que o estado real do projeto
divergia simultaneamente do repositório, do PRD e da arquitetura. A Story estava
marcada `in-progress` no `sprint-status.yaml`, mas o trabalho existente não podia
satisfazer seu critério de aceitação por razões estruturais, não por falta de esforço.

### Como foi descoberto

A investigação começou por uma pergunta de escolha de provedor de cotação
(questão aberta #1 da arquitetura). Ao validar os candidatos, o primeiro deles
revelou-se inválido, e o rastro levou ao estado do banco.

### Evidências

| Achado | Evidência |
|---|---|
| Provedor inválido no catálogo | 27 dos 52 ativos (todo o lado BR: `stock_br` + `fii` + `bdr`) com `quote_provider = 'ibovfinancials'`. O domínio é um espelho ripado do site do Alpha Vantage servido sob outro host; não respondeu a requisição |
| Seed a 0,25% do AC | 32 linhas em `price_history` contra ~12.500 esperadas (51 tickers × ~250 dias úteis). 1 a 2 dias por ticker |
| Duas Edge Functions vazias | `sync-br-assets` (v3) e `sync-market-data` (v12): bundles de 516 bytes, sourcemap com `"sources":[]` e `"mappings":""`. Zero código executável |
| Terceira function incapaz por design | `sync-global-assets` chama `finnhub.io/api/v1/quote` e `coingecko/simple/price` — cotação do instante. Grava `date: new Date()`, uma linha por execução, com `open=high=low=close` para cripto |
| Finnhub free não serve | Os 18 ativos US/REIT via Finnhub tinham exatamente 1 dia cada. O endpoint de candles históricos é pago |
| Repo não era fonte de verdade | `supabase_migrations.schema_migrations` não existia: nenhuma migration do diretório havia sido aplicada via CLI |
| Coluna obrigatória ausente | `assets` sem `currency`, exigida pela arquitetura e necessária à exposição internacional (Story 2.4) |
| TRUNCATE não é interceptado por RLS | Verificado em Postgres 15: com RLS ativo e policy só de SELECT, `INSERT` é bloqueado, `DELETE` filtra para zero linhas, e `TRUNCATE` zera a tabela |
| Causa raiz dos grants | `pg_default_acl` do Supabase concede `arwdDxtm` a `anon` e `authenticated` em toda tabela nova do schema `public`. É default de plataforma, não descuido |
| Functions publicamente invocáveis | As três com `verify_jwt = false`, escrevendo no banco e consumindo cota de API de terceiros |
| Fonte do AD-12 com quota estourada | AwesomeAPI retornou `HTTP 429 QuotaExceeded` |
| Yahoo Finance descartado | `HTTP 429` na primeira chamada, sem histórico de uso |
| Modelagem incorreta | `USD-BRL` cadastrado como ativo `type = 'crypto'`, o que o faria contar como criptomoeda na exposição internacional e permitiria cadastrar posição em moeda |

### Categoria do problema

**Limitação técnica descoberta durante a implementação**, combinada com **drift de
infraestrutura não rastreado**. Não é mudança de requisito nem pivô estratégico: o
que o PRD e a arquitetura pedem continua correto e desejável. O que mudou é o
conhecimento sobre quais fontes de dados podem entregá-lo.

---

## 2. Análise de impacto

### Impacto em épicos

**Épico 2 (in-progress) — permanece viável, sem mudança de escopo.** A Story 2.1
precisa ser dividida: a parte de schema e catálogo está concluída e validada; a
parte de histórico de 12 meses está bloqueada por credencial de API.

Consequência positiva: **a Story 2.2 (Adicionar Posição Manual) está destravada
agora**, porque ela depende apenas de `assets` para validar ticker, e o catálogo
está completo. Hoje ela está `backlog` esperando uma 2.1 que só está parcialmente
bloqueada.

**Épico 3 (Proventos e Patrimônio) — impacto direto.** A Story 3.1 pede seed de
dividendos. O plano gratuito da brapi **não inclui dados de dividendos** (confirmado
na tabela de limites do provedor). Isso não bloqueia o épico hoje, mas define uma
decisão futura: assinar o plano Startup (R$ 1.199,90/ano, que também sobe o histórico
de 3 meses para 1 ano) ou manter dividendos sintéticos no MVP.

**Épico 4 (Rentabilidade) — risco mitigado preventivamente.** A Story 4.1 (retorno
total) exige preço ajustado por proventos. A coluna `adjusted_close` foi adicionada
agora porque a brapi já a devolve de graça; coletá-la depois exigiria reingerir 12
meses × 51 ativos.

**Épicos 5 e 6 — sem impacto.**

**Ordem e prioridade — sem mudança.**

### Conflitos com artefatos

| Artefato | Seção | Conflito |
|---|---|---|
| Arquitetura | **AD-6** (RLS Strategy) | Manda tabelas públicas **sem RLS**. O banco tem RLS ativo com policy de SELECT. O banco está mais seguro que o documento |
| Arquitetura | **AD-12** (AwesomeAPI) | Fonte primária retornando 429. Existe alternativa oficial, gratuita e sem quota |
| Arquitetura | **Dados Externos (MVP)** | Diz "Cotações BR/Fundamentals: dados seed/mock — v2 integra Brapi, Alpha Vantage". Alpha Vantage é inviável (25 req/dia) |
| Arquitetura | **Questão aberta #1** | Pode ser fechada: há resposta empírica |
| Arquitetura | Schema `assets` | Falta `quote_provider`, `provider_symbol`, `active` |
| Arquitetura | Schema `price_history` | Falta `adjusted_close` |
| PRD | **FR-23** | "série diária **simulada**", `source = 'seed'`. Agora é dado real com procedência por provedor |
| PRD | **NFR-9** (`<30s`) | Válido para aplicar `seed.sql`. Inviável para ingestão via API: só os 18 ativos US no free do Twelve Data (8 créditos/min) levam ~2,5 min |
| PRD | Questão aberta #1 | Mesma resposta da arquitetura |
| Epics | Story 2.1 AC / AR-7 | O texto de `AR-7` (linha 191) reproduz a formulação antiga do AD-6 ("tabelas públicas sem RLS") e precisa da mesma emenda. O rótulo em si está correto — ver §4.10 |
| `stories-detailed.md` | Story 2.1 | Descreve "Criar Tabelas Transactions e Positions com RLS" e referencia uma "Story 0.1" inexistente. Conflita com `epics.md`, que o `sprint-status.yaml` segue |

### Impacto em UI/UX

Nenhum. Não há artefato de UX no projeto, e a mudança é de camada de dados.
A rastreabilidade exigida pelo PRD (§4.9, tooltip com fonte e data) fica **mais
rica**: em vez de `source = 'seed'` uniforme, cada linha carrega o provedor real.

### Impacto em outros artefatos

- **`supabase/functions/`** passou a existir no repositório. Três functions foram
  recuperadas do servidor via Management API e documentadas.
- **`supabase/migrations/`** ganhou `003` (reconciliação) e `004` (endurecimento de
  privilégios), ambas aplicadas e registradas em `supabase_migrations.schema_migrations`.
- **`.gitignore`** passou a excluir `.backup-supabase-*/`, que contém e-mails.
- **Sem CI/CD, IaC, monitoramento ou estratégia de testes** para tocar — o projeto
  não os tem. Ausência de teste automatizado no banco é dívida conhecida, fora do
  escopo desta correção.

---

## 3. Caminho recomendado

### Opção 1 — Ajuste direto ✅ **ESCOLHIDA**

Dividir a Story 2.1, adicionar uma story para reimplementar a ingestão, e emendar
duas decisões de arquitetura. Escopo do MVP intacto.
**Esforço:** Baixo para o backlog, Médio para a nova story. **Risco:** Baixo.

### Opção 2 — Rollback ❌ Não viável

Não há o que reverter com proveito. As duas functions relevantes são stubs vazios;
a terceira nunca produziu o dado exigido. O Épico 1 está sólido e não é tocado.
Reverter só destruiria o trabalho já corrigido nesta sessão.

### Opção 3 — Revisão de MVP ❌ Desnecessária

O MVP continua alcançável sem redução de escopo. As metas do PRD não dependiam da
escolha de provedor, que o próprio PRD já classificava como questão aberta de v2.

### Justificativa

O problema é de **fonte de dados e rastreamento de infraestrutura**, não de produto.
O PRD estava certo ao prever seed no MVP; a arquitetura estava certa ao deixar o
provedor como questão aberta. O que falhou foi o trabalho de implementação ter
seguido por um provedor inválido sem validação, e o banco ter divergido do repo sem
detecção. Ambos foram corrigidos. O que resta é ajustar o backlog para refletir a
realidade e registrar as decisões que agora têm resposta empírica.

---

## 4. Propostas de mudança detalhadas

### 4.1 Arquitetura — AD-6: RLS Strategy

**ANTES:**
> - **Tabelas públicas (sem RLS):** `assets`, `price_history`, `dividends`, `fundamentals`, `benchmarks`. Dados de mercado compartilhados, inseridos via service role, leitura livre para usuários autenticados.
>
> **Prevents:** RLS em tabelas públicas degradando performance desnecessariamente.
> **Rule:** [...] Tabela contém dado de mercado/seed compartilhado → sem RLS, acesso via `anon` ou `authenticated` role com SELECT apenas.

**DEPOIS:**
> - **Tabelas de mercado (RLS ativo, policy permissiva de leitura):** `assets`, `price_history`, `dividends`, `fundamentals`, `benchmarks`. Dados compartilhados, escritos apenas via service role. `CREATE POLICY ... FOR SELECT TO authenticated USING (true)`. `anon` não recebe grant.
>
> **Prevents:** Exposição de escrita por GRANT concedido inadvertidamente. `TRUNCATE` executável por role de cliente.
> **Rule:** Toda tabela do schema `public` tem RLS habilitado, sem exceção. Tabela de dado de usuário → policy por `user_id = auth.uid()`. Tabela de mercado → policy `SELECT ... USING (true)` para `authenticated`, e nenhum grant de escrita.

**Racional:** o `pg_default_acl` do Supabase concede `arwdDxtm` a `anon` e
`authenticated` em toda tabela nova do `public`. Sem RLS, esses grants viram escrita
imediata. Com RLS, INSERT/UPDATE/DELETE ficam barrados mesmo com o grant presente.
O custo de performance citado no "Prevents" original não se materializa numa policy
`USING (true)`, que o planner resolve trivialmente. Ressalva registrada: RLS **não**
cobre `TRUNCATE` — daí a migration `004`, que remove TRUNCATE dos default privileges.

---

### 4.2 Arquitetura — AD-12: Cotação USD

**ANTES:**
> **AD-12: AwesomeAPI Integration (Cotação USD)**
> **Binds:** Client-side fetch de `https://economia.awesomeapi.com.br/json/last/USD-BRL` via TanStack Query.

**DEPOIS:**
> **AD-12: Cotação USD/BRL — BCB PTAX com fallback**
> **Binds:** Fonte primária **BCB PTAX** (`olinda.bcb.gov.br/olinda/servico/PTAX/...`), oficial, sem chave e sem quota. AwesomeAPI como fallback secundário. `staleTime` 1h. Fallback final R$ 5,00.
> **Rule:** Hook `useUSDRate()` encapsula a cadeia BCB → AwesomeAPI → localStorage → R$ 5,00. PTAX publica **apenas em dia útil**: fim de semana e feriado devem usar a última cotação disponível, não falhar. Badge "taxa USD aproximada" quando cair para fallback.

**Racional:** AwesomeAPI retornou `429 QuotaExceeded`. O BCB respondeu 200 na mesma
janela. O fallback de R$ 5,00 foi **confirmado adequado**: PTAX de 03/09 fechou em
5,1253, e cross-check independente via CoinGecko deu 5,092.

**Item pendente de verificação:** não foi confirmado se o endpoint Olinda devolve
cabeçalho CORS para fetch de browser. Se não devolver, a chamada precisa passar por
Edge Function, o que contraria o "client-side fetch" do AD-12. **Requer teste antes
da Story 2.3.**

---

### 4.3 Arquitetura — Dados Externos (MVP)

**ANTES:**
> - **Cotação USD:** AwesomeAPI — gratuita, sem auth
> - **Cotações BR/Fundamentals:** Dados seed/mock (50 ativos) — v2 integra Brapi, Alpha Vantage

**DEPOIS:**
> | Classe | Provedor | Limite do free | Observação |
> |---|---|---|---|
> | `stock_br`, `fii`, `bdr` | **brapi** | 15.000 req/mês, 1 ticker/req, **histórico 3 meses**, sem dividendos | Único com cobertura B3 e licença clara |
> | `stock_us`, `reit` | **Twelve Data** Basic | 8 créditos/min, 800/dia | Licença "personal & non-commercial" — adequada a projeto acadêmico, **impeditiva se o projeto virar comercial**. Basic não cobre BVMF |
> | `crypto` | **CoinGecko** Demo/keyless | 100 calls/min | `market_chart&interval=daily` dá fechamento diário; OHLC diário não existe no free |
> | USD/BRL | **BCB PTAX** | sem quota | Oficial. Só dia útil |
>
> **Descartados:** Alpha Vantage (25 req/dia inviabiliza qualquer carga);
> Yahoo Finance (`HTTP 429` na primeira chamada); Finnhub para histórico (candles são pagos);
> `ibovfinancials` (espelho não-oficial, sem resposta).

---

### 4.4 Arquitetura — Schemas

Atualizar o bloco de `assets` para incluir `currency TEXT NOT NULL CHECK (currency IN ('BRL','USD'))`,
`quote_provider` (enum), `provider_symbol TEXT`, `active BOOLEAN`.

Atualizar o bloco de `price_history` para incluir `adjusted_close NUMERIC(18,4)`.

Registrar que o enum `asset_type` **não** contempla par de moedas: `USD-BRL` não é
ativo investível e não pertence a `assets`. A cotação do dólar é responsabilidade do
hook `useUSDRate()` (AD-12).

---

### 4.5 Arquitetura e PRD — fechar questão aberta #1

**ANTES:** "Qual API de cotação externa usar em v2? Candidatas: Brapi, Alpha Vantage, Yahoo Finance."

**DEPOIS:** **RESOLVIDA (2026-09-08).** brapi para B3, Twelve Data para US/REIT,
CoinGecko para cripto, BCB para câmbio. Ver tabela em §4.3. O impacto arquitetural
previsto se confirmou: os limites exigem **job de ingestão em batch**, não fetch
on-demand — o que a Story 2.1b endereça.

---

### 4.6 PRD — FR-23

**ANTES:**
> Tabela `price_history` contém série diária **simulada** (últimos 12 meses) para ativos seed.
> Dados marcados com flag `source = 'seed'` para rastreabilidade.

**DEPOIS:**
> Tabela `price_history` contém série diária dos últimos 12 meses para os ativos do catálogo,
> obtida de provedor real quando o plano gratuito cobre a janela, e simulada apenas no
> trecho não coberto.
> `source` carrega a procedência por linha: `'brapi' | 'twelvedata' | 'coingecko' | 'bcb' | 'synthetic'`.

**Racional:** dado real é estritamente melhor para validar Score, Preço-Teto e
retorno total, e a procedência por linha atende melhor o requisito de
rastreabilidade do §4.9 que um rótulo uniforme. O PRD já antecipava isso na nota
`[NOTE FOR PM]` de §4.9, que previa `source = 'api_brapi'`.

---

### 4.7 PRD — NFR-9

**ANTES:** "Seed scripts rodam em <30s para popular banco de dados inicial."

**DEPOIS:**
> - Aplicar `supabase/seed.sql` (catálogo + histórico já materializado) roda em <30s.
> - **Ingestão via API é job separado, não interativo, sem orçamento de 30s.** Os limites
>   dos planos gratuitos impõem o piso: 18 ativos US a 8 créditos/min no Twelve Data
>   levam ~2,5 min; 27 ativos BR a 1 ticker/req na brapi somam 27 chamadas.

---

### 4.8 Epics — dividir a Story 2.1

**ANTES:** Story 2.1 única, cobrindo schema + catálogo + histórico de 12 meses.

**DEPOIS:**

> **Story 2.1a: Schema e Catálogo de Ativos** — `done`
> **Given** o banco do ambiente de desenvolvimento
> **When** as migrations `003`/`004` e o `supabase/seed.sql` são aplicados
> **Then** `assets` contém 51 ativos com ticker, nome, tipo, moeda e provedor (FR-22)
> **And** `assets` e `price_history` têm RLS ativo com policy de SELECT para `authenticated` (AD-6)
> **And** `anon` não tem grant algum, e nenhum role de cliente tem `TRUNCATE`
> **And** o usuário consegue buscar ativo por ticker ou nome
> **And** aplicar o `seed.sql` completa em <30s (NFR-9)
>
> **Story 2.1b: Histórico de Preços de 12 Meses** — `blocked`
> **Given** o catálogo populado e as chaves de API configuradas
> **When** o job de ingestão é executado
> **Then** `price_history` contém série diária dos últimos 12 meses para os 51 ativos (FR-23)
> **And** cada linha registra a procedência em `source`
> **And** trechos não cobertos pelo plano gratuito são preenchidos por simulação ancorada
>   no primeiro fechamento real e marcados `source = 'synthetic'`
> **And** a reexecução é idempotente (`ON CONFLICT (ticker, date)`)
>
> **Bloqueio atual:** as chaves em `.env` são digests SHA-256 copiados da tela de
> secrets do Supabase, não os valores reais — brapi respondeu "Token de autenticação
> inválido", Finnhub `401`, CoinGecko `401 / 10002`. É preciso recopiar de
> `brapi.dev/dashboard` e criar conta no Twelve Data. **Cripto já concluída:** 6 ativos,
> 2.190 linhas, 365 dias cada, de 2025-09-09 a 2026-09-08, via CoinGecko keyless.

**Consequência para o sprint:** com 2.1a `done`, a **Story 2.2 fica destravada
imediatamente** — ela só precisa de `assets` para validar ticker.

---

### 4.9 Epics — nova Story 2.8

> **Story 2.8: Reimplementar Ingestão de Dados de Mercado**
>
> **As a** desenvolvedor,
> **I want** Edge Functions de ingestão que realmente funcionem e estejam versionadas,
> **So that** o histórico de preços possa ser semeado e mantido atualizado.
>
> **Acceptance Criteria:**
> **Given** as três functions atuais, das quais duas são stubs vazios e a terceira só
>   busca cotação instantânea
> **When** a ingestão é reimplementada
> **Then** existe função de carga histórica que busca janela de 12 meses por provedor
>   (brapi `range=1y&interval=1d`; Twelve Data `/time_series`; CoinGecko `/market_chart`)
> **And** existe função de refresh diário, distinta da carga histórica
> **And** o fonte está em `supabase/functions/` e é deployado via `supabase functions deploy`
> **And** `verify_jwt = true` em todas
> **And** os stubs `sync-br-assets` e `sync-market-data` são removidos ou implementados
>
> **Nota de segurança:** `verify_jwt` exige JWT válido do projeto, e a anon key **é**
> um JWT válido. Como a anon key é pública no bundle do frontend, `verify_jwt` bloqueia
> varredura anônima mas não quem leia o JS. Proteção real para função de ingestão exige
> segredo compartilhado próprio ou remoção do acesso público.

---

### 4.10 Epics — emendar AR-7 (correção desta proposta)

**Correção de premissa.** Uma versão anterior desta proposta afirmava que o rótulo
`AR-7`, citado no AC da Story 2.1, não existia na arquitetura, e propunha trocá-lo por
`AD-6`. Isso estava errado: o `epics.md` mantém sua própria lista `AR-1` a `AR-15`
(linhas 169–216), que reafirma as decisões da arquitetura para consumo dos épicos, e
`AR-7: RLS Strategy` cita `(AD-6)` internamente. A referência original estava correta
e foi preservada.

O ajuste necessário é de **conteúdo**, não de rótulo: o texto de `AR-7` reproduz a
formulação antiga do AD-6 e precisa da mesma emenda.

**ANTES (`epics.md` linha 191):**
> **AR-7: RLS Strategy**
> Tabelas privadas (RLS ativo): [...]
> Tabelas públicas (sem RLS): assets, price_history, dividends, fundamentals, benchmarks. Dados de mercado compartilhados (AD-6).

**DEPOIS:**
> **AR-7: RLS Strategy**
> Tabelas privadas (RLS ativo): [...]
> Tabelas de mercado (RLS ativo, policy permissiva de leitura): assets, price_history, dividends, fundamentals, benchmarks. Escritos apenas via service role. Policy: `FOR SELECT TO authenticated USING (true)`. O role `anon` não recebe grant (AD-6, emendado em 2026-09-08).
> Toda tabela do schema `public` tem RLS habilitado, sem exceção: os default privileges do Supabase concedem escrita a anon/authenticated em toda tabela nova, e sem RLS esses grants viram escrita real. Ressalva: RLS não intercepta `TRUNCATE` — ver migration `004`.

**Lição de processo:** o projeto mantém a mesma decisão em três lugares (`AD-6` na
arquitetura, `AR-7` nos epics, e o schema real no banco). Emendar um sem os outros foi
exatamente o que produziu o drift auditado. Qualquer emenda futura a uma decisão de
arquitetura precisa percorrer os três.

---

### 4.11 `stories-detailed.md` — resolver conflito

O arquivo descreve a Story 2.1 como "Criar Tabelas Transactions e Positions com RLS"
e referencia uma "Story 0.1" inexistente, conflitando com `epics.md`, que é o que o
`sprint-status.yaml` rastreia.

**Proposta:** marcar o arquivo como histórico (renomear para
`stories-detailed-DEPRECATED.md` com nota no topo) e **preservar** o conteúdo de
`recalculate_position()`, que é bom e pertence às Stories 2.2 e 2.5 — hoje ele só
existe nesse arquivo.

---

## 5. Handoff de implementação

**Classificação: Moderado.** Não há mudança de escopo de MVP nem rollback, mas duas
decisões de arquitetura `ADOPTED` são emendadas e o Épico 2 ganha uma story.

| Destinatário | Responsabilidade | Entregáveis |
|---|---|---|
| **Arquiteto** (`bmad-agent-architect`) | Emendar AD-6, AD-12, "Dados Externos", schemas, e fechar questão aberta #1 | §4.1 a §4.5 |
| **PM** (`bmad-agent-pm`) | Emendar FR-23 e NFR-9; fechar questão aberta #1 do PRD | §4.6, §4.7 |
| **PO / Dev** | Dividir 2.1 em 2.1a/2.1b, adicionar 2.8, corrigir rótulo, depreciar `stories-detailed.md`, atualizar `sprint-status.yaml` | §4.8 a §4.11 |
| **Samuel** | Recopiar chave da brapi de `brapi.dev/dashboard`; criar conta free no Twelve Data; decidir sobre plano Startup da brapi antes do Épico 3 | destrava 2.1b |
| **Dev** (`bmad-build`) | Implementar 2.1b e 2.8 | após credenciais |

### `sprint-status.yaml` — mudanças propostas

```yaml
epic-2: in-progress
  2-1a-schema-e-catalogo-de-ativos: done
  2-1b-historico-de-precos-12-meses: blocked
  2-2-adicionar-posição-manual: ready-for-dev   # destravada por 2.1a
  2-3-visualizar-lista-de-posições-com-rastreabilidade: backlog
  2-4-composição-por-classe-e-exposição-internacional: backlog
  2-5-importar-transações-via-csv: backlog
  2-6-lista-de-alertas-badge-e-geração-on-demand: backlog
  2-7-exportar-relatórios-em-csv: backlog
  2-8-reimplementar-ingestao-de-dados-de-mercado: backlog
```

### Critérios de sucesso

1. `assets` com 51 ativos, nenhum apontando para provedor inválido — **atingido e verificado**
2. Nenhum role de cliente com escrita ou `TRUNCATE` em tabela de mercado — **atingido e verificado**
3. Repo como fonte de verdade: `schema_migrations` populada — **atingido**
4. Fonte das Edge Functions versionada — **atingido**
5. `price_history` com 12 meses para os 51 ativos — **6 de 51** (só cripto)
6. AD-6, AD-12, FR-23, NFR-9 emendados — **pendente**

### Ação imediata

Nada bloqueia a **Story 2.2**. Ela pode entrar em desenvolvimento antes de 2.1b ser
destravada, porque depende apenas do catálogo.

---

## 6. Itens que permanecem em aberto

1. **CORS do endpoint Olinda do BCB** — não verificado. Decide se o AD-12 continua
   client-side. Testar antes da Story 2.3.
2. **Histórico da brapi no plano gratuito** — a documentação diz 3 meses; o sandbox
   devolveu 1 ano para os 4 tickers públicos. Só um token válido resolve, e isso define
   quantos meses precisarão ser sintéticos.
3. **Dividendos para o Épico 3** — ausentes do free da brapi. Decisão de custo antes
   da Story 3.1.
4. **Licença do Twelve Data** — o tier free é "personal & non-commercial". Adequado ao
   projeto acadêmico; se o Valora virar produto, exige troca de plano ou de provedor.
5. **Ausência de teste automatizado de banco** — as validações desta sessão foram
   manuais em container efêmero. Dívida conhecida, fora do escopo.
6. **`AGENTS.md` inexistente** — nenhum contexto de repositório para agentes.
   Sugerido rodar `bmad-project-context`.
