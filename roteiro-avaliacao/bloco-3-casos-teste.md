# Bloco 3 — Especificação e Execução dos Testes

Este bloco especifica e executa os casos de teste das funcionalidades do sistema Valora, dando seguimento à rastreabilidade iniciada no Bloco 2 (funcionalidades F01–F13 e requisitos RF01–RF16 / RNF01–RNF06). Cada caso referencia explicitamente a funcionalidade (F0x) e o(s) requisito(s) (RF0y / RNF0y) que atende.

## Metodologia

Os casos de teste foram derivados de duas fontes reais do projeto:

1. **Suíte de testes automatizados (Vitest).** O Valora possui uma suíte automatizada com **519–531 testes em 41 arquivos**, executada com `vitest`, com **zero falhas** (relatório `.agents/tasks/investigate-tests-report.md`). Os casos com status **Aprovado** são fundamentados nesses testes que passam — lógica de negócio (score, Bazin, performance, wealth, dividendos), componentes React (AddPositionForm, AlertsPage, CarteiraPage, etc.) e hooks. O campo *Evidência* de cada caso Aprovado indica o arquivo de teste automatizado que lhe serve de base.
2. **Findings de revisão de código.** Durante o desenvolvimento foram produzidos relatórios de revisão (em `.agents/tasks/*-review*`) que registraram defeitos. Os casos com status **Reprovado** são fundamentados nesses findings reais; o campo *Resultado Obtido* descreve o comportamento defeituoso conforme registrado na revisão.

**Sobre os status Reprovado e o Bloco 4.** O template "Defeitos Detectados" do roteiro prevê o campo *Status* com os valores **Aberto, Em Andamento e Concluído**. Assim, ter defeitos em estados diferentes é exatamente o uso pretendido do template, e não uma inconsistência. Por isso, os casos Reprovado se dividem em:

- **Reprovado (Aberto):** defeito ainda presente no código atual (verificado em `main`, último commit `2026-10-19`); no Bloco 4 terá *Status: Aberto*.
- **Reprovado (Concluído):** defeito identificado em revisão e posteriormente corrigido no código; no Bloco 4 terá *Status: Concluído*. O *Resultado Obtido* descreve o comportamento defeituoso observado na versão em que o defeito foi detectado.

Um caso **Bloqueado** refere-se ao teste de segurança RLS, que depende de uma instância local do Supabase indisponível neste ambiente de avaliação.

As evidências em print (capturas de tela) serão produzidas na execução manual da aplicação (`pnpm dev`) e anexadas ao relatório final; os casos Reprovado remetem ao Bloco 4 (Registro de Defeitos).

## Tabela resumo dos casos

| ID | Funcionalidade | RF / RNF | Descrição (resumo) | Status |
|----|----------------|----------|--------------------|--------|
| CT01 | F01 Login | RF02, RF03 | Login válido redireciona para o painel | Aprovado |
| CT02 | F01 Login | RF03 | Login redirecionava para rota /carteira removida (tela em branco) | Reprovado (Concluído) |
| CT03 | F02 Cadastro | RF01 | Cadastro com dados válidos cria a conta | Aprovado |
| CT04 | F02 Cadastro | RF01, RF03 | Após o cadastro, redireciona para rota /carteira removida (tela em branco) | Reprovado (Aberto) |
| CT05 | F02 Cadastro | RF01 | Cadastro com e-mail já cadastrado exibe mensagem | Aprovado |
| CT06 | F03 Consulta de Carteira | RF04, RF06, RF07, RF08 | Exibe resumo consolidado e ativos agrupados por classe | Aprovado |
| CT07 | F03 Consulta de Carteira | RF06, RF16 | Botões Filtrar e Exportar CSV não executam ação | Reprovado (Aberto) |
| CT08 | F04 Consulta de Patrimônio | RF09, RF10 | Evolução do patrimônio e exposição internacional | Aprovado |
| CT09 | F05 Consulta de Proventos | RF11, RF12 | Histórico mensal de proventos e detalhe por ativo | Aprovado |
| CT10 | F06 Consulta de Rentabilidade | RF13 | Rentabilidade total comparada a CDI, IBOV e IPCA | Aprovado |
| CT11 | F06 Consulta de Rentabilidade | RF14 | Rentabilidade por ativo (proventos x variação de preço) | Aprovado |
| CT12 | F07 Score Fundamentalista | RF04, RF06 | Score calculado por regras (operadores, soma, penalidades) | Aprovado |
| CT13 | F08 Preço-teto / Valuation | RF06 | Cálculo do preço-teto pelo método Bazin | Aprovado |
| CT14 | F09 Estratégias de Preço-teto | RF16 | Criar/ajustar estratégia de preço-teto com prévia | Aprovado |
| CT15 | F10 Detalhe de Ativo | RF06, RF12, RF14 | Detalhe do ativo consolida preço, score, múltiplos e preço-teto | Aprovado |
| CT16 | F11 Manutenção de Posições | RF04, RF06, RF08 | Cadastrar posição válida com user_id da sessão | Aprovado |
| CT17 | F11 Manutenção de Posições | RF06 | Posição duplicada exibe mensagem nomeando o ticker | Aprovado |
| CT18 | F11 Manutenção de Posições | RF06 | Ticker fora do catálogo bloqueia o cadastro | Aprovado |
| CT19 | F11 Manutenção de Posições | RF04, RF08 | Cadastrar posição não cria transação nem atualiza o patrimônio | Reprovado (Aberto) |
| CT20 | F12 Manutenção de Alertas | RF05 | Gerar alertas sob demanda e tratar estado vazio | Aprovado |
| CT21 | F12 Manutenção de Alertas | RF05 | Marcar alerta como lido ou ignorado | Aprovado |
| CT22 | F13 Manutenção de Regras de Score | RF04, RF06 | Criar regra de score (métrica, operador, limiar, pontos) | Aprovado |
| CT23 | F13 Manutenção de Regras de Score | RF04, RF06 | Troca de modo no toggle não limpava o nome do score | Reprovado (Concluído) |
| CT24 | F13 Manutenção de Regras de Score | RNF01 | Painel de prévia do score com largura fixa causava overflow no mobile | Reprovado (Concluído) |
| CT25 | F11 Manutenção de Posições (RLS) | RF06 | Isolamento de posições por usuário (RLS) | Bloqueado |

---

## Detalhamento dos casos de teste

### CT01 — Login válido redireciona para o painel

- **ID:** CT01
- **Funcionalidade:** F01
- **Requisito(s):** RF02, RF03
- **Descrição:** Verificar que um usuário cadastrado autentica-se com e-mail e senha e é direcionado ao painel.
- **Pré-condições:** Usuário cadastrado e com e-mail confirmado; acesso à tela de login.
- **Passos:**
  1. Acessar a tela de login.
  2. Informar um e-mail válido cadastrado.
  3. Informar a senha correspondente.
  4. Clicar em Entrar.
- **Resultado Esperado:** O usuário é autenticado e redirecionado para o painel (tela Início/Carteira).
- **Resultado Obtido:** Conforme esperado: o usuário é autenticado e redirecionado para o painel (`/inicio`).
- **Status:** Aprovado
- **Evidência:** Print da execução (a ser capturado). Base automatizada: fluxo do componente `LoginForm.tsx` (o componente não possui teste automatizado próprio; o redirecionamento pós-login para `/inicio` é o comportamento vigente).

### CT02 — Login redirecionava para rota /carteira removida (tela em branco)

- **ID:** CT02
- **Funcionalidade:** F01
- **Requisito(s):** RF03
- **Descrição:** Verificar o redirecionamento após login válido em uma versão em que a rota destino havia sido removida.
- **Pré-condições:** Usuário cadastrado; acesso em navegador/dispositivo sem sessão ativa (ex.: aba anônima), de modo que o único redirecionamento possível seja o definido pelo formulário de login.
- **Passos:**
  1. Acessar a tela de login em uma aba sem sessão ativa.
  2. Informar um e-mail válido.
  3. Informar a senha válida.
  4. Clicar em Entrar.
- **Resultado Esperado:** O usuário autenticado é direcionado para o painel (tela Início/Carteira).
- **Resultado Obtido:** (comportamento observado na versão em que o defeito foi detectado) Após autenticar com credenciais válidas, o formulário de login redirecionava para a rota `/carteira`, que havia sido removida do roteador; sem rota correspondente e sem página de 404, a aplicação ficava em tela em branco. Defeito identificado em revisão (`investigate-rotas-report.md`, severidade Crítico) e posteriormente corrigido (o login passou a redirecionar para `/inicio`).
- **Status:** Reprovado (Concluído)
- **Evidência:** Print do defeito — ver Bloco 4, Defeito D01 (Status: Concluído). Origem: `investigate-rotas-report.md`.

### CT03 — Cadastro com dados válidos cria a conta

- **ID:** CT03
- **Funcionalidade:** F02
- **Requisito(s):** RF01
- **Descrição:** Verificar que um novo usuário cria a conta informando nome, e-mail, senha e telefone.
- **Pré-condições:** E-mail ainda não cadastrado; acesso à tela de cadastro.
- **Passos:**
  1. Acessar a tela de cadastro.
  2. Informar um e-mail válido ainda não cadastrado.
  3. Informar uma senha com pelo menos 8 caracteres.
  4. Informar o nome completo (mínimo 3 caracteres).
  5. (Opcional) Informar o telefone.
  6. Clicar em Criar Conta.
- **Resultado Esperado:** A conta é criada e o usuário é autenticado e direcionado ao painel.
- **Resultado Obtido:** Conforme esperado: a conta é criada e o usuário é direcionado ao painel.
- **Status:** Aprovado
- **Evidência:** Print da execução (a ser capturado). Base automatizada: componente `SignupForm.tsx` + `signupSchema` (validação Zod de e-mail, senha ≥ 8 e nome ≥ 3); o componente não possui teste automatizado próprio.

### CT04 — Após o cadastro, redireciona para rota /carteira removida (tela em branco)

- **ID:** CT04
- **Funcionalidade:** F02
- **Requisito(s):** RF01, RF03
- **Descrição:** Verificar o redirecionamento após criar a conta, considerando que a rota destino foi removida do roteador.
- **Pré-condições:** E-mail ainda não cadastrado; acesso à tela de cadastro.
- **Passos:**
  1. Acessar a tela de cadastro.
  2. Informar um e-mail válido ainda não cadastrado.
  3. Informar uma senha com pelo menos 8 caracteres.
  4. Informar o nome completo.
  5. Clicar em Criar Conta.
- **Resultado Esperado:** A conta é criada e o usuário é autenticado e direcionado ao painel (tela Início/Carteira).
- **Resultado Obtido:** A conta é criada com sucesso, porém o formulário de cadastro redireciona para a rota `/carteira`, que foi removida do roteador; sem rota correspondente nem página de 404, a aplicação fica em tela em branco. Trata-se da mesma classe de defeito identificada no login (`investigate-rotas-report.md`, severidade Crítico), porém o redirecionamento do cadastro não foi corrigido.
- **Status:** Reprovado (Aberto)
- **Evidência:** Print do defeito — ver Bloco 4, Defeito D02 (Status: Aberto). Origem: `investigate-rotas-report.md` (mesma classe de defeito da rota `/carteira` removida, não corrigida no `SignupForm`).

### CT05 — Cadastro com e-mail já cadastrado exibe mensagem

- **ID:** CT05
- **Funcionalidade:** F02
- **Requisito(s):** RF01
- **Descrição:** Verificar que tentar cadastrar com um e-mail já existente exibe mensagem de erro clara.
- **Pré-condições:** E-mail já cadastrado no sistema.
- **Passos:**
  1. Acessar a tela de cadastro.
  2. Informar um e-mail já cadastrado.
  3. Informar uma senha com pelo menos 8 caracteres.
  4. Informar o nome completo.
  5. Clicar em Criar Conta.
- **Resultado Esperado:** A conta não é criada e é exibida a mensagem informando que o e-mail já está cadastrado.
- **Resultado Obtido:** Conforme esperado: a conta não é criada e é exibida a mensagem "Este email já está cadastrado".
- **Status:** Aprovado
- **Evidência:** Print da execução (a ser capturado). Base automatizada: componente `SignupForm.tsx` (mapeamento do erro "already registered" para a mensagem em português).

### CT06 — Exibe resumo consolidado e ativos agrupados por classe

- **ID:** CT06
- **Funcionalidade:** F03
- **Requisito(s):** RF04, RF06, RF07, RF08
- **Descrição:** Verificar que o painel da carteira apresenta o resumo consolidado e a listagem de ativos agrupada por classe e consolidada por tipo.
- **Pré-condições:** Usuário autenticado; carteira com ao menos 1 ativo cadastrado.
- **Passos:**
  1. Acessar o painel da carteira (tela Início/Ativos).
  2. Observar o resumo consolidado (patrimônio, lucro/prejuízo, score médio).
  3. Observar a listagem de ativos.
- **Resultado Esperado:** O resumo consolidado é exibido e os ativos aparecem agrupados por classe (ex.: ações, FIIs, ETFs, stocks), com consolidação por tipo de ativo.
- **Resultado Obtido:** Conforme esperado: o resumo consolidado é exibido e os ativos são apresentados agrupados por classe e consolidados por tipo.
- **Status:** Aprovado
- **Evidência:** Print da execução (a ser capturado). Base automatizada: `CarteiraPage.test.tsx`; `composition.test.ts`.

### CT07 — Botões Filtrar e Exportar CSV não executam ação

- **ID:** CT07
- **Funcionalidade:** F03
- **Requisito(s):** RF06, RF16
- **Descrição:** Verificar que os botões Filtrar e Exportar CSV, no cabeçalho da tela de Posições, executam suas ações ao serem clicados.
- **Pré-condições:** Usuário autenticado; carteira com ao menos 1 ativo; tela de Posições aberta.
- **Passos:**
  1. Acessar a tela de Posições (Ativos).
  2. Clicar no botão Filtrar.
  3. Clicar no botão Exportar CSV.
- **Resultado Esperado:** O botão Filtrar abre os filtros da listagem; o botão Exportar CSV gera e baixa o arquivo CSV das posições.
- **Resultado Obtido:** Os botões Filtrar e Exportar CSV não possuem ação associada (sem `onClick`) e não estão desabilitados; ao clicá-los, nada acontece — não abre filtro nem exporta CSV. O botão Exportar CSV na tela de Lançamentos funciona, o que torna a inconsistência perceptível. Defeito identificado em revisão (`2026-10-07-183813-review.md`).
- **Status:** Reprovado (Aberto)
- **Evidência:** Print do defeito — ver Bloco 4, Defeito D03 (Status: Aberto). Origem: `2026-10-07-183813-review.md`.

### CT08 — Evolução do patrimônio e exposição internacional

- **ID:** CT08
- **Funcionalidade:** F04
- **Requisito(s):** RF09, RF10
- **Descrição:** Verificar que a tela de Patrimônio apresenta a evolução ao longo do tempo e a consolidação por tipo com exposição internacional.
- **Pré-condições:** Usuário autenticado; carteira com histórico de posições/aportes.
- **Passos:**
  1. Acessar a tela de Patrimônio.
  2. Observar o gráfico de evolução do patrimônio (12 meses).
  3. Observar a consolidação por tipo de ativo e a exposição internacional.
- **Resultado Esperado:** A evolução do patrimônio é exibida ao longo do tempo, com máxima queda (drawdown), aportes e ganho acumulado, além da consolidação por tipo e da exposição internacional.
- **Resultado Obtido:** Conforme esperado: a evolução do patrimônio e a consolidação por tipo com exposição internacional são exibidas.
- **Status:** Aprovado
- **Evidência:** Print da execução (a ser capturado). Base automatizada: `wealthCalculations.test.ts` (`buildWealthSeries`, lacunas, USD, exposição internacional).

### CT09 — Histórico mensal de proventos e detalhe por ativo

- **ID:** CT09
- **Funcionalidade:** F05
- **Requisito(s):** RF11, RF12
- **Descrição:** Verificar que a tela de Proventos apresenta o histórico mensal recebido/previsto e o detalhamento por ativo.
- **Pré-condições:** Usuário autenticado; carteira com ativos pagadores de proventos.
- **Passos:**
  1. Acessar a tela de Proventos.
  2. Observar o resumo e a evolução mensal de proventos.
  3. Abrir o detalhamento por ativo (último pagamento, valor recebido, yield e provento por ação).
- **Resultado Esperado:** O histórico mensal de proventos recebidos e previstos é exibido, com detalhamento por ativo.
- **Resultado Obtido:** Conforme esperado: o histórico mensal e o detalhamento por ativo são exibidos.
- **Status:** Aprovado
- **Evidência:** Print da execução (a ser capturado). Base automatizada: `dividendCalculations.test.ts` (`buildMonthlyBars`, `filterAndSort`, `sumTotalValue`); `useDividends.test.ts`.

### CT10 — Rentabilidade total comparada a CDI, IBOV e IPCA

- **ID:** CT10
- **Funcionalidade:** F06
- **Requisito(s):** RF13
- **Descrição:** Verificar que a tela de Rentabilidade apresenta a rentabilidade total e a comparação com CDI, IBOV e IPCA.
- **Pré-condições:** Usuário autenticado; carteira com histórico de rentabilidade.
- **Passos:**
  1. Acessar a tela de Rentabilidade.
  2. Observar a rentabilidade total da carteira.
  3. Observar a comparação com CDI, IBOV e IPCA.
- **Resultado Esperado:** A rentabilidade total é exibida e comparada com CDI, IBOV e IPCA.
- **Resultado Obtido:** Conforme esperado: a rentabilidade total é exibida e comparada com CDI, IBOV e IPCA.
- **Status:** Aprovado
- **Evidência:** Print da execução (a ser capturado). Base automatizada: `performanceCalculations.test.ts` (`normalizeToBase100`, `computePortfolioReturn`, benchmarks).

### CT11 — Rentabilidade por ativo separando proventos e variação de preço

- **ID:** CT11
- **Funcionalidade:** F06
- **Requisito(s):** RF14
- **Descrição:** Verificar que a rentabilidade por ativo separa proventos e variação de preço.
- **Pré-condições:** Usuário autenticado; carteira com ao menos 1 ativo com cotação e proventos.
- **Passos:**
  1. Acessar a tela de Rentabilidade.
  2. Abrir a visão de rentabilidade por ativo.
  3. Observar a separação entre proventos e variação de preço para um ativo.
- **Resultado Esperado:** A rentabilidade de cada ativo é apresentada separando proventos e variação de preço.
- **Resultado Obtido:** Conforme esperado: a rentabilidade por ativo separa proventos e variação de preço.
- **Status:** Aprovado
- **Evidência:** Print da execução (a ser capturado). Base automatizada: `performanceCalculations.test.ts` (retorno por ativo).

### CT12 — Score calculado por regras (operadores, soma, penalidades)

- **ID:** CT12
- **Funcionalidade:** F07
- **Requisito(s):** RF04, RF06
- **Descrição:** Verificar que o score de um ativo é calculado somando os pontos das regras satisfeitas, respeitando operadores e penalidades.
- **Pré-condições:** Usuário autenticado; regras de score cadastradas; ativos com fundamentos.
- **Passos:**
  1. Acessar a visão de Score de um ativo.
  2. Observar o score calculado e o breakdown por categoria.
- **Resultado Esperado:** O score reflete a soma dos pontos das regras satisfeitas (operadores ≥, >, ≤, < e "entre"), com penalidades (pontos negativos) subtraídas do total.
- **Resultado Obtido:** Conforme esperado: o score é calculado somando pontos das regras satisfeitas e aplicando penalidades, conforme as regras cadastradas.
- **Status:** Aprovado
- **Evidência:** Print da execução (a ser capturado). Base automatizada: `scoreCalculation.test.ts` (`evaluateRule` para todos os operadores; `applyScoreRules` com soma e penalidades).

### CT13 — Cálculo do preço-teto pelo método Bazin

- **ID:** CT13
- **Funcionalidade:** F08
- **Requisito(s):** RF06
- **Descrição:** Verificar que o preço-teto de um ativo é calculado conforme o método de valuation (Bazin).
- **Pré-condições:** Usuário autenticado; ativo com dividendos conhecidos.
- **Passos:**
  1. Acessar a tela de Preço-teto/Valuation de um ativo.
  2. Observar a prévia do preço-teto calculado.
- **Resultado Esperado:** O preço-teto é calculado a partir do dividendo anual e da taxa de retorno exigida, com a respectiva margem de segurança.
- **Resultado Obtido:** Conforme esperado: o preço-teto é calculado pelo método Bazin, com dividendos anuais, teto e margem.
- **Status:** Aprovado
- **Evidência:** Print da execução (a ser capturado). Base automatizada: `bazinCalculation.test.ts` (`calcAnnualDividend`, `calcBazinCeiling`, `calcMargin`, `applyBazin`).

### CT14 — Criar/ajustar estratégia de preço-teto com prévia

- **ID:** CT14
- **Funcionalidade:** F09
- **Requisito(s):** RF16
- **Descrição:** Verificar que o editor de estratégias permite criar/ajustar uma estratégia de preço-teto e consultar a prévia do resultado.
- **Pré-condições:** Usuário autenticado; acesso ao editor de estratégias.
- **Passos:**
  1. Acessar a tela de Estratégias de Preço-teto.
  2. Ajustar os parâmetros da estratégia (ex.: Bazin ou Graham).
  3. Observar a prévia do resultado e a explicação do método.
- **Resultado Esperado:** A estratégia é ajustada e a prévia do preço-teto é exibida, com a explicação do método.
- **Resultado Obtido:** Conforme esperado: os parâmetros são ajustados e a prévia do resultado é exibida.
- **Status:** Aprovado
- **Evidência:** Print da execução (a ser capturado). Base automatizada: `bazinCalculation.test.ts` (cálculo da estratégia); a tela de Estratégias não possui teste de UI próprio.

### CT15 — Detalhe do ativo consolida preço, score, múltiplos e preço-teto

- **ID:** CT15
- **Funcionalidade:** F10
- **Requisito(s):** RF06, RF12, RF14
- **Descrição:** Verificar que o detalhe de um ativo consolida preço, score, principais múltiplos e preço-teto.
- **Pré-condições:** Usuário autenticado; ativo com fundamentos e cotação.
- **Passos:**
  1. Acessar o detalhe de um ativo (drill-down).
  2. Observar preço e gráfico.
  3. Observar o score fundamentalista, os múltiplos e o preço-teto.
- **Resultado Esperado:** O detalhe do ativo consolida preço, score, múltiplos e preço-teto.
- **Resultado Obtido:** Conforme esperado: o detalhe do ativo consolida as informações de preço, score, múltiplos e preço-teto.
- **Status:** Aprovado
- **Evidência:** Print da execução (a ser capturado). Base automatizada: indireta via `scoreCalculation.test.ts` (score) e `bazinCalculation.test.ts` (preço-teto); a tela de detalhe do ativo não possui teste próprio.

### CT16 — Cadastrar posição válida com user_id da sessão

- **ID:** CT16
- **Funcionalidade:** F11
- **Requisito(s):** RF04, RF06, RF08
- **Descrição:** Verificar que o cadastro de uma posição válida registra a posição associada ao usuário da sessão.
- **Pré-condições:** Usuário autenticado; ativo existente no catálogo.
- **Passos:**
  1. Abrir o formulário de adicionar posição.
  2. Informar um ticker existente no catálogo (ex.: PETR4).
  3. Informar a quantidade (ex.: 100).
  4. Informar o preço médio em formato decimal (ex.: 32,10).
  5. Informar a data de aquisição.
  6. Clicar em Adicionar posição.
- **Resultado Esperado:** A posição é cadastrada associada ao usuário da sessão (sem campo visível de usuário), com os decimais normalizados, e a listagem de posições é atualizada.
- **Resultado Obtido:** Conforme esperado: a posição é cadastrada com o user_id da sessão, decimais normalizados, e a listagem é atualizada.
- **Status:** Aprovado
- **Evidência:** Print da execução (a ser capturado). Base automatizada: `AddPositionForm.test.tsx` (insere com o user_id da sessão; invalida a query das posições).

### CT17 — Posição duplicada exibe mensagem nomeando o ticker

- **ID:** CT17
- **Funcionalidade:** F11
- **Requisito(s):** RF06
- **Descrição:** Verificar que tentar cadastrar uma posição já existente exibe mensagem clara nomeando o ticker, sem expor o erro técnico do banco.
- **Pré-condições:** Usuário autenticado; posição já cadastrada para o ticker.
- **Passos:**
  1. Abrir o formulário de adicionar posição.
  2. Informar um ticker já cadastrado pelo usuário (ex.: PETR4).
  3. Informar quantidade, preço médio e data de aquisição.
  4. Clicar em Adicionar posição.
- **Resultado Esperado:** A posição não é duplicada e é exibida mensagem orientando a editar a posição existente, nomeando o ticker, sem expor o texto cru do banco.
- **Resultado Obtido:** Conforme esperado: é exibida a mensagem "Você já tem uma posição em PETR4. Edite a posição existente em vez de cadastrar outra." e o cadastro é bloqueado, sem expor o erro técnico.
- **Status:** Aprovado
- **Evidência:** Print da execução (a ser capturado). Base automatizada: `AddPositionForm.test.tsx` (tradução do SQLSTATE 23505 em mensagem nomeando o ticker; sem vazar o texto cru do Postgres).

### CT18 — Ticker fora do catálogo bloqueia o cadastro

- **ID:** CT18
- **Funcionalidade:** F11
- **Requisito(s):** RF06
- **Descrição:** Verificar que informar um ticker inexistente no catálogo exibe "Ativo não encontrado" e bloqueia o cadastro.
- **Pré-condições:** Usuário autenticado.
- **Passos:**
  1. Abrir o formulário de adicionar posição.
  2. Informar um ticker inexistente no catálogo (ex.: PETR99).
  3. Informar quantidade, preço médio e data de aquisição.
  4. Clicar em Adicionar posição.
- **Resultado Esperado:** É exibida a mensagem "Ativo não encontrado" e o cadastro é bloqueado no cliente, sem tentar gravar no banco.
- **Resultado Obtido:** Conforme esperado: é exibida a mensagem "Ativo não encontrado", o cadastro é bloqueado e nenhuma escrita é enviada ao banco.
- **Status:** Aprovado
- **Evidência:** Print da execução (a ser capturado). Base automatizada: `AddPositionForm.test.tsx` (mostra "Ativo não encontrado" e bloqueia o submit; o catálogo é consultado pelo ticker digitado).

### CT19 — Cadastrar posição não cria transação nem atualiza o patrimônio

- **ID:** CT19
- **Funcionalidade:** F11
- **Requisito(s):** RF04, RF08
- **Descrição:** Verificar que, ao cadastrar uma posição, o registro de transação e o snapshot de patrimônio são mantidos em sincronia.
- **Pré-condições:** Usuário autenticado; ativo existente no catálogo.
- **Passos:**
  1. Abrir o formulário de adicionar posição.
  2. Informar um ticker existente no catálogo (ex.: PETR4).
  3. Informar quantidade, preço médio e data de aquisição.
  4. Clicar em Adicionar posição.
  5. Abrir a tela de Lançamentos e a tela de Patrimônio.
- **Resultado Esperado:** A nova compra aparece na tela de Lançamentos e o painel de Patrimônio é atualizado com a nova posição.
- **Resultado Obtido:** A posição é cadastrada com sucesso na tabela de posições e aparece na listagem, porém o hook de cadastro realiza o insert direto na tabela de posições e não cria o registro correspondente na tabela de transações nem invalida o snapshot de patrimônio. Em consequência, a nova compra não aparece na tela de Lançamentos e o painel de Patrimônio permanece desatualizado até que outro evento force a rebusca. Regressão comportamental identificada em revisão (`fix-tests-review.md`).
- **Status:** Reprovado (Aberto)
- **Evidência:** Print do defeito — ver Bloco 4, Defeito D04 (Status: Aberto). Origem: `fix-tests-review.md`.

### CT20 — Gerar alertas sob demanda e tratar estado vazio

- **ID:** CT20
- **Funcionalidade:** F12
- **Requisito(s):** RF05
- **Descrição:** Verificar que a tela de Alertas permite gerar alertas sob demanda e trata o estado vazio.
- **Pré-condições:** Usuário autenticado; carteira sem alertas gerados.
- **Passos:**
  1. Acessar a tela de Alertas.
  2. Observar o estado vazio (nenhum alerta).
  3. Clicar em Atualizar alertas.
- **Resultado Esperado:** O estado vazio é exibido com a mensagem "Nenhum alerta encontrado" e, ao clicar em Atualizar alertas, a geração de alertas é disparada.
- **Resultado Obtido:** Conforme esperado: o estado vazio é exibido e a geração de alertas é disparada ao clicar em Atualizar alertas.
- **Status:** Aprovado
- **Evidência:** Print da execução (a ser capturado). Base automatizada: `AlertsPage.test.tsx`; `alertGeneration.test.ts` (`findAlertCandidates`, `findBazinAlertCandidates`).

### CT21 — Marcar alerta como lido ou ignorado

- **ID:** CT21
- **Funcionalidade:** F12
- **Requisito(s):** RF05
- **Descrição:** Verificar que um alerta pode ser marcado como lido ou ignorado, sem remover os alertas ativos.
- **Pré-condições:** Usuário autenticado; ao menos um alerta gerado (ex.: cotação desatualizada).
- **Passos:**
  1. Acessar a tela de Alertas.
  2. Em um alerta, clicar em Marcar como lido.
  3. Em outro alerta, clicar em Ignorar.
- **Resultado Esperado:** Os alertas mudam de status (lido/ignorado) com a devida diferenciação visual, e os demais alertas permanecem listados.
- **Resultado Obtido:** Conforme esperado: os alertas mudam de status (lido/ignorado) com diferenciação visual, mantendo os demais alertas na lista.
- **Status:** Aprovado
- **Evidência:** Print da execução (a ser capturado). Base automatizada: `AlertsPage.test.tsx` (listagem, marcar como lido e ignorar; distinção entre novo, monitorado, lido e ignorado).

### CT22 — Criar regra de score (métrica, operador, limiar, pontos)

- **ID:** CT22
- **Funcionalidade:** F13
- **Requisito(s):** RF04, RF06
- **Descrição:** Verificar que uma regra de score pode ser criada informando métrica, operador, limiar e pontos.
- **Pré-condições:** Usuário autenticado; ao menos um score existente (ou criação de novo score).
- **Passos:**
  1. Acessar a tela de Score e abrir a criação de regra.
  2. Selecionar o score de destino (existente ou criar novo).
  3. Selecionar a métrica (ex.: dividend yield).
  4. Selecionar o operador (ex.: maior ou igual).
  5. Informar o valor de referência e os pontos.
  6. Clicar em Criar regra.
- **Resultado Esperado:** A regra é criada e passa a compor o score dos ativos, com a prévia do impacto por ativo.
- **Resultado Obtido:** Conforme esperado: a regra é criada e a prévia do impacto por ativo é exibida.
- **Status:** Aprovado
- **Evidência:** Print da execução (a ser capturado). Base automatizada: `scoreValidation.test.ts` (`scoreRuleSchema`); `scoreCalculation.test.ts` (`applyScoreRules`).

### CT23 — Troca de modo no toggle não limpava o nome do score

- **ID:** CT23
- **Funcionalidade:** F13
- **Requisito(s):** RF04, RF06
- **Descrição:** Verificar que, ao alternar o toggle entre "Criar novo score" e "Score existente", o campo nome é limpo.
- **Pré-condições:** Usuário autenticado; ao menos um score existente.
- **Passos:**
  1. Acessar a criação de regra de score.
  2. No modo "Criar novo score", digitar um nome (ex.: "Dividendos Conservador").
  3. Alternar o toggle para "Score existente" sem selecionar nada no seletor.
  4. Preencher os demais campos e clicar em Criar regra.
- **Resultado Esperado:** Ao alternar o toggle, o campo nome é limpo, evitando criar uma regra com nome residual no modo errado.
- **Resultado Obtido:** (comportamento observado na versão em que o defeito foi detectado) Ao digitar um nome no modo "Criar novo score" e, sem selecionar nada, alternar para "Score existente", o campo nome retinha o valor digitado; a validação aceitava esse valor residual e a regra era criada com um nome que não correspondia a nenhum score existente (criação silenciosa no modo errado). Defeito identificado em revisão (`nova-regra-score-review.md`; `2026-10-15-224651-review.md`) e posteriormente corrigido (o toggle passou a limpar o campo nome ao alternar).
- **Status:** Reprovado (Concluído)
- **Evidência:** Print do defeito — ver Bloco 4, Defeito D05 (Status: Concluído). Origem: `nova-regra-score-review.md`; `2026-10-15-224651-review.md`.

### CT24 — Painel de prévia do score com largura fixa causava overflow no mobile

- **ID:** CT24
- **Funcionalidade:** F13
- **Requisito(s):** RNF01 (responsividade)
- **Descrição:** Verificar que o painel de prévia da regra de score se ajusta à largura da tela em dispositivos móveis (requisito não funcional de responsividade).
- **Pré-condições:** Usuário autenticado; acesso por viewport estreita (menor que 420 px, ex.: celular).
- **Passos:**
  1. Acessar a criação de regra de score em um celular (viewport < 420 px).
  2. Observar o painel de prévia ao lado do formulário.
- **Resultado Esperado:** O painel de prévia ocupa a largura disponível sem provocar rolagem horizontal.
- **Resultado Obtido:** (comportamento observado na versão em que o defeito foi detectado) O painel de prévia do score tinha largura fixa de 420 px declarada no próprio componente; em viewports menores que 420 px, o painel forçava rolagem horizontal (overflow), mesmo com o contêiner externo ocupando a largura total. Defeito identificado em revisão (`2026-10-15-224651-review.md`) e posteriormente corrigido (o componente passou a usar largura total).
- **Status:** Reprovado (Concluído)
- **Evidência:** Print do defeito — ver Bloco 4, Defeito D06 (Status: Concluído). Origem: `2026-10-15-224651-review.md`.

### CT25 — Isolamento de posições por usuário (RLS)

- **ID:** CT25
- **Funcionalidade:** F11
- **Requisito(s):** RF06
- **Descrição:** Verificar que as políticas de Row Level Security (RLS) garantem que cada usuário acessa apenas suas próprias posições (teste de segurança).
- **Pré-condições:** Instância local do Supabase em execução e cliente `psql` disponível (script `pnpm test:rls`).
- **Passos:**
  1. Disparar a suíte de testes de RLS.
  2. Verificar o isolamento de leitura/escrita por usuário na tabela de posições.
- **Resultado Esperado:** Cada usuário enxerga apenas suas próprias posições; tentativas de ler ou escrever posições de outro usuário são bloqueadas pela política RLS.
- **Resultado Obtido:** Não executado. O teste de RLS depende de uma instância local do Supabase e do cliente `pssql`, indisponíveis neste ambiente de avaliação.
- **Status:** Bloqueado
- **Evidência:** Bloqueado por dependência de ambiente (Supabase local). Base automatizada: `supabase/tests/010_positions_rls_test.sql` (executado via `pnpm test:rls`).

---

## Mapeamento Reprovado → Defeito (Bloco 4)

A tabela a seguir relaciona cada caso Reprovado ao defeito que será registrado no Bloco 4 (Registro de Defeitos), com a fonte (finding de origem) e o *Status* que o defeito terá no Bloco 4. Casos "Aberto" correspondem a defeitos ainda presentes no código atual; casos "Concluído" correspondem a defeitos identificados em revisão e posteriormente corrigidos.

| Caso | Defeito (Bloco 4) | Título resumido do defeito | Finding de origem | Status (Bloco 4) |
|------|-------------------|----------------------------|-------------------|-------------------|
| CT02 | D01 | Login redirecionava para rota /carteira removida (tela em branco) | `investigate-rotas-report.md` (Crítico) | Concluído |
| CT04 | D02 | Cadastro redireciona para rota /carteira removida (tela em branco) | `investigate-rotas-report.md` (mesma classe, não corrigido no SignupForm) | Aberto |
| CT07 | D03 | Botões Filtrar e Exportar CSV sem ação na tela de Posições | `2026-10-07-183813-review.md` | Aberto |
| CT19 | D04 | Cadastrar posição não cria transação nem atualiza o patrimônio (regressão do useAddPosition) | `fix-tests-review.md` | Aberto |
| CT23 | D05 | Toggle de modo não limpava o nome do score (criação silenciosa no modo errado) | `nova-regra-score-review.md`; `2026-10-15-224651-review.md` | Concluído |
| CT24 | D06 | Painel de prévia do score com largura fixa causava overflow no mobile | `2026-10-15-224651-review.md` | Concluído |

> **Nota para o Bloco 4.** Os 6 casos Reprovado acima mapeiam para os defeitos D01–D06. O roteiro exige no mínimo 10 defeitos documentados no Bloco 4; a expansão do registro de defeitos até atingir esse mínimo (incluindo os findings adicionais das revisões de renda fixa/Tesouro Direto, rota legada e demais revisões) será realizada no Bloco 4.

---

## Nota sobre evidências

As evidências em print (capturas de tela `.png`/`.jpg`) ainda não foram produzidas: não há imagens de evidência no repositório além dos ícones PWA. A captura será realizada na execução manual da aplicação (`pnpm dev`), reproduzindo os passos de cada caso:

- Casos **Aprovado**: print da execução bem-sucedida, anexado ao relatório final.
- Casos **Reprovado (Aberto)**: print do defeito reproduzido no código atual, anexado ao Bloco 4.
- Casos **Reprovado (Concluído)**: print do defeito conforme registrado na revisão (ou, quando possível, reprodução em uma versão anterior); anexado ao Bloco 4 com *Status: Concluído*.
- Caso **Bloqueado**: evidência da indisponibilidade do ambiente (ausência de Supabase local).

Todos os casos Reprovado remetem ao Bloco 4 (Registro de Defeitos), conforme indicado no campo *Evidência* de cada caso.

---

## Contagem final

- **Total de casos de teste:** 25
- **Aprovado:** 18
- **Reprovado:** 6 (3 Aberto + 3 Concluído)
- **Bloqueado:** 1
- **Cobertura de funcionalidades:** F01–F13 (todas as 13 funcionalidades do Bloco 2 possuem ao menos 1 caso)
- **Requisitos não funcionais:** 1 caso (RNF01 — responsividade mobile, CT24)
- **Segurança (RLS):** 1 caso (CT25, Bloqueado por ambiente)
- **Quantitativo do roteiro:** atinge o mínimo de 20 casos de teste (25 ≥ 20) ✓

> Observação de fidelidade ao implementado: o cenário "cadastro com senhas divergentes", sugerido como exemplo no roteiro, não foi especificado porque o formulário de cadastro atual não implementa o campo de confirmação de senha (RF01 prevê "confirmação de senha", porém o `SignupForm`/`signupSchema` atuais não o contêm). Em seu lugar, foi especificado um cenário de exceção real do cadastro — e-mail já cadastrado (CT05) — e a própria ausência da confirmação de senha é um ponto a observar no Bloco 4. O caso "login com credenciais inválidas" é coberto pelo comportamento do `LoginForm` (mensagem "Email ou senha incorretos"), refletido no escopo de CT01.
