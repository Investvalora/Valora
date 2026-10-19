# Bloco 2 — Levantamento das Funcionalidades

Este bloco identifica e descreve as funcionalidades do sistema Valora que serão submetidas a testes no Bloco 3 (Especificação e Execução dos Testes). O levantamento parte dos 10 protótipos de tela em `prototypes/` e dos 16 requisitos funcionais (RF01–RF16) e 6 requisitos não funcionais (RNF01–RNF06) formalizados em `contexto.md`, complementados pelos módulos de domínio implementados em `src/modules/`.

As funcionalidades são numeradas de F01 a F13: F01–F10 correspondem às telas/protótipos (acesso, cadastro e consultas) e F11–F13 correspondem às operações de manutenção (cadastro/alteração/exclusão) implementadas em serviços e hooks de domínio.

## Tabela principal de funcionalidades

Legenda do campo **Tipo**: Acesso (autenticação), Cadastro, Consulta, Alteração, Exclusão. Uma funcionalidade pode abranger mais de um tipo (ex.: Cadastro/Alteração/Exclusão).

| ID | Funcionalidade | Descrição | Tela/Protótipo | RF associado | Tipo |
|----|----------------|-----------|---------------|--------------|-----|
| F01 | Login | Autenticação por e-mail e senha na tela de login, com opção de manter conectado e redirecionamento do usuário autenticado para o painel de carteira. | `prototypes/valor_login.html` | RF02, RF03 | Acesso |
| F02 | Cadastro de Usuário | Criação de conta informando nome, celular, e-mail, senha e confirmação de senha. | `prototypes/valor_cadastro.html` | RF01 | Cadastro |
| F03 | Consulta de Carteira | Painel central com patrimônio total, lucro/prejuízo, benchmark, score médio e alertas de precificação; listagem de ativos com preço médio, cotação, rentabilidade, score e preço-teto, agrupados por classe (ações, FIIs, ETFs, stocks) e consolidados por tipo. | `prototypes/valor_carteira.html` | RF04, RF05, RF06, RF07, RF08, RF15 | Consulta |
| F04 | Consulta de Patrimônio | Evolução do patrimônio ao longo do tempo (12 meses), máximo drawdown, aportes e ganho acumulado, com consolidação por tipo de ativo e exposição internacional. | `prototypes/valor_patrimonio.html` | RF09, RF10, RF15 | Consulta |
| F05 | Consulta de Proventos | Histórico mensal de proventos recebidos e previstos, com resumo geral, evolução mensal e detalhamento por ativo (último pagamento, valor recebido, yield e provento por ação). | `prototypes/valor_proventos.html` | RF11, RF12, RF15 | Consulta |
| F06 | Consulta de Rentabilidade | Comparação da rentabilidade da carteira com CDI, IBOV e IPCA, com rentabilidade total, últimos 12 meses, último mês, volatilidade/beta e contribuição por ativo. | `prototypes/valor_rentabilidade.html` | RF13, RF14, RF15 | Consulta |
| F07 | Score Fundamentalista | Visualização do score Valora de um ativo, com visão geral, pesos por categoria e breakdown por categoria. | `prototypes/valor_score.html` | RF04, RF06 | Consulta |
| F08 | Preço-teto / Valuation | Cálculo e prévia do preço-teto de um ativo conforme método de valuation, com editor de estratégia, prévia do resultado e explicação do método. | `prototypes/valor_preco_teto.html` | RF06 | Consulta |
| F09 | Estratégias de Preço-teto | Editor e biblioteca de estratégias de preço-teto (parâmetros Bazin e Graham), permitindo criar/ajustar estratégias e consultar a prévia do resultado. | `prototypes/valor_estrategias.html` | RF16 | Cadastro/Alteração |
| F10 | Detalhe de Ativo | Drill-down de um ativo individual consolidando preço e gráfico, score fundamentalista, principais múltiplos e preço-teto. | `prototypes/valor_ativo.html` | RF06, RF12, RF14 | Consulta |
| F11 | Manutenção de Posições da Carteira | Cadastro, alteração e exclusão de posições/ativos da carteira (via `src/modules/portfolio/services/positionService.ts`), alimentando a consolidação exibida na tela de carteira. | `prototypes/valor_carteira.html` | RF04, RF06, RF08 | Cadastro/Alteração/Exclusão |
| F12 | Manutenção de Alertas | Cadastro, alteração e exclusão de alertas de inconsistências (preço médio fora do esperado, cotações pendentes), via `src/modules/alerts/services/alertsService.ts`. | `prototypes/valor_carteira.html` | RF05 | Cadastro/Alteração/Exclusão |
| F13 | Manutenção de Regras de Score | Cadastro, alteração e exclusão de regras/critérios e pesos do score (via `src/modules/score/hooks/useScoreRules.ts`), correspondente ao editor de critérios da tela de score. | `prototypes/valor_score.html` | RF04, RF06 | Cadastro/Alteração/Exclusão |

## Rastreabilidade: Requisitos Funcionais → Funcionalidades

A tabela abaixo mapeia cada requisito funcional (RF01–RF16) de `contexto.md` às funcionalidades (F0x) que o atendem, garantindo rastreabilidade explícita. As descrições são transcritas da fonte canônica (`contexto.md` §4.1).

| Requisito | Descrição (contexto.md) | Funcionalidade(s) |
|-----------|-------------------------|---------------------|
| RF01 | Permitir que o usuário crie uma conta informando nome, celular, e-mail, senha e confirmação de senha. | F02 |
| RF02 | Permitir autenticação por e-mail e senha na tela de login. | F01 |
| RF03 | Direcionar o usuário autenticado para o painel de carteira. | F01 |
| RF04 | Exibir resumo consolidado da carteira com patrimônio total, lucro ou prejuízo, benchmark e score médio. | F03, F07, F13 |
| RF05 | Exibir alertas de inconsistências, como preço médio fora do esperado e cotações pendentes. | F03, F12 |
| RF06 | Listar ativos da carteira com quantidade, preço médio, cotação, rentabilidade, score e preço-teto. | F03, F07, F08, F10, F13 |
| RF07 | Permitir agrupamento de ativos por classe, como ações, FIIs, ETFs e stocks. | F03 |
| RF08 | Exibir consolidação da carteira por tipo de ativo. | F03, F11 |
| RF09 | Exibir evolução do patrimônio ao longo do tempo. | F04 |
| RF10 | Apresentar consolidação patrimonial por tipo e exposição internacional. | F04 |
| RF11 | Exibir histórico mensal de proventos recebidos e previstos. | F05 |
| RF12 | Detalhar proventos por ativo, com último pagamento, valor recebido, yield e provento por ação. | F05, F10 |
| RF13 | Exibir rentabilidade total e comparação com CDI, IBOV e IPCA. | F06 |
| RF14 | Exibir rentabilidade por ativo, separando proventos e variação de preço. | F06, F10 |
| RF15 | Permitir a navegação entre as visões principais por menu superior e lateral. | F03, F04, F05, F06 |
| RF16 | Oferecer ações de apoio, como exportar relatório, sincronizar dados, revisar inconsistências e gerar insights. | F09 |

Os requisitos não funcionais RNF01–RNF06 (responsividade, design escuro, componentes reutilizáveis, navegação rápida, síntese de informações e acessibilidade básica) são transversais a todas as funcionalidades e serão avaliados qualitativamente no Bloco 6 (Avaliação da Qualidade do Sistema).

## Notas explicativas

- **Funcionalidades de manutenção (F11–F13):** os RF01–RF16 formalizam majoritariamente o lado de _consulta_ (RF04–RF14, verbos "Exibir"/"Listar"/"Apresentar"). As operações de _cadastro/alteração/exclusão_ existem como serviços e hooks implementados em `src/modules/` (`positionService.ts`, `alertsService.ts`, `useScoreRules.ts`) e estão associadas aos RFs de consulta cujos dados elas alimentam (ex.: a manutenção de posições sustenta o que RF04/RF06/RF08 exibem).
- **Estratégias de Preço-teto (F08/F09):** os protótipos `valor_preco_teto.html`, `valor_estrategias.html` (e a variante `valor_estrategias (1).html`) representam a mesma funcionalidade "Estratégias de Preço-teto". F08 enfatiza a prévia/valuation (RF06, "preço-teto") e F09 o editor/biblioteca de estratégias (RF16, via a cláusula "gerar insights").
- **Navegação e ações de apoio (RF15/RF16):** são requisitos transversais. RF15 (navegação por menu) sustenta a passagem entre F03–F06; RF16 (ações de apoio, inclusive "gerar insights") vincula-se a F09.

## Cobertura mínima do roteiro e recomendação para o Bloco 3

O exemplo mínimo do roteiro (Login, Cadastro, Consulta, Alteração e Exclusão) é totalmente coberto por esta tabela:

- **Login/Acesso:** F01.
- **Cadastro:** F02; e o lado de cadastro de F09, F11, F12, F13.
- **Consulta:** F03, F04, F05, F06, F07, F08, F10.
- **Alteração/Exclusão:** F09, F11, F12, F13.

**Recomendação para o Bloco 3 — Especificação e Execução dos Testes:** elaborar casos de teste que cubram todas as 10 funcionalidades centrais (F01–F10) e as 3 operações de manutenção (F11–F13), contemplando os caminhos felizes e os fluxos de exceção (ex.: login com credenciais inválidas, cadastro com senhas divergentes, cadastro/alteração de posição com dados inconsistentes, exclusão de regra de score em uso). Isso atende o quantitativo mínimo do roteiro (≥ 20 casos de teste) e garante representatividade entre consulta e CRUD. Sugere-se ainda que cada caso de teste faça referência explícita ao ID da funcionalidade (F0x) e ao(s) RF(s) associado(s), mantendo a rastreabilidade iniciada neste bloco.
