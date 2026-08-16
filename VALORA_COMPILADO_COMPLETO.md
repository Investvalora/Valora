# 📊 VALORA — COMPILADO COMPLETO DO PROJETO

**Versão:** 1.0  
**Data:** Agosto 2026  
**Status:** Telas UI prontas (6/12) | Backend em design | MVP: 8 semanas  

---

## 📑 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Telas Concluídas](#telas-concluídas)
3. [Telas em Falta](#telas-em-falta)
4. [Design System](#design-system)
5. [Arquitetura & Stack](#arquitetura--stack)
6. [Requisitos Funcionais](#requisitos-funcionais)
7. [Requisitos Não Funcionais](#requisitos-não-funcionais)
8. [APIs Públicas](#apis-públicas)
9. [Estrutura de Dados (TypeScript)](#estrutura-de-dados-typescript)
10. [Componentes & Padrões](#componentes--padrões)
11. [Dados de Estudo de Caso](#dados-de-estudo-de-caso)
12. [Roadmap & Sprints](#roadmap--sprints)
13. [Checklist de Desenvolvimento](#checklist-de-desenvolvimento)
14. [Riscos & Mitigação](#riscos--mitigação)

---

## Visão Geral

### O que é Valora?

Valora é uma **plataforma web de análise de carteira de investimentos** focada em transparência, decisão fundamentada e visualização clara de dados. Diferente de agregadores genéricos (Investidor10, Kinvo), o Valora coloca o usuário no controle das decisões através de:

- **Score Fundamentalista Customizável** (0-100): regras e pesos definidos pelo usuário
- **Motor de Preço-Teto Configurável**: estratégias Bazin, Graham ou fórmulas próprias
- **Alertas Inteligentes**: combinação de preço, fundamentos e eventos corporativos
- **Rastreabilidade Total**: cada número tem fonte, timestamp, versão

### Diferencial vs Concorrência

| Aspecto | Investidor10 | Kinvo | **Valora** |
|---------|--------------|-------|-----------|
| Score customizável | ❌ | ❌ | ✅ Pesos e regras |
| Preço-teto transparente | ❌ | Parcial | ✅ Fórmula visível |
| Alertas combinados | Básicos | Básicos | ✅ Preço + fundamentos + eventos |
| Rastreabilidade | ❌ Erros frequentes | Parcial | ✅ Fonte + timestamp por linha |
| Carteira manual + integração | Manual | Integrado | ✅ Ambos (fase 1 + 2) |

### Público-alvo

- **Investidores pessoa física** (renda média-alta)
- **Traders fundamentalistas** em B3
- **Assessores independentes** que precisam de ferramenta própria
- **Fintechs** que querem integrar análise de carteira

---

## Telas Concluídas

### ✅ 1. Login (`valora_login.html`)

**Arquivo:** `/uploads/valora_login.html` (234 linhas)

**Funcionalidades:**
- Autenticação por e-mail + senha
- Checkbox "manter conectado"
- Link "esqueci minha senha"
- Link para cadastro
- Transição suave para carteira

**Design:**
- Layout 2 colunas (desktop) | 1 coluna (mobile)
- Lado esquerdo: brand story + métricas (carteiras ativas, atualização, alertas)
- Lado direito: formulário login
- Topbar com logo, tag "ambiente seguro", link suporte
- Animações fade-in staggered com delays (0.1s, 0.2s, 0.3s, 0.4s)

**Elementos visuais:**
```html
<div class="topbar">                  <!-- 64px altura -->
  <div class="logo-wrap">             <!-- Logo + nome Valora -->
  <div class="top-actions">           <!-- Status, link suporte -->
</div>
<main class="content">                <!-- Grid 1.2fr : 0.9fr -->
  <section class="brand">             <!-- Storytelling lado esquerdo -->
    <div class="metrics">             <!-- Grid 3 cols de KPIs -->
    <div class="signal">              <!-- Grid 2 cols signal cards -->
  <section class="login-panel">       <!-- Formulário lado direito -->
```

**Validações:**
- E-mail obrigatório (email validation)
- Senha obrigatória
- Spinner no botão durante submit

**Responsividade:**
- 1920px: 2 colunas desktop full
- 1100px: 1 coluna center
- 980px: reorder (formulário topo, brand abaixo)
- 640px: tipografia reduzida, padding menor

---

### ✅ 2. Cadastro (`valora_cadastro.html`)

**Arquivo:** `/uploads/valora_cadastro.html` (237 linhas)

**Funcionalidades:**
- Cadastro: nome completo + celular + e-mail + senha + confirmar senha
- Validação de senha confirmada
- Link para login (se já tem conta)
- Fluxo de 3 passos visual (dados básicos → configurar → carteira pronta)

**Design:**
- Mesma estrutura do login (2 col → 1 col responsive)
- Lado esquerdo: steps indicator, benefícios (sem burocracia, centralize tudo)
- Lado direito: formulário com 5 campos

**Elementos:**
```html
<div class="steps">                   <!-- Grid 3 cols, indicadores -->
  <div class="step">                  <!-- 1. Dados básicos -->
  <div class="step">                  <!-- 2. Configurar -->
  <div class="step">                  <!-- 3. Acompanhar -->
</div>
<div class="signal">                  <!-- 2 signal cards lado esquerdo -->
<form>
  <input name="name" placeholder="Seu nome completo" />
  <input name="phone" type="tel" placeholder="(11) 90000-0000" />
  <input name="email" type="email" />
  <input name="password" type="password" />
  <input name="confirmPassword" type="password" />
  <button type="submit" class="btn primary">criar conta e abrir carteira</button>
</form>
```

**Animações:**
- Fade-in staggered (animação `.animate` com `.delay-1` a `.delay-4`)
- Submit: spinner + transição para carteira (650ms)

---

### ✅ 3. Carteira (`valora_carteira.html`)

**Arquivo:** `/uploads/valora_carteira.html` (570 linhas)

**Funcionalidades:**
- Painel principal de investimentos
- KPIs: patrimônio total, lucro, proventos, vs IBOV, score médio
- Tabela de ativos agrupada por tipo (ações, FIIs)
- Alocação por ativo (barra empilhada 100%)
- Alocação por setor (barras horizontais)
- Histórico de proventos (últimos 4 recebimentos)
- Alertas (2-3 cards contextualizados)

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Topbar: logo | nav links | sync badge | avatar │
├──────────────┬────────────────────────────────────┤
│              │                                    │
│  Sidebar     │  Main Content                      │
│  - carteira  │  ┌────────────────────────────┐   │
│  - rentab.   │  │ KPIs (4 cols)              │   │
│  - patrimônio│  ├────────────────────────────┤   │
│  - proventos │  │ Ativos Table (colspan 2)   │   │ ← Grid 1fr + 300px
│  - estratég. │  │ ┌──────────────────────┐  │   │
│  - score     │  │ │ Ações (5 ativos)     │  │   │
│  - alertas   │  │ │ - PETR4, BBAS3, ...  │  │   │
│              │  │ │ subtotal             │  │   │
│              │  │ │ FIIs (6 ativos)      │  │   │
│              │  │ │ - HGLG11, GARE11...  │  │   │
│              │  │ │ subtotal             │  │   │
│              │  │ └──────────────────────┘  │   │
│              │  └────────────────────────────┘   │
│              │                                    │
│              │  Sidebar Direito:                  │
│              │  ┌─ Alocação por Ativo ────────┐ │
│              │  │ [████████████████████]       │ │
│              │  │ PETR4 31.5% BBAS3 25.6% ... │ │
│              │  └──────────────────────────────┘ │
│              │  ┌─ Alocação por Setor ────────┐ │
│              │  │ financeiro ████  47.8%       │ │
│              │  │ energia    ████  31.5%       │ │
│              │  └──────────────────────────────┘ │
│              │  ┌─ Últimos Proventos ──────────┐ │
│              │  │ PETR4 div · +R$ 576          │ │
│              │  │ BBAS3 JCP · +R$ 377          │ │
│              │  │ Total 2026: R$ 1.840         │ │
│              │  └──────────────────────────────┘ │
│              │  ┌─ Alertas Valora ─────────────┐ │
│              │  │ 🟢 PETR4 abaixo do teto      │ │
│              │  │ 🟡 VALE3 perdas no trimestre │ │
│              │  └──────────────────────────────┘ │
└──────────────┴────────────────────────────────────┘
```

**Tabela de Ativos:**
```
Ativo    | Qtd | P.Médio | Cotação | Investido | Posição | Rent. | % Cart | Score | P.Teto
---------|-----|---------|---------|-----------|---------|-------|--------|-------|--------
PETR4    | 400 | 32,10   | 38,42   | 12.840    | 15.368  | +19,7%| 31,5%  | 81    | 43,60
BBAS3    | 460 | 25,80   | 27,15   | 11.868    | 12.489  | +5,2% | 25,6%  | 85    | 31,20
ITUB4    | 310 | 33,50   | 34,87   | 10.385    | 10.810  | +4,1% | 22,2%  | 77    | próx.
VALE3    | 120 | 65,00   | 61,10   | 7.800     | 7.332   | -6,0% | 15,0%  | 64    | acima
WEGE3    | 75  | 48,90   | 52,30   | 3.668     | 3.923   | +6,9% | 8,1%   | 59    | acima
─────────┴─────┴─────────┴─────────┴───────────┴─────────┴───────┴────────┴───────┴────────
SUB TOTAL| ... | ... | ... | 46.561 | 49.922    | +7,2% | 100% | méd 73 | ...
```

**KPIs:**
- **Patrimônio Total:** R$ 48.720 (+R$ 3.241 · +7,1%)
- **Lucro Total:** R$ 3.241 (valorização + proventos)
- **Proventos Recebidos:** R$ 1.840 (DY 8,2% a.a.)
- **vs IBOV:** +2,8 p.p. (carteira +7,1% · ibov +4,3%)
- **Score Médio:** 74 (3 oportunidades · 1 atenção) — card destaque

**Componentes:**
```html
.kpi { background: --bg-1; border: --line-1; padding: 16px 18px; }
  h3 { font-: 11px uppercase; color: --text-3; }
  .value { font-size: 22px; font-weight: 600; }
  .sub { font-size: 11px; color: --text-2; }

.panel { background: --bg-1; border: --line-1; }
  .filters { display: flex; gap: 6px; }
    .btn { padding: 5px 10px; }
  table { width: 100%; border-collapse: collapse; }
    thead { background: --bg-2; }
    tbody tr:hover { background: --bg-2; }

.sidebar-col { display: flex; flex-direction: column; gap: 14px; }
  .side-card { background: --bg-1; border: --line-1; }
    h4 { font-size: 11px; uppercase; }
```

**Indicadores de Fonte (Rastreabilidade):**
- 🟢 Ponto verde = dado verificado (fonte confiável, < 1min)
- 🟡 Ponto laranja = dado com delay (ex: 15min, fonte secundária)
- 🔴 Ponto vermelho = dado não confirmado (usar com cautela)

**Filtros:**
- Botões: Todos | Ações | FIIs | ETFs
- Ativo filtra a tabela sem recarregar

---

### ✅ 4. Patrimônio (`valora_patrimonio.html`)

**Arquivo:** `/uploads/valora_patrimonio.html` (474 linhas)

**Funcionalidades:**
- Evolução patrimonial em 12 meses (gráfico area)
- KPIs: max drawdown, aportes, ganho acumulado
- Consolidação por classe (ações, tesouro, FIIs, stocks, ETFs int, cripto)
- Destaques de posições
- Exposição externa e liquidez

**KPIs (4 colunas):**
- Patrimônio total: R$ 48.720
- Max drawdown: -8,2% (jan)
- Aportes no período: R$ 15.000
- Ganho acumulado: +R$ 3.241

**Gráfico:**
- Área empilhada com 6 segmentos por classe
- Legend interativa
- Tooltip ao hover com valores

**Tabela de Classes:**
```
Classe              | Valor    | % Carteira | Ganho    | Rent%
--------------------|----------|-----------|----------|--------
Ações               | 49.922   | 73,4%     | +3.654   | +7,9%
Tesouro Direto      | 8.500    | 12,5%     | +320     | +3,9%
FIIs                | 12.000   | 17,6%     | -180     | -1,5%
ETFs Internacionais | 4.200    | 6,2%      | +520     | +14,1%
Criptos             | -        | -         | -        | -
```

---

### ✅ 5. Proventos (`valora_proventos.html`)

**Arquivo:** `/uploads/valora_proventos.html` (508 linhas)

**Funcionalidades:**
- Total de proventos: R$ 1.840
- Proventos 12M: R$ 1.840
- Média mensal: R$ 153,33
- Yield on cost: 3,78%
- Gráfico de evolução mensal
- Histórico por mês com recebidos + previstos
- Tabela de ativos pagadores

**Histórico Mensal:**
```
Mês    | Recebidos | Previstos | Total  | Status
-------|-----------|-----------|--------|--------
Mai    | R$ 576    | R$ 120    | R$ 696 | ✓ Completo
Abr    | R$ 322    | -         | R$ 322 | ✓ Completo
Mar    | R$ 189    | R$ 80     | R$ 269 | ✓ Completo
Fev    | R$ 377    | -         | R$ 377 | ✓ Completo
Jan    | -         | R$ 200    | R$ 200 | ⏳ Previsto
```

**Ativos Pagadores:**
- PETR4: último pag 30/mai, dividendo, R$ 576, 144/ação, 8,9% DY
- BBAS3: último pag 15/mai, JCP, R$ 377, 82/ação, 11,2% DY
- HGLG11: último pag 08/mai, rendimento, R$ 289, 3,61/ação, 8,7% DY
- ITUB4: último pag 02/mai, dividendo, R$ 189, 61/ação, 5,2% DY

---

### ✅ 6. Rentabilidade (`valora_rentabilidade.html`)

**Arquivo:** `/uploads/valora_rentabilidade.html` (488 linhas)

**Funcionalidades:**
- Rentabilidade total: +7,1% desde início
- Rentabilidade 12M: +6,8%
- Rentabilidade 1M: +1,2%
- Volatilidade: 8,4% (mensal)
- Beta: 0,95
- Gráfico comparativo (carteira vs CDI vs IBOV vs IPCA)
- Tabela por ativo com peso, proventos, variação e contribuição

**Gráfico Comparativo (últimos 12M):**
```
Carteira: ────────────────────────────── +7,1%
IBOV:     ──────────────────────── +4,3%
CDI:      ────────────── +2,1%
IPCA:     ─────────────── +2,8%
```

**Tabela de Performance por Ativo:**
```
Ativo   | Peso  | Proventos | Variação | Contribuição
--------|-------|-----------|----------|---------------
PETR4   | 31,5% | +1,8%     | +20,1%   | +6,7%
BBAS3   | 25,6% | +1,4%     | +5,2%    | +1,7%
ITUB4   | 22,2% | +0,9%     | +4,1%    | +1,1%
VALE3   | 15,0% | +0,6%     | -6,0%    | -0,9%
WEGE3   | 8,1%  | +0,3%     | +6,9%    | +0,6%
HGLG11  | 6,7%  | +5,2%     | +6,2%    | +0,8%
... (total contribuição = +7,1%)
```

---

## Telas em Falta

### ❌ 1. Detalhe do Ativo (`valora_ativo.html`) — PRIORITÁRIO

**Necessidade:** Quando usuário clica em ativo na carteira, precisa ir a algum lugar. Atualmente é void.

**Estrutura 1920×1080:**
```
┌─────────────────────────────────────────────┐
│ Topbar + Sidebar                            │
├──────────────┬──────────────────────────────┤
│              │ Header do Ativo (PETR4)      │
│              │ Preço: R$ 38,42 (+2,3%)      │
│              │ Setor: Energia · IBOVX      │
│ Sidebar      ├──────────────────────────────┤
│              │ Chart (gráfico 6M)  │ Info  │
│              │ ┌────────────────┐  │ lado  │
│              │ │    PREÇO       │  │ d:    │
│              │ │   ╱  ╲  ╱ ╲   │  │ - P/L │
│              │ │  ╱    ╲╱   ╲  │  │ - ROE │
│              │ └────────────────┘  │ - DY  │
│              │ [1M] [3M] [6M] [1A] │ - ... │
│              │ [5A] [Tudo]         │       │
│              ├──────────────────────┤───────┤
│              │ Indicadores (2×4)    │ Score │
│              │ ┌─────────┐┌─────────┐Donut │
│              │ │ P/L: 8  ││ ROE: 15%│Break-│
│              │ │vs setor │││vs setor ││down  │
│              │ │: 12     │└─────────┘│● R.L │
│              │ └─────────┘           │● Mark│
│              │ P/L vs P/VP | Dívida  │● CAGR│
│              │             | EBITDA  │      │
│              │ DY: 8,9%    | P/VP    │      │
│              ├──────────────────────┤───────┤
│              │ Preço-Teto           │ Timeline
│              │ [Bazin ▼] R$ 43,60   │ ╔════════╗
│              │ ████████  vs atual   │ │ Eventos│
│              │ Abaixo 12% oportun. │ │ - Divid│
│              │ Fórmula visível ↓    │ │ - Fato│
│              │ [(LPA*15)*1.5]       │ │ - Result
│              │                      │ ╚════════╝
│              ├──────────────────────┤───────┤
│              │ Ações                │       │
│              │ [Adicionar] [Favorit]│       │
│              │ [Gerar Alerta]       │       │
└──────────────┴──────────────────────┴───────┘
```

**Elementos obrigatórios:**

1. **Header do Ativo**
   - Ticker (ex: PETR4), preço atual, variação % (cor)
   - Nome completo (ex: Petrobras PN)
   - Setor (ex: Energia), subsetor, índice (ex: IBOVX)
   - Botão de ações: adicionar, favoritar, gerar alerta

2. **Gráfico de Preço**
   - Abas temporais: 1M, 3M, 6M, 1A, 5A, Tudo
   - Candlestick ou linha conforme período
   - Volume em barras abaixo
   - Tooltip ao hover (data, preço, volume)
   - Zoom interativo

3. **Grid de Indicadores (2×4)**
   ```
   P/L              | ROE            | Dívida/EBITDA    | DY
   Valor vs Setor   | Valor vs Setor | Valor vs Setor   | Valor vs Setor
   
   P/VP             | Margem Líq     | CAGR Receita     | P/L×P/VP
   Valor vs Setor   | Valor vs Setor | Valor vs Setor   | Valor vs Setor
   ```
   Cada card tem:
   - Rótulo + valor
   - Barra comparativa vs setor (ou benchmark)
   - Cor: verde (acima) / neutro / vermelho (abaixo)

4. **Score Valora**
   - Donut chart com número grande no centro (ex: 81)
   - Legend abaixo com breakdown por regra:
     - Regra Lucratividade: 20/20
     - Regra Endividamento: 15/20
     - Regra Crescimento: 12/15
     - etc
   - Barra de progresso por regra
   - Status: "Excelente" ou "Oportunidade" com cor

5. **Preço-Teto**
   - Dropdown: [Bazin ▼] (opções: Bazin, Graham, Múltiplos, Custom)
   - Valor calculado em destaque (ex: R$ 43,60)
   - Barra horizontal comparativa:
     ```
     [█████████ 38,42 (atual) ███████ 43,60 (teto)]
     Abaixo 12% - Oportunidade
     ```
   - Campo colapsável com fórmula (ex: `(LPA × 15) × 1.5 = R$ 43,60`)
   - Botão "usar esta estratégia"

6. **Timeline de Eventos**
   - Dividendos: data, valor/ação, YoY
   - JCP: data, valor/ação
   - Desdobramentos
   - Fatos relevantes (CVM)
   - Resultados (trimestral)
   - Scroll vertical ou horizontal

7. **Ações Rápidas (Bottom)**
   - Botão "Adicionar à carteira" (abre modal)
   - Botão "Favoritar" (toggle)
   - Botão "Gerar alerta" (abre form)

**Design Notes:**
- Manter sidebar esquerda (230px)
- Main content: 1690px com grid 2fr (gráfico + indicadores) + 1fr (score + timeline)
- Usar cores do design system (--cyan, --green, --amber, --red)
- Responsive em 1280, 768, 540

---

### ❌ 2. Score Valora (`valora_score.html`) — PRIORITÁRIO

**Necessidade:** Usuário precisa ver e modificar as regras de cálculo do score que aparece na carteira.

**Estrutura:**
```
┌─────────────────────────────────────────────┐
│ Topbar + Sidebar                            │
├──────────────┬──────────────────────────────┤
│              │ KPI Score Médio Carteira     │
│              │ [Número grande: 74]          │
│ Sidebar      │ Última atualização: 30 min  │
│              │ (3 ativos oportunidade)     │
│              ├──────────────────────────────┤
│              │ EDITOR DE REGRAS             │
│              │                              │
│              │ Tabela:                      │
│              │ Regra │ Pontuação │ Peso │ ✕ │
│              │────────────────────────────┤  │
│              │ P/L < 12          │ 20   │ 40%│─ │
│              │ ROE > 15%         │ 15   │ 30%│ + │
│              │ Dívida/EBITDA < 2 │ 15   │ 20%│ × │
│              │ Crescimento > 5%  │ 10   │ 10%│ ✕ │
│              │────────────────────────────┤  │
│              │ [+ Adicionar Regra]         │  │
│              │                              │
│              ├──────────────────────────────┤
│              │ PARÂMETROS GLOBAIS          │
│              │ Taxa Mínima (% a.a.):       │
│              │ [━━━━━━━━━━ 6%]  0% ← → 15% │
│              │                              │
│              │ Janela de Análise (anos):   │
│              │ [━━━━━━━━━ 5 anos] 1 ← → 10 │
│              │                              │
│              │ Margem de Segurança:        │
│              │ [━━━━━━━━━ 10%]  0% ← → 30% │
│              │                              │
│              ├──────────────────────────────┤
│              │ [Salvar como Padrão]        │
│              │ [Resetar para Sistema]      │
└──────────────┴──────────────────────────────┘
```

**Right Panel (Preview em Tempo Real):**
```
┌──────────────────────┐
│ PREVIEW (3 ativos)   │
├──────────────────────┤
│ PETR4      Score: 81 │
│ ███████  Comprar    │
│                      │
│ BBAS3      Score: 85 │
│ ███████  Comprar    │
│                      │
│ WEGE3      Score: 59 │
│ ██████   Neutro     │
└──────────────────────┘
```

**Elementos:**

1. **KPI Score Médio**
   - Número grande (tamanho 36px+)
   - Frase descritiva ("3 oportunidades · 1 atenção")
   - Última atualização

2. **Tabela de Regras**
   - Colunas: Regra | Pontuação | Peso | Ações
   - Cada linha tem:
     - Campo texto (regra, ex: "P/L < 12")
     - Input number (pontuação, 0-20)
     - Slider (peso, %)
     - Botões: editar, deletar
   - Botão "+ Adicionar Regra" no fim

3. **Sliders de Parâmetros**
   - Taxa mínima: 0-15% com steps 0,5
   - Janela de anos: 1-10 com steps 1
   - Margem de segurança: 0-30% com steps 1
   - Cada slider tem rótulo + valor atual

4. **Botões de Ação**
   - Salvar como Padrão (POST /score/save)
   - Resetar para Sistema (DELETE /score/custom)

5. **Preview em Tempo Real**
   - 3 ativos exemplo (PETR4, BBAS3, WEGE3)
   - Recalcula conforme usuário mexe nos sliders
   - Sinal: Comprar (verde) | Neutro (amarelo) | Vender (vermelho)

6. **Histórico (Aba ou Drawer)**
   - Últimas 5 estratégias de score criadas
   - Data, score resultante, número de alertas gerados

**Validações:**
- Soma de pesos não pode ultrapassar 100% (feedback)
- Cada regra precisa de pontuação > 0
- Mínimo 1 regra obrigatória

---

### ❌ 3. Estratégias / Preço-Teto (`valora_estrategias.html`) — PRIORITÁRIO

**Necessidade:** Completar o ciclo de análise. Usuário cria estratégias de valuation que geram alertas automáticos.

**Estrutura (Abas):**

```
┌─────────────────────────────────────────────┐
│ Topbar + Sidebar                            │
├──────────────┬──────────────────────────────┤
│              │ [Estratégias Ativas] [Nova]  │
│              │ [Histórico]                  │
│              ├──────────────────────────────┤
│              │                              │
│              │ ABA 1: ESTRATÉGIAS ATIVAS    │
│              │                              │
│              │ Cards em grid 3 cols:        │
│              │ ┌──────────┐┌──────────┐     │
│              │ │Bazin     ││Graham    │     │
│              │ │Padrão    ││Padrão    │     │
│              │ │R$ 43,60  ││R$ 38,20  │     │
│              │ │Ativa em 3││Ativa em 2│     │
│              │ │ ativos   ││ ativos   │     │
│              │ │[Ed][Del] ││[Ed][Del] │     │
│              │ └──────────┘└──────────┘     │
│              │ ┌──────────────┐             │
│              │ │Custom Rentab.│             │
│              │ │do usuário    │             │
│              │ │R$ 45,50      │             │
│              │ │Ativa em 1    │             │
│              │ │ativo         │             │
│              │ │[Ed][Del]     │             │
│              │ └──────────────┘             │
│              │                              │
│              ├──────────────────────────────┤
│              │                              │
│              │ ABA 2: CRIAR NOVA            │
│              │                              │
│              │ Nome:                        │
│              │ [_________________________]  │
│              │                              │
│              │ Tipo:                        │
│              │ ○ Preço-Teto ○ Score        │
│              │                              │
│              │ Método (se Preço-Teto):     │
│              │ ○ Bazin ○ Graham            │
│              │ ○ Múltiplos ○ Fórmula Custom│
│              │                              │
│              │ [Parâmetros por método]     │
│              │                              │
│              │ Bazin:                       │
│              │ Taxa (% a.a.): [_]           │
│              │ Janela (anos): [_]           │
│              │ Margem (% seg): [_]          │
│              │                              │
│              │ Graham (Manual):             │
│              │ Preço-Teto: [_________]      │
│              │                              │
│              │ Múltiplos:                   │
│              │ P/L-Teto: [_]                │
│              │ P/VP-Teto: [_]               │
│              │                              │
│              │ Fórmula Custom:              │
│              │ [_________________________]  │
│              │ [Indicadores] (dropdown)     │
│              │                              │
│              │ Preview em Tempo Real:       │
│              │ ┌─────────────────────────┐ │
│              │ │ PETR4: R$ 45,60 Comprar │ │
│              │ │ BBAS3: R$ 32,50 Comprar │ │
│              │ │ WEGE3: Acima do teto    │ │
│              │ └─────────────────────────┘ │
│              │                              │
│              │ [Salvar e Gerar Alerta]     │
│              │                              │
│              └──────────────────────────────┘
```

**ABA 3: HISTÓRICO**
```
Data       │ Estratégia       │ Método   │ Valor | Alertas | Ação
-----------|------------------|----------|-------|---------|-------
30/08/2026 │ Custom Rentabil  │ Fórmula  │ 45,50 │ 3 gerados│ Ativa
28/08/2026 │ Graham conserv.  │ Graham   │ 38,20 │ 2 gerados│ Pausada
25/08/2026 │ Bazin 2026       │ Bazin    │ 42,10 │ 5 gerados│ Deletada
```

**Elementos:**

1. **Aba Estratégias Ativas**
   - Card por estratégia (grid, 3 cols desktop)
   - Cada card mostra:
     - Nome
     - Tipo (Bazin/Graham/Custom)
     - Valor calculado (ex: R$ 43,60)
     - Número de ativos "em oportunidade"
     - Botões: editar, deletar, visualizar

2. **Aba Criar Nova**
   - Input: nome da estratégia
   - Radio: tipo (Preço-Teto | Score)
   - Se Preço-Teto:
     - Radio: método (Bazin | Graham | Múltiplos | Fórmula Custom)
     - Parâmetros por método:
       - **Bazin:** Taxa (%), Janela (anos), Margem (%)
       - **Graham:** Preço-Teto (valor manual)
       - **Múltiplos:** P/L-Teto, P/VP-Teto
       - **Fórmula:** Campo texto com dropdown de indicadores
   - Preview em tempo real (3 ativos exemplo)
   - Botão "Salvar e Gerar Alerta"

3. **Indicadores Disponíveis (Dropdown)**
   ```
   - lpa (LPA anual)
   - vpa (VPA anual)
   - roe (ROE %)
   - pl (P/L atual)
   - pvp (P/VP atual)
   - dy (Dividendo Yield %)
   - divida_ebitda (Dívida/EBITDA)
   - cagr_receita (CAGR receita 5a)
   - margem_liq (Margem Líquida %)
   - preco_atual (Preço atual)
   ```

4. **Aba Histórico**
   - Tabela com últimas 10 estratégias
   - Ordenável por data, valor, alertas
   - Botão "reativar" ou "visualizar"

**Validações:**
- Nome obrigatório
- Tipo obrigatório
- Método obrigatório
- Parâmetros com range válido (taxa 0-20%, janela 1-10, etc)
- Fórmula customizada precisa validar sintaxe

**Cálculos:**
- **Bazin:** `(LPA × taxa × 15 × (1 + margem))`
- **Graham:** valor manual
- **Múltiplos:** `(LPA × P/L-Teto)` ou `(VPA × P/VP-Teto)`
- **Custom:** parser da fórmula com replace de indicadores

---

### ❌ 4-6. Telas de Fase 2 (Não-Prioritárias)

**Alertas** (`valora_alertas.html`)
- Central de alertas com filtros (tipo, status, ativo)
- Histórico 30 dias
- Config para criar alertas customizados

**Comparador** (`valora_comparar.html`)
- Busca e add até 4 ativos
- Tabela comparativa com indicadores customizáveis
- Export PDF

**Configurações** (`valora_config.html`)
- Perfil, preferências, notificações, estratégia padrão
- Integrações com corretoras (fase 3)

---

## Design System

### Paleta de Cores

```css
:root {
  /* Backgrounds */
  --bg-0: #0f141a;      /* Principal (frame bg) */
  --bg-1: #141b23;      /* Cards, panels */
  --bg-2: #19212b;      /* Hover states, secondary */
  --bg-3: #1e2833;      /* Tertiary */

  /* Borders/Lines */
  --line-1: #2a3440;    /* Default border */
  --line-2: #202a36;    /* Subtle divider */

  /* Text */
  --text-1: #e6edf5;    /* Primário (títulos, corpo) */
  --text-2: #9aa7b8;    /* Secundário (labels, hints) */
  --text-3: #6d7a8d;    /* Terciário (muted) */

  /* Destaques */
  --cyan: #62c6ff;      /* Logo, links principais */
  --blue: #4c8dff;      /* Links, estados ativos */
  --green: #4cd483;     /* Positivo (ganhos, comprar) */
  --amber: #f2b44b;     /* Aviso (neutro, atenção) */
  --red: #f26d6d;       /* Negativo (perdas, vender) */

  /* Shadow & Effects */
  --card-glow: 0 10px 32px rgba(6, 10, 16, 0.35);
  --radius-lg: 16px;
  --radius-md: 12px;
  --radius-sm: 9px;
}
```

**Uso:**
- Backgrounds: `--bg-0` (frame), `--bg-1` (cards), `--bg-2` (hover)
- Borders: `--line-1` (default), `--line-2` (subtle)
- Text: `--text-1` (corpo), `--text-2` (labels), `--text-3` (muted)
- Status: `--green` (up/buy), `--red` (down/sell), `--amber` (neutral)

### Tipografia

```css
--font-title: 'Space Grotesk', 'Segoe UI', system-ui, -apple-system, sans-serif;
--font-body: 'IBM Plex Sans', 'Segoe UI', system-ui, -apple-system, sans-serif;
```

**Escala:**
| Uso | Font | Size | Weight | Line-Height |
|-----|------|------|--------|-------------|
| Page Title | Space Grotesk | 32px | 600 | 1.1 |
| Section Title | Space Grotesk | 20px | 600 | 1.2 |
| KPI Value | Space Grotesk | 22px | 600 | 1 |
| Body | IBM Plex Sans | 13px | 400 | 1.5 |
| Label/Tag | IBM Plex Sans | 11px | 500 | 1.4 |
| Small | IBM Plex Sans | 10px | 400 | 1.4 |

### Espaçamento

```css
/* Grid/Gaps */
4px, 6px, 8px, 10px, 12px, 14px, 16px, 20px, 24px, 28px, 32px

/* Cards/Padding */
.card { padding: 16px 18px; } /* small */
.card { padding: 20px 24px; } /* medium */
.card { padding: 24px 32px; } /* large */

/* Borders */
.panel { border: 1px solid var(--line-1); }
.divider { border: 0.5px solid var(--line-2); }
```

### Componentes Padrão

#### Buttons
```html
<!-- Primary -->
<button class="btn primary">Entrar</button>
<!-- Styles: linear-gradient(135deg, #1d3a56, #25507a), border #2b4d6c, color #dcedff -->

<!-- Secondary/Ghost -->
<button class="btn ghost">Cancelar</button>
<!-- Styles: transparent, color var(--text-2) -->

<!-- Warning -->
<button class="btn warn">Deletar</button>
<!-- Styles: border rgba(242,180,75,0.45), color #ffd9a8, background rgba(242,180,75,0.08) -->
```

#### KPI Cards
```html
<div class="kpi">
  <h3>patrimônio total</h3>
  <div class="value">R$ 48.720</div>
  <div class="sub up">+R$ 3.241 · +7,1%</div>
</div>
```

#### Pills/Tags
```html
<div class="pill err">
  <div class="dot"></div> Erro na sincronização
</div>
<div class="pill info">
  <div class="dot"></div> Atualizado 14:47
</div>
```

#### Tables
```html
<table>
  <thead>
    <tr> <!-- background: --bg-2 -->
      <th>Ativo</th>
      <th>Qtd</th>
      <!-- ... -->
    </tr>
  </thead>
  <tbody>
    <tr> <!-- hover: background --bg-2 -->
      <td class="ticker">PETR4</td>
      <!-- ... -->
    </tr>
  </tbody>
</table>
```

#### Layout Padrão (Topbar + Sidebar + Main)
```html
<div class="frame">
  <!-- 1. Topbar (60px altura) -->
  <header class="topbar">
    <div class="logo-wrap">
      <img class="logo-mark" src="logo.svg" />
      <span class="logo-txt">val<span>ora</span></span>
    </div>
    <nav class="nav-links">
      <a class="nl on" href="#carteira">carteira</a>
      <a class="nl" href="#rentabilidade">rentabilidade</a>
      <!-- ... -->
    </nav>
    <div class="top-actions">
      <div class="sync"><span class="sync-dot"></span>atualizado 14:47</div>
      <button class="ib"><!-- ícone --></button>
      <div class="av">MR</div>
    </div>
  </header>

  <!-- 2. Body (flex: Sidebar + Main) -->
  <div class="body">
    <!-- 2a. Sidebar (230px, colapsável) -->
    <aside class="sidebar">
      <div class="sb-section">
        <div class="sb-label">visão geral</div>
        <a class="sb-item on" href="#carteira">
          <svg><!-- ícone --></svg>
          carteira
        </a>
        <a class="sb-item" href="#rentabilidade">
          <svg><!-- ícone --></svg>
          rentabilidade
          <span class="badge">3</span>
        </a>
      </div>
    </aside>

    <!-- 2b. Main Content (flex: 1) -->
    <main style="flex: 1; overflow-y: auto; padding: 24px 28px;">
      <!-- Conteúdo aqui -->
    </main>
  </div>
</div>
```

### Animações

```css
/* Fade-in ao carregar */
@keyframes rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate {
  opacity: 0;
  transform: translateY(14px);
  animation: rise 0.8s ease forwards;
}

.delay-1 { animation-delay: 0.1s; }
.delay-2 { animation-delay: 0.2s; }
.delay-3 { animation-delay: 0.3s; }
.delay-4 { animation-delay: 0.4s; }

/* Transições rápidas */
.sidebar {
  transition: width 220ms ease, padding 220ms ease, border-color 220ms ease;
}

.sb-item {
  transition: background-color 160ms ease, color 160ms ease;
}
```

### Responsividade

| Breakpoint | Comportamento |
|------------|---------------|
| 1920px    | 2 cols (nav links full) |
| 1280px    | 2 cols comprimido |
| 768px     | 1 col (sidebar collapse) |
| 540px     | 1 col mobile (stack vertical) |

```css
@media (max-width: 1280px) {
  .sidebar { display: none; }  /* Hide sidebar, toggle button */
  .main { width: 100%; }
}

@media (max-width: 768px) {
  .kpi { grid-template-columns: repeat(2, 1fr); }
  .sidebar-col { flex-direction: row; flex-wrap: wrap; }
}

@media (max-width: 540px) {
  .topbar { flex-wrap: wrap; gap: 10px; }
  .nav-links { display: none; }  /* Hide em mobile */
  .kpi { grid-template-columns: 1fr; }
  h1 { font-size: 26px; }
}
```

---

## Arquitetura & Stack

### Arquitetura em Microserviços

**Diagram:**
```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend (Next.js + React)                │
│                        (1920×1080)                          │
└────────────────────────────┬────────────────────────────────┘
                             │ fetch/axios
                             ↓
┌─────────────────────────────────────────────────────────────┐
│         Gateway/BFF (Fastify + TypeScript)                  │
│     Agregação de microserviços, autenticação JWT            │
└──┬─────────────┬─────────────┬─────────────┬───────────────┘
   │             │             │             │
   ↓             ↓             ↓             ↓
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
│ Portfolio│ │Fundamental│ │ Valuation│ │ Alerts       │
│ Engine   │ │ Engine   │ │ Engine   │ │ Engine       │
│ (CRUD    │ │ (Score   │ │ (Preço-  │ │ (Regras      │
│ posições)│ │ Calc.)   │ │ Teto)    │ │ alertas)     │
└────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘
     │            │            │              │
     └────────────┴────────────┴──────────────┘
              │
              ↓
     ┌────────────────┐
     │  PostgreSQL    │
     │  (Prisma ORM)  │
     └────────────────┘

Paralelo:
┌─────────────────────────────────────┐
│  Market Data Ingestion (Scheduled)  │
│  - ibovfinancials API               │
│  - brapi.dev API                    │
│  - CVM dados públicos               │
│  → Redis (cache 5min)               │
│  → PostgreSQL (histórico)           │
└─────────────────────────────────────┘
```

### 11 Microserviços

1. **valora-gateway / BFF**
   - Porta: 3000
   - Funções: Agregação, autenticação JWT, CORS
   - Endpoints: /auth, /portfolio, /assets, /score, /strategies, /alerts

2. **valora-portfolio-engine**
   - CRUD posições de carteira
   - Cálculo de patrimônio, alocação, rentabilidade
   - Histórico de transações

3. **valora-fundamental-engine**
   - Cálculo de Score Fundamentalista
   - Breakdown por regra
   - Recompilação em tempo real com novos pesos

4. **valora-valuation-engine**
   - Cálculo de Preço-Teto (Bazin, Graham, Múltiplos, Custom)
   - Parser de fórmulas customizadas
   - Validação de sintaxe

5. **valora-alerts-engine**
   - Processamento de alertas
   - Disparo de notificações
   - Histórico

6. **valora-market-data-ingestion**
   - Sincronização com ibovfinancials + brapi
   - Atualizar cotações, dividendos, histórico
   - Schedule: cada 5 min durante mercado, cada 1h fora

7. **valora-fundamental-data-ingestion**
   - Sincronização com brapi (fundamentos, DRE, BP)
   - CVM dados (demonstrações, fatos relevantes)
   - Schedule: diário após fechamento

8. **valora-cvm-loader**
   - Específico para ler portal CVM
   - Extração de fatos relevantes
   - Calendário de resultados

9. **valora-data-normalizer**
   - Padronização de dados entre APIs
   - Conversão de formatos, moedas
   - Cálculo de derivados (ex: CAGR a partir de série histórica)

10. **valora-text-analysis**
    - Parse de relatórios CVM
    - Extração de métricas de texto
    - Análise de sentimento (fase 2)

11. **valora-strategy-manager**
    - CRUD de estratégias do usuário
    - Versionamento de estratégias
    - Histórico de alertas por estratégia

### Stack Tecnológico

**Frontend:**
- **Framework:** Next.js 14 (App Router)
- **UI:** React 18 com TypeScript
- **Estilos:** CSS-in-JS (Styled Components ou Emotion) + Tailwind
- **Gráficos:** Chart.js ou Recharts (para candlestick, área, donut)
- **State:** Context API + useReducer ou Zustand
- **HTTP:** axios ou fetch com SWR/React Query

**Backend:**
- **Runtime:** Node.js 20+
- **Framework:** Fastify (alta performance)
- **Linguagem:** TypeScript
- **ORM:** Prisma (schema-first, type-safe)
- **Banco:** PostgreSQL 14+
- **Cache:** Redis (Upstash ou Railway)
- **Filas:** BullMQ (Node.js job queue)
- **Autenticação:** JWT + bcrypt (passwords)
- **Validação:** Zod (schema validation)

**Infra:**
- **VCS:** GitHub
- **Package Manager:** pnpm (monorepo)
- **Monorepo Tool:** Turborepo (shared types, workspace management)
- **Containerização:** Docker (cada microserviço em container)
- **Hosting:** Railway (desenvolvimento), AWS/Vercel (produção)
- **CI/CD:** GitHub Actions (testes, build, deploy)
- **Secrets:** Railway Secrets ou AWS Secrets Manager

**Monorepo Structure:**
```
valora/
├── apps/
│   ├── web/                      # Next.js frontend
│   ├── api-gateway/              # Fastify BFF
│   ├── services/
│   │   ├── portfolio-engine/
│   │   ├── fundamental-engine/
│   │   ├── valuation-engine/
│   │   ├── alerts-engine/
│   │   ├── market-data-ingestion/
│   │   ├── strategy-manager/
│   │   └── ...
│   └── workers/                  # BullMQ jobs
├── packages/
│   ├── @valora/types/            # Tipos compartilhados ⭐
│   ├── @valora/prisma/           # Schema + migrations
│   ├── @valora/utils/            # Helpers (cálculos, parsing)
│   └── @valora/api-client/       # Client tipado
├── docker-compose.yml            # Local dev stack
├── turbo.json                    # Turborepo config
├── package.json                  # Root package
└── .github/workflows/            # CI/CD
```

---

## Requisitos Funcionais

### RF01-02: Autenticação & Cadastro ✅

**RF01:** Cadastro de usuário (nome, celular, e-mail, senha confirmada)
**RF02:** Login (e-mail + senha, manter conectado)

*Status:* Telas prontas (`valora_login.html`, `valora_cadastro.html`)

### RF03-07: Carteira ✅

**RF03:** Consolidação de carteira (patrimônio total, lucro, benchmark, score)
**RF04:** Alertas de inconsistências
**RF05:** Listagem de ativos (qtd, p.médio, cotação, rent%, score, p.teto)
**RF06:** Agrupamento por classe (ações, FIIs, ETFs, stocks)
**RF07:** Subtotais por grupo

*Status:* Tela pronta (`valora_carteira.html`)

### RF08-10: Patrimônio ✅

**RF08:** Evolução 12 meses
**RF09:** Composição por classe
**RF10:** Exposição externa, liquidez, classes ativas

*Status:* Tela pronta (`valora_patrimonio.html`)

### RF11-12: Proventos ✅

**RF11:** Histórico mensal (recebidos + previstos)
**RF12:** Detalhamento por ativo (último pag, DY, valor/ação)

*Status:* Tela pronta (`valora_proventos.html`)

### RF13-15: Rentabilidade ✅

**RF13:** Total + 12M + 1M + volatilidade + beta
**RF14:** Comparação benchmarks (CDI, IBOV, IPCA)
**RF15:** Performance por ativo

*Status:* Tela pronta (`valora_rentabilidade.html`)

### RF16-18: Score & Valuation ❌ PRIORITÁRIO

**RF16:** Score Fundamentalista (regras customizáveis, breakdown, transparência)
*→ Tela `valora_score.html` faltando*

**RF17:** Preço-Teto (estratégias Bazin/Graham/custom, fórmula visível)
*→ Tela `valora_estrategias.html` faltando*

**RF18:** Alertas combinados (preço + fundamentos + eventos corporativos)
*→ Lógica backend + tela `valora_alertas.html` faltando*

### RF19-20: Análise ❌ FASE 2

**RF19:** Comparador (até 4 ativos, indicadores customizáveis)
*→ Tela `valora_comparar.html` faltando*

**RF20:** Histórico de estratégias e scores
*→ Banco de dados + API faltando*

---

## Requisitos Não Funcionais

| RNF | Descrição | Status |
|-----|-----------|--------|
| RNF01 | Dashboard carrega < 3s (cotações favoritas) | 🟡 Design ok, backend necessário |
| RNF02 | SLA 99% em horário de mercado (10h–18h) | 🟡 Arquitetura preparada |
| RNF03 | Escalabilidade por microserviço independente | ✅ Microserviços definidos |
| RNF04 | Criptografia de dados (bcrypt + AES-256) | 🟡 Stack definido |
| RNF05 | Rastreabilidade: fonte + timestamp por número | ✅ Design visível na carteira |
| RNF06 | Transparência total de fórmulas | ✅ UI pronta (falta lógica) |
| RNF07 | SOLID + 70% cobertura testes | 🟡 Estrutura preparada |
| RNF08 | Cache 5 min para cotações | 🟡 Redis configurado |
| RNF09 | Responsivo (desktop, tablet, mobile) | ✅ Media queries em todas as telas |
| RNF10 | Resiliência com fallback de APIs | 🟡 Padrão definido |

---

## APIs Públicas

### Cotações em Tempo Real

**ibovfinancials.com**
- Endpoint: `GET /api/ibov/quotes/?symbol=PETR4&token=TOKEN`
- Resposta:
  ```json
  {
    "symbol": "PETR4",
    "price": 38.42,
    "change": 0.88,
    "percentChange": 2.34,
    "volume": 50000000,
    "open": 37.54,
    "high": 38.50,
    "low": 37.30,
    "previous_close": 37.54
  }
  ```
- Freemium: ✅ (token public)
- Delay: 15-20 min no preço
- Uso: Cotação principal, gráfico intraday

**Histórico de Preços**
- Endpoint: `GET /api/ibov/historical/?symbol=PETR4&start_date=2024-01-01&end_date=2024-12-31&timeframe=1d`
- Timeframes: 1m, 5m, 15m, 1h, 1d, 1wk, 1mo
- Uso: Gráficos, cálculo de volatilidade

### Fundamentos Completos

**brapi.dev**
- Endpoint: `GET /api/quote/PETR4?range=1y&interval=1d&token=TOKEN`
- Dados: BP, DRE, DFC, DVA (últimos 4 trimestres + anual)
- Freemium: ✅ (50 req/dia, upgrade ilimitado)
- Uso: P/L, ROE, DY, Dívida/EBITDA, indicadores TTM

**bolsai.com**
- Endpoint: `GET /v1/indicators/?tickers=PETR4&token=TOKEN`
- Dados: 27+ indicadores, 350+ ações, 400+ FIIs
- Freemium: ✅ (200 req/dia)
- Uso: Backup de indicadores, FIIs/ETFs

### Dados Oficiais CVM

**dados.cvm.gov.br**
- Endpoint: `GET /dados/CIA_ABERTA/DEMONSTRACOES_FINANCEIRAS`
- Dados: Demonstrações completas, fatos relevantes
- Freemium: ✅ (público, sem token)
- Delay: D+2 a D+5
- Uso: Validação de dados, relatórios oficiais

### Dados Macro

**dadosdemercado.com.br**
- Endpoint: `GET /api/macro/?indicators=SELIC,IPCA,CDI&token=TOKEN`
- Dados: SELIC, IPCA, CDI, Boletim Focus, curvas
- Freemium: ✅ (50 req/dia)
- Uso: Benchmarks, cálculo de rentabilidade real

### Resumo de Integrações

```
Frontend → Gateway/BFF → [Market Data] ┐
                      ├→ [Fundamental Data] → PostgreSQL
                      ├→ [CVM Data]       ↓
                      ├→ [Macro Data]  → Redis Cache
                      ├→ Portfolio Engine
                      ├→ Score Engine
                      └→ Valuation Engine
```

---

## Estrutura de Dados (TypeScript)

### Tipos Compartilhados (@valora/types)

```typescript
// User
export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  default_strategy: string;
  notifications_enabled: boolean;
  theme: 'dark' | 'light';
  currency: 'BRL' | 'USD';
}

// Asset (Ativo)
export interface Asset {
  id: string;
  ticker: string;
  name: string;
  type: 'ACAO' | 'FII' | 'ETF' | 'STOCK' | 'CRIPTO';
  sector: string;
  subsector?: string;
  exchange: 'B3' | 'NASDAQ' | 'NYSE' | 'CRYPTO';
}

// Position (Posição em Carteira)
export interface Position {
  id: string;
  user_id: string;
  asset_id: string;
  quantity: number;
  average_price: number;
  acquisition_date: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// Score Fundamentalista
export interface FundamentalScore {
  id: string;
  user_id: string;
  asset_id: string;
  score: number; // 0-100
  breakdown: ScoreRule[];
  calculation_date: Date;
  strategy_id: string;
}

export interface ScoreRule {
  id: string;
  rule: string; // ex: "P/L < 12"
  points: number; // pontuação (0-20)
  weight: number; // peso (0-100)
  passed: boolean;
}

// Strategy (Estratégia de Valuation)
export interface Strategy {
  id: string;
  user_id: string;
  name: string;
  type: 'SCORE' | 'VALUATION';
  method: 'BAZIN' | 'GRAHAM' | 'MULTIPLOS' | 'CUSTOM';
  parameters: StrategyParameters;
  formula?: string; // ex: "(LPA * 15) * 1.5"
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface StrategyParameters {
  taxa_minima?: number; // % a.a.
  janela_anos?: number; // 1-10
  margem_seguranca?: number; // % 0-30
  pl_teto?: number; // para múltiplos
  pvp_teto?: number;
}

// Valuation (Preço-Teto)
export interface Valuation {
  id: string;
  asset_id: string;
  strategy_id: string;
  target_price: number;
  current_price: number;
  calculation_date: Date;
  formula_used: string;
}

// Provento (Dividendo/JCP/Rendimento)
export interface Dividend {
  id: string;
  asset_id: string;
  type: 'DIVIDENDO' | 'JCP' | 'RENDIMENTO' | 'AMORTIZACAO';
  ex_date: Date;
  payment_date: Date;
  value_per_share: number;
  total_value?: number; // se conhecido
}

// Alert
export interface Alert {
  id: string;
  user_id: string;
  asset_id: string;
  type: 'PRICE_BELOW' | 'PRICE_ABOVE' | 'SCORE_DROP' | 'EVENT' | 'CUSTOM';
  condition: string;
  is_active: boolean;
  triggered_at?: Date;
  created_at: Date;
}

// Portfolio Summary
export interface PortfolioSummary {
  user_id: string;
  total_value: number;
  invested: number;
  gain: number;
  gain_percent: number;
  average_score: number;
  dividend_income_ytd: number;
  allocation_by_asset: Record<string, number>;
  allocation_by_sector: Record<string, number>;
  positions_count: number;
  asset_types_count: Record<string, number>;
  last_update: Date;
}

// Historical Data
export interface PriceHistory {
  asset_id: string;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjusted_close: number;
}
```

### Prisma Schema

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id                String   @id @default(cuid())
  email             String   @unique
  name              String
  phone             String
  password_hash     String
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt

  positions         Position[]
  scores            FundamentalScore[]
  strategies        Strategy[]
  alerts            Alert[]
  preferences       UserPreferences?

  @@index([email])
}

model UserPreferences {
  id                String   @id @default(cuid())
  user_id           String   @unique
  default_strategy  String?
  notifications     Boolean  @default(true)
  theme             String   @default("dark")
  currency          String   @default("BRL")
  user              User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
}

model Asset {
  id                String   @id @default(cuid())
  ticker            String   @unique
  name              String
  type              String   // ACAO, FII, ETF, STOCK, CRIPTO
  sector            String
  subsector         String?
  exchange          String   // B3, NASDAQ, NYSE, CRYPTO

  positions         Position[]
  scores            FundamentalScore[]
  valuations        Valuation[]
  dividends         Dividend[]
  prices            PriceHistory[]

  @@index([ticker, sector])
}

model Position {
  id                String   @id @default(cuid())
  user_id           String
  asset_id          String
  quantity          Float
  average_price     Float
  acquisition_date  DateTime
  notes             String?
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt

  user              User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  asset             Asset    @relation(fields: [asset_id], references: [id])

  @@unique([user_id, asset_id])
  @@index([user_id, asset_id])
}

model FundamentalScore {
  id                String   @id @default(cuid())
  user_id           String
  asset_id          String
  score             Int      // 0-100
  breakdown         Json     // ScoreRule[]
  calculation_date  DateTime
  strategy_id       String

  user              User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  asset             Asset    @relation(fields: [asset_id], references: [id])

  @@index([user_id, asset_id, calculation_date])
}

model Strategy {
  id                String   @id @default(cuid())
  user_id           String
  name              String
  type              String   // SCORE, VALUATION
  method            String   // BAZIN, GRAHAM, MULTIPLOS, CUSTOM
  parameters        Json     // StrategyParameters
  formula           String?
  is_active         Boolean  @default(true)
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt

  user              User     @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id, type])
}

model Valuation {
  id                String   @id @default(cuid())
  asset_id          String
  strategy_id       String
  target_price      Float
  current_price     Float
  calculation_date  DateTime @default(now())
  formula_used      String

  asset             Asset    @relation(fields: [asset_id], references: [id])

  @@index([asset_id, calculation_date])
}

model Dividend {
  id                String   @id @default(cuid())
  asset_id          String
  type              String   // DIVIDENDO, JCP, RENDIMENTO, AMORTIZACAO
  ex_date           DateTime
  payment_date      DateTime
  value_per_share   Float
  total_value       Float?
  created_at        DateTime @default(now())

  asset             Asset    @relation(fields: [asset_id], references: [id])

  @@index([asset_id, payment_date])
}

model Alert {
  id                String   @id @default(cuid())
  user_id           String
  asset_id          String
  type              String   // PRICE_BELOW, PRICE_ABOVE, SCORE_DROP, EVENT, CUSTOM
  condition         String
  is_active         Boolean  @default(true)
  triggered_at      DateTime?
  created_at        DateTime @default(now())

  user              User     @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id, is_active])
}

model PriceHistory {
  id                String   @id @default(cuid())
  asset_id          String
  date              DateTime
  open              Float
  high              Float
  low               Float
  close             Float
  volume            Int
  adjusted_close    Float

  asset             Asset    @relation(fields: [asset_id], references: [id])

  @@unique([asset_id, date])
  @@index([asset_id, date])
}
```

---

## Componentes & Padrões

### Componentes React Principais

```typescript
// 1. CarteiraDashboard (Página)
export default function CarteiraDashboard() {
  const { portfolio } = usePortfolio();
  const [filter, setFilter] = useState('todos');
  return (
    <div>
      <Topbar />
      <Layout>
        <Sidebar />
        <main>
          <MetricsRow portfolio={portfolio} />
          <AtivosTable filter={filter} />
          <SidebarCol />
        </main>
      </Layout>
    </div>
  );
}

// 2. Topbar
export function Topbar() {
  return (
    <header className="topbar">
      {/* Logo + Nav + Actions */}
    </header>
  );
}

// 3. Sidebar
export function Sidebar() {
  return (
    <aside className="sidebar">
      {/* Navigation items */}
    </aside>
  );
}

// 4. MetricsRow (KPIs)
export function MetricsRow({ portfolio }) {
  return (
    <div className="kpis">
      <KpiCard label="Patrimônio Total" value={portfolio.total} trend="up" />
      {/* ... mais KPIs */}
    </div>
  );
}

// 5. AtivosTable
export function AtivosTable({ filter }) {
  const { positions } = usePortfolio();
  const filtered = positions.filter(p => matches(p, filter));
  return (
    <div className="panel">
      <table>
        {/* Header + Rows */}
      </table>
    </div>
  );
}

// 6. Hooks Customizados
export function usePortfolio() {
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  useEffect(() => {
    fetchPortfolio().then(setPortfolio);
  }, []);
  return { portfolio, loading: !portfolio };
}

export function useAsset(ticker: string) {
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  useEffect(() => {
    fetchAsset(ticker).then(setAsset);
  }, [ticker]);
  return asset;
}
```

### Padrões de API

```typescript
// Gateway/BFF Endpoints

// 1. Auth
POST /auth/register
  Body: { email, name, phone, password }
  Response: { user, token }

POST /auth/login
  Body: { email, password }
  Response: { user, token }

POST /auth/refresh
  Headers: { Authorization: "Bearer TOKEN" }
  Response: { token }

// 2. Portfolio
GET /portfolio
  Headers: { Authorization: "Bearer TOKEN" }
  Response: PortfolioSummary

POST /portfolio/positions
  Headers: { Authorization: "Bearer TOKEN" }
  Body: { asset_id, quantity, average_price }
  Response: Position

PUT /portfolio/positions/:id
  Headers: { Authorization: "Bearer TOKEN" }
  Body: { quantity, average_price }
  Response: Position

DELETE /portfolio/positions/:id
  Headers: { Authorization: "Bearer TOKEN" }
  Response: { success }

// 3. Assets
GET /assets/:ticker
  Response: AssetDetail { asset, fundamentals, score, valuation, history }

GET /assets/:ticker/price-history
  Query: { start_date, end_date, interval }
  Response: PriceHistory[]

// 4. Score
POST /score/calculate
  Headers: { Authorization: "Bearer TOKEN" }
  Body: { strategy_id, assets: [ticker1, ticker2] }
  Response: { scores: { [ticker]: number } }

GET /score/strategies
  Headers: { Authorization: "Bearer TOKEN" }
  Response: Strategy[]

POST /score/strategies
  Headers: { Authorization: "Bearer TOKEN" }
  Body: Strategy
  Response: Strategy

// 5. Valuation
POST /valuation/calculate
  Headers: { Authorization: "Bearer TOKEN" }
  Body: { strategy_id, ticker }
  Response: { target_price, signal }

// 6. Alerts
GET /alerts
  Headers: { Authorization: "Bearer TOKEN" }
  Response: Alert[]

POST /alerts
  Headers: { Authorization: "Bearer TOKEN" }
  Body: { asset_id, type, condition }
  Response: Alert

DELETE /alerts/:id
  Headers: { Authorization: "Bearer TOKEN" }
  Response: { success }
```

---

## Dados de Estudo de Caso

### Carteira Base

| Ticker | Tipo | Qtd | P.Médio | Cotação | Investido | Posição | Rent.% |
|--------|------|-----|---------|---------|-----------|---------|--------|
| PETR4 | Ação | 400 | 32,10 | 38,42 | 12.840 | 15.368 | +19,7% |
| BBAS3 | Ação | 460 | 25,80 | 27,15 | 11.868 | 12.489 | +5,2% |
| ITUB4 | Ação | 310 | 33,50 | 34,87 | 10.385 | 10.810 | +4,1% |
| VALE3 | Ação | 120 | 65,00 | 61,10 | 7.800 | 7.332 | -6,0% |
| WEGE3 | Ação | 75 | 48,90 | 52,30 | 3.668 | 3.923 | +6,9% |
| HGLG11 | FII | 80 | 152,00 | 161,40 | 12.160 | 12.912 | +6,2% |
| GARE11 | FII | 100 | 9,20 | 9,85 | 920 | 985 | +7,1% |
| MXRF11 | FII | 200 | 10,50 | 10,12 | 2.100 | 2.024 | -3,6% |
| **Total** | | | | | **61.741** | **65.843** | **+6,6%** |

### Patrimônio

- **Valor total:** R$ 48.720 (vs mercado: investimentos + caixa)
- **Investido:** R$ 61.741
- **Posição:** R$ 65.843
- **Lucro:** +R$ 4.102 (+6,6%)
- **Benchmark:** IBOV +4,3% (outperformance +2,3 p.p.)

### Proventos 2026

| Data | Ativo | Tipo | Qtd | Valor/Unid | Total |
|------|-------|------|-----|------------|-------|
| 30/mai | PETR4 | Dividendo | 400 | 1,44 | +576 |
| 15/mai | BBAS3 | JCP | 460 | 0,82 | +377 |
| 08/mai | HGLG11 | Rendimento | 80 | 3,61 | +289 |
| 02/mai | ITUB4 | Dividendo | 310 | 0,61 | +189 |
| **Total 2026** | | | | | **+1.840** |

**DY Carteira:** 1.840 / 48.720 = **3,78% a.a.**

### Indicadores Fundamentalistas (Exemplo PETR4)

| Métrica | Valor | vs Setor | Status |
|---------|-------|----------|--------|
| P/L | 8,2 | setor: 12 | ✅ Bom |
| ROE | 15,8% | setor: 13% | ✅ Acima |
| Dívida/EBITDA | 1,9x | setor: 2,5x | ✅ Saudável |
| DY | 8,9% | setor: 6,2% | ✅ Acima |
| P/VP | 1,1 | setor: 1,3 | ✅ Bom |
| Margem Líq | 22,3% | setor: 18% | ✅ Acima |
| CAGR Receita (5a) | 5,2% | setor: 3% | ✅ Crescimento |

**Score Fundamental:** 81/100 (Oportunidade)

---

## Roadmap & Sprints

### Fases de Desenvolvimento

```
FASE 1 (MVP — 8 semanas) ════════════════════════════════════
├─ Sprint 1: Setup & Infraestrutura (Sem 1-2)
│  ├─ [ ] Turborepo + @valora/types
│  ├─ [ ] Prisma schema + migrations
│  ├─ [ ] PostgreSQL (local + staging)
│  ├─ [ ] Fastify BFF base
│  └─ [ ] Testes unitários setup
│
├─ Sprint 2: Autenticação & Fundação (Sem 2-3)
│  ├─ [ ] JWT auth (login/register)
│  ├─ [ ] Middleware de autenticação
│  ├─ [ ] Endpoints /auth (POST register, POST login)
│  ├─ [ ] Migrar `valora_login.html` → componentes React
│  └─ [ ] Testes E2E: login flow
│
├─ Sprint 3: API Carteira & Cache (Sem 3-4)
│  ├─ [ ] Endpoints /portfolio
│  ├─ [ ] Redis cache (cotações 5min)
│  ├─ [ ] Integrações: ibovfinancials, brapi
│  ├─ [ ] Componente CarteiraDashboard (React)
│  ├─ [ ] Tela Detalhe do Ativo (`valora_ativo.html`)
│  └─ [ ] Testes: portfolio API, cache
│
├─ Sprint 4: Score & Valuation Engines (Sem 4-5)
│  ├─ [ ] Score Fundamentalista (cálculo)
│  ├─ [ ] Preço-Teto (Bazin, Graham, Múltiplos)
│  ├─ [ ] Parser de fórmulas customizadas
│  ├─ [ ] Endpoints /score, /valuation
│  ├─ [ ] Telas `valora_score.html`, `valora_estrategias.html`
│  └─ [ ] Testes unitários: Score, Valuation
│
├─ Sprint 5: Alertas & Refinamento (Sem 5-6)
│  ├─ [ ] Motor de alertas (BullMQ jobs)
│  ├─ [ ] Endpoints /alerts
│  ├─ [ ] Notificações (email)
│  ├─ [ ] Tela `valora_alertas.html`
│  └─ [ ] Testes E2E: alertas
│
├─ Sprint 6: Mercado Data & Histórico (Sem 6-7)
│  ├─ [ ] Market Data Ingestion (schedule)
│  ├─ [ ] Fundamental Data Ingestion
│  ├─ [ ] Histórico de preços (PriceHistory)
│  ├─ [ ] CVM data loader
│  └─ [ ] Testes: data ingestion
│
└─ Sprint 7-8: Testes & Deploy (Sem 7-8)
   ├─ [ ] Testes de carga (Vegeta, k6)
   ├─ [ ] Performance tuning
   ├─ [ ] Deploy staging (Railway)
   ├─ [ ] QA final
   └─ [ ] Deploy produção

FASE 2 (Expansão — Após MVP) ═════════════════════════════════
├─ Comparador (valora_comparar.html)
├─ Integração com corretoras
├─ Análise textual de relatórios CVM
├─ Análise de sentimento
├─ Mobile app (React Native)
└─ Marketplace de estratégias

FASE 3 (B2B/Escalabilidade) ═══════════════════════════════════
├─ White-label para fintechs
├─ APIs para assessores
├─ Análise de carteiras em lote
└─ Data warehouse (BigQuery)
```

---

## Checklist de Desenvolvimento

### Backend Essencial

**Autenticação & Usuário**
- [ ] POST /auth/register (Prisma)
- [ ] POST /auth/login (JWT)
- [ ] Middleware JWT (Fastify)
- [ ] POST /auth/logout
- [ ] Password hashing (bcrypt)

**Portfolio**
- [ ] GET /portfolio (resumo + positions)
- [ ] POST /portfolio/positions (add ativo)
- [ ] PUT /portfolio/positions/:id (update)
- [ ] DELETE /portfolio/positions/:id (remove)
- [ ] Cálculo de patrimônio + rent%
- [ ] Cálculo de alocação por ativo/setor

**Fundamentais**
- [ ] Fetch brapi.dev (P/L, ROE, DY, etc)
- [ ] Fetch ibovfinancials (cotações)
- [ ] Cache Redis (5min)
- [ ] GET /assets/:ticker (retornar fundamentals)

**Score Fundamentalista**
- [ ] Classe ScoreCalculator
- [ ] POST /score/calculate (passar strategy_id)
- [ ] Breakdown por regra
- [ ] Parser de regras (ex: "P/L < 12")
- [ ] Testes unitários

**Preço-Teto**
- [ ] Classe ValuationCalculator
- [ ] Método Bazin: `(LPA * taxa * 15 * (1 + margem))`
- [ ] Método Graham: preço manual
- [ ] Método Múltiplos: `LPA * P/L-teto`
- [ ] Parser de fórmulas custom
- [ ] POST /valuation/calculate
- [ ] Testes unitários

**Estratégias**
- [ ] GET /strategies (listar)
- [ ] POST /strategies (criar)
- [ ] PUT /strategies/:id (atualizar)
- [ ] DELETE /strategies/:id (deletar)
- [ ] Versionamento (histórico)

**Alertas**
- [ ] Tabela alerts (Prisma)
- [ ] GET /alerts (listar)
- [ ] POST /alerts (criar)
- [ ] DELETE /alerts/:id
- [ ] BullMQ jobs para trigger
- [ ] Notificação por e-mail

**Data Ingestion**
- [ ] Scheduler (cron/BullMQ)
- [ ] Market Data fetcher (ibovfinancials)
- [ ] Fundamental Data fetcher (brapi)
- [ ] CVM loader (fatos relevantes)
- [ ] PriceHistory storage
- [ ] Error handling + retry

### Frontend Essencial

**Setup**
- [ ] Next.js 14 + React 18 + TypeScript
- [ ] Tailwind + CSS-in-JS
- [ ] Context API ou Zustand (state)
- [ ] Axios client tipado
- [ ] Layout padrão (Topbar + Sidebar + Main)

**Autenticação**
- [ ] Migrar login HTML → componente React
- [ ] Migrar cadastro HTML → componente React
- [ ] Token armazenamento (localStorage)
- [ ] Redirect middleware (auth guard)

**Páginas Principais**
- [ ] /dashboard/carteira (CarteiraDashboard)
- [ ] /dashboard/patrimonio (PatrimonioPage)
- [ ] /dashboard/proventos (ProventosPage)
- [ ] /dashboard/rentabilidade (RentabilidadePage)

**Telas Faltando (MVP)**
- [ ] /dashboard/ativo/:ticker (AssetDetail)
- [ ] /dashboard/score (ScorePage)
- [ ] /dashboard/estrategias (StrategiesPage)

**Componentes Reutilizáveis**
- [ ] Topbar
- [ ] Sidebar
- [ ] KpiCard
- [ ] Table (genérico)
- [ ] Button (primary, secondary, warn)
- [ ] Modal / Drawer
- [ ] Pills / Tags
- [ ] Chart (Recharts / Chart.js)

**Integração com API**
- [ ] usePortfolio() hook
- [ ] useAsset() hook
- [ ] useScore() hook
- [ ] useStrategy() hook
- [ ] Fetch wrapper com error handling

### Testes

**Unitários (Backend)**
- [ ] Score calculation (30 casos)
- [ ] Valuation calculation (20 casos)
- [ ] Portfolio math (25 casos)
- [ ] Rule parser (15 casos)
- [ ] Formula parser (10 casos)

**Integração**
- [ ] API endpoints (50+ testes)
- [ ] Autenticação (10 testes)
- [ ] Portfolio CRUD (10 testes)
- [ ] Data ingestion (10 testes)

**E2E**
- [ ] Login → Dashboard → Asset detail → Score → Strategy
- [ ] Criar estratégia → Gerar alerta → Receber notificação
- [ ] Import carteira → View rentabilidade

**Performance**
- [ ] Dashboard < 3s (15 ativos)
- [ ] Asset detail < 2s (gráfico + indicadores)
- [ ] Table scroll 200+ rows smooth

---

## Riscos & Mitigação

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|--------|-----------|
| APIs externas caem | 🟡 Média | 🔴 Alto | Cache Redis, fallback last-known value, UI feedback |
| Fórmula inválida (user input) | 🟡 Média | 🟡 Médio | Validação Zod, preview tempo real, docs |
| Volume alto de ativos (100+) | 🟡 Média | 🟡 Médio | Paginação, lazy-load, indexação DB |
| Usuário não entende score | 🟡 Média | 🟡 Médio | Breakdown visual, exemplos, tooltips |
| Corretora tem dados diferentes | 🟡 Média | 🟡 Médio | Rastreabilidade visível, aviso ao usuário |
| Performance em mobile | 🟡 Média | 🟡 Médio | Progressive Web App, lighthouse 90+, testes mobile |
| Sincronização de estratégias | 🟢 Baixa | 🟡 Médio | Migrations Prisma, versionamento |
| Compatibilidade de navegador | 🟢 Baixa | 🟡 Médio | Testes BrowserStack, caniuse.com |

---

## Conclusão

Valora é um projeto ambicioso mas bem-estruturado, com:

✅ **Telas UI:** 6/12 prontas, design system robusto, responsividade garantida  
❌ **Backend:** Arquitetura definida, mas sem código ainda  
📊 **Dados:** Estudo de caso completo, APIs mapeadas  
🚀 **Roadmap:** 8 semanas para MVP, roadmap de 2 anos  

**Próximo passo:** Iniciar Sprint 1 com Turborepo + Prisma schema + tipos TypeScript.

---

## Anexos

### A. Diretórios de Referência

- **Telas HTML**: `/mnt/user-data/uploads/valora_*.html`
- **Logo SVG**: `/mnt/user-data/uploads/LOGO_rebrand.svg`
- **Design System**: Definido neste documento (Seção 4)

### B. Contatos & Recursos

- **GitHub Repo**: (a criar)
- **Railway Dashboard**: (a configurar)
- **Figma Project**: https://www.figma.com/design/f5mYIld4ckFSMCrGi89DID/Valora

### C. Glossário

- **Score Fundamentalista**: Pontuação 0-100 baseada em regras customizáveis do usuário
- **Preço-Teto (Target Price)**: Valor máximo que o usuário está disposto a pagar pela ação
- **Estratégia**: Configuração de regras/parâmetros para Score ou Valuation
- **Alerta**: Notificação automática quando preço atinge teto ou fundamentos caem
- **DY**: Dividend Yield (dividendo anual / preço atual)
- **CAGR**: Compound Annual Growth Rate (taxa de crescimento anualizado)
- **Rastreabilidade**: Capacidade de ver fonte (API), timestamp e versão de cada dado

---

**Documento compilado:** Agosto 2026  
**Versão:** 1.0 (Final)  
**Status:** Pronto para desenvolvimento
