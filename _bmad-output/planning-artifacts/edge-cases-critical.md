# Edge Cases Críticos - Valora MVP

## Overview

Este documento lista edge cases críticos identificados via **Boundary & Edge Case Sweep** que devem ser incluídos nos acceptance criteria das histórias.

**Prioridades:**
- 🔴 **ALTO** — Pode causar falha em produção, corrupção de dados ou UX quebrada
- 🟡 **MÉDIO** — Degrada experiência mas não quebra sistema
- 🟢 **BAIXO** — Nice to have, edge case raro

---

## Epic 1: Fundação e Autenticação

### História 1.1: Setup + Auth

**🟡 MÉDIO: Nome com apenas espaços**
- **Input:** `"   "` (string com espaços)
- **Behavior esperado:** Frontend `.trim()` e valida `required`, backend rejeita
- **AC adicional:** "Validar que nome após trim não é vazio"
- **Rationale:** Form pode aceitar espaços, DB insere NULL

**🟡 MÉDIO: Email 254 caracteres**
- **Input:** `very.long.email...@subdomain.subdomain.domain.co.uk` (254 chars)
- **Behavior esperado:** Layout UI não quebra, validação aceita ≤254
- **AC adicional:** "Testar email 254 caracteres não quebra layout do form"

---

## Epic 2: Gestão de Carteira

### História 2.4: Preview CSV

**🔴 ALTO: CSV acima limite (1001+ linhas)**
- **Input:** Arquivo CSV com 1001 linhas
- **Behavior esperado:** Validar **count linhas ANTES de parsear completo**, erro "Máximo 1000 transações por arquivo"
- **AC adicional:** "Validar count linhas antes de parsear conteúdo completo (performance)"
- **Rationale:** Parsear 10k linhas consome memória desnecessariamente antes de rejeitar
- **Implementação:** `file.text().then(text => text.split('\n').length)` antes `Papa.parse()`

**🔴 ALTO: Encoding ISO-8859-1 (Excel Brasil)**
- **Input:** CSV exportado do Excel Brasil com acentos `ação`, `café`
- **Behavior esperado:** Detectar encoding com `jschardet`, converter para UTF-8 com `iconv-lite`, exibir acentos corretamente
- **AC adicional:** "Testar CSV ISO-8859-1 com caracteres `ção`, `ã`, `é` — exibir correto no preview"
- **Rationale:** Excel Brasil exporta ISO-8859-1 por padrão, acentos viram `�` sem detecção

**🟡 MÉDIO: Quantidade zero**
- **Input:** `PETR4,0,28.50,01/01/2026` tipo compra
- **Behavior esperado:** Rejeitar compra quantidade=0, aceitar venda quantidade=0 (zera posição)
- **AC adicional:** "Validar quantidade > 0 para tipo compra, aceitar quantidade=0 para tipo venda"
- **Rationale:** Venda total legítima deixa posição=0, mas compra 0 não faz sentido

**🟡 MÉDIO: CSV separador ponto-e-vírgula**
- **Input:** `PETR4;100;28,50;01/01/2026` (separador europeu `;`, decimal `,`)
- **Behavior esperado:** Papa Parse detecta automaticamente, parsear correto
- **AC adicional:** "Testar CSV separador `;` e decimal `,` (formato europeu)"

**🟡 MÉDIO: UTF-8 BOM**
- **Input:** Arquivo começa com bytes `EF BB BF` (UTF-8 BOM)
- **Behavior esperado:** Detectar BOM, remover, parsear normalmente
- **AC adicional:** "Detectar e remover UTF-8 BOM antes de parsear"
- **Implementação:** `text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text`

---

## Epic 3: Análise de Portfolio

### Gráfico Evolução Patrimônio

**🟡 MÉDIO: Gap cotação (ativo sem price_history dia X)**
- **Input:** Ativo delisted ou sem negociação dia X
- **Behavior esperado:** Gráfico mostra gap (linha pontilhada ou break), não interpolação
- **AC adicional:** "Se cotação faltante, mostrar gap honesto — não interpolar média"
- **Rationale:** Interpolar cria falsa precisão, usuário deve ver onde dados faltam

### Histórico Proventos

**🟡 MÉDIO: Provento data futura**
- **Input:** Dividendo declarado mas data COM no futuro
- **Behavior esperado:** Filtrar, mostrar apenas proventos com data ≤ hoje
- **AC adicional:** "Filtrar proventos futuros (data COM > hoje)"
- **Rationale:** Dividendos declarados mas não pagos podem confundir cálculo rentabilidade

**🟡 MÉDIO: Provento valor zero**
- **Input:** `PETR4, dividendo, R$ 0.00`
- **Behavior esperado:** Filtrar valores = 0 (dividendo R$0 não faz sentido)
- **AC adicional:** "Filtrar proventos valor = 0"

---

## Epic 4: Valuation e Scoring Engine

### Postgres Function calculate_score

**🔴 ALTO: Divisão por zero em PL/pgSQL**
- **Input:** Cálculo `(Lucro / Patrimônio) > X` onde Patrimônio = 0
- **Behavior esperado:** `COALESCE(Patrimônio, 1)` ou propagar NULL
- **AC adicional:** "Tratar divisão por zero em todas as fórmulas PL/pgSQL — usar COALESCE ou NULL propagation"
- **Implementação sugerida:**
  ```sql
  CASE 
    WHEN patrimonio = 0 THEN NULL 
    ELSE lucro / patrimonio 
  END
  ```

**🟡 MÉDIO: Fundamental NULL**
- **Input:** Ativo sem P/L (valor NULL em `fundamentals`)
- **Behavior esperado:** Regra não aplicável, score parcial (soma outras regras aplicáveis)
- **AC adicional:** "Documentar comportamento: fundamental NULL = regra ignorada, score = soma regras aplicáveis"

### Postgres Function calculate_fair_price_bazin

**🔴 ALTO: DY target zero ou negativo**
- **Input:** User coloca DY mínimo = 0% ou -5%
- **Behavior esperado:** Validar frontend DY > 0, não permitir submit
- **AC adicional:** "Validar DY mínimo > 0 no frontend (prevenir divisão por zero)"
- **Rationale:** `Preço-teto = dividendo / 0` = infinito, quebra cálculo

**🟡 MÉDIO: DY target 100%**
- **Input:** User quer yield 100%
- **Behavior esperado:** Permitir (matematicamente correto: `preço-teto = dividendo / 1.0`), mas mostrar warning "DY 100% é irrealista"
- **AC adicional:** "Aceitar DY até 100%, mostrar warning se > 30% (irrealista)"

---

## Epic 5: Sistema de Alertas

### Trigger Postgres

**🟡 MÉDIO: Trigger em DELETE transactions**
- **Input:** User tinha 1 transação, deletou, posição voltou a ter 0 transações
- **Behavior esperado:** Trigger também em `DELETE transactions` re-cria alerta "Posição sem transações"
- **AC adicional:** "Trigger deve disparar em INSERT positions E DELETE transactions"
- **Implementação:**
  ```sql
  CREATE TRIGGER alert_position_no_transactions_insert
    AFTER INSERT ON positions FOR EACH ROW EXECUTE FUNCTION check_transactions();
  
  CREATE TRIGGER alert_position_no_transactions_delete
    AFTER DELETE ON transactions FOR EACH ROW EXECUTE FUNCTION check_transactions_for_position(OLD.ticker, OLD.user_id);
  ```

**🟡 MÉDIO: Alerta duplicado (idempotência)**
- **Input:** Posição sem transação já tem alerta ativo, trigger dispara novamente
- **Behavior esperado:** Check `EXISTS(alerts WHERE user_id=... AND ticker=... AND type='position_no_transactions' AND status != 'ignored')` antes de INSERT
- **AC adicional:** "Alerta idempotente — não criar duplicado se já existe alerta ativo mesmo tipo+ticker+user"

**🟡 MÉDIO: Batch trigger (1000 posições simultâneas)**
- **Input:** Importação CSV cria 1000 posições de uma vez
- **Behavior esperado:** Aceitar flood de 1000 notificações Realtime (MVP), ou implementar debounce/batch (v2)
- **AC adicional:** "Testar importação CSV 1000 linhas — Realtime deve notificar sem travar frontend"
- **Nota:** MVP aceita flood, v2 pode agrupar notificações

---

## Epic 7: Seed Incremental

### História 7.4: Validation Script

**🔴 ALTO: Dividendo > 0 ↔ Lucro > 0 (contradição)**
- **Input:** `dividendo_anual = 2.00`, `lucro_liquido = 0` ou negativo
- **Behavior esperado:** Script rejeita "Empresa com lucro ≤ 0 não paga dividendo sustentável"
- **AC adicional:** "Validar dividendo_anual > 0 ↔ lucro_liquido > 0 (permitir ambos NULL)"
- **Implementação:**
  ```python
  if row['dividendo_anual'] > 0 and row['lucro_liquido'] <= 0:
      errors.append(f"{row['ticker']}: dividendo {row['dividendo_anual']} mas lucro {row['lucro_liquido']}")
  ```

**🔴 ALTO: Dívida/PL negativa**
- **Input:** `divida_patrimonio = -1.5`
- **Behavior esperado:** Script rejeita "Dívida/PL deve ser ≥ 0"
- **AC adicional:** "Validar divida_patrimonio ≥ 0"
- **Rationale:** Matematicamente impossível dívida negativa

**🟡 MÉDIO: Fundamentals NULL permitidos**
- **Input:** Ativo novo sem histórico, todos fundamentals = NULL
- **Behavior esperado:** Aceitar (ativo pode não ter balanço ainda)
- **AC adicional:** "NULL permitido para fundamentals (ativo novo), mas se presente, validar constraints"
- **Implementação:**
  ```python
  if row['p_l'] is not None:
      if not (5 <= row['p_l'] <= 50):
          errors.append(f"{row['ticker']}: P/L {row['p_l']} fora range 5-50")
  ```

**Boundaries Exatos:**
- P/L: aceita `5.0` e `50.0`, rejeita `4.99` e `50.01`
- DY: aceita `0.01%` e `20.0%`, rejeita `0%` e `20.01%`
- ROE: aceita `-50.0%` e `+100.0%`, rejeita `-50.01%` e `+100.01%`

---

## Resumo Priorização

| Prioridade | Count | Epic Principal |
|------------|-------|----------------|
| 🔴 **ALTO** | 6 | Epic 2 (CSV), Epic 4 (cálculos), Epic 7 (validation) |
| 🟡 **MÉDIO** | 13 | Distribuído |
| 🟢 **BAIXO** | 0 | — |

**Próximos Passos:**
1. ✅ Edge cases identificados
2. ⏭️ Incorporar nos acceptance criteria das histórias
3. ⏭️ Criar histórias detalhadas (Step 3 bmad workflow)
4. ⏭️ Marcar dependências 🟢🟡🔴

---

**Gerado por:** Boundary & Edge Case Sweep  
**Data:** 2026-08-15  
**Status:** Aprovado para incorporação nos ACs
