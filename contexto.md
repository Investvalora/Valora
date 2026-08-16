# Relatório Completo do Sistema Valora

## 1. Introdução

O Valora é uma interface web para acompanhamento de carteira de investimentos, com foco em visibilidade, confiabilidade e leitura rápida dos principais indicadores. O sistema organiza, em um único painel, dados de cadastro, acesso, carteira, patrimônio, proventos e rentabilidade, permitindo ao usuário navegar entre visões complementares do seu patrimônio.

## 2. Objetivo do sistema

O objetivo do Valora é centralizar informações financeiras relevantes e apresentar uma experiência visual moderna para apoio à decisão do investidor. A proposta principal é reunir posições, desempenho, distribuição de ativos, histórico de proventos e evolução patrimonial em um fluxo único e consistente.

## 3. Escopo funcional

O projeto contempla as seguintes telas e funções:

- Cadastro de usuário.
- Login de acesso.
- Painel de carteira com consolidação por ativos e alertas.
- Visão de patrimônio com evolução temporal e composição por classe.
- Visão de proventos com histórico mensal e detalhamento por ativo.
- Visão de rentabilidade com comparação contra benchmarks.

## 4. Levantamento de requisitos

### 4.1 Requisitos funcionais

RF01 - Permitir que o usuário crie uma conta informando nome, celular, e-mail, senha e confirmação de senha.

RF02 - Permitir autenticação por e-mail e senha na tela de login.

RF03 - Direcionar o usuário autenticado para o painel de carteira.

RF04 - Exibir resumo consolidado da carteira com patrimônio total, lucro ou prejuízo, benchmark e score médio.

RF05 - Exibir alertas de inconsistências, como preço médio fora do esperado e cotações pendentes.

RF06 - Listar ativos da carteira com quantidade, preço médio, cotação, rentabilidade, score e preço-teto.

RF07 - Permitir agrupamento de ativos por classe, como ações, FIIs, ETFs e stocks.

RF08 - Exibir consolidação da carteira por tipo de ativo.

RF09 - Exibir evolução do patrimônio ao longo do tempo.

RF10 - Apresentar consolidação patrimonial por tipo e exposição internacional.

RF11 - Exibir histórico mensal de proventos recebidos e previstos.

RF12 - Detalhar proventos por ativo, com último pagamento, valor recebido, yield e provento por ação.

RF13 - Exibir rentabilidade total e comparação com CDI, IBOV e IPCA.

RF14 - Exibir rentabilidade por ativo, separando proventos e variação de preço.

RF15 - Permitir a navegação entre as visões principais por menu superior e lateral.

RF16 - Oferecer ações de apoio, como exportar relatório, sincronizar dados, revisar inconsistências e gerar insights.

### 4.2 Requisitos não funcionais

RNF01 - Interface responsiva, adaptando-se a telas de desktop e dispositivos menores.

RNF02 - Design visual escuro, com contraste adequado e foco em leitura de dados.

RNF03 - Uso de componentes reutilizáveis e consistentes entre as telas.

RNF04 - Navegação rápida entre páginas, com transições simples e sem complexidade desnecessária.

RNF05 - Apresentação de informações financeiras em formato sintético e fácil de interpretar.

RNF06 - Acessibilidade básica com textos descritivos, estados visuais e uso de labels nos formulários.

## 5. Descrição das telas

### 5.1 Tela de cadastro

A tela de cadastro apresenta o formulário de criação de conta com nome completo, celular, e-mail, senha e confirmação de senha. A interface explica o fluxo em três passos e destaca os benefícios do acesso rápido ao painel.

Elementos principais:

- Formulário de cadastro.
- Link para login.
- Botão de criação de conta.
- Mensagens de apoio e reforço de segurança.

### 5.2 Tela de login

A tela de login oferece autenticação por e-mail e senha, opção de manter conectado e acesso ao fluxo de cadastro. A parte informativa da página reforça a ideia de painel de controle, com métricas e indicações de monitoramento.

Elementos principais:

- Formulário de login.
- Checkbox de permanência de sessão.
- Link de recuperação de senha.
- Botão para entrar e abrir a carteira.

### 5.3 Tela de carteira

A tela de carteira é o painel central do sistema. Ela consolida patrimônio total, lucro ou prejuízo, benchmark, score médio e alertas de precificação. A listagem de ativos é organizada por grupos, com suporte a ações, FIIs, ETFs e stocks.

Dados exibidos na tela:

- Patrimônio total.
- Lucro ou prejuízo total.
- Benchmark do período.
- Score médio da carteira.
- Alertas de preço médio.
- Tabela de ativos com preço médio, cotação, rentabilidade, score e preço-teto.
- Painel lateral com divisão por tipo de ativo.

### 5.4 Tela de patrimônio

A tela de patrimônio mostra o patrimônio total consolidado, a exposição ao exterior, a liquidez imediata e o número de classes ativas. Também exibe gráfico de evolução patrimonial, consolidação por tipo e destaques por classe.

Dados exibidos na tela:

- Evolução do patrimônio em 12 meses.
- Máximo drawdown.
- Aportes no período.
- Ganho patrimonial acumulado.
- Consolidação por classes, como ações, tesouro, FIIs, stocks, ETFs internacionais e criptos.
- Destaques de posições relevantes.

### 5.5 Tela de proventos

A tela de proventos organiza dividendos, juros sobre capital próprio, rendimentos de FIIs e proventos futuros. Ela traz resumo geral, evolução mensal, histórico por mês e detalhamento por ativo.

Dados exibidos na tela:

- Total de proventos.
- Proventos dos últimos 12 meses.
- Média mensal.
- Yield on cost.
- Evolução mensal dos recebimentos.
- Histórico mensal com total, recebidos, previstos, eventos e status.
- Lista de ativos pagadores com último pagamento e valor recebido.

### 5.6 Tela de rentabilidade

A tela de rentabilidade compara o resultado da carteira com CDI, IBOV e IPCA. A página destaca rentabilidade total, performance dos últimos 12 meses, último mês e volatilidade, além de uma tabela com contribuição por ativo.

Dados exibidos na tela:

- Rentabilidade total desde o início.
- Rentabilidade dos últimos 12 meses.
- Rentabilidade do último mês.
- Volatilidade e beta.
- Gráfico comparativo com benchmarks.
- Rentabilidade por ativo com peso, proventos, variação de preço e contribuição.
- Alertas de performance e observatório do mercado.

## 6. Fluxo de navegação

O fluxo principal observado é o seguinte:

1. O usuário acessa a tela de login ou cadastro.
2. Após autenticar ou criar a conta, é direcionado para a carteira.
3. A partir da carteira, pode navegar para patrimônio, proventos e rentabilidade.
4. O menu lateral complementa o menu superior com atalhos analíticos e configurações.

## 7. Regras de negócio observadas

- O cadastro exige confirmação de senha antes de permitir a continuidade.
- O login usa e-mail e senha como credenciais básicas de entrada.
- A carteira prioriza notificações de inconsistências de precificação.
- Ativos com comportamento fora do esperado recebem destaque visual.
- Os indicadores financeiros são exibidos em formato consolidado, não bruto.
- O sistema trabalha com visões complementares por classe, período e benchmark.

## 8. Estrutura visual e experiência de uso

A interface adota linguagem visual escura, com gradientes sutis, cards bem definidos e hierarquia tipográfica forte. O layout privilegia leitura rápida de números, comparação entre métricas e acesso imediato às páginas analíticas.

Características de UX observadas:

- Navegação clara entre módulos.
- Indicadores resumidos no topo das páginas.
- Tabelas estruturadas com status visuais.
- Uso de cores para sinalizar ganhos, perdas, alertas e estabilidade.
- Comportamento responsivo para telas menores.

## 9. Conclusão

O Valora se apresenta como uma solução de acompanhamento financeiro com foco em consolidação de carteira e visualização analítica. O conjunto de telas cobre o ciclo principal do usuário, desde o acesso inicial até a consulta de patrimônio, proventos e rentabilidade.

Como complemento ao relatório original, este documento adiciona a descrição consolidada dos requisitos, das telas e das regras de negócio observadas nas interfaces implementadas.