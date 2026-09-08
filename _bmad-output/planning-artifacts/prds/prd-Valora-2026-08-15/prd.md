---
title: PRD MVP Valora
status: final
created: 2026-08-15
updated: 2026-08-15
---

# PRD MVP Valora

## 0. Propósito do Documento

Este PRD destina-se ao time de desenvolvimento, stakeholders e fluxos downstream (UX, arquitetura, épicos e histórias). Ele define o MVP da plataforma Valora — uma aplicação web para análise fundamentalista de carteira de investimentos — usando vocabulário ancorado no Glossário (§3), features agrupadas com requisitos funcionais (FRs) numerados globalmente, e decisões de produto já tomadas. Assumptions inline são marcadas com `[ASSUMPTION]` e indexadas em §9. O PRD é construído sobre protótipos HTML existentes (6 telas prontas: cadastro, login, carteira, patrimônio, proventos, rentabilidade) e documentação técnica prévia (README.md, contexto.md, VALORA_COMPILADO_COMPLETO.md). Decisões técnicas (stack, RLS, fórmulas) vivem em `addendum.md`.

## 1. Visão

O **Valora** é uma plataforma web para investidores de renda variável que praticam análise fundamentalista e precisam consolidar, monitorar e avaliar suas carteiras com critérios customizáveis. Diferente de agregadores passivos (Kinvo, Investidor10), o Valora entrega **Score Fundamentalista configurável**, **Preço-Teto com múltiplos métodos** (Bazin, Graham, Múltiplos, Custom), **rastreabilidade de dados** (de onde veio cada cotação, dividendo ou indicador), **alertas de inconsistências** (posições sem lastro em transações, dividendos não recebidos), e **benchmark comparativo** (carteira vs CDI/IBOV/IFIX). O produto é voltado para investidores pessoa física, traders fundamentalistas, assessores independentes e fintechs B2B que precisam de motores de análise plugáveis. O MVP valida a proposta de valor com investidores PF via entrada manual de posições e transações, dados externos mockados/seed inicialmente, e tema visual dark-only.

## 2. Usuário-Alvo

### 2.1 Jobs To Be Done

- **Consolidar posições heterogêneas** — ter uma visão única de ações, FIIs, BDRs, stocks US, REITs e cryptos, com exposição internacional e composição por classe.
- **Avaliar fundamentals com critério próprio** — criar regras de score personalizadas (P/L < 15, ROE > 12%, DY > 6%) e aplicar ao portfólio inteiro.
- **Descobrir oportunidades e riscos** — identificar ativos abaixo do preço-teto calculado (Bazin, Graham) ou acima de limiares de alerta, e receber avisos de inconsistências.
- **Entender rentabilidade real** — separar ganho de capital de proventos, comparar com benchmarks, e ver evolução do patrimônio ao longo do tempo.
- **Confiar nos números** — rastrear de onde veio cada dado (API, CSV, manual) e quando foi atualizado, eliminando "caixas-pretas".

### 2.2 Não-Usuários (v1)

- Traders de day trade e swing trade sem foco em fundamentos.
- Investidores que só querem agregação passiva sem customização de análise.
- Usuários que exigem integração direta com corretoras no MVP (entrará em v2+).

### 2.3 Jornadas de Usuário Principais

**UJ-1. Ricardo consolida sua carteira mista pela primeira vez.**  
Ricardo, investidor PF com ações BR, FIIs e 2 stocks US, abre o Valora já autenticado. Ele navega para **Carteira** e clica em "Adicionar Posição". Preenche ticker (PETR4), quantidade (200), preço médio (R$28,50), data de aquisição. Repete para os outros 8 ativos. A tela de Carteira exibe a lista consolidada: valor atual de cada posição (cotação mock × quantidade), peso relativo, P/L médio estimado, e dois alertas laranja ("Posição PETR4 sem transações cadastradas" e "Dividendo VIVT3 não recebido conforme histórico"). Ricardo vê o patrimônio total no card superior e a composição por classe de ativo no gráfico de pizza ao lado. **Climax:** os alertas de inconsistência mostram que o Valora rastreia gaps nos dados. **Resolução:** Ricardo agenda cadastrar transações depois; por ora tem a visão consolidada e os alertas à vista. **Edge case:** se Ricardo digitar um ticker inexistente, o sistema avisa "Ativo não encontrado" e sugere busca ou cadastro manual.

**UJ-2. Ana cria um Score Fundamentalista customizado e aplica na carteira.**  
Ana, trader fundamentalista, acessa **Score** (menu lateral). Clica "Nova Regra" e define: `P/L < 12 → +20 pts`, `ROE > 15% → +15 pts`, `DY > 6% → +10 pts`, `Dívida/PL < 1 → +10 pts`. Salva o score com nome "Ana Conservadora". Volta para **Carteira** e escolhe "Ana Conservadora" no filtro de score. A lista de ativos agora mostra pontuação ao lado de cada ticker: TAEE11 85pts (verde), PETR4 45pts (amarelo), MGLU3 20pts (vermelho). Ana ordena por score decrescente e vê que 3 ativos estão abaixo de 40pts. **Climax:** ela decide revisar a tese desses ativos. **Resolução:** Ana anota os tickers para análise posterior e exporta a lista. **Edge case:** se os dados fundamentalistas de um ativo estão desatualizados (>90 dias), o score aparece com flag "⚠️ Dados antigos".

**UJ-3. Carlos checa se algum ativo está abaixo do Preço-Teto de Bazin.**  
Carlos acessa **Estratégias** e seleciona método "Bazin" com DY mínimo desejado = 6%. O sistema calcula `Preço-teto = (Dividendo anual por ação) / 0.06` para cada ativo com histórico de dividendos. A tabela exibe: TAEE11 cotação R$38, teto R$42 → margem +10% (verde "oportunidade"); BBDC4 cotação R$22, teto R$20 → margem -10% (vermelho "sobrevalorizado"). **Climax:** Carlos vê 2 FIIs com margem >15% e adiciona à watchlist mental. **Resolução:** ele exporta o relatório de Preço-Teto em CSV. **Edge case:** ativo sem histórico de dividendos consistente → teto não calculável, linha exibe "N/A" com tooltip explicativo.

**UJ-4. Beatriz importa transações via CSV em vez de digitar manualmente.**  
Beatriz acessa **Carteira**, clica "Importar Transações" e faz upload de um CSV (colunas: data, ticker, tipo, quantidade, preço, corretagem). O sistema valida formato, reconhece tickers, e exibe preview: 47 linhas OK, 2 com ticker desconhecido (marcadas em amarelo). Beatriz corrige os 2 tickers no preview inline e confirma. As transações são inseridas e posições recalculadas automaticamente (preço médio ponderado, quantidade líquida). Os alertas de "posição sem transações" desaparecem. **Climax:** Beatriz vê o preço médio real refletido na Carteira. **Resolução:** ela pode agora confiar nos cálculos de rentabilidade. **Edge case:** CSV com formato incorreto → erro detalhado com linha/coluna do problema e exemplo do formato esperado.

## 3. Glossário

- **Ativo** — Instrumento financeiro rastreado na plataforma: ação BR, FII, BDR, stock US, REIT, crypto. Identificado por ticker único. Possui cotação, histórico de preços, e opcionalmente dados fundamentalistas e dividendos.
- **Posição** — Quantidade de um Ativo detida pelo Usuário em um momento. Possui: ticker, quantidade, preço médio, data de aquisição. Relação 1:N entre Usuário e Posição.
- **Transação** — Evento de compra/venda/dividendo de um Ativo. Possui: data, ticker, tipo (compra|venda|dividendo|JCP|bonificação), quantidade, preço unitário, corretagem, IR. Transações determinam Posições via cálculo de preço médio ponderado e quantidade líquida.
- **Score Fundamentalista** — Pontuação calculada aplicando Regras de Score sobre indicadores fundamentalistas de um Ativo. Cada Regra possui: métrica (P/L, ROE, DY, etc.), operador (>, <, entre), limiar, e pontos atribuídos. Score total = soma dos pontos de todas as regras aplicáveis.
- **Preço-Teto** — Valor justo calculado de um Ativo segundo metodologia escolhida: Bazin (DY), Graham (LPA × VPA), Múltiplos (P/L × LPA), ou Custom. Usado para identificar oportunidades (cotação < teto) ou sobrevalorização (cotação > teto).
- **Dividendo / Provento** — Pagamento em dinheiro (dividendo, JCP, rendimento de FII) distribuído por um Ativo. Histórico de Proventos alimenta cálculo de DY e Preço-Teto Bazin.
- **Patrimônio Líquido** — Soma do valor de mercado de todas as Posições do Usuário (cotação atual × quantidade) em uma data. Evolução do Patrimônio = série histórica dessa soma.
- **Rentabilidade** — Retorno percentual da carteira em um período. Desdobra-se em: ganho de capital (variação de preço) e proventos recebidos. Comparável com benchmarks (CDI, IBOV, IFIX).
- **Alerta** — Notificação interna sobre inconsistência ou evento relevante: posição sem transações, dividendo esperado não recebido, ativo sem cotação recente, meta de alocação violada. Exibido em lista e como badge na interface.
- **Benchmark** — Índice de referência para comparação: CDI, IBOV, IFIX, S&P500. Rentabilidade da carteira é comparada com Benchmarks no mesmo período.
- **RLS (Row Level Security)** — Política de segurança do Supabase Postgres que restringe acesso a linhas de tabelas por `user_id`. Garante que cada Usuário vê apenas seus próprios dados.

## 4. Features

### 4.1 Autenticação e Cadastro de Usuário

**Descrição:** Usuários criam conta via email + senha e fazem login. Supabase Auth gerencia sessão. Após login bem-sucedido, o usuário é redirecionado para **Carteira** (tela principal). Realiza **UJ-1** (primeiro acesso), **UJ-2**, **UJ-3**, **UJ-4** (usuários subsequentes). Utiliza protótipos `valora_cadastro.html` e `valora_login.html` como base visual.

**Requisitos Funcionais:**

#### FR-1: Cadastro de Novo Usuário

Visitante não autenticado pode criar conta fornecendo email, senha, nome completo e telefone.

**Consequências (testáveis):**
- Sistema valida formato de email, telefone (opcional mas presente no form) e força senha com mínimo 8 caracteres.
- Supabase Auth retorna erro se email já existe.
- Após cadastro, usuário recebe email de confirmação (opcional no MVP; pode ser desabilitado).
- Registro cria linha em tabela `users` com `user_id` único e telefone opcional.

**Fora de Escopo:**
- Cadastro via OAuth (Google, Apple) no MVP.
- Verificação de email obrigatória (pode ser adicionada depois).

#### FR-2: Login de Usuário Existente

Usuário registrado pode fazer login com email e senha.

**Consequências (testáveis):**
- Supabase Auth retorna sessão JWT válida.
- Sistema redireciona para `/carteira` após login bem-sucedido.
- Credenciais inválidas → mensagem de erro "Email ou senha incorretos".

#### FR-3: Logout e Gestão de Sessão

Usuário autenticado pode fazer logout. Sessão expira após período configurável (padrão 7 dias).

**Consequências (testáveis):**
- Logout limpa token local e redireciona para `/login`.
- Tentativa de acessar rota protegida sem sessão → redirect automático para `/login`.

#### FR-4: Recuperação de Senha

Usuário pode solicitar recuperação de senha via email.

**Consequências (testáveis):**
- Link "Esqueci minha senha" na tela de login aciona fluxo Supabase Auth de reset.
- Sistema envia email com link de recuperação (TTL 1 hora).
- Usuário clica no link, define nova senha, e é redirecionado para login.
- Link expirado → mensagem de erro com opção de solicitar novo link.

**Feature-specific NFRs:**
- Senhas armazenadas com hash bcrypt (gerenciado por Supabase Auth).
- Tokens JWT assinados e verificados server-side quando necessário (Route Handlers sensíveis).

---

### 4.2 Gestão de Carteira (Posições e Transações)

**Descrição:** Usuário cadastra Posições manualmente (ticker, quantidade, preço médio) ou via importação CSV. Opcionalmente cadastra Transações (compra/venda) que recalculam automaticamente preço médio ponderado e quantidade líquida. Tela **Carteira** (`valora_carteira.html`) exibe lista de Posições, valor total, peso relativo, e Alertas de inconsistência. Realiza **UJ-1**, **UJ-4**.

**Requisitos Funcionais:**

#### FR-5: Adicionar Posição Manual

Usuário autenticado pode adicionar Posição fornecendo ticker, quantidade, preço médio de compra, data de aquisição.

**Consequências (testáveis):**
- Sistema valida se ticker existe na tabela `assets` (seed/mock); caso contrário, oferece busca ou cadastro manual de ativo novo.
- Posição criada com `user_id` do usuário logado.
- RLS garante que apenas o próprio usuário vê e edita essa Posição.

#### FR-6: Importar Transações via CSV

Usuário pode fazer upload de arquivo CSV com colunas: `data, ticker, tipo, quantidade, preço, corretagem`. Sistema valida, exibe preview, e permite correção inline antes de confirmar importação.

**Consequências (testáveis):**
- CSV com formato incorreto → erro detalhado (linha/coluna/problema).
- Transações importadas recalculam Posições: preço médio ponderado = `(Σ preço × quantidade) / Σ quantidade`; quantidade líquida = compras − vendas.
- Ticker desconhecido → linha marcada em preview; usuário pode corrigir ou pular.

**Realiza UJ-4.**

#### FR-7: Visualizar Lista de Posições

Tela **Carteira** exibe todas as Posições do usuário: ticker, nome do ativo, quantidade, preço médio, cotação atual (mock), valor de mercado (`cotação × quantidade`), peso relativo (%), variação % (lucro/prejuízo desde aquisição).

**Consequências (testáveis):**
- Ordenação: por peso decrescente (padrão), por ticker alfabético, por variação %.
- Agrupamento por classe de ativo (ações BR, FIIs, BDRs, stocks US, REITs, crypto) exibe subtotais.
- Cotação atual vem de tabela `price_history` (última entrada por ticker); se > 1 dia desatualizada, flag "⚠️ Cotação antiga".

**Realiza UJ-1.**

#### FR-8: Consolidação por Tipo de Ativo

Tela **Carteira** exibe card de composição: gráfico de pizza com % por classe de ativo e exposição internacional (BDR + stocks US + REITs + crypto).

**Consequências (testáveis):**
- Classes reconhecidas: Ações BR, FIIs, BDRs, Stocks US, REITs, Cryptos.
- Exposição internacional = soma (BDR + stocks + REITs + crypto) / patrimônio total %.
- Card exibe valor total da carteira em destaque.

**Realiza RF10 (patrimônio composition) do relatório original.**

#### FR-9: Alertas de Inconsistências na Carteira

Sistema detecta e exibe Alertas: "Posição sem transações cadastradas", "Dividendo esperado não recebido", "Ativo sem cotação recente (>7 dias)".

**Consequências (testáveis):**
- Alerta "Posição sem transações" aparece se `COUNT(transactions WHERE ticker=X AND user_id=U) = 0` mas existe `position` para esse ticker.
- Badge numérico de alertas no menu lateral e lista de alertas na tela Carteira.
- Usuário pode marcar alerta como "revisado" ou "ignorar".

**Realiza RF05 (inconsistencies alerts) e UJ-1.**

**Feature-specific NFRs:**
- Importação CSV suporta até 1000 transações por arquivo no MVP.
- Preview inline renderiza em <2s para arquivos de até 500 linhas.

---

### 4.3 Evolução e Composição de Patrimônio

**Descrição:** Tela **Patrimônio** (`valora_patrimonio.html`) exibe gráfico de linha da evolução do patrimônio líquido ao longo do tempo e composição atual por tipo de ativo e exposição internacional. Realiza **RF09**, **RF10**.

**Requisitos Funcionais:**

#### FR-10: Evolução do Patrimônio Líquido

Usuário visualiza gráfico de linha mostrando valor total da carteira ao longo do tempo (eixo X: data; eixo Y: R$).

**Consequências (testáveis):**
- Sistema calcula patrimônio diário = `Σ (cotação do dia × quantidade de cada posição)`.
- Períodos selecionáveis: 1M, 3M, 6M, 1A, Tudo.
- Dados históricos reconstruídos a partir de `price_history` e `positions`; `[ASSUMPTION: usuário não altera retroativamente transações frequentemente]`.
- Se dados históricos incompletos (posições sem histórico de preço), gráfico exibe lacuna ou linha pontilhada.

**Realiza RF09.**

#### FR-11: Composição e Exposição Internacional

Card de composição (gráfico de pizza ou barras horizontais) exibe % por classe de ativo. Card de exposição internacional exibe % de ativos estrangeiros vs BR.

**Consequências (testáveis):**
- Classes: Ações BR, FIIs, BDRs, Stocks US, REITs, Cryptos.
- Exposição internacional = `(BDR + stocks US + REITs + crypto) / total`.
- Tooltip em cada fatia mostra valor absoluto (R$) e ticker principal dessa classe.

**Realiza RF10.**

**Feature-specific NFRs:**
- Gráfico de patrimônio carrega em <3s para histórico de 1 ano (até 365 pontos).

---

### 4.4 Histórico de Proventos

**Descrição:** Tela **Proventos** (`valora_proventos.html`) exibe histórico mensal de dividendos, JCP e rendimentos recebidos. Agrupa por mês e por ativo. Realiza **RF11**, **RF12**, **UJ-1** parcialmente (alertas de dividendo não recebido).

**Requisitos Funcionais:**

#### FR-12: Histórico Mensal de Dividendos

Usuário visualiza timeline de proventos recebidos, agrupados por mês (ex.: Jan/2026: R$450, Fev/2026: R$380).

**Consequências (testáveis):**
- Sistema busca transações do tipo `dividendo|JCP|rendimento` da tabela `transactions`.
- Gráfico de barras verticais: eixo X = mês, eixo Y = valor total (R$).
- Períodos: 6M, 1A, Tudo.

**Realiza RF11.**

#### FR-13: Proventos por Ativo

Tabela detalhada exibe: ticker, tipo (dividendo/JCP/rendimento), data COM, data de pagamento, valor por cota, quantidade de cotas, valor total recebido.

**Consequências (testáveis):**
- Ordenação: por data decrescente (padrão), por valor, por ticker.
- Filtro por ticker e por tipo de provento.
- Soma total de proventos no período exibida em destaque.

**Realiza RF12.**

**Feature-specific NFRs:**
- Histórico de proventos carrega em <2s para até 500 registros.

---

### 4.5 Rentabilidade e Benchmarks

**Descrição:** Tela **Rentabilidade** (`valora_rentabilidade.html`) exibe retorno total da carteira e comparação com benchmarks (CDI, IBOV, IFIX). Desdobra rentabilidade em ganho de capital e proventos. Exibe rentabilidade por ativo. Realiza **RF13**, **RF14**, **UJ-1** parcialmente (visão de rentabilidade real).

**Requisitos Funcionais:**

#### FR-14: Retorno Total e Comparação com Benchmarks

Usuário visualiza rentabilidade % da carteira em período selecionado (1M, 3M, 6M, 1A, Tudo) e comparação lado a lado com CDI, IBOV, IFIX.

**Consequências (testáveis):**
- Rentabilidade carteira = `((Patrimônio final + Proventos recebidos − Aportes) / Patrimônio inicial) − 1`.
- Gráfico de linhas comparativo: carteira vs benchmarks no mesmo eixo temporal.
- Dados de benchmark mockados no MVP (tabela `benchmark_history` com série histórica seed).
- Card de resumo: carteira +12,5%, CDI +10,2%, IBOV +8,7% → "Você bateu o CDI em +2,3pp".

**Realiza RF13.**

#### FR-15: Rentabilidade por Ativo (Ganho de Capital vs Proventos)

Tabela exibe: ticker, retorno total %, ganho de capital %, proventos recebidos (R$), proventos %.

**Consequências (testáveis):**
- Ganho de capital = `((cotação atual − preço médio) / preço médio) × 100`.
- Proventos % = `(Σ dividendos recebidos / (preço médio × quantidade)) × 100`.
- Retorno total % = ganho de capital % + proventos %.
- Ordenação: por retorno total decrescente (padrão), por ticker.

**Realiza RF14.**

**Feature-specific NFRs:**
- Cálculo de rentabilidade para carteira de 50 ativos e 1 ano de histórico em <3s.

---

### 4.6 Score Fundamentalista Customizável

**Descrição:** Tela **Score** (protótipo `valora_score.html`) permite criar, editar e aplicar regras de Score Fundamentalista. Cada regra define métrica, operador, limiar e pontos. Score total aplicado na lista de ativos da Carteira. Realiza **UJ-2**.

**Requisitos Funcionais:**

#### FR-16: Criar e Editar Regras de Score

Usuário cria Score customizado definindo nome e conjunto de regras. Cada regra: métrica (P/L, ROE, DY, Dívida/PL, Margem Líquida, etc.), operador (<, >, entre), limiar(s), e pontos atribuídos (+20, -10, etc.).

**Consequências (testáveis):**
- Métricas disponíveis no MVP: P/L, P/VP, ROE, DY, Dívida/Patrimônio, Margem Líquida (outras podem ser adicionadas depois).
- Sistema valida que limiar é numérico e pontos inteiros.
- Usuário pode ter múltiplos Scores salvos; seleciona um como "ativo" para aplicar na Carteira.

**Realiza UJ-2.**

#### FR-17: Aplicar Score na Carteira

Lista de Posições na tela **Carteira** exibe pontuação de Score ao lado de cada ticker quando Score ativo está selecionado.

**Consequências (testáveis):**
- Sistema calcula Score total = `Σ pontos de regras aplicáveis` para cada ativo com dados fundamentalistas.
- Ativo sem dados fundamentalistas → Score exibido como "N/A".
- Dados fundamentalistas desatualizados (>90 dias) → flag "⚠️ Dados antigos" ao lado do Score.
- Ordenação da lista por Score decrescente/crescente.

**Realiza UJ-2.**

**Feature-specific NFRs:**
- Cálculo de Score para 50 ativos em <1s.

---

### 4.7 Preço-Teto e Estratégias de Valuation

**Descrição:** Tela **Estratégias** / **Preço-Teto** (protótipos `valora_estrategias.html`, `valora_estrategias (1).html`, `valora_preco_teto.html`) calcula Preço-Teto usando método Bazin. Identifica oportunidades (cotação < teto) e sobrevalorização. Realiza **UJ-3**.

**Requisitos Funcionais:**

#### FR-18: Calcular Preço-Teto por Método Bazin

Usuário seleciona método de valuation Bazin e define DY mínimo desejado. Sistema calcula `Preço-teto = Dividendo anual por ação / DY mínimo`.

**Consequências (testáveis):**
- Sistema calcula Preço-Teto para cada ativo com histórico de dividendos consistente.
- Tabela exibe: ticker, cotação atual, Preço-Teto calculado, margem de segurança % (`(teto − cotação) / cotação`), indicador visual (verde se cotação < teto, vermelho se cotação > teto).
- Ativo sem histórico de dividendos consistente → teto "N/A" com tooltip explicando dado faltante.

**Realiza UJ-3.**

#### FR-19: Identificar Oportunidades e Alertas de Valuation

Sistema gera Alertas automáticos quando ativo está >15% abaixo do Preço-Teto (oportunidade) ou >20% acima (sobrevalorizado).

**Consequências (testáveis):**
- Alerta "PETR4 está 18% abaixo do Preço-Teto Bazin — oportunidade" exibido em lista de Alertas.
- Usuário pode configurar % de margem para disparo de alerta.

**Realiza UJ-3 parcialmente (watchlist mental → poderia virar alerta).**

**Feature-specific NFRs:**
- Cálculo de Preço-Teto para 50 ativos em <2s.

**Notas:**
- `[ASSUMPTION: fórmula Bazin correta como descrita; usuário pode ajustar DY mínimo]`.
- Graham e Múltiplos entram em v2 (ver §6.2, §11.2).

---

### 4.8 Alertas Internos Simples

**Descrição:** Sistema mantém lista de Alertas gerados automaticamente (inconsistências, oportunidades de valuation, eventos de ativo). Usuário visualiza, marca como lido, ou ignora. MVP não inclui notificações externas (email/push). Realiza **RF05**, **UJ-1**, **UJ-3** parcialmente.

**Requisitos Funcionais:**

#### FR-20: Lista de Alertas e Badge Numérico

Tela de Alertas exibe lista cronológica: tipo (inconsistência|oportunidade|evento), descrição, data de criação, status (novo|lido|ignorado).

**Consequências (testáveis):**
- Badge numérico no menu lateral/carteira exibe contagem de alertas "novos".
- Usuário pode marcar alerta como "lido" ou "ignorar".
- Tipos de alerta no MVP:
  - Inconsistência: posição sem transações, dividendo esperado não recebido, cotação desatualizada.
  - Oportunidade: ativo abaixo de Preço-Teto configurado.
  - Evento: (reservado para v2 — ex.: publicação de balanço).

**Realiza RF05 (inconsistencies alerts).**

#### FR-21: Geração Automática de Alertas

Sistema roda job diário (ou on-demand) que varre Posições, Transações, Dividendos e Preço-Teto, e cria novos Alertas conforme regras.

**Consequências (testáveis):**
- Job executável via Supabase Edge Function agendada ou script manual no MVP.
- Alertas duplicados (mesmo tipo + ticker + user) não são recriados se alerta anterior ainda está ativo.

**Fora de Escopo:**
- Notificações externas (email, SMS, push) no MVP.
- Alertas customizáveis pelo usuário (entram em v2).

**Feature-specific NFRs:**
- Job de alertas processa carteira de 50 ativos em <5s.

---

### 4.9 Dados de Mercado e Fundamentalistas (Seed/Mock)

**Descrição:** MVP utiliza dados seed/mockados para cotações, histórico de preços, dividendos, e indicadores fundamentalistas. Estrutura de tabelas permite plugar APIs reais depois. Realiza suporte técnico para todas as features anteriores.

**Requisitos Funcionais:**

#### FR-22: Catálogo de Ativos com Dados Seed

Sistema possui tabela `assets` pré-populada com ~50 ativos representativos: ações BR (PETR4, VALE3, ITUB4, etc.), FIIs (HGLG11, KNRI11), BDRs (AAPL34), alguns stocks US (AAPL, MSFT), REITs, cryptos (BTC, ETH).

**Consequências (testáveis):**
- Cada ativo tem: ticker, nome, tipo (stock_br|fii|bdr|stock_us|reit|crypto), moeda (BRL|USD).
- Usuário pode buscar ativo por ticker ou nome.
- `[ASSUMPTION: 50 ativos suficientes para validar MVP; usuário pode cadastrar ativo novo manualmente se necessário]`.

#### FR-23: Histórico de Preços Seed

Tabela `price_history` contém série diária dos últimos 12 meses para os ativos do catálogo, obtida de provedor real quando o plano gratuito cobre a janela, e simulada apenas no trecho descoberto.

A coluna `source` carrega a procedência **por linha**: `'brapi' | 'twelvedata' | 'coingecko' | 'bcb' | 'synthetic'`. Isso atende o requisito de rastreabilidade do §4.11 melhor que um rótulo uniforme, e já era antecipado pela nota `[NOTE FOR PM]` deste mesmo §4.9.

**Estado em 2026-09-08:** 51 ativos, 13.773 linhas, 61,4% de procedência real (Twelve Data 32,9%, CoinGecko 15,9%, brapi 12,5%) e 38,6% simulada — esta concentrada nos 9 meses que o plano gratuito da brapi não cobre.

**Consequências (testáveis):**
- Queries de patrimônio e rentabilidade funcionam sobre esses dados.
- Dados simulados com volatilidade realista mas fictícios.

#### FR-24: Dividendos e Indicadores Fundamentalistas Seed

Tabelas `dividends` e `fundamentals` contêm histórico trimestral simulado de dividendos e indicadores (P/L, ROE, DY, VPA, LPA, Dívida/PL, Margem Líquida) para ativos seed.

**Consequências (testáveis):**
- Cálculos de Preço-Teto, Score e DY funcionam.
- Dados marcados com flag `source = 'seed'` para rastreabilidade.

**Fora de Escopo MVP:**
- **Atualização automática e recorrente de cotações** — o MVP faz uma carga histórica única a partir de provedores reais (brapi, Twelve Data, CoinGecko); o refresh periódico entra em v2 via Edge Function agendada.
- Fundamentals e dividendos de provedor real — o plano gratuito da brapi não inclui dividendos, então o Épico 3 segue com dado simulado até haver decisão de custo.
- Integração com CVM e B3 diretamente — entra em v2.

**Feature-specific NFRs:**
- Aplicar `supabase/seed.sql` (catálogo + histórico já materializado) roda em <30s.
- **A ingestão via API é job separado, não interativo, e não está sujeita ao orçamento de 30s.** Os limites dos planos gratuitos impõem o piso: os 18 ativos US a 8 créditos/min no Twelve Data levam ~2,5 min; os 27 ativos BR consomem 27 requisições na brapi, que aceita 1 ticker por chamada.

**Notas:**
- `[NOTE FOR PM: estrutura de tabelas já preparada para receber `source = 'api_brapi'|'user_manual'|'csv_import'` em v2]`.

---

### 4.10 Rastreabilidade de Dados

**Descrição:** Toda cotação, dividendo ou indicador fundamentalista registra origem (`source`) e timestamp de última atualização. Usuário pode ver "de onde veio" cada dado. Realiza diferencial de **rastreabilidade** mencionado na visão.

**Requisitos Funcionais:**

#### FR-25: Exibir Origem e Atualização de Dados

Tooltip ou modal de "info" em cotação, dividendo ou indicador fundamentalista mostra: fonte (seed|api|manual|csv), data de atualização.

**Consequências (testáveis):**
- Tabelas `price_history`, `dividends`, `fundamentals` possuem colunas `source` e `updated_at`.
- Interface exibe ícone 🛈 clicável que abre tooltip com essas informações.
- Dados desatualizados (>90 dias para fundamentals, >7 dias para cotações) exibem flag "⚠️ Desatualizado".

**Fora de Escopo:**
- Auditoria completa de histórico de alterações (log de quem mudou o quê) — pode entrar em v2 se necessário.

---

### 4.11 Detalhe do Ativo

**Descrição:** Tela de detalhe individual de um Ativo (`valora_ativo.html`) exibe informações consolidadas: cotação atual, variação do dia, histórico de preços (gráfico), indicadores fundamentalistas, dividendos pagos, Score calculado, Preço-Teto, e posição do usuário (se houver). Acessível clicando em um ticker na Carteira.

**Requisitos Funcionais:**

#### FR-26: Visualizar Detalhe de Ativo

Usuário pode clicar em qualquer ticker na Carteira para abrir tela de detalhe do Ativo.

**Consequências (testáveis):**
- Tela exibe: nome completo, ticker, tipo (ação BR|FII|BDR|stock US|REIT|crypto), cotação atual, variação % do dia, moeda.
- Gráfico de histórico de preços (últimos 12 meses) com períodos selecionáveis (1M, 3M, 6M, 1A).
- Card de indicadores fundamentalistas: P/L, P/VP, ROE, DY, Dívida/PL, Margem Líquida (se disponíveis; seed no MVP).
- Seção de dividendos: histórico trimestral com data COM, valor por cota, yield.
- Score Fundamentalista calculado (se usuário tem Score ativo).
- Preço-Teto calculado pelo método ativo (se configurado).
- Se usuário possui posição: quantidade, preço médio, valor de mercado, variação %.
- Botão "Adicionar à Carteira" ou "Editar Posição" conforme contexto.

**Fora de Escopo MVP:**
- Notícias e fatos relevantes do ativo (v2).
- Análise técnica / gráficos de candlestick (fora de escopo fundamentalista).
- Comparação com pares / setor (v2).

**Feature-specific NFRs:**
- Tela de detalhe carrega em <2s para ativo com 12 meses de histórico.
- Gráfico interativo com tooltip de valores por data.

---

### 4.12 Navegação e Layout

**Descrição:** Interface organizada em menu lateral fixo com seções: Carteira, Patrimônio, Proventos, Rentabilidade, Score, Estratégias, Alertas, Configurações (futuro). Tema dark-only no MVP. Utiliza design system definido em `VALORA_COMPILADO_COMPLETO.md`. Realiza **RF15**, **RF16** parcialmente.

**Requisitos Funcionais:**

#### FR-27: Menu Lateral e Navegação Entre Telas

Usuário navega entre telas via menu lateral fixo à esquerda.

**Consequências (testáveis):**
- Itens do menu: Carteira (padrão pós-login), Patrimônio, Proventos, Rentabilidade, Score, Estratégias, Alertas.
- Item ativo visualmente destacado.
- Navegação client-side (SPA com React Router).

**Realiza RF15.**

#### FR-28: Ações de Suporte (Exportar, Sincronizar, Insights)

Cada tela relevante oferece botões de ação:
- **Exportar relatório** (CSV ou PDF futuro) — Carteira, Rentabilidade, Proventos.
- **Sincronizar dados** (futuro — dispara refresh de APIs) — placeholder no MVP.
- **Gerar insights** (futuro — IA sugere ajustes de alocação) — placeholder no MVP.

**Consequências (testáveis):**
- Exportar CSV funciona no MVP (gera arquivo com colunas das tabelas exibidas).
- Sincronizar e Insights exibem mensagem "Em breve" no MVP.

**Realiza RF16 parcialmente (export funcional, sync/insights placeholders).**

**Feature-specific NFRs:**
- Transição entre telas em <500ms.
- Exportar CSV de até 1000 linhas em <2s.

---

## 5. Não-Objetivos (Explícitos)

- **Integração direta com corretoras** (CEI, Clear, Rico, XP) no MVP — entra em v2.
- **Notificações externas** (email, SMS, push) — alertas são apenas internos no MVP.
- **Modo claro / temas customizáveis** — MVP é dark-only; modo claro entra depois.
- **Suporte a renda fixa** (Tesouro Direto, CDBs, LCI/LCA) — MVP foca renda variável; renda fixa entra em v3.
- **Mobile nativo** — MVP é web responsivo; apps nativos podem vir em v2+.
- **Análise técnica** (gráficos de candlestick, indicadores técnicos) — fora do escopo fundamentalista.
- **Social / comunidade** (feed, comentários, ranking de carteiras) — não é objetivo v1.
- **Marketplace de estratégias** — não é objetivo v1.

## 6. Escopo do MVP

### 6.1 No Escopo

- Cadastro e login via email/senha (Supabase Auth).
- Recuperação de senha via email.
- Campo de telefone no cadastro (opcional).
- Adicionar posições manualmente (ticker, quantidade, preço médio).
- Importar transações via CSV.
- Visualizar Carteira consolidada com alertas de inconsistências.
- Tela de detalhe individual do Ativo com histórico, fundamentals, dividendos.
- Evolução de patrimônio e composição por tipo de ativo.
- Histórico de proventos (mensal e por ativo).
- Rentabilidade total e por ativo, comparação com benchmarks (CDI, IBOV, IFIX).
- Score Fundamentalista customizável (regras de P/L, ROE, DY, etc.).
- Preço-Teto com método Bazin (Graham e Múltiplos movidos para v2).
- Alertas internos simples (inconsistências, oportunidades).
- Rastreabilidade de dados (fonte e data de atualização).
- Dados seed/mock para cotações, dividendos, fundamentals (50 ativos).
- Cotação USD via API pública (AwesomeAPI ou similar) para ativos internacionais.
- Exportar relatórios em CSV.
- Tema dark-only.
- Arquitetura monolítica modular (Vite + React + Supabase).
- Interface web responsiva (desktop e tablet; mobile funcional mas não otimizado).

### 6.2 Fora de Escopo para MVP

- Integração com APIs reais de cotação e fundamentals (v2 — MVP usa seed + API pública apenas para USD).
- Integração com corretoras/CEI (v2).
- Notificações externas por email ou push (v2).
- Modo claro (v2).
- Métodos de Preço-Teto Graham e Múltiplos (v2 — MVP usa apenas Bazin).
- Suporte a renda fixa (v3).
- Análise técnica (não-objetivo).
- Mobile nativo (v2+).
- Social/comunidade (não-objetivo v1).
- Fórmulas customizadas livres para Preço-Teto (v2).
- Múltiplas carteiras por usuário (v2).
- Backtest de estratégias (v3).
- Integrações externas para export — Google Drive, Notion, Trello (v3).

## 7. Métricas de Sucesso

**Primárias**

- **SM-1**: **Retenção semanal ≥40% após 1 mês de lançamento.** Valida que usuários retornam para monitorar carteira (FR-6, FR-9, FR-11, FR-13).
- **SM-2**: **≥60% dos usuários ativos cadastram pelo menos 5 posições na primeira sessão.** Valida utilidade imediata da funcionalidade de Carteira (FR-4, FR-6, realiza UJ-1).
- **SM-3**: **≥30% dos usuários criam Score Fundamentalista customizado nas primeiras 2 semanas.** Valida engajamento com feature diferenciadora (FR-15, realiza UJ-2).

**Secundárias**

- **SM-4**: **Tempo médio na plataforma ≥8 minutos por sessão.** Indica exploração ativa de Patrimônio, Proventos, Rentabilidade, Score (FR-9 a FR-16).
- **SM-5**: **≥20% dos usuários exportam relatório (CSV) ao menos uma vez.** Valida utilidade de análise fora da plataforma (FR-26).
- **SM-6**: **≥50% dos usuários clicam em ≥1 alerta nas primeiras 3 sessões.** Valida relevância dos alertas de inconsistências e oportunidades (FR-19, FR-8, FR-18).

**Contra-métricas (não otimizar)**

- **SM-C1**: **Taxa de erro em importação CSV ≤15%.** Contrabalança SM-2 — não sacrificar robustez de validação para inflar cadastro rápido de posições (FR-5).
- **SM-C2**: **Carga de página inicial da Carteira ≤3s (p95).** Contrabalança SM-4 — tempo na plataforma não deve ser inflado por lentidão de interface (NFR de performance FR-6).

## 8. NFRs Cross-Cutting

**Performance:**
- Tela **Carteira** (FR-6) carrega e renderiza lista de 50 posições em ≤2s (p95).
- Cálculo de Score para 50 ativos (FR-16) em ≤1s.
- Evolução de Patrimônio para 1 ano de histórico (FR-9) carrega gráfico em ≤3s.

**Segurança:**
- RLS (Row Level Security) do Supabase em todas as tabelas de dados de usuário (`positions`, `transactions`, `alerts`, `score_rules`, etc.) — apenas o `user_id` dono acessa suas linhas.
- Tokens JWT verificados em Route Handlers sensíveis (cálculos server-side, importação CSV).
- `SUPABASE_SERVICE_ROLE_KEY` nunca exposta ao frontend; apenas em variáveis de ambiente server-side.

**Acessibilidade:**
- Navegação por teclado funcional (Tab, Enter, Esc).
- Contraste de cores do tema dark atende WCAG 2.1 AA para texto normal e grande.
- `[NOTE FOR PM: validação completa WCAG requer testes com leitores de tela e auditoria especializada — fora do escopo MVP; validar em v2]`.

**Observabilidade:**
- Logs estruturados (JSON) para erros de backend (Supabase Edge Functions / Route Handlers).
- Sentry ou similar para captura de erros frontend (a ser configurado).

**Compatibilidade:**
- Suporte a navegadores modernos: Chrome, Firefox, Safari, Edge (últimas 2 versões).
- Interface responsiva: desktop ≥1280px (otimizado), tablet 768-1279px (funcional), mobile 375-767px (funcional mas não otimizado).

## 9. Questões em Aberto

1. ~~**Qual API de cotação externa usar em v2?**~~ — **RESOLVIDA em 2026-09-08.** brapi (ações BR, FIIs, BDRs), Twelve Data (stocks US, REITs), CoinGecko (cripto), BCB PTAX (USD/BRL). Descartados: Alpha Vantage (25 req/dia), Yahoo Finance (`HTTP 429` na primeira chamada), Finnhub para histórico (candles são pagos). Matriz com limites e licenças em `ARCHITECTURE-SPINE.md` → "Dados Externos (MVP)". **Ressalva de licença:** o tier gratuito do Twelve Data é "personal & non-commercial" — adequado ao uso acadêmico atual, impeditivo se o Valora for comercializado.
2. **Critérios de alerta de "dividendo esperado não recebido"?** Sistema precisa saber calendário de pagamento de dividendos; no MVP com dados seed, como simular? `[ASSUMPTION: basear em histórico trimestral; se passou >95 dias desde último dividendo de FII/ação pagadora, gerar alerta]`.
3. **Job de alertas roda quando?** Diário via cron (Supabase Edge Function agendada) ou on-demand (usuário clica "Atualizar alertas")? `[ASSUMPTION: on-demand no MVP para simplicidade; agendar em v2]`.

## 10. Índice de Assumptions

- **§4.3 FR-10:** Usuário não altera retroativamente transações com frequência (simplifica reconstrução de patrimônio histórico).
- **§4.9 FR-22:** 50 ativos seed suficientes para validar MVP; usuário pode cadastrar novo ativo manualmente se necessário.
- **§4.10 Fora de Escopo:** Estrutura de tabelas já preparada para `source = 'api_brapi'|'api_awesomeapi'|'user_manual'|'csv_import'` em v2.
- **§8 NFRs Acessibilidade:** Validação WCAG completa requer testes com leitores de tela — fora do escopo MVP; validar em v2.
- **§9 Q2:** Alerta de dividendo esperado gerado se >95 dias desde último dividendo de ativo pagador (baseado em histórico trimestral seed).
- **§9 Q3:** Job de alertas on-demand (usuário dispara) no MVP; agendar diário em v2.

## 11. Decisões Arquiteturais (Resolvidas)

As seguintes decisões foram tomadas durante o processo de PRD e estão refletidas nos requisitos acima:

1. **Arquitetura MVP:** Monolito modular com Vite + React + TypeScript + Supabase (Auth, Postgres, RLS). Microserviços planejados para v2+.
2. **Preço-Teto MVP:** Apenas método Bazin (ver FR-18). Graham e Múltiplos em v2.
3. **Conversão USD:** API pública (AwesomeAPI ou similar) para taxa de câmbio real.
4. **Cadastro:** Campo telefone opcional + recuperação de senha via email (ver FR-1, FR-4).
5. **Tela de Ativo:** Incluída no MVP como FR-26.
6. **Tema:** Dark-only (ver §6.1, §8 NFRs Acessibilidade).
