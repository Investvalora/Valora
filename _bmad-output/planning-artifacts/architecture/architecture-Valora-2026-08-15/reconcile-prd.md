# Reconciliação: PRD → Architecture Spine

## Gaps Arquiteturais Encontrados

### 1. **NFRs de Performance Não Endereçados na Spine**
- **PRD §8 NFRs:** Define métricas específicas de performance:
  - Carteira carrega 50 posições em ≤2s (p95)
  - Cálculo de Score para 50 ativos em ≤1s
  - Evolução de Patrimônio (1 ano) em ≤3s
  - Importação CSV preview <2s para 500 linhas
  - Histórico de proventos <2s para 500 registros
  - Gráfico de patrimônio <3s para 365 pontos
  - Job de alertas <5s para 50 ativos
  - Preço-Teto cálculo <2s para 50 ativos
  - Tela de detalhe de ativo <2s
  - Transição entre telas <500ms
  - Exportar CSV de 1000 linhas <2s
  - Seed scripts <30s

**Spine não menciona:** Estratégias de otimização, índices adicionais além dos básicos, estratégia de query batching, ou considerações de cache no TanStack Query (apenas menciona staleTime 5min para score).

**Sugestão:** Adicionar seção "Performance Strategy" na spine ou expandir AD-3 (TanStack Query) com configurações de cache específicas (staleTime, gcTime) por módulo.

---

### 2. **Segurança — JWT e Bcrypt Mencionados no PRD mas Não Detalhados na Spine**
- **PRD §4.1 NFRs:** "Senhas armazenadas com hash bcrypt (gerenciado por Supabase Auth)" e "Tokens JWT assinados e verificados server-side quando necessário".
- **PRD §8 NFRs Segurança:** "Tokens JWT verificados em Route Handlers sensíveis", "`SUPABASE_SERVICE_ROLE_KEY` nunca exposta ao frontend".

**Spine menciona:** AD-6 RLS Strategy, mas não detalha verificação JWT em Edge Functions ou boas práticas de secrets management.

**Sugestão:** Adicionar AD de segurança específico ou nota em AD-10 (Deploy) sobre variáveis de ambiente sensíveis e quando usar service role vs anon key.

---

### 3. **Observabilidade — Sentry Mencionado mas Marcado como Deferred**
- **PRD §8 NFRs Observabilidade:** "Sentry ou similar para captura de erros frontend (a ser configurado)."
- **Spine Deferred §:** "Logging e Observabilidade: MVP usa `console.log` + Supabase logs básicos. v2: Sentry (erros frontend), Datadog/LogRocket (full-stack)."

**Gap:** Spine corretamente marcou como deferred, mas PRD NFRs diz "a ser configurado" (implica MVP). Inconsistência entre documentos.

**Sugestão:** Alinhar — se Sentry é MVP, spine deve ter AD ou nota de implementação. Se é v2, PRD NFRs deve mover para §6.2 (Fora de Escopo).

---

### 4. **Compatibilidade de Navegadores — PRD Define, Spine Não Menciona**
- **PRD §8 NFRs Compatibilidade:** "Chrome, Firefox, Safari, Edge (últimas 2 versões)" e "Interface responsiva: desktop ≥1280px, tablet 768-1279px, mobile 375-767px."

**Spine não menciona:** Browsers suportados, estratégia de transpilação/polyfills (Vite config), ou breakpoints responsivos.

**Sugestão:** Adicionar seção "Browser Support & Responsiveness" na spine ou expandir Stack Técnica com configuração Vite de target browsers.

---

### 5. **Integração Externa — AwesomeAPI para USD Mencionada mas Não Arquitetada**
- **PRD §11 Decisões Arquiteturais #3:** "Conversão USD: API pública (AwesomeAPI ou similar) para taxa de câmbio real."
- **PRD §4.9 FR-22, §6.1:** Cotação USD via API pública (AwesomeAPI) para ativos internacionais.

**Spine menciona:** AD-10 "Dados Externos (MVP): Cotação USD: AwesomeAPI", mas não há:
  - Edge Function para fetch de USD (ou client-side?)
  - Estratégia de cache (TanStack Query? localStorage?)
  - Fallback se API falhar
  - Rate limit considerations

**Sugestão:** Adicionar detalhamento em AD ou criar `supabase/functions/fetch-usd-rate/` com especificação de cache strategy.

---

### 6. **Jobs/Workers — Geração de Alertas On-Demand vs Cron**
- **PRD §4.8 FR-21:** "Job executável via Supabase Edge Function agendada ou script manual no MVP."
- **PRD §9 Q3:** "Job de alertas on-demand no MVP; agendar em v2."

**Spine Open Questions §:** Corretamente lista Q3, mas não define arquitetura do job on-demand:
  - Botão na UI dispara Edge Function?
  - Timeout considerations (job pode demorar >10s em carteiras grandes)?
  - Como evitar execuções paralelas do mesmo user?

**Sugestão:** Adicionar nota em AD-4 (Realtime) ou criar novo AD "Jobs Strategy" definindo on-demand trigger via Edge Function com idempotency key.

---

### 7. **Estratégia de Testes — Mencionada como Deferred mas PRD Tem Critérios**
- **PRD §8 NFRs (implícito):** Todos os FRs têm "Consequências (testáveis)" definidas.
- **Spine Deferred §4:** "Estratégia de testes: MVP com testes mínimos (smoke tests Vitest). v2: coverage >70%, testes E2E Playwright."

**Gap:** PRD estrutura requisitos para serem testáveis, mas spine não define quais testes rodar no MVP. "Smoke tests" é vago.

**Sugestão:** Adicionar seção "Testing Strategy (MVP)" com lista de smoke tests críticos (ex: login, adicionar posição, calcular score, importar CSV) e comando de CI.

---

### 8. **Recuperação de Senha — PRD FR-4 Detalha, Spine Não Menciona**
- **PRD §4.1 FR-4:** "Link 'Esqueci minha senha' na tela de login aciona fluxo Supabase Auth de reset. Sistema envia email com link de recuperação (TTL 1 hora)."

**Spine menciona:** AD-1 a AD-10 não cobrem fluxo de password recovery. Supabase Auth gerencia, mas:
  - Qual template de email?
  - Redirect URL configurado onde?
  - Tela de reset password customizada ou default Supabase?

**Sugestão:** Adicionar nota em módulo `auth/` da estrutura frontend ou AD sobre configuração de Auth templates.

---

### 9. **Migrações de Schema — Não Endereçadas**
- **Spine:** Define schemas completos em §Database Schema, mas não menciona:
  - Estratégia de migração (Supabase CLI migrations?)
  - Versionamento de schema
  - Como evoluir tabelas em produção (v2+)
  - Rollback strategy

**Sugestão:** Adicionar seção "Database Migrations" ou nota em AD-10 sobre uso de `supabase/migrations/` e comando `supabase db push`.

---

### 10. **Ambiente de Desenvolvimento Local — Setup Não Documentado**
- **PRD §6.1:** MVP usa Supabase Cloud, mas developers precisam rodar local.
- **Spine:** Não menciona:
  - Supabase local via Docker? Ou sempre remote?
  - Como popular dados seed localmente?
  - Configuração de `.env.local` com keys de desenvolvimento

**Sugestão:** Adicionar seção "Local Development Setup" na spine com comandos de `supabase start`, seed, e env vars.

---

## Constraints Técnicas Bem Capturadas

- **AwesomeAPI para USD** → Mencionada em AD-10 e Stack Técnica, mas falta detalhamento (ver Gap #5).
- **Dados Seed 50 Ativos** → Bem coberto em Database Schema e Deferred §5.
- **RLS Strategy** → AD-6 detalha perfeitamente políticas privadas vs públicas.
- **Cálculos Híbridos Cliente-Servidor** → AD-5 define claramente responsabilidades.
- **Posições Independentes + Transações Opcionais** → AD-8 captura bem a decisão.

---

## Sugestões de Adição

### 1. **Novo AD: Performance & Caching Strategy**
Consolidar NFRs de performance do PRD com configurações de TanStack Query (staleTime, gcTime por módulo), índices Postgres adicionais se necessário, e estratégia de lazy loading.

### 2. **Novo AD: Security & Secrets Management**
Definir quando usar `anon` vs `service_role` key, verificação JWT em Edge Functions sensíveis, e boas práticas de variáveis de ambiente.

### 3. **Seção: Testing Strategy (MVP)**
Lista de smoke tests, comandos de CI (`pnpm test`, `pnpm test:e2e`), e threshold de cobertura mínimo (ex: 40% para MVP).

### 4. **Seção: Local Development Setup**
Comandos para iniciar Supabase local, popular seed, e configurar `.env.local`.

### 5. **Expandir AD-10 (Deploy)**
Adicionar ambientes de desenvolvimento (local, staging, production), configuração de Supabase projects separados, e CI/CD com GitHub Actions (PR preview, deploy on merge).

### 6. **Nota em Módulo `auth/`**
Configuração de Supabase Auth templates (email de confirmação, password recovery), redirect URLs, e TTL de tokens.

---

## Resumo Executivo

**Gaps Críticos (Bloquers para Implementação):**
1. **Performance strategy** — Spine não define como atingir NFRs de <2s, <3s.
2. **AwesomeAPI integration** — Mencionada mas não arquitetada (client vs server, cache, fallback).
3. **Local dev setup** — Developers precisam saber como rodar localmente.
4. **Jobs on-demand** — Geração de alertas não tem trigger definido.

**Gaps Médios (Podem ser Resolvidos em Implementação):**
5. **Testing strategy** — "Smoke tests" muito vago, precisa lista.
6. **Migrações de schema** — Processo não documentado.
7. **Recuperação de senha** — Flow existe (Supabase) mas customização não definida.

**Gaps Menores (Documentação/Clareza):**
8. **Observabilidade** — Sentry marcado como deferred na spine mas "a ser configurado" no PRD.
9. **Browser compatibility** — PRD define, spine não menciona transpilação.
10. **Security details** — JWT e bcrypt mencionados mas práticas não expandidas.

**Alignment Score: 7.5/10** — Spine cobre bem decisões arquiteturais macro (monolito modular, Zustand, RLS, cálculos híbridos), mas falta detalhamento operacional (performance, local dev, jobs, integrações externas).
