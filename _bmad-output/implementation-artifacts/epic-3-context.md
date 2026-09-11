# Epic 3 Context: Análise de Patrimônio e Proventos

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Permitir que usuários autenticados acompanhem a evolução diária do patrimônio, entendam a composição e a exposição internacional da carteira e analisem os proventos recebidos por período e ativo. O épico transforma posições, preços históricos, transações e dados de dividendos em visões agregadas, rastreáveis e úteis para avaliar crescimento e geração de renda.

## Stories

- Story 3.1: Seed de Dividendos e Indicadores Fundamentalistas
- Story 3.2: Tela Patrimônio — Evolução, Composição e Exposição
- Story 3.3: Tela Proventos — Timeline Mensal e Tabela por Ativo

## Requirements & Constraints

- O patrimônio diário é a soma de cotação do dia multiplicada pela quantidade de cada posição; períodos disponíveis: 1M, 3M, 6M, 1A e Tudo.
- A composição deve cobrir ações BR, FIIs, BDRs, stocks US, REITs e criptos. Exposição internacional é o valor de BDRs, stocks US, REITs e criptos dividido pelo patrimônio total.
- Dados históricos incompletos devem aparecer como lacuna ou linha pontilhada; não interpolar valores ausentes.
- Proventos devem ser agrupáveis por mês e detalhados por ticker, tipo, data COM, data de pagamento, valor por cota, quantidade e valor total. A tabela precisa permitir ordenação por data, valor e ticker, além de filtros por ticker e tipo.
- O total de proventos do período deve ficar destacado e a exportação CSV deve seguir o padrão da Carteira.
- No MVP, dividendos e fundamentals são dados trimestrais simulados, marcados com `source = 'seed'`; a ausência de dividendos no plano gratuito da brapi não deve ser tratada como bloqueio.
- O gráfico de patrimônio deve carregar até 365 pontos em menos de 3s; o histórico de proventos deve carregar até 500 registros em menos de 2s.
- Proventos futuros não entram na visualização e valores de provento iguais a zero devem ser filtrados.

## Technical Decisions

- O produto usa monolito modular. A lógica fica nos módulos de domínio, com `wealth` para patrimônio, `dividends` para proventos e serviços/hooks próprios; componentes e utilitários compartilhados ficam em `src/shared/`.
- Todo acesso a dados deve passar por services Supabase encapsulados em hooks TanStack Query, usando chaves estruturadas por domínio e recurso. Mutations devem invalidar as queries relacionadas.
- Cálculos apresentacionais derivados de dados já carregados, como soma do patrimônio, agrupamento por classe, pesos relativos, filtros e ordenação, são client-side. A camada server-side permanece responsável por lógica de negócio persistida ou complexa.
- Gráficos usam Recharts e devem ser lazy-loaded. Dados de baixa frequência, como dividends e fundamentals, podem usar `staleTime` de aproximadamente 5 minutos; queries devem usar índices por ticker e data.
- As tabelas de mercado `assets`, `price_history`, `dividends`, `fundamentals` e `benchmarks` têm RLS habilitado, leitura para usuários autenticados e escrita somente por service role. Dados devem preservar `source` e `updated_at` quando aplicável.
- `price_history` deve fornecer cotações diárias e, quando disponível, `adjusted_close`; a composição internacional depende também da moeda e do tipo correto do ativo. A taxa USD/BRL usa a cadeia BCB PTAX, fallback AwesomeAPI, localStorage e, por fim, R$ 5,00 aproximados.

## UX & Interaction Patterns

- As telas seguem a navegação lateral fixa do produto e tema dark-only, usando os protótipos de Patrimônio e Proventos como referência visual.
- Patrimônio oferece seletor de período, gráfico de linha, cards de composição e exposição internacional. Tooltips exibem valor absoluto em reais e o ticker principal da classe.
- Proventos oferece timeline/gráfico de barras mensal, seletor de período 6M/1A/Tudo, tabela filtrável e ordenável, destaque do total e ação de exportar CSV.
- Estados de dados ausentes devem comunicar a lacuna honestamente, sem apresentar uma série contínua artificial.

## Cross-Story Dependencies

- O épico depende do catálogo de ativos, posições e `price_history` fornecidos pela Gestão de Carteira e pelo seed de mercado. Sem posições e preços históricos, Patrimônio não consegue calcular a evolução.
- Story 3.1 fornece os dados de `dividends` necessários à visualização de proventos e aos cálculos posteriores; `transactions` também é fonte dos proventos efetivamente recebidos.
- A classificação de ativos e a taxa de câmbio devem permanecer consistentes com Carteira, pois composição e exposição internacional reutilizam essas regras.