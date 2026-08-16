# Valora MVP - Histórias Detalhadas

**Data:** 2026-08-15  
**Status:** Em criação  
**Baseado em:** epics-first-principles.md + edge-cases-critical.md + architecture-decisions-panel.md

---

## Epic 1: Fundação e Autenticação

**FRs Cobertos:** FR-1, FR-2, FR-3, FR-4, FR-27
**Estimativa Total:** 3 dias  
**Objetivo:** Usuários podem criar conta, fazer login/logout, recuperar senha e acessar sistema protegido por autenticação.

---

### Story 1.1: Setup Projeto e Autenticação Básica Supabase

🔴 **BLOCKS** — Todas as outras histórias dependem do setup inicial

**As a** desenvolvedor,
**I want** configurar o projeto Vite + React + TypeScript + Supabase com autenticação básica funcional,  
**So that** posso começar a desenvolver features em cima de uma base técnica sólida.

**Acceptance Criteria:**

✅ **AC-1.1.1: Projeto Vite + React inicializado**
**Given** repositório vazio  
**When** executar setup inicial  
**Then** projeto Vite 5.x + React 18.3.x + TypeScript 5.5.x criado  
**And** `npm run dev` inicia servidor desenvolvimento porta 5173  
**And** hot-reload funcional

✅ **AC-1.1.2: Supabase configurado**  
**Given** projeto inicializado  
**When** configurar Supabase client  
**Then** `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`  
**And** `src/lib/supabase.ts` com cliente inicializado  
**And** conexão com Supabase Cloud testada

✅ **AC-1.1.3: Tabela users criada com RLS**  
**Given** Supabase configurado  
**When** executar migration inicial  
**Then** tabela `users` criada com campos:
- `id` UUID PRIMARY KEY (referencia `auth.users`)
- `email` TEXT UNIQUE NOT NULL
- `full_name` TEXT
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()

**And** RLS habilitado:
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

✅ **AC-1.1.4: Auth básica funcional**  
**Given** tabela `users` criada  
**When** usuário faz signup via `supabase.auth.signUp()`  
**Then** registro criado em `auth.users`  
**And** email confirmação enviado (modo dev: auto-confirm)  
**And** sessão JWT retornada

**Edge cases:**
- 🟡 Email 254 caracteres: layout não quebra, validação aceita ≤254

**Estimativa:** 1 dia

---

### Story 1.2: Estrutura Módulos + State Management + Routing

🟡 **SOFT DEPENDENCY** — Precisa Story 1.1 (setup), mas pode usar mocks

**As a** desenvolvedor,  
**I want** estrutura de pastas modular + Zustand (auth) + React Router configurados,  
**So that** o código seja organizado e escalável desde o início.

**Acceptance Criteria:**

✅ **AC-1.2.1: Estrutura de pastas modular**  
**Given** projeto inicializado  
**When** criar estrutura de módulos  
**Then** estrutura criada:
```
src/
├── modules/
│   ├── auth/           # Epic 1
│   ├── portfolio/      # Epic 2
│   ├── analysis/       # Epic 3 (wealth+dividends+performance)
│   ├── valuation/      # Epic 4 (score+pricing)
│   ├── alerts/         # Epic 5
│   └── assets/         # Epic 6
├── shared/
│   ├── components/     # UI compartilhado
│   ├── hooks/          # Custom hooks
│   └── utils/          # Helpers
├── lib/
│   └── supabase.ts     # Client Supabase
└── App.tsx
```

✅ **AC-1.2.2: Zustand store auth configurado**  
**Given** estrutura criada  
**When** implementar `src/modules/auth/store.ts`  
**Then** store Zustand com:
```ts
interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
}
```

**And** `signOut()` limpa sessão Supabase + state local

✅ **AC-1.2.3: React Router 6.x configurado**  
**Given** Zustand configurado  
**When** implementar routing  
**Then** rotas criadas:
- `/` → redirect `/dashboard` se autenticado, senão `/login`
- `/login` → página login (Story 1.3)
- `/signup` → página cadastro (Story 1.3)
- `/dashboard` → protegida, placeholder "Dashboard"

**And** `<ProtectedRoute>` wrapper valida `authStore.session`  
**And** redirect automático se não autenticado

✅ **AC-1.2.4: ADR-003 State Management aplicado**  
**Given** estrutura completa  
**When** revisar state management  
**Then** Zustand usado **apenas** para:
- Auth session (authStore)
- User preferences (futuro)

**And** React Query **não** usado ainda (Epic 2+)  
**And** `useState` para UI state local

**Estimativa:** 1 dia

---

### Story 1.3: Telas Login, Signup e Recuperação Senha

🟡 **SOFT DEPENDENCY** — Precisa Story 1.1 (auth) + 1.2 (routing)

**As a** usuário não autenticado,  
**I want** fazer login, criar conta e recuperar senha,  
**So that** possa acessar o sistema de forma segura.

**Acceptance Criteria:**

✅ **AC-1.3.1: Tela Login funcional**  
**Given** usuário em `/login`  
**When** preencher email + senha válidos e submeter  
**Then** `supabase.auth.signInWithPassword()` chamado  
**And** em sucesso: redirect `/dashboard` + session salva em `authStore`  
**And** em erro: toast "Email ou senha inválidos"

**Edge cases:**
- 🟡 Nome com apenas espaços: `.trim()` aplicado, valida `required`

✅ **AC-1.3.2: Tela Signup funcional**  
**Given** usuário em `/signup`  
**When** preencher email + senha + nome completo e submeter  
**Then** `supabase.auth.signUp()` chamado  
**And** em sucesso: mensagem "Confirme seu email" (prod) ou auto-login (dev)  
**And** em erro: toast com mensagem erro Supabase

**And** validações frontend:
- Email formato válido
- Senha ≥8 caracteres
- Nome não vazio após trim

✅ **AC-1.3.3: Recuperação senha funcional**  
**Given** usuário clica "Esqueci minha senha" em `/login`  
**When** digitar email e submeter  
**Then** `supabase.auth.resetPasswordForEmail()` chamado  
**And** mensagem "Email enviado com instruções"  
**And** link reset redireciona `/reset-password` (Story futura v2)

✅ **AC-1.3.4: CSS mínimo aplicado (ADR polish v2)**  
**Given** telas criadas  
**When** aplicar estilos  
**Then** TailwindCSS 3.4.x dark-only:
- Formulários centralizados, max-width 400px
- Inputs com border, padding, focus state
- Botões primary style
- Toast notifications com react-hot-toast

**And** **sem design system completo** (polish v2)

**Estimativa:** 0.5 dia

---

### Story 1.4: Banner "Dados Simulados" e Persistência Session

🟢 **INDEPENDENT** — Pode ser desenvolvida em paralelo

**As a** usuário logado,  
**I want** ver banner informando que dados são simulados + sessão persistir entre reloads,  
**So that** saiba que está em ambiente MVP e não precise relogar a cada refresh.

**Acceptance Criteria:**

✅ **AC-1.4.1: Banner dados simulados**  
**Given** usuário autenticado em `/dashboard`  
**When** página carrega  
**Then** banner topo da página:
- Texto: "⚠️ MVP: Dados simulados para demonstração"
- Cor: amarelo warning
- Dismissible com `localStorage` (não reaparece após fechar)

✅ **AC-1.4.2: Persistência sessão Supabase**  
**Given** usuário autenticado  
**When** recarregar página (F5)  
**Then** sessão recuperada via `supabase.auth.getSession()`  
**And** `authStore` populado automaticamente  
**And** usuário permanece em `/dashboard` (não redirect `/login`)

✅ **AC-1.4.3: Listener auth state changes**  
**Given** app inicializado  
**When** setup `supabase.auth.onAuthStateChange()`  
**Then** listener atualiza `authStore` em:
- Login
- Logout
- Token refresh
- Session expired

**And** redirect `/login` se session expired

**Estimativa:** 0.5 dia

---

## Epic 1 Summary

**Total Histórias:** 4  
**Estimativa Total:** 3 dias  
**FRs Cobertos:** FR-1 (Cadastro), FR-2 (Login), FR-3 (Recuperação senha), FR-4 (Proteção rotas), FR-27 (Banner dados simulados)

**Dependências:**
- 🔴 Story 1.1 BLOCKS todas
- 🟡 Story 1.2 depende 1.1
- 🟡 Story 1.3 depende 1.1 + 1.2
- 🟢 Story 1.4 independente (pode rodar paralelo)

**Tabelas Criadas:**
- `users` (Story 1.1) com RLS

---

## Story 0.1: Spike Técnico PL/pgSQL vs Edge Function

🟡 **SOFT DEPENDENCY** — Precisa Epic 1 completo (Supabase configurado), mas não bloqueia Epic 2

**As a** time de desenvolvimento,  
**I want** comparar implementação PL/pgSQL vs Edge Function TypeScript em função real,  
**So that** possamos decidir qual abordagem usar no Epic 4 (Valuation Engine) com base em dados reais de latência, DX e confiança do time.

**Acceptance Criteria:**

✅ **AC-0.1.1: Implementar safe_divide em PL/pgSQL**  
**Given** Supabase configurado (Story 1.1)  
**When** criar migration `supabase/migrations/spike_safe_divide.sql`  
**Then** function PL/pgSQL criada:

```sql
CREATE OR REPLACE FUNCTION safe_divide(
  numerator NUMERIC,
  denominator NUMERIC,
  default_value NUMERIC DEFAULT NULL
) RETURNS NUMERIC AS $$
BEGIN
  IF denominator = 0 OR denominator IS NULL THEN
    RETURN default_value;
  END IF;
  RETURN numerator / denominator;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**And** testes inline executados:
```sql
SELECT 
  safe_divide(10, 2) as normal,           -- expect: 5
  safe_divide(10, 0) as div_zero,         -- expect: NULL
  safe_divide(10, 0, -1) as with_default, -- expect: -1
  safe_divide(10, NULL) as div_null;      -- expect: NULL
```

**Edge cases:**
- 🔴 Divisão por zero: retorna `default_value` ou NULL (não erro)
- 🟡 Fundamental NULL: propaga NULL

✅ **AC-0.1.2: Implementar safe_divide em Edge Function TypeScript**  
**Given** Supabase configurado  
**When** criar `supabase/functions/safe-divide/index.ts`  
**Then** Edge Function implementada:

```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

interface DivideRequest {
  numerator: number;
  denominator: number;
  defaultValue?: number | null;
}

serve(async (req) => {
  const { numerator, denominator, defaultValue = null }: DivideRequest 
    = await req.json();
  
  if (denominator === 0 || denominator === null) {
    return new Response(
      JSON.stringify({ result: defaultValue }), 
      { headers: { "Content-Type": "application/json" } }
    );
  }
  
  return new Response(
    JSON.stringify({ result: numerator / denominator }), 
    { headers: { "Content-Type": "application/json" } }
  );
});
```

**And** deploy em Supabase  
**And** teste manual via POST request funcional

✅ **AC-0.1.3: Benchmark latência (100 chamadas)**  
**Given** ambas implementações funcionais  
**When** executar script benchmark:
- 100 chamadas PL/pgSQL via `supabase.rpc('safe_divide', {numerator: 10, denominator: 2})`
- 100 chamadas Edge Function via `fetch()`
- Medir: latência média (avg), p99, cold start Edge Function

**Then** resultados registrados em tabela:

| Métrica | PL/pgSQL | Edge Function |
|---------|----------|---------------|
| Latência avg | ___ms | ___ms |
| Latência p99 | ___ms | ___ms |
| Cold start | N/A | ___s |

✅ **AC-0.1.4: Survey confiança time**  
**Given** implementações concluídas  
**When** devs A e B preenchem auto-avaliação  
**Then** métricas coletadas:
- Tempo real implementação (horas): PL/pgSQL ___ h, TypeScript ___ h
- Facilidade debug (1-5): PL/pgSQL ___, TypeScript ___
- Confiança escalar para Epic 4 (1-5): PL/pgSQL ___, TypeScript ___

✅ **AC-0.1.5: Decisão documentada em spike-plpgsql-results.md**  
**Given** todas métricas coletadas  
**When** aplicar critério decisão:

```
SE (tempo_impl_plpgsql / tempo_impl_typescript) < 2.0
   E confianca_plpgsql >= 3
   E latencia_plpgsql < 500ms
ENTÃO manter ADR-001 (Postgres Functions)
SENÃO pivotar para Edge Functions TypeScript
```

**Then** documento criado em `_bmad-output/planning-artifacts/spike-plpgsql-results.md` com:
- Tabela métricas completa
- Decisão: **manter ADR-001** ou **pivotar para TypeScript**
- Impacto: quais histórias Epic 4 mudam (4.1, 4.2, 4.3, 4.4)
- Rationale da decisão

**Edge cases:**
- 🟡 Se equipe travada >4h em PL/pgSQL: considerar pivotar mesmo sem completar benchmark

**Estimativa:** 2 dias (1.5d dev paralelo)

---

## Story 0.1 Summary

**Objetivo:** Validar ADR-001 antes de comprometer Epic 4  
**Quando executar:** Entre Epic 1 e Epic 4 (não bloqueia Epic 2)  
**ROI esperado:** +5.5 dias (economiza 7.5d risco - 2d custo)  
**Entregáveis:**
1. `supabase/migrations/spike_safe_divide.sql`
2. `supabase/functions/safe-divide/index.ts`
3. Script benchmark latência
4. `spike-plpgsql-results.md` com decisão

**Impacto em Epic 4:**
- **Se PL/pgSQL vence:** Histórias 4.1-4.4 mantêm Postgres Functions
- **Se TypeScript vence:** ADR-001 atualizado, histórias 4.1-4.4 refatoradas para Edge Functions

---

## Epic 2: Gestão de Carteira e Posições

**FRs Cobertos:** FR-5, FR-6, FR-7, FR-8, FR-9
**Estimativa Total:** 5 dias  
**Objetivo:** Usuários cadastram posições manualmente ou via CSV, visualizam carteira consolidada com custo médio e quantidade atualizada.

---

### Story 2.1: Criar Tabelas Transactions e Positions com RLS

🟡 **SOFT DEPENDENCY** — Precisa Story 1.1 (setup Supabase), mas pode rodar paralelo com Story 0.1

**As a** desenvolvedor,  
**I want** criar tabelas `transactions` e `positions` com RLS configurado,  
**So that** cada usuário veja apenas suas próprias transações e posições.

**Acceptance Criteria:**

✅ **AC-2.1.1: Tabela transactions criada**  
**Given** Supabase configurado  
**When** executar migration `002_create_transactions.sql`  
**Then** tabela `transactions` criada com campos:
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `user_id` UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
- `ticker` TEXT NOT NULL
- `type` TEXT NOT NULL CHECK (type IN ('buy', 'sell'))
- `quantity` NUMERIC NOT NULL CHECK (quantity > 0)
- `price` NUMERIC NOT NULL CHECK (price > 0)
- `date` DATE NOT NULL
- `created_at` TIMESTAMPTZ DEFAULT now()

**And** RLS habilitado:
```sql
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);
```

✅ **AC-2.1.2: Tabela positions criada**  
**Given** tabela `transactions` criada  
**When** continuar migration  
**Then** tabela `positions` criada com campos:
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `user_id` UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
- `ticker` TEXT NOT NULL
- `quantity` NUMERIC NOT NULL CHECK (quantity >= 0)
- `average_price` NUMERIC NOT NULL CHECK (average_price > 0)
- `updated_at` TIMESTAMPTZ DEFAULT now()
- UNIQUE(user_id, ticker)

**And** RLS habilitado:
```sql
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own positions"
  ON positions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own positions"
  ON positions FOR UPDATE
  USING (auth.uid() = user_id);
```

✅ **AC-2.1.3: Trigger recalcular positions após INSERT/DELETE transactions**  
**Given** tabelas criadas  
**When** criar function + trigger  
**Then** function `recalculate_position()` implementada:

```sql
CREATE OR REPLACE FUNCTION recalculate_position()
RETURNS TRIGGER AS $$
DECLARE
  v_total_quantity NUMERIC;
  v_average_price NUMERIC;
BEGIN
  -- Calcula quantidade total e preço médio
  SELECT 
    SUM(CASE WHEN type = 'buy' THEN quantity ELSE -quantity END),
    SUM(CASE WHEN type = 'buy' THEN quantity * price ELSE 0 END) / 
      NULLIF(SUM(CASE WHEN type = 'buy' THEN quantity ELSE 0 END), 0)
  INTO v_total_quantity, v_average_price
  FROM transactions
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND ticker = COALESCE(NEW.ticker, OLD.ticker);

  -- Upsert position
  IF v_total_quantity > 0 THEN
    INSERT INTO positions (user_id, ticker, quantity, average_price)
    VALUES (
      COALESCE(NEW.user_id, OLD.user_id),
      COALESCE(NEW.ticker, OLD.ticker),
      v_total_quantity,
      v_average_price
    )
    ON CONFLICT (user_id, ticker) 
    DO UPDATE SET 
      quantity = EXCLUDED.quantity,
      average_price = EXCLUDED.average_price,
      updated_at = now();
  ELSE
    -- Quantidade zero ou negativa: deleta position
    DELETE FROM positions
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND ticker = COALESCE(NEW.ticker, OLD.ticker);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalculate_position
  AFTER INSERT OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION recalculate_position();
```

**Edge cases:**
- 🟡 Quantidade zero: permite venda total (zera posição)
- 🟡 Venda > quantidade: permitido (quantidade negativa = vendido descoberto)

**Estimativa:** 1 dia

---

### Story 2.2: Cadastro Manual de Transação

🟡 **SOFT DEPENDENCY** — Precisa Story 2.1 (tabelas), pode usar mock de assets

**As a** usuário logado,  
**I want** cadastrar transação de compra/venda manualmente via formulário,  
**So that** possa registrar operações individuais e ver minha carteira atualizada automaticamente.

**Acceptance Criteria:**

✅ **AC-2.2.1: Formulário cadastro transação**  
**Given** usuário em `/portfolio/transactions/new`  
**When** preencher formulário:
- Ticker (text input uppercase)
- Tipo (select: Compra/Venda)
- Quantidade (number, >0)
- Preço (number, >0, 2 decimais)
- Data (date picker, ≤hoje)

**Then** validações frontend:
- Ticker obrigatório, uppercase automático
- Quantidade >0
- Preço >0
- Data ≤hoje

✅ **AC-2.2.2: Submit transação via Supabase**  
**Given** formulário válido  
**When** clicar "Salvar"  
**Then** `INSERT INTO transactions` executado  
**And** trigger `recalculate_position()` dispara automaticamente  
**And** em sucesso: toast "Transação cadastrada" + redirect `/portfolio`  
**And** em erro: toast com mensagem erro

✅ **AC-2.2.3: React Query mutation configurada**  
**Given** formulário implementado  
**When** setup React Query  
**Then** mutation `useCreateTransaction` criada:

```ts
const createTransaction = useMutation({
  mutationFn: async (data: TransactionInput) => {
    const { data: result, error } = await supabase
      .from('transactions')
      .insert([{ ...data, user_id: user.id }])
      .select()
      .single();
    
    if (error) throw error;
    return result;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['positions'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  }
});
```

**And** invalidação automática queries `positions` e `transactions`

**Estimativa:** 1 dia

---

### Story 2.3: Visualizar Lista Posições Consolidada

🟡 **SOFT DEPENDENCY** — Precisa Story 2.1 (tabelas) + 2.2 (cadastro), pode usar seed Story 7.1

**As a** usuário logado,  
**I want** visualizar lista de posições consolidadas (ticker, quantidade, preço médio),  
**So that** possa ver minha carteira atualizada em tempo real.

**Acceptance Criteria:**

✅ **AC-2.3.1: Query positions via React Query**  
**Given** usuário autenticado  
**When** acessar `/portfolio`  
**Then** query `usePositions` busca:

```ts
const { data: positions } = useQuery({
  queryKey: ['positions', userId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('user_id', userId)
      .order('ticker', { ascending: true });
    
    if (error) throw error;
    return data;
  }
});
```

✅ **AC-2.3.2: Tabela posições exibida**  
**Given** positions carregadas  
**When** renderizar tabela  
**Then** colunas exibidas:
- Ticker (uppercase)
- Quantidade (formatado: 1.000, sem decimais)
- Preço Médio (formatado: R$ 28,50)
- Valor Total (quantity × average_price, formatado: R$ 28.500,00)

**And** ordenação por ticker alfabética  
**And** loading state skeleton enquanto carrega  
**And** empty state se sem posições: "Nenhuma posição cadastrada. Cadastre sua primeira transação."

✅ **AC-2.3.3: Total carteira calculado**  
**Given** positions exibidas  
**When** calcular totais  
**Then** footer tabela mostra:
- Total Investido (soma todos `quantity × average_price`)
- Formatação: R$ 123.456,78

**Estimativa:** 0.5 dia

---

### Story 2.4: Importação CSV com Preview Paginado e Correção Inline

🟡 **SOFT DEPENDENCY** — Precisa Story 2.1 (tabelas), seed Story 7.1 para validar tickers

**As a** usuário logado,  
**I want** importar múltiplas transações via CSV com preview paginado e correção inline antes de confirmar,  
**So that** possa migrar meu histórico de forma rápida e conferir dados antes de salvar.

**Acceptance Criteria:**

✅ **AC-2.4.1: Validar arquivo CSV antes de parsear**  
**Given** usuário seleciona CSV em `/portfolio/import`  
**When** arquivo selecionado  
**Then** validações executadas **ANTES** de parsear:
- Count linhas: `file.text().then(t => t.split('\n').length)`
- Se >1000 linhas: erro "Máximo 1000 transações por arquivo" em <1s

**Edge cases:**
- 🔴 CSV 1001+ linhas: validar count ANTES Papa.parse() (não consumir memória desnecessária)

✅ **AC-2.4.2: Detectar encoding e parsear CSV**  
**Given** arquivo validado  
**When** parsear conteúdo  
**Then** detectar encoding:

```ts
import { detect } from 'jschardet';
import iconv from 'iconv-lite';

const buffer = await file.arrayBuffer();
const detected = detect(Buffer.from(buffer));

let text: string;
if (detected.encoding === 'ISO-8859-1' || detected.encoding === 'windows-1252') {
  text = iconv.decode(Buffer.from(buffer), 'ISO-8859-1');
} else {
  text = new TextDecoder('utf-8').decode(buffer);
}

// Remover UTF-8 BOM se presente
if (text.charCodeAt(0) === 0xFEFF) {
  text = text.slice(1);
}

const parsed = Papa.parse(text, { 
  header: true, 
  skipEmptyLines: true,
  delimiter: '', // auto-detect , ou ;
});
```

**Edge cases:**
- 🔴 Encoding ISO-8859-1 (Excel Brasil): detectar com jschardet, converter com iconv-lite, exibir `ção`, `ã`, `é` corretos
- 🟡 CSV separador `;` (europeu): Papa Parse auto-detecta
- 🟡 UTF-8 BOM: remover bytes `EF BB BF` antes parsear

✅ **AC-2.4.3: Preview paginado com correção inline**  
**Given** CSV parseado  
**When** exibir preview  
**Then** tabela paginada (50 linhas/página):
- Colunas: Ticker | Tipo | Quantidade | Preço | Data | Status
- Cada célula **editável inline** (contentEditable ou input)
- Status mostra: ✅ Válido | ⚠️ Ticker não encontrado | ❌ Erro validação

**And** validações por linha:
- Ticker existe em `assets` (query seed Story 7.1)
- Tipo em ['buy', 'sell']
- Quantidade >0 para compra, ≥0 para venda
- Preço >0
- Data válida ≤hoje

**Edge cases:**
- 🟡 Quantidade zero: aceitar apenas para tipo=sell (zera posição)

✅ **AC-2.4.4: Confirmar importação batch**  
**Given** usuário corrigiu erros no preview  
**When** clicar "Confirmar Importação"  
**Then** apenas linhas ✅Válidas são inseridas:

```ts
const validRows = rows.filter(r => r.status === 'valid');

const { data, error } = await supabase
  .from('transactions')
  .insert(validRows.map(r => ({
    user_id: userId,
    ticker: r.ticker.toUpperCase(),
    type: r.type,
    quantity: parseFloat(r.quantity),
    price: parseFloat(r.price),
    date: r.date
  })));
```

**And** trigger `recalculate_position()` dispara para cada transação  
**And** toast: "X transações importadas com sucesso"  
**And** redirect `/portfolio`

**Estimativa:** 2 dias

---

### Story 2.5: Deletar Transação com Recalculo Automático Position

🟢 **INDEPENDENT** — Pode rodar paralelo, só precisa Story 2.1 (tabelas)

**As a** usuário logado,  
**I want** deletar transação incorreta,  
**So that** minha posição seja recalculada automaticamente sem a transação deletada.

**Acceptance Criteria:**

✅ **AC-2.5.1: Botão deletar na lista transactions**  
**Given** usuário em `/portfolio/transactions`  
**When** clicar botão "🗑️" em uma transação  
**Then** modal confirmação: "Deletar transação PETR4 Compra 100 @ R$28,50?"

✅ **AC-2.5.2: Delete transaction com trigger automático**  
**Given** usuário confirma deleção  
**When** executar delete  
**Then** `DELETE FROM transactions WHERE id = ?` executado  
**And** trigger `recalculate_position()` dispara automaticamente  
**And** position atualizada ou deletada se quantidade=0  
**And** toast "Transação deletada"  
**And** queries `transactions` e `positions` invalidadas

✅ **AC-2.5.3: React Query mutation delete**  
**Given** implementação delete  
**When** setup mutation  
**Then** `useDeleteTransaction` criada com invalidação automática

**Estimativa:** 0.5 dia

---

## Epic 2 Summary

**Total Histórias:** 5  
**Estimativa Total:** 5 dias  
**FRs Cobertos:** FR-5 (Cadastro manual), FR-6 (Importação CSV), FR-7 (Lista posições), FR-8 (Custo médio automático), FR-9 (Edição transações via delete+insert)

**Dependências:**
- 🟡 Story 2.1 soft dependency Epic 1, pode rodar paralelo Story 0.1
- 🟡 Stories 2.2, 2.3, 2.4 dependem 2.1
- 🟢 Story 2.5 independente (paralelo)

**Tabelas Criadas:**
- `transactions` (Story 2.1) com RLS
- `positions` (Story 2.1) com RLS e trigger automático

**Edge Cases Incorporados:**
- 🔴 CSV 1001+ linhas (AC-2.4.1)
- 🔴 Encoding ISO-8859-1 (AC-2.4.2)
- 🟡 Quantidade zero, CSV separador `;`, UTF-8 BOM

---

## Epic 3: Análise de Portfolio

**FRs Cobertos:** FR-10, FR-11, FR-12, FR-13, FR-14, FR-15  
**Estimativa Total:** 8 dias  
**Objetivo:** Usuários visualizam evolução do patrimônio, composição da carteira, histórico de proventos recebidos e rentabilidade comparada com benchmarks.

---

### Story 3.1: Criar Tabela Price History e Query Evolução Patrimônio

🟡 **SOFT DEPENDENCY** — Precisa Story 2.1 (positions), seed Story 7.1 (assets + price_history)

**As a** desenvolvedor,  
**I want** criar tabela `price_history` e query que calcula evolução patrimônio por período,  
**So that** usuários possam ver o valor da carteira ao longo do tempo.

**Acceptance Criteria:**

✅ **AC-3.1.1: Tabela price_history criada**  
**Given** seed Story 7.1 executado  
**When** migration `003_create_price_history.sql`  
**Then** tabela `price_history` criada com campos:
- `ticker` TEXT NOT NULL
- `date` DATE NOT NULL
- `close_price` NUMERIC NOT NULL CHECK (close_price > 0)
- PRIMARY KEY (ticker, date)

**And** índice criado: `CREATE INDEX idx_price_history_date ON price_history(date);`

**And** tabela **pública** (sem RLS, dados de mercado compartilhados)

✅ **AC-3.1.2: Query evolução patrimônio implementada**  
**Given** tabela criada  
**When** implementar query React Query  
**Then** `useWealthEvolution` busca:

```ts
const { data: wealthData } = useQuery({
  queryKey: ['wealth-evolution', userId, period],
  queryFn: async () => {
    // Busca positions do user
    const { data: positions } = await supabase
      .from('positions')
      .select('ticker, quantity')
      .eq('user_id', userId);
    
    // Busca price_history para período
    const startDate = getStartDate(period); // 1M, 3M, 6M, 1A, Tudo
    
    const { data: prices } = await supabase
      .from('price_history')
      .select('ticker, date, close_price')
      .in('ticker', positions.map(p => p.ticker))
      .gte('date', startDate)
      .order('date', { ascending: true });
    
    // Agrupa por data, calcula valor total carteira
    const grouped = groupByDate(prices, positions);
    return grouped; // [{ date, totalValue }]
  }
});
```

✅ **AC-3.1.3: Helper groupByDate implementado**  
**Given** query retorna dados  
**When** calcular valor carteira por data  
**Then** função helper:

```ts
function groupByDate(prices: PriceHistory[], positions: Position[]) {
  const dateMap = new Map<string, number>();
  
  prices.forEach(p => {
    const position = positions.find(pos => pos.ticker === p.ticker);
    if (!position) return;
    
    const currentValue = dateMap.get(p.date) || 0;
    dateMap.set(p.date, currentValue + (position.quantity * p.close_price));
  });
  
  return Array.from(dateMap.entries())
    .map(([date, totalValue]) => ({ date, totalValue }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
```

**Edge cases:**
- 🟡 Gap cotação (ativo sem price_history dia X): mostrar gap honesto no gráfico, não interpolar

**Estimativa:** 1.5 dias

---

### Story 3.2: Gráfico Evolução Patrimônio com Filtros Período

🟡 **SOFT DEPENDENCY** — Precisa Story 3.1 (query)

**As a** usuário logado,  
**I want** visualizar gráfico de linha da evolução do meu patrimônio com filtros de período,  
**So that** possa acompanhar o crescimento da carteira ao longo do tempo.

**Acceptance Criteria:**

✅ **AC-3.2.1: Gráfico linha Recharts implementado**  
**Given** query `useWealthEvolution` retorna dados  
**When** renderizar em `/analysis/wealth`  
**Then** gráfico Recharts exibido:

```tsx
<ResponsiveContainer width="100%" height={400}>
  <LineChart data={wealthData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" tickFormatter={(d) => format(d, 'dd/MM')} />
    <YAxis tickFormatter={(v) => formatCurrency(v)} />
    <Tooltip 
      formatter={(v) => formatCurrency(v)}
      labelFormatter={(d) => format(d, 'dd/MM/yyyy')}
    />
    <Line 
      type="monotone" 
      dataKey="totalValue" 
      stroke="#10b981" 
      strokeWidth={2}
      dot={false}
    />
  </LineChart>
</ResponsiveContainer>
```

**And** lazy load Recharts: `const LineChart = lazy(() => import('recharts'))`

**Edge cases:**
- 🟡 Gap cotação: linha pontilhada ou break no gráfico (não interpolar média)

✅ **AC-3.2.2: Filtros período implementados**  
**Given** gráfico renderizado  
**When** usuário seleciona período  
**Then** botões filtro: `1M | 3M | 6M | 1A | Tudo`  
**And** período selecionado highlighted  
**And** query `useWealthEvolution` re-fetch com novo `startDate`

✅ **AC-3.2.3: Cards resumo patrimônio**  
**Given** dados carregados  
**When** calcular métricas  
**Then** cards exibidos acima do gráfico:
- **Patrimônio Atual:** último valor da série (formatado R$ 123.456,78)
- **Variação Período:** `(último - primeiro) / primeiro * 100` (formatado +12,34% verde ou -5,67% vermelho)
- **Maior Valor:** `Math.max(wealthData.map(d => d.totalValue))`
- **Menor Valor:** `Math.min(wealthData.map(d => d.totalValue))`

**Estimativa:** 1.5 dias

---

### Story 3.3: Composição e Exposição da Carteira

🟡 **SOFT DEPENDENCY** — Precisa Story 2.3 (positions), seed Story 7.1 (assets com campos type, country)

**As a** usuário logado,  
**I want** visualizar composição da carteira por ativo e exposição internacional,  
**So that** possa entender minha diversificação.

**Acceptance Criteria:**

✅ **AC-3.3.1: Query composição com JOIN assets**  
**Given** positions e assets disponíveis  
**When** buscar composição  
**Then** query `usePortfolioComposition`:

```ts
const { data: composition } = useQuery({
  queryKey: ['portfolio-composition', userId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('positions')
      .select(`
        ticker,
        quantity,
        average_price,
        assets!inner(name, type, country)
      `)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    // Busca último preço para cada ticker
    const tickers = data.map(d => d.ticker);
    const { data: latestPrices } = await supabase
      .from('price_history')
      .select('ticker, close_price')
      .in('ticker', tickers)
      .order('date', { ascending: false })
      .limit(tickers.length);
    
    return data.map(d => {
      const latestPrice = latestPrices.find(p => p.ticker === d.ticker);
      const currentValue = d.quantity * (latestPrice?.close_price || d.average_price);
      return { ...d, currentValue };
    });
  }
});
```

✅ **AC-3.3.2: Card composição por ativo (% carteira)**  
**Given** composition carregada  
**When** calcular percentuais  
**Then** card exibe:
- Lista ativos ordenados por % decrescente
- Cada linha: `Ticker (Nome) | R$ valor | XX.X%`
- Barra visual proporcional ao %

**And** cálculo: `% = (currentValue / totalCarteira) * 100`

✅ **AC-3.3.3: Card exposição internacional**  
**Given** composition carregada  
**When** agrupar por `assets.country`  
**Then** card exibe:
- `Brasil: XX.X%`
- `EUA: XX.X%`
- `Outros: XX.X%`

**And** gráfico pizza simples (Recharts PieChart lazy load)

**Estimativa:** 1.5 dias

---

### Story 3.4: Histórico de Proventos Recebidos

🟡 **SOFT DEPENDENCY** — Precisa Story 2.1 (positions), seed Story 7.3 (dividends)

**As a** usuário logado,  
**I want** visualizar histórico de proventos recebidos (dividendos, JCP) por ativo,  
**So that** possa acompanhar renda passiva gerada pela carteira.

**Acceptance Criteria:**

✅ **AC-3.4.1: Tabela dividends criada (seed Story 7.3)**  
**Given** seed Story 7.3 executado  
**When** tabela `dividends` disponível  
**Then** estrutura:
- `ticker` TEXT NOT NULL
- `type` TEXT NOT NULL CHECK (type IN ('dividend', 'jcp'))
- `value_per_share` NUMERIC NOT NULL CHECK (value_per_share > 0)
- `payment_date` DATE NOT NULL
- `ex_date` DATE NOT NULL
- PRIMARY KEY (ticker, payment_date, type)

**And** tabela **pública** (sem RLS, dados de mercado)

✅ **AC-3.4.2: Query proventos recebidos com JOIN positions**  
**Given** tabela disponível  
**When** buscar proventos do user  
**Then** query `useDividends`:

```ts
const { data: dividends } = useQuery({
  queryKey: ['dividends', userId],
  queryFn: async () => {
    // Busca positions do user
    const { data: positions } = await supabase
      .from('positions')
      .select('ticker, quantity')
      .eq('user_id', userId);
    
    // Busca dividends dos tickers do user
    const { data: divs } = await supabase
      .from('dividends')
      .select('*')
      .in('ticker', positions.map(p => p.ticker))
      .lte('payment_date', new Date().toISOString()) // Apenas pagos
      .order('payment_date', { ascending: false });
    
    // Calcula valor recebido por user
    return divs.map(d => {
      const pos = positions.find(p => p.ticker === d.ticker);
      const receivedValue = pos ? d.value_per_share * pos.quantity : 0;
      return { ...d, receivedValue };
    });
  }
});
```

**Edge cases:**
- 🟡 Provento data futura: filtrar `payment_date <= hoje`
- 🟡 Provento valor zero: filtrar `value_per_share > 0`

✅ **AC-3.4.3: Timeline proventos mensal**  
**Given** dividends carregados  
**When** agrupar por mês  
**Then** timeline exibe:
- Mês/Ano (ex: "Jan/2026")
- Total recebido no mês (soma `receivedValue`)
- Expandir: lista detalhada por ativo

```
Jan/2026 - R$ 1.234,56
  └ PETR4: R$ 850,00 (Dividendo)
  └ VALE3: R$ 384,56 (JCP)

Dez/2025 - R$ 987,34
  ...
```

✅ **AC-3.4.4: Tabela proventos por ativo**  
**Given** dividends carregados  
**When** visualizar por ativo  
**Then** tabela exibe:
- Ticker | Tipo | Valor/Ação | Data Pagamento | Valor Recebido

**And** ordenação padrão: data decrescente

**Estimativa:** 2 dias

---

### Story 3.5: Rentabilidade e Comparação com Benchmarks

🟡 **SOFT DEPENDENCY** — Precisa Story 3.1 (wealth), 3.4 (dividends), seed Story 7.3 (benchmarks)

**As a** usuário logado,  
**I want** visualizar rentabilidade da carteira e comparar com benchmarks (IBOV, CDI),  
**So that** possa avaliar performance dos investimentos.

**Acceptance Criteria:**

✅ **AC-3.5.1: Tabela benchmarks criada (seed Story 7.3)**  
**Given** seed Story 7.3 executado  
**When** tabela `benchmarks` disponível  
**Then** estrutura:
- `code` TEXT PRIMARY KEY (ex: 'IBOV', 'CDI')
- `name` TEXT NOT NULL
- `date` DATE NOT NULL
- `value` NUMERIC NOT NULL
- UNIQUE(code, date)

**And** tabela **pública** (sem RLS)

✅ **AC-3.5.2: Query rentabilidade com proventos**  
**Given** wealth e dividends disponíveis  
**When** calcular rentabilidade  
**Then** query `usePortfolioReturn`:

```ts
const { data: returns } = useQuery({
  queryKey: ['portfolio-return', userId, period],
  queryFn: async () => {
    const { data: wealth } = await fetchWealthEvolution(userId, period);
    const { data: divs } = await fetchDividends(userId, period);
    
    const startValue = wealth[0].totalValue;
    const endValue = wealth[wealth.length - 1].totalValue;
    const totalDividends = divs.reduce((sum, d) => sum + d.receivedValue, 0);
    
    // Rentabilidade = (valor final + proventos - valor inicial) / valor inicial
    const totalReturn = ((endValue + totalDividends - startValue) / startValue) * 100;
    
    // Rentabilidade apenas ganho capital
    const capitalGain = ((endValue - startValue) / startValue) * 100;
    
    // Rentabilidade apenas proventos
    const dividendYield = (totalDividends / startValue) * 100;
    
    return { totalReturn, capitalGain, dividendYield };
  }
});
```

✅ **AC-3.5.3: Gráfico comparativo com benchmarks**  
**Given** rentabilidade calculada  
**When** buscar benchmarks período  
**Then** gráfico linha múltipla (Recharts):
- Linha 1: Carteira (normalizada 100 início período)
- Linha 2: IBOV (normalizada 100 início)
- Linha 3: CDI (normalizada 100 início)

**And** legenda com cores distintas  
**And** tooltip mostrando % acumulada

✅ **AC-3.5.4: Cards métricas rentabilidade**  
**Given** returns calculados  
**When** exibir métricas  
**Then** cards:
- **Rentabilidade Total:** XX.X% (verde/vermelho conforme sinal)
- **Ganho Capital:** XX.X%
- **Proventos:** XX.X%
- **vs IBOV:** +X.X pp (pontos percentuais, verde se ganhou)
- **vs CDI:** +X.X pp

**Estimativa:** 1.5 dias

---

## Epic 3 Summary

**Total Histórias:** 5  
**Estimativa Total:** 8 dias  
**FRs Cobertos:** FR-10 (Evolução patrimônio), FR-11 (Composição), FR-12 (Exposição internacional), FR-13 (Proventos), FR-14 (Rentabilidade), FR-15 (Comparação benchmarks)

**Dependências:**
- 🟡 Todas stories dependem Epic 2 (positions) + seed Epic 7
- Podem rodar sequencialmente dentro do épico

**Tabelas Criadas:**
- `price_history` (Story 3.1, populada por seed 7.1)
- `dividends` (Story 3.4, populada por seed 7.3)
- `benchmarks` (Story 3.5, populada por seed 7.3)

**Edge Cases Incorporados:**
- 🟡 Gap cotação: mostrar gap honesto (AC-3.1.2, AC-3.2.1)
- 🟡 Provento data futura: filtrar (AC-3.4.2)
- 🟡 Provento valor zero: filtrar (AC-3.4.2)

---

## Epic 4: Valuation e Scoring Engine

**FRs Cobertos:** FR-16, FR-17, FR-18, FR-19  
**Estimativa Total:** 6 dias  
**Objetivo:** Usuários criam regras de score fundamentalista customizáveis e calculam preço-teto método Bazin, ambos com cálculos server-side rápidos.

**⚠️ DEPENDÊNCIA SPIKE 0.1:** Se Story 0.1 decidir pivotar para Edge Functions TypeScript, todas as 4 histórias deste épico precisam refatorar de PL/pgSQL para Deno.

---

### Story 4.1: Postgres Functions Engine (Score + Preço-Teto)

🔴 **BLOCKS** — Histórias 4.2, 4.3, 4.4 dependem desta engine

**⚠️ ASSUMINDO:** Story 0.1 validou PL/pgSQL (ADR-001 mantido)

**As a** desenvolvedor,  
**I want** implementar Postgres Functions PL/pgSQL para cálculo de Score e Preço-Teto com helper `safe_divide`,  
**So that** cálculos rodem server-side com latência <500ms e 0 cold start.

**Acceptance Criteria:**

✅ **AC-4.1.1: Tabela fundamentals criada (seed Story 7.2)**  
**Given** seed Story 7.2 executado  
**When** tabela `fundamentals` disponível  
**Then** estrutura:
- `ticker` TEXT PRIMARY KEY
- `p_l` NUMERIC (Preço/Lucro, pode ser NULL)
- `roe` NUMERIC (Return on Equity %, pode ser NULL)
- `dividend_yield` NUMERIC (DY %, pode ser NULL)
- `debt_equity` NUMERIC (Dívida/PL, pode ser NULL)
- `net_margin` NUMERIC (Margem líquida %, pode ser NULL)
- `last_12m_dividend` NUMERIC (Dividendo anual, pode ser NULL)
- `updated_at` TIMESTAMPTZ DEFAULT now()

**And** tabela **pública** (sem RLS, dados fundamentalistas compartilhados)

✅ **AC-4.1.2: Tabela score_rules criada**  
**Given** fundamentals criada  
**When** migration `004_create_score_rules.sql`  
**Then** tabela `score_rules` criada com campos:
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `user_id` UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
- `name` TEXT NOT NULL (ex: "Meu Score Conservador")
- `rules` JSONB NOT NULL (array de regras)
- `created_at` TIMESTAMPTZ DEFAULT now()

**And** RLS habilitado (users veem apenas próprias regras)

Exemplo `rules`:
```json
[
  {"field": "p_l", "operator": "<", "threshold": 15, "points": 10},
  {"field": "roe", "operator": ">", "threshold": 15, "points": 15},
  {"field": "dividend_yield", "operator": ">", "threshold": 6, "points": 20}
]
```

✅ **AC-4.1.3: Function calculate_score implementada**  
**Given** tabelas criadas  
**When** criar function PL/pgSQL  
**Then** `calculate_score(p_user_id UUID, p_score_rules_id UUID)` implementada com lógica:
- Busca `score_rules` do user
- Para cada `position` do user, calcula score baseado em `fundamentals`
- Itera regras JSONB, aplica operadores (<, >, <=, >=)
- Se fundamental NULL: ignora regra (não soma pontos)
- Retorna TABLE(ticker, score, details)

**Edge cases:**
- 🔴 Divisão por zero: usar `safe_divide()` do spike Story 0.1 se houver divisões
- 🟡 Fundamental NULL: regra ignorada, score = soma regras aplicáveis

✅ **AC-4.1.4: Function calculate_fair_price_bazin implementada**  
**Given** fundamentals disponível  
**When** criar function  
**Then** `calculate_fair_price_bazin(p_ticker TEXT, p_target_dy NUMERIC)` implementada:

```sql
CREATE OR REPLACE FUNCTION calculate_fair_price_bazin(
  p_ticker TEXT,
  p_target_dy NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  v_dividend NUMERIC;
  v_fair_price NUMERIC;
BEGIN
  SELECT last_12m_dividend INTO v_dividend
  FROM fundamentals
  WHERE ticker = p_ticker;
  
  IF v_dividend IS NULL OR v_dividend <= 0 THEN
    RETURN NULL;
  END IF;
  
  v_fair_price := safe_divide(v_dividend, p_target_dy / 100);
  
  RETURN v_fair_price;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Edge cases:**
- 🔴 DY target = 0: validação frontend (AC-4.3.2), function retorna NULL se denominator=0
- 🟡 DY target 100%: permitido matematicamente, warning frontend

**Estimativa:** 2 dias

**⚠️ SE STORY 0.1 PIVOTAR PARA TYPESCRIPT:**
- Refatorar para 2x Edge Functions Deno: `calculate-score` e `calculate-fair-price`
- Latência relaxada: <2s (não <500ms)
- DX melhor (console.log, TypeScript)
- Custo +$20/mês se viralizar
- Estimativa mantém 2 dias

---

### Story 4.2: UI Score Fundamentalista com CRUD Regras

🟡 **SOFT DEPENDENCY** — Precisa Story 4.1 (functions), seed Story 7.2 (fundamentals)

**As a** usuário logado,  
**I want** criar/editar regras de score customizáveis e visualizar score calculado dos meus ativos,  
**So that** possa filtrar ações baseado nos meus critérios fundamentalistas.

**Acceptance Criteria:**

✅ **AC-4.2.1: Formulário criar regra de score**  
**Given** usuário em `/valuation/score/new`  
**When** criar nova regra  
**Then** formulário exibe:
- Nome da regra (text input)
- Lista regras (array dinâmico):
  - Campo (select: P/L, ROE, DY, Dívida/PL, Margem Líquida)
  - Operador (select: <, >, <=, >=)
  - Threshold (number input)
  - Pontos (number input, inteiro)
  - Botão "Adicionar Regra" / "Remover"

**And** preview score máximo possível (soma todos pontos)

✅ **AC-4.2.2: Salvar score_rules via Supabase**  
**Given** formulário válido  
**When** clicar "Salvar"  
**Then** `INSERT INTO score_rules` executado  
**And** `rules` JSONB montado no formato correto  
**And** redirect `/valuation/score`

✅ **AC-4.2.3: Lista score_rules do user**  
**Given** usuário em `/valuation/score`  
**When** carregar regras  
**Then** query `useScoreRules` busca score_rules do user  
**And** cards exibem: nome regra, count regras, score máximo

✅ **AC-4.2.4: Calcular e exibir score positions**  
**Given** usuário seleciona uma score_rule  
**When** clicar "Calcular Score"  
**Then** RPC Supabase chama `calculate_score(userId, ruleId)`  
**And** tabela exibe: Ticker | Nome | Score | Barra Visual (% do score máximo)  
**And** ordenação padrão: score decrescente

✅ **AC-4.2.5: CRUD completo score_rules**  
**Given** lista regras  
**When** ações disponíveis  
**Then** botões:
- Editar: carrega formulário pré-populado
- Deletar: modal confirmação, DELETE score_rules
- Duplicar: cria cópia com nome "Nome (cópia)"

**Estimativa:** 2 dias

---

### Story 4.3: UI Preço-Teto Bazin

🟡 **SOFT DEPENDENCY** — Precisa Story 4.1 (function), seed Story 7.2 (fundamentals)

**As a** usuário logado,  
**I want** calcular preço-teto método Bazin para minhas posições com DY alvo customizável,  
**So that** possa identificar ações abaixo do preço justo para compra.

**Acceptance Criteria:**

✅ **AC-4.3.1: Input DY alvo**  
**Given** usuário em `/valuation/fair-price`  
**When** definir parâmetro  
**Then** input número: "DY Mínimo Desejado (%)"  
**And** valor padrão: 6%  
**And** range permitido: 0.01% a 100%

✅ **AC-4.3.2: Validação DY alvo**  
**Given** usuário digita DY  
**When** validar input  
**Then** regras:
- DY > 0 (obrigatório, previne divisão por zero)
- Se DY > 30%: warning "⚠️ DY acima de 30% é irrealista para maioria das ações"
- Se DY = 100%: warning "⚠️ DY 100% significa preço-teto = dividendo anual"

**Edge cases:**
- 🔴 DY target = 0: validação impede submit (previne divisão por zero backend)
- 🟡 DY target 100%: permitido, mas warning UX

✅ **AC-4.3.3: Calcular preço-teto para positions**  
**Given** DY válido  
**When** clicar "Calcular Preço-Teto"  
**Then** para cada position, RPC `calculate_fair_price_bazin(ticker, targetDY)`  
**And** busca preço atual de `price_history` (último dia)

✅ **AC-4.3.4: Tabela preço-teto com indicadores visuais**  
**Given** preços calculados  
**When** exibir resultados  
**Then** tabela: Ticker | Nome | Preço Atual | Preço-Teto | Upside | Status

**And** cálculos:
- `Upside = ((preço-teto - preço atual) / preço atual) * 100`
- `Status`:
  - 🟢 Oportunidade: upside > 20%
  - 🟡 Justo: upside -10% a +20%
  - 🔴 Caro: upside < -10%

**And** ordenação: upside decrescente  
**And** Se `fairPrice` NULL: exibir "-" e "⚠️ Sem dividendos"

**Estimativa:** 1 dia

---

### Story 4.4: Alertas Valuation Integrados

🟢 **INDEPENDENT** — Pode rodar paralelo, só precisa Story 4.1 (functions)

**As a** usuário logado,  
**I want** receber alertas quando score de ativo atingir threshold ou preço cair abaixo do preço-teto,  
**So that** possa ser notificado de oportunidades automaticamente.

**Acceptance Criteria:**

✅ **AC-4.4.1: Trigger alerta score alto**  
**Given** score calculado (Story 4.2)  
**When** score ≥ 80% do score máximo  
**Then** trigger Postgres insere alerta tipo `high_score`

✅ **AC-4.4.2: Trigger alerta oportunidade preço-teto**  
**Given** preço-teto calculado (Story 4.3)  
**When** preço atual < preço-teto × 0.8 (upside > 25%)  
**Then** trigger insere alerta tipo `bazin_opportunity`

✅ **AC-4.4.3: Notificação Realtime alertas valuation**  
**Given** triggers configurados  
**When** alerta inserido  
**Then** Realtime Supabase notifica frontend (reutiliza infra Epic 5)  
**And** toast exibido: "🎯 Novo alerta: [mensagem]"

**Estimativa:** 1 dia

---

## Epic 4 Summary

**Total Histórias:** 4  
**Estimativa Total:** 6 dias  
**FRs Cobertos:** FR-16 (Score fundamentalista), FR-17 (Regras customizáveis), FR-18 (Preço-teto Bazin), FR-19 (Alertas valuation)

**Dependências:**
- 🔴 Story 4.1 BLOCKS 4.2, 4.3, 4.4
- 🟡 Stories 4.2, 4.3 dependem 4.1 + seed 7.2
- 🟢 Story 4.4 independente (paralelo)

**⚠️ DEPENDÊNCIA CRÍTICA STORY 0.1:**
- **Se PL/pgSQL vence:** Histórias mantêm como estão
- **Se TypeScript vence:** Story 4.1 refatora para 2x Edge Functions, ACs latência relaxados

**Tabelas Criadas:**
- `fundamentals` (Story 4.1, populada por seed 7.2)
- `score_rules` (Story 4.1) com RLS

**Functions Criadas (se PL/pgSQL):**
- `calculate_score(user_id, score_rules_id)`
- `calculate_fair_price_bazin(ticker, target_dy)`
- `safe_divide()` (reutilizado do spike 0.1)

**Edge Cases Incorporados:**
- 🔴 Divisão por zero: `safe_divide()` (AC-4.1.3, AC-4.1.4)
- 🔴 DY target = 0: validação frontend (AC-4.3.2)
- 🟡 Fundamental NULL: regra ignorada (AC-4.1.3)
- 🟡 DY target 100%: permitido com warning (AC-4.3.2)

---

## Epic 5: Sistema de Alertas Inteligentes

**FRs Cobertos:** FR-20, FR-21  
**Estimativa Total:** 3 dias  
**Objetivo:** Usuários recebem alertas instantâneos via Trigger Postgres + Realtime quando posições ficam sem transações ou eventos de valuation ocorrem.

---

### Story 5.1: Trigger Postgres + Realtime para Alertas Instantâneos

🔴 **BLOCKS** — Story 5.2 depende da infra de alertas

**As a** desenvolvedor,  
**I want** criar tabela `alerts` com Trigger Postgres + Supabase Realtime,  
**So that** usuários recebam notificações instantâneas quando condições de alerta forem atingidas.

**Acceptance Criteria:**

✅ **AC-5.1.1: Tabela alerts criada**  
**Given** migrations anteriores executadas  
**When** migration `005_create_alerts.sql`  
**Then** tabela `alerts` criada com campos:
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `user_id` UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
- `type` TEXT NOT NULL CHECK (type IN ('position_no_transactions', 'high_score', 'bazin_opportunity'))
- `ticker` TEXT NOT NULL
- `message` TEXT NOT NULL
- `priority` TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high'))
- `status` TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'ignored'))
- `created_at` TIMESTAMPTZ DEFAULT now()

**And** RLS habilitado:
```sql
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
  ON alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON alerts FOR UPDATE
  USING (auth.uid() = user_id);
```

**And** índice: `CREATE INDEX idx_alerts_user_status ON alerts(user_id, status);`

✅ **AC-5.1.2: Realtime habilitado para alerts**  
**Given** tabela criada  
**When** configurar Realtime  
**Then** publicação Realtime habilitada:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
```

**And** frontend pode subscrever:
```ts
const alertsSubscription = supabase
  .channel('alerts')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'alerts',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      showToast(payload.new.message);
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    }
  )
  .subscribe();
```

✅ **AC-5.1.3: Trigger "posição sem transação"**  
**Given** tabela alerts disponível  
**When** criar trigger  
**Then** function + trigger implementados:

```sql
CREATE OR REPLACE FUNCTION check_position_no_transactions()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM transactions
    WHERE user_id = NEW.user_id AND ticker = NEW.ticker
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM alerts
      WHERE user_id = NEW.user_id
        AND ticker = NEW.ticker
        AND type = 'position_no_transactions'
        AND status = 'active'
    ) THEN
      INSERT INTO alerts (user_id, type, ticker, message, priority)
      VALUES (
        NEW.user_id,
        'position_no_transactions',
        NEW.ticker,
        format('Posição %s criada mas sem transações cadastradas', NEW.ticker),
        'medium'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_position_no_transactions
  AFTER INSERT ON positions
  FOR EACH ROW EXECUTE FUNCTION check_position_no_transactions();
```

**Edge cases:**
- 🟡 Alerta duplicado: check `NOT EXISTS` previne (idempotência)

✅ **AC-5.1.4: Trigger DELETE transactions também dispara alerta**  
**Given** trigger INSERT positions implementado  
**When** usuário deleta transação e position volta a ter 0 transações  
**Then** trigger adicional criado:

```sql
CREATE OR REPLACE FUNCTION check_transactions_after_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM transactions
    WHERE user_id = OLD.user_id AND ticker = OLD.ticker
  ) THEN
    IF EXISTS (
      SELECT 1 FROM positions
      WHERE user_id = OLD.user_id AND ticker = OLD.ticker
    ) THEN
      INSERT INTO alerts (user_id, type, ticker, message, priority)
      VALUES (
        OLD.user_id,
        'position_no_transactions',
        OLD.ticker,
        format('Posição %s sem transações após deleção', OLD.ticker),
        'medium'
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_transactions_delete
  AFTER DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION check_transactions_after_delete();
```

**Edge cases:**
- 🟡 Trigger em DELETE transactions: implementado (AC-5.1.4)

✅ **AC-5.1.5: Batch trigger performante (1000 posições)**  
**Given** importação CSV cria 1000 posições  
**When** triggers disparam  
**Then** aceita flood de notificações Realtime  
**And** frontend não trava (debounce toast notifications)

**Edge cases:**
- 🟡 Batch trigger 1000 posições: MVP aceita flood, v2 pode agrupar notificações

**Estimativa:** 2 dias

---

### Story 5.2: Lista Alertas + Badge + Botão Manual Refresh

🟡 **SOFT DEPENDENCY** — Precisa Story 5.1 (tabela + triggers)

**As a** usuário logado,  
**I want** visualizar lista de alertas ativos com badge no menu e botão manual para forçar re-check,  
**So that** possa gerenciar notificações e forçar verificação quando necessário.

**Acceptance Criteria:**

✅ **AC-5.2.1: Query alerts via React Query**  
**Given** usuário autenticado  
**When** acessar `/alerts`  
**Then** query `useAlerts` busca alerts ativos do user ordenados por data

✅ **AC-5.2.2: Badge contador alertas no menu**  
**Given** alerts carregados  
**When** renderizar menu lateral  
**Then** item "Alertas" exibe badge:
- Contador: count alertas `status='active'`
- Cor: vermelho se count > 0
- Posição: canto superior direito do ícone

**And** badge atualiza via Realtime automaticamente

✅ **AC-5.2.3: Lista alertas com ações**  
**Given** usuário em `/alerts`  
**When** exibir lista  
**Then** cards alertas mostram:
- Ícone por prioridade (🔴 high, 🟡 medium, 🟢 low)
- Ticker
- Mensagem
- Timestamp relativo ("há 5 minutos")
- Botões: "Resolver" | "Ignorar"

**And** agrupamento por tipo

✅ **AC-5.2.4: Ações marcar alerta**  
**Given** alerta exibido  
**When** usuário clica ação  
**Then** mutations:
- **Resolver:** `UPDATE alerts SET status='dismissed'` + invalida query
- **Ignorar:** `UPDATE alerts SET status='ignored'` + invalida query

**And** alerta desaparece da lista ativa

✅ **AC-5.2.5: Botão manual "Verificar Alertas Agora"**  
**Given** usuário em `/alerts`  
**When** clicar "🔄 Verificar Alertas Agora"  
**Then** RPC executa:
- Re-check positions sem transações
- Re-calcula scores (se score_rules ativas)
- Re-calcula preços-teto (se configurado)

**And** novos alertas inseridos via triggers  
**And** toast: "Verificação completa: X novos alertas"

**Estimativa:** 1 dia

---

## Epic 5 Summary

**Total Histórias:** 2  
**Estimativa Total:** 3 dias  
**FRs Cobertos:** FR-20 (Alertas instantâneos Realtime), FR-21 (Botão manual verificação)

**Dependências:**
- 🔴 Story 5.1 BLOCKS 5.2
- 🟡 Story 5.2 depende 5.1

**Tabelas Criadas:**
- `alerts` (Story 5.1) com RLS

**Triggers Criados:**
- `trigger_check_position_no_transactions` (AFTER INSERT positions)
- `trigger_check_transactions_delete` (AFTER DELETE transactions)
- Triggers valuation (Epic 4.4) reutilizam mesma tabela `alerts`

**Realtime Configurado:**
- Publicação `supabase_realtime` inclui tabela `alerts`
- Frontend subscreve via `supabase.channel('alerts').on('INSERT', ...)`

**Edge Cases Incorporados:**
- 🟡 Alerta duplicado: idempotência via `NOT EXISTS` (AC-5.1.3)
- 🟡 Trigger DELETE transactions: implementado (AC-5.1.4)
- 🟡 Batch trigger 1000 posições: aceita flood MVP (AC-5.1.5)

---

## Epic 6: Detalhe de Ativo e Rastreabilidade

**FRs Cobertos:** FR-25, FR-26  
**Estimativa Total:** 3 dias  
**Objetivo:** Usuários acessam tela detalhe do ativo com todas as informações consolidadas e veem tooltips rastreáveis mostrando origem dos dados calculados.

---

### Story 6.1: Tela Detalhe Ativo Consolidada

🟡 **SOFT DEPENDENCY** — Precisa Epics 2, 3, 4 (positions, price_history, fundamentals, score, fair_price)

**As a** usuário logado,  
**I want** acessar tela detalhe de um ativo específico com todas informações consolidadas,  
**So that** possa ver visão 360° do ativo (cotação, fundamentals, minha posição, score, preço-teto, proventos).

**Acceptance Criteria:**

✅ **AC-6.1.1: Rota detalhe ativo**  
**Given** usuário clica em ticker em qualquer tela  
**When** navegar  
**Then** rota `/assets/:ticker` criada (ex: `/assets/PETR4`)  
**And** layout responsivo mobile/desktop

✅ **AC-6.1.2: Header ativo com dados básicos**  
**Given** usuário em `/assets/PETR4`  
**When** carregar dados  
**Then** query busca `assets` + último `price_history`:

```ts
const { data: asset } = useQuery({
  queryKey: ['asset-detail', ticker],
  queryFn: async () => {
    const { data: assetData } = await supabase
      .from('assets')
      .select('*')
      .eq('ticker', ticker)
      .single();
    
    const { data: latestPrice } = await supabase
      .from('price_history')
      .select('close_price, date')
      .eq('ticker', ticker)
      .order('date', { ascending: false })
      .limit(1)
      .single();
    
    return { 
      ...assetData, 
      latestPrice: latestPrice?.close_price, 
      priceDate: latestPrice?.date 
    };
  }
});
```

**And** header exibe:
- Ticker (grande, destaque)
- Nome completo do ativo
- Preço atual (formatado R$ 28,50)
- Data última atualização
- Badge tipo (Ação BR, FII, Ação USA, etc.)

✅ **AC-6.1.3: Seção "Minha Posição"**  
**Given** ativo carregado  
**When** buscar position do user  
**Then** query busca position (pode ser NULL)  
**And** card exibe:
- Quantidade possuída
- Preço médio
- Valor investido (quantity × average_price)
- Valor atual (quantity × latest_price)
- Ganho/Perda (colorido)

**And** se sem posição: "Você não possui este ativo. Cadastre uma transação."

✅ **AC-6.1.4: Seção "Fundamentals"**  
**Given** ativo carregado  
**When** buscar fundamentals  
**Then** query busca `fundamentals` por ticker  
**And** card exibe grid: P/L, ROE, DY, Dívida/PL, Margem Líquida, Dividendo Anual  
**And** valores NULL exibidos como "-"

✅ **AC-6.1.5: Seção "Valuation"**  
**Given** fundamentals carregados  
**When** calcular valuation  
**Then** cards:
- **Score Fundamentalista:** RPC `calculate_score` (se score_rules ativa)
- **Preço-Teto Bazin:** RPC `calculate_fair_price_bazin` (DY padrão 6%)
- **Upside:** % colorido

✅ **AC-6.1.6: Seção "Proventos Históricos"**  
**Given** ativo carregado  
**When** buscar dividends últimos 12 meses  
**Then** tabela exibe: Tipo, Valor/Ação, Data Pagamento, Data COM  
**And** ordenação: data decrescente  
**And** se vazio: "Nenhum provento nos últimos 12 meses"

✅ **AC-6.1.7: Minigráfico evolução preço (sparkline)**  
**Given** ativo carregado  
**When** buscar price_history últimos 30 dias  
**Then** sparkline Recharts:
- Linha simples sem eixos
- Altura 60px
- Cor verde/vermelho conforme valorização

**Estimativa:** 2 dias

---

### Story 6.2: Tooltips Rastreabilidade de Cálculos

🟡 **SOFT DEPENDENCY** — Precisa Story 6.1 ou qualquer tela com valores calculados

**As a** usuário logado,  
**I want** ver tooltips mostrando origem e fórmula dos valores calculados,  
**So that** possa entender de onde cada número veio e validar cálculos.

**Acceptance Criteria:**

✅ **AC-6.2.1: Tooltip Score Fundamentalista**  
**Given** score exibido  
**When** hover/click ícone "ℹ️"  
**Then** tooltip exibe:

```
Score: 45 pontos (75% do máximo 60)

Regras aplicadas:
✅ P/L < 15: +10 pontos (atual: 12.5)
✅ ROE > 15%: +15 pontos (atual: 18.3%)
✅ DY > 6%: +20 pontos (atual: 7.2%)
❌ Dívida/PL < 1.0: 0 pontos (atual: 1.5)

Regra: "Meu Score Conservador"
Atualização: 10/08/2026
```

✅ **AC-6.2.2: Tooltip Preço-Teto Bazin**  
**Given** preço-teto exibido  
**When** hover/click "ℹ️"  
**Then** tooltip exibe fórmula expandida:

```
Preço-Teto Bazin: R$ 35,00

Fórmula:
= Dividendo Anual / (DY Mínimo / 100)
= R$ 2,10 / (6% / 100)
= R$ 35,00

Parâmetros:
• Dividendo Anual: R$ 2,10
• DY Configurado: 6%
• Preço Atual: R$ 28,50
• Upside: +22,8% 🟢
```

✅ **AC-6.2.3: Tooltip Rentabilidade**  
**Given** rentabilidade exibida (Epic 3)  
**When** hover/click "ℹ️"  
**Then** tooltip decompõe:

```
Rentabilidade Total: +15,5%

• Ganho Capital: +12,3%
  └ (Final - Inicial) / Inicial
• Proventos: +3,2%
  └ Total Proventos / Inicial

Período: 01/01 a 15/08/2026
Fontes: price_history, dividends, transactions
```

✅ **AC-6.2.4: Tooltip Custo Médio**  
**Given** posição exibida  
**When** hover/click "ℹ️" preço médio  
**Then** tooltip lista transações:

```
Preço Médio: R$ 28,50

Transações:
• 100 un @ R$ 25,00 = R$ 2.500
• 50 un @ R$ 30,00 = R$ 1.500
• 50 un @ R$ 35,00 = R$ 1.750
────────────────────────────
Total: 200 un = R$ 5.750
Média: R$ 28,75

Atualização: trigger automático
```

✅ **AC-6.2.5: Componente Tooltip reutilizável**  
**Given** tooltip implementado  
**When** criar componente  
**Then** `<Tooltip>` reutilizável:

```tsx
<Tooltip content={<div>...</div>} position="top">
  <span>ℹ️</span>
</Tooltip>
```

**And** funciona mobile (click) e desktop (hover)  
**And** posicionamento inteligente  
**And** estilo dark theme consistente

**Estimativa:** 1 dia

---

## Epic 6 Summary

**Total Histórias:** 2  
**Estimativa Total:** 3 dias  
**FRs Cobertos:** FR-25 (Tela detalhe ativo), FR-26 (Tooltips rastreabilidade)

**Dependências:**
- 🟡 Story 6.1 depende Epics 2, 3, 4
- 🟡 Story 6.2 depende 6.1 ou telas com valores calculados

**Tabelas Consultadas:**
- `assets`, `price_history`, `positions`, `fundamentals`, `dividends`
- Nenhuma tabela nova criada

**Componentes Criados:**
- Tela `/assets/:ticker` com 7 seções
- Componente `<Tooltip>` reutilizável

**Rastreabilidade Implementada:**
- Score: regras + valores fundamentals
- Preço-Teto: fórmula Bazin expandida
- Rentabilidade: decomposição ganho + proventos
- Custo Médio: lista transações

---

## Epic 7: Dados de Mercado e Seed Incremental

**FRs Cobertos:** FR-22, FR-23, FR-24, FR-28  
**Estimativa Total:** 4 dias  
**Objetivo:** Popular base de dados com ativos, cotações, fundamentals, dividendos e benchmarks de forma incremental e idempotente, habilitando desenvolvimento paralelo dos épicos.

---

### Story 7.1: Seed Mínimo (10 Ativos + Price History 3M)

🟡 **SOFT DEPENDENCY** — Precisa Story 1.1 (setup Supabase), mas pode rodar paralelo Story 0.1

**As a** desenvolvedor,  
**I want** criar seed mínimo com 10 ativos brasileiros + price_history de 3 meses,  
**So that** Epic 2 (Portfolio) possa começar imediatamente com dados reais.

**Acceptance Criteria:**

✅ **AC-7.1.1: Tabela assets criada**  
**Given** Supabase configurado  
**When** migration `006_create_assets.sql`  
**Then** tabela `assets` criada com campos:
- `ticker` TEXT PRIMARY KEY
- `name` TEXT NOT NULL
- `type` TEXT NOT NULL CHECK (type IN ('stock_br', 'fii_br', 'stock_us', 'etf'))
- `country` TEXT NOT NULL CHECK (country IN ('BR', 'US'))
- `sector` TEXT
- `created_at` TIMESTAMPTZ DEFAULT now()

**And** tabela **pública** (sem RLS, dados de mercado compartilhados)

✅ **AC-7.1.2: Script seed 10 ativos idempotente**  
**Given** tabela assets criada  
**When** executar `supabase/seed/001_seed_minimal.sql`  
**Then** 10 ativos inseridos com `ON CONFLICT DO NOTHING`:

```sql
INSERT INTO assets (ticker, name, type, country, sector)
VALUES
  ('PETR4', 'Petrobras PN', 'stock_br', 'BR', 'Energia'),
  ('VALE3', 'Vale ON', 'stock_br', 'BR', 'Mineração'),
  ('ITUB4', 'Itaú Unibanco PN', 'stock_br', 'BR', 'Financeiro'),
  ('BBDC4', 'Bradesco PN', 'stock_br', 'BR', 'Financeiro'),
  ('ABEV3', 'Ambev ON', 'stock_br', 'BR', 'Consumo'),
  ('WEGE3', 'WEG ON', 'stock_br', 'BR', 'Industrial'),
  ('RENT3', 'Localiza ON', 'stock_br', 'BR', 'Serviços'),
  ('LREN3', 'Lojas Renner ON', 'stock_br', 'BR', 'Varejo'),
  ('MGLU3', 'Magazine Luiza ON', 'stock_br', 'BR', 'Varejo'),
  ('GGBR4', 'Gerdau PN', 'stock_br', 'BR', 'Siderurgia')
ON CONFLICT (ticker) DO NOTHING;
```

**And** script pode ser executado múltiplas vezes (idempotente)

✅ **AC-7.1.3: Seed price_history 3 meses (mock)**  
**Given** 10 ativos inseridos  
**When** popular price_history  
**Then** para cada ativo, inserir ~60 registros (3 meses × ~20 dias úteis) usando helper function `generate_mock_prices()`  
**And** idempotente via `ON CONFLICT DO NOTHING`

✅ **AC-7.1.4: Habilita Epic 2 imediatamente**  
**Given** seed mínimo executado  
**When** Epic 2 (Portfolio) começa  
**Then** Story 2.4 (importação CSV) valida tickers contra `assets`  
**And** Story 2.3 (lista positions) JOIN `assets` funciona  
**And** **Epic 2 pode rodar em paralelo** com Stories 7.2, 7.3, 7.4

**Estimativa:** 1 dia

---

### Story 7.2: Seed Expand Fundamentals (30 Ativos)

🟡 **SOFT DEPENDENCY** — Precisa Story 7.1 (assets), pode rodar paralelo Epic 2

**As a** desenvolvedor,  
**I want** expandir seed para 30 ativos + fundamentals completos,  
**So that** Epic 4 (Valuation Engine) possa calcular Score e Preço-Teto.

**Acceptance Criteria:**

✅ **AC-7.2.1: Script seed expand 20 ativos adicionais**  
**Given** seed mínimo executado (10 ativos)  
**When** executar `supabase/seed/002_seed_fundamentals.sql`  
**Then** +20 ativos inseridos (total 30) via `ON CONFLICT DO NOTHING`

✅ **AC-7.2.2: Seed fundamentals para 30 ativos**  
**Given** 30 ativos disponíveis  
**When** popular fundamentals  
**Then** inserir dados mock realistas:

```sql
INSERT INTO fundamentals (ticker, p_l, roe, dividend_yield, debt_equity, net_margin, last_12m_dividend)
VALUES
  ('PETR4', 8.5, 18.3, 7.2, 0.8, 15.2, 2.10),
  ('VALE3', 4.2, 22.5, 9.8, 0.5, 28.5, 6.40),
  ('ITUB4', 6.8, 19.2, 8.5, NULL, 25.8, 1.85),
  -- ... 30 ativos
ON CONFLICT (ticker) DO UPDATE SET
  p_l = EXCLUDED.p_l,
  roe = EXCLUDED.roe,
  dividend_yield = EXCLUDED.dividend_yield,
  debt_equity = EXCLUDED.debt_equity,
  net_margin = EXCLUDED.net_margin,
  last_12m_dividend = EXCLUDED.last_12m_dividend,
  updated_at = now();
```

**Edge cases:**
- 🟡 Fundamentals NULL permitidos: alguns campos podem ser NULL (ativo novo sem balanço)

✅ **AC-7.2.3: Expand price_history para 30 ativos**  
**Given** +20 ativos inseridos  
**When** executar seed  
**Then** chamar `generate_mock_prices()` para novos ativos (3 meses)

✅ **AC-7.2.4: Habilita Epic 4 (Valuation)**  
**Given** fundamentals populados  
**When** Epic 4 (Valuation) começa  
**Then** Story 4.1 (Postgres Functions) pode calcular score e preço-teto  
**And** **Epic 4 pode começar** após seed 7.2

**Estimativa:** 1 dia

---

### Story 7.3: Seed Full (50 Ativos + Dividends + Benchmarks + 12M)

🟡 **SOFT DEPENDENCY** — Precisa Story 7.2, pode rodar paralelo Epics 2 e 4

**As a** desenvolvedor,  
**I want** seed completo com 50 ativos + dividends + benchmarks + price_history 12 meses,  
**So that** Epic 3 (Análise) possa exibir proventos, rentabilidade e comparação benchmarks.

**Acceptance Criteria:**

✅ **AC-7.3.1: Script seed expand +20 ativos (total 50)**  
**Given** seed 30 ativos executado  
**When** executar `supabase/seed/003_seed_full.sql`  
**Then** +20 ativos inseridos (FIIs, small caps, etc.) via `ON CONFLICT DO NOTHING`

✅ **AC-7.3.2: Seed dividends últimos 12 meses**  
**Given** 50 ativos disponíveis  
**When** popular dividends  
**Then** inserir ~100 registros mock (ativos pagadores dividendo):

```sql
INSERT INTO dividends (ticker, type, value_per_share, payment_date, ex_date)
VALUES
  ('PETR4', 'dividend', 0.52, '2026-07-15', '2026-07-01'),
  ('PETR4', 'dividend', 0.48, '2026-04-15', '2026-04-01'),
  ('PETR4', 'jcp', 0.55, '2026-01-15', '2026-01-01'),
  ('VALE3', 'dividend', 1.60, '2026-06-20', '2026-06-05'),
  -- ... ~100 registros
ON CONFLICT (ticker, payment_date, type) DO NOTHING;
```

**Edge cases:**
- 🟡 Provento valor zero: filtrar, não inserir
- 🟡 Provento data futura: não inserir (apenas histórico)

✅ **AC-7.3.3: Seed benchmarks (IBOV, CDI) 12 meses**  
**Given** tabela benchmarks criada  
**When** popular benchmarks  
**Then** inserir ~240 registros (IBOV + CDI × ~120 dias úteis por semestre)  
**And** `ON CONFLICT (code, date) DO NOTHING`

✅ **AC-7.3.4: Expand price_history para 12 meses (50 ativos)**  
**Given** 50 ativos disponíveis  
**When** executar seed  
**Then** chamar `generate_mock_prices()` com 12 meses (~252 dias úteis)

✅ **AC-7.3.5: Habilita Epic 3 (Análise)**  
**Given** seed full executado  
**When** Epic 3 começa  
**Then** Story 3.4 (Proventos) exibe dividends  
**And** Story 3.5 (Rentabilidade) compara com benchmarks  
**And** **Epic 3 pode começar** após seed 7.3

**Estimativa:** 1 dia

---

### Story 7.4: Validation Script Retroativo

🟢 **INDEPENDENT** — Pode rodar paralelo, valida integridade seeds

**As a** desenvolvedor,  
**I want** script validação retroativa que verifica integridade dos dados seed,  
**So that** possamos detectar inconsistências antes de virar bugs em produção.

**Acceptance Criteria:**

✅ **AC-7.4.1: Script Python validação executável**  
**Given** seeds executados  
**When** executar `python supabase/seed/validate_seed.py`  
**Then** script valida:
- Todos assets têm price_history
- Dividendo > 0 ↔ Lucro > 0 (approximation via net_margin)
- Dívida/PL >= 0
- Fundamentals ranges (P/L 5-50, DY 0.01-20%, ROE -50 a +100%)

**Edge cases:**
- 🔴 Dividendo>0 ↔ Lucro>0: validation detecta contradição
- 🔴 Dívida/PL negativa: validation rejeita
- 🟡 Fundamentals NULL: permitido, validation não rejeita

✅ **AC-7.4.2: Executar validation no CI/CD**  
**Given** script criado  
**When** configurar CI (GitHub Actions)  
**Then** `.github/workflows/validate-seed.yml` executa validation em cada push

✅ **AC-7.4.3: Boundaries exatos testados**  
**Given** validation implementada  
**When** testar edge cases  
**Then** boundaries:
- P/L: aceita 5.0 e 50.0, rejeita 4.99 e 50.01
- DY: aceita 0.01% e 20.0%, rejeita 0% e 20.01%
- ROE: aceita -50.0% e +100.0%, rejeita -50.01% e +100.01%

**Estimativa:** 1 dia

---

## Epic 7 Summary

**Total Histórias:** 4  
**Estimativa Total:** 4 dias  
**FRs Cobertos:** FR-22 (Dados mercado mock), FR-23 (50 ativos brasileiros), FR-24 (Benchmarks IBOV/CDI), FR-28 (Seed incremental)

**Estratégia Incremental:**
- 🔴 Story 7.1 (10 ativos, 3M) → **Habilita Epic 2** imediatamente
- 🟡 Story 7.2 (30 ativos + fundamentals) → **Habilita Epic 4**
- 🟡 Story 7.3 (50 ativos + dividends + benchmarks, 12M) → **Habilita Epic 3**
- 🟢 Story 7.4 (validation) → Independente, valida integridade

**Dependências:**
- 🟡 Story 7.1 pode rodar paralelo Story 0.1
- 🟡 Stories 7.2, 7.3 podem rodar paralelo Epics 2, 4
- 🟢 Story 7.4 independente

**Tabelas Populadas:**
- `assets` (50 ativos, incremental 10→30→50)
- `price_history` (incremental 3M→3M→12M)
- `fundamentals` (30 ativos, Story 7.2)
- `dividends` (~100 registros, Story 7.3)
- `benchmarks` (IBOV + CDI 12M, Story 7.3)

**Idempotência:**
- Todos scripts usam `ON CONFLICT DO NOTHING` ou `DO UPDATE`
- Podem ser executados múltiplas vezes sem duplicar dados

**Validation:**
- Script Python detecta inconsistências
- CI/CD valida seeds automaticamente
- Edge cases 🔴ALTO cobertos

**Edge Cases Incorporados:**
- 🔴 Dividendo>0 ↔ Lucro>0: validation rejeita (AC-7.4.1)
- 🔴 Dívida/PL negativa: validation rejeita (AC-7.4.1)
- 🟡 Fundamentals NULL: permitido (AC-7.2.2)
- Boundaries P/L, DY, ROE testados (AC-7.4.3)

---

## 🎉 TODOS OS 7 ÉPICOS COMPLETOS!

**Resumo Geral:**
- ✅ Epic 1: Fundação e Autenticação (4 histórias, 3 dias)
- ✅ Story 0.1: Spike PL/pgSQL vs TypeScript (1 história, 2 dias)
- ✅ Epic 2: Gestão de Carteira e Posições (5 histórias, 5 dias)
- ✅ Epic 3: Análise de Portfolio (5 histórias, 8 dias)
- ✅ Epic 4: Valuation e Scoring Engine (4 histórias, 6 dias)
- ✅ Epic 5: Sistema de Alertas Inteligentes (2 histórias, 3 dias)
- ✅ Epic 6: Detalhe de Ativo e Rastreabilidade (2 histórias, 3 dias)
- ✅ Epic 7: Dados de Mercado e Seed Incremental (4 histórias, 4 dias)

**Total: 27 histórias, 34 dias estimados**

**Cobertura FRs:** 28/28 FRs cobertos (FR-1 a FR-28) ✅

**Tabelas Criadas:** 11 tabelas
- `users`, `transactions`, `positions` (com triggers)
- `price_history`, `assets`, `fundamentals`, `dividends`, `benchmarks`
- `score_rules`, `alerts`
- Todas com RLS onde necessário (tabelas privadas)

**Dependências 🟢🟡🔴:** 
- Estrutura permite paralelização máxima
- Story 0.1 valida ADR-001 antes Epic 4
- Seed incremental desbloqueia Epics 2, 4, 3 progressivamente

**Edge Cases Incorporados:** 19/19 edge cases cobertos
- 🔴 6 ALTO incorporados como ACs explícitos
- 🟡 13 MÉDIO incorporados como sub-bullets

---
