# Reconciliação: Protótipos HTML vs PRD Valora

**Data:** 2026-08-15  
**Protótipos analisados:** 10 arquivos HTML  
**PRD:** prd-Valora-2026-08-15/prd.md

---

## Gaps Encontrados

### 1. **Campo de telefone no cadastro (valora_cadastro.html)**
- **Localização:** linha 189
- **Gap:** O formulário de registro inclui campo "celular" (telefone)
- **PRD:** FR-1 especifica apenas "email, senha e nome completo"
- **Impacto:** Feature adicional não documentada como requisito

### 2. **Confirmação de senha no cadastro (valora_cadastro.html)**
- **Localização:** linha 201
- **Gap:** Campo de confirmação de senha presente no formulário
- **PRD:** FR-1 não menciona confirmação de senha
- **Impacto:** Validação UX implícita não especificada

### 3. **"Esqueci minha senha" no login (valora_login.html)**
- **Localização:** linha 201
- **Gap:** Link "esqueci minha senha" presente
- **PRD:** FR-2 e FR-3 não mencionam recuperação de senha
- **Impacto:** Fluxo de recuperação de senha não documentado

### 4. **"Manter conectado" no login (valora_login.html)**
- **Localização:** linha 200
- **Gap:** Checkbox "manter conectado" presente
- **PRD:** FR-2 não menciona persistência de sessão configurável
- **Impacto:** Feature de UX não especificada

### 5. **Grupos colapsáveis na carteira (valora_carteira.html)**
- **Localização:** linhas 345-353, botões de toggle
- **Gap:** Funcionalidade de expandir/colapsar grupos de ativos (Ações, FIIs, ETFs)
- **PRD:** FR-6 lista colunas mas não menciona agrupamento colapsável
- **Impacto:** Interação importante para usabilidade não documentada

### 6. **Navegação por âncoras para detalhe do ativo (valora_carteira.html)**
- **Localização:** linhas 345-353 (links para valora_ativo.html#resumo-ativo)
- **Gap:** Linhas clicáveis que abrem tela de detalhe do ativo
- **PRD:** Não há FR específico sobre navegação para detalhe do ativo
- **Impacto:** Fluxo de navegação completo não mapeado (sugere tela valora_ativo.html)

### 7. **"Ver posição ideal" no patrimônio (valora_patrimonio.html)**
- **Localização:** linha 219
- **Gap:** Botão "ver posicao ideal"
- **PRD:** Não há FR mencionando cálculo ou visualização de posição ideal
- **Impacto:** Feature estratégica não documentada

### 8. **"Ver calendário" nos proventos (valora_proventos.html)**
- **Localização:** linha 223
- **Gap:** Botão "ver calendario"
- **PRD:** FR-11 e FR-12 não mencionam visualização em formato calendário
- **Impacto:** Modo de visualização alternativo não especificado

### 9. **Yield on Cost nos proventos (valora_proventos.html)**
- **Localização:** linhas 244-248
- **Gap:** Métrica "Yield on cost" (9,3%) exibida como KPI
- **PRD:** FR-11 e FR-12 não listam Yield on Cost explicitamente
- **Impacto:** Métrica calculada não documentada

### 10. **Tela completa de detalhe do ativo (valora_ativo.html)**
- **Gap:** HTML completo com seções: resumo, preço/gráfico, score, indicadores, preço-teto, alertas, eventos
- **PRD:** Não existe FR específico para tela de detalhe do ativo
- **Impacto:** Tela inteira não mapeada nos requisitos (apenas componentes isolados: FR-15 score, FR-17 preço-teto)

### 11. **Tema claro no valora_score.html**
- **Localização:** linhas 9-43 (color scheme light)
- **Gap:** Protótipo usa tema claro (light mode)
- **PRD:** §1 e §4.11 definem tema escuro exclusivo no MVP
- **Impacto:** **Inconsistência** - protótipo viola decisão de design documentada

### 12. **Múltiplos protótipos de estratégias**
- **Arquivos:** valora_estrategias.html (2 versões diferentes lidas)
- **Gap:** Existem duas implementações distintas da tela de estratégias
- **PRD:** §4.7 já observa essa inconsistência (linha 344)
- **Impacto:** **Inconsistência** - precisa consolidação

### 13. **Sidebar colapsável (valora_rentabilidade.html)**
- **Localização:** linhas 48-50, 486-492 (toggle via JavaScript)
- **Gap:** Sidebar lateral com botão de colapsar/expandir
- **PRD:** FR-25 menciona sidebar mas não especifica se é colapsável
- **Impacto:** Feature de navegação não explicitada

### 14. **Métrica "Exposição ao exterior" (valora_patrimonio.html)**
- **Gap:** KPI dedicado "Exposição ao exterior: 24,6%"
- **PRD:** Não mencionado em FR-7 ou FR-8
- **Impacto:** Métrica calculada não documentada

### 15. **Gráfico interativo com tooltips e períodos (valora_ativo.html)**
- **Localização:** linhas 425-451 (chartSvg, period tabs)
- **Gap:** Gráfico de preço com seleção de período (1D, 5D, 1M, 6M, 1A, 5A)
- **PRD:** FR-9 menciona "evolução do patrimônio" mas não detalha interatividade do gráfico
- **Impacto:** Requisito de interatividade visual não especificado

---

## Conteúdo Bem Capturado

### ✅ Autenticação
- FR-1 (Registro) e FR-2 (Login) estão bem representados nos protótipos
- Campos principais (email, senha, nome) presentes
- Apenas detalhes de validação (telefone, confirmação) ficaram implícitos

### ✅ Gestão de posições
- FR-4 (adicionar posição), FR-5 (importar CSV), FR-6 (listar posições) mapeados
- Tabela de ativos com colunas especificadas presente em valora_carteira.html
- Filtros por tipo de ativo implementados

### ✅ Proventos
- FR-11 (histórico) e FR-12 (resumo) bem representados
- Gráfico mensal/anual presente
- Tabela detalhada por ativo com métricas

### ✅ Score fundamentalista
- FR-15 (visualizar) e FR-16 (customizar) presentes em valora_score.html
- Editor de critérios, pesos, faixas de pontuação implementado
- Breakdown por categoria (Qualidade, Crescimento, Solidez)

### ✅ Preço-teto
- FR-17 (calcular) e FR-18 (comparar) presentes
- Estratégias Bazin, Graham e Custom implementadas
- Editor de parâmetros e preview de resultados

### ✅ Navegação
- FR-25 (sidebar) presente em múltiplas telas
- Estrutura de navegação consistente

### ✅ Patrimônio
- FR-7 (evolução) e FR-8 (consolidação) bem representados
- Gráfico de evolução com filtros de período
- Cards de métricas (Max drawdown, Aportes, Ganho patrimonial)

---

## Inconsistências

### ⚠️ 1. Tema claro vs escuro
- **Problema:** valora_score.html usa tema claro (light color scheme)
- **PRD decisão:** §1 e §4.11 determinam tema escuro exclusivo no MVP
- **Ação:** Converter valora_score.html para tema escuro ou atualizar PRD

### ⚠️ 2. Múltiplas versões de estratégias
- **Problema:** Dois arquivos valora_estrategias.html com implementações diferentes
- **PRD observação:** §4.7 (linha 344) já documenta essa inconsistência
- **Ação:** Consolidar em uma única versão ou definir qual é a oficial

### ⚠️ 3. Tela de detalhe do ativo não documentada
- **Problema:** valora_ativo.html é uma tela completa mas não há FR correspondente
- **Impacto:** User Journey quebrado - carteira linka para detalhe mas não há requisito
- **Ação:** Adicionar FR específico para tela de detalhe do ativo (ou documentar como composição de FRs existentes)

### ⚠️ 4. Fluxo de recuperação de senha
- **Problema:** Link "esqueci minha senha" presente mas sem FR
- **Impacto:** UJ-1 (autenticação) incompleto
- **Ação:** Adicionar FR para recuperação de senha ou remover do protótipo

---

## Recomendações

1. **Adicionar FRs de UX implícita:**
   - Confirmação de senha no registro
   - Recuperação de senha
   - Persistência de sessão ("manter conectado")
   - Grupos colapsáveis na carteira

2. **Documentar tela de detalhe do ativo:**
   - Criar FR específico ou User Journey dedicado
   - Mapear seções: resumo, gráfico, score, indicadores, preço-teto, alertas

3. **Resolver inconsistência de tema:**
   - Padronizar todos os protótipos em tema escuro
   - Validar decisão de MVP (§4.11)

4. **Consolidar estratégias:**
   - Escolher versão oficial de valora_estrategias.html
   - Atualizar referências no PRD

5. **Adicionar métricas calculadas ao PRD:**
   - Yield on Cost (proventos)
   - Exposição ao exterior (patrimônio)
   - Liquidez imediata (patrimônio)

---

## Sumário Executivo

**Protótipos HTML analisados:** 10 arquivos (cadastro, login, carteira, patrimônio, proventos, rentabilidade, ativo, score, estratégias, preço-teto)

**Principais gaps identificados:**
1. Campo de telefone no cadastro (não em FR-1)
2. Fluxo de recuperação de senha (ausente)
3. Tela completa de detalhe do ativo (sem FR correspondente)
4. Grupos colapsáveis na carteira (interação não documentada)
5. Métricas calculadas não especificadas (Yield on Cost, Exposição exterior)

**Inconsistências críticas:**
- valora_score.html usa tema claro (viola decisão de dark-only no MVP)
- Múltiplas versões de valora_estrategias.html

**Conteúdo bem alinhado:**
- Autenticação básica, gestão de posições, proventos, score, preço-teto, navegação geral

**Próximos passos:**
1. Atualizar PRD com FRs de UX implícita
2. Criar FR para tela de detalhe do ativo
3. Corrigir tema claro em valora_score.html
4. Consolidar versões de estratégias
