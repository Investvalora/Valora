# Epic 2 Context: Gestão Completa de Carteira

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Entregar a carteira como produto utilizável: o usuário cadastra posições manualmente ou importa transações via CSV, vê a lista consolidada com valor de mercado, peso e a procedência de cada número, entende a diversificação por classe e a exposição internacional, recebe alertas de inconsistência nos próprios dados e exporta o que está na tela. É o épico que transforma a autenticação do Épico 1 em valor real e que produz a base de dados de mercado sobre a qual os Épicos 3 a 6 calculam patrimônio, proventos, rentabilidade, score e preço-teto.

## Stories

- Story 2.1a: Schema e Catálogo de Ativos
- Story 2.1b: Histórico de Preços de 12 Meses
- Story 2.2: Adicionar Posição Manual
- Story 2.3: Visualizar Lista de Posições com Rastreabilidade
- Story 2.4: Composição por Classe e Exposição Internacional
- Story 2.5: Importar Transações via CSV
- Story 2.6: Lista de Alertas, Badge e Geração On-Demand
- Story 2.7: Exportar Relatórios em CSV
- Story 2.8: Reimplementar Ingestão de Dados de Mercado

## Requirements & Constraints

**Posições.** Ticker precisa existir no catálogo — desconhecido não vira posição, informa "Ativo não encontrado" e oferece busca. Quantidade > 0, preço médio ≥ 0, `(user_id, ticker)` único com erro claro na duplicata. Posição existe validamente sem nenhuma transação.

**Importação CSV.** Colunas `data, ticker, tipo, quantidade, preço, corretagem`. Fluxo obrigatório: validar → preview → correção inline → confirmar. Erro de formato aponta linha, coluna, problema e exemplo esperado; ticker desconhecido marca a linha para corrigir ou pular. Limite de 1000 transações, com a contagem de linhas verificada **antes** do parse completo; preview de 500 linhas em <2s. O arquivo típico vem do Excel brasileiro: converter ISO-8859-1, remover BOM UTF-8, aceitar separador `;` com decimal `,`. Quantidade zero é inválida em compra e válida em venda.

**Lista de posições.** Ticker, nome, quantidade, preço médio, cotação atual, valor de mercado, peso relativo e variação % desde a aquisição. Ordenação padrão por peso decrescente; alternativas por ticker e variação.

**Rastreabilidade (transversal).** Toda cotação, dividendo e indicador exibido carrega ícone de info com fonte e data de atualização. Dado velho é sinalizado: >1 dia sinaliza cotação antiga na lista, >7 dias gera alerta, >90 dias marca fundamentals. Nunca interpolar dado faltante — mostrar lacuna honesta.

**Composição.** Classes: Ações BR, FIIs, BDRs, Stocks US, REITs, Cryptos. Exposição internacional = (BDR + stocks US + REITs + crypto) / patrimônio total. Total da carteira em destaque; tooltip por fatia com valor em R$ e ticker principal da classe.

**Alertas.** Três inconsistências no MVP: posição sem transações, dividendo esperado não recebido (>95 dias desde o último de ativo pagador), ativo sem cotação recente (>7 dias). Geração on-demand. Idempotência obrigatória: mesmo tipo + ticker + usuário não recria alerta enquanto o anterior está ativo. Lista cronológica com status `novo | lido | ignorado`, badge com contagem de `novo`, ações de marcar lido e ignorar. Sem notificação externa no MVP.

**Exportação.** CSV com as colunas da tabela exibida, até 1000 linhas em <2s. "Sincronizar dados" e "Gerar insights" respondem "Em breve".

**Performance.** 50 posições em ≤2s (p95); geração de alertas para 50 ativos em <5s; transição de tela <500ms. Queries limitadas a 50 posições no MVP.

**Segurança e acessibilidade.** RLS por `user_id = auth.uid()` em toda tabela de dado de usuário; service role key nunca em bundle frontend; Edge Function sensível exige JWT válido. Navegação por teclado, contraste WCAG 2.1 AA no tema dark, desktop otimizado e tablet/mobile funcionais.

## Technical Decisions

**RLS universal.** Toda tabela do schema `public` tem RLS habilitado, sem exceção. Dado de usuário → policy `user_id = auth.uid()`. Tabela de mercado (`assets`, `price_history`, `dividends`, `fundamentals`, `benchmarks`) → RLS ativo com policy `FOR SELECT TO authenticated USING (true)`, escrita só via service role, `anon` sem grant algum. Motivo: os default privileges do Supabase concedem escrita a `anon`/`authenticated` em toda tabela nova do `public`, e sem RLS esses grants viram escrita real. Ressalva: RLS **não** intercepta `TRUNCATE`.

**Posições independentes, transações opcionais.** Quando existem transações para um ticker do usuário, preço médio ponderado e quantidade líquida são recalculados **no servidor**. O recálculo precisa disparar também na remoção de transação — a posição pode voltar a não ter nenhuma, o que recria o alerta correspondente.

**Divisão cliente/servidor.** Cliente: somas, peso relativo, agrupamento por classe, exposição internacional, ordenação, filtros, formatação. Servidor: recálculo de preço médio, geração de alertas, validações complexas de importação.

**Cotação USD/BRL.** Primária BCB PTAX (oficial, sem chave nem quota, CORS verificado — fetch client-side viável). Cadeia: BCB → AwesomeAPI → última taxa em localStorage → R$ 5,00. `staleTime` 1h. PTAX publica só em dia útil: fim de semana e feriado consomem a última cotação da série, não são erro. Badge "taxa USD aproximada" no fallback.

**Modelo de dados.** `assets` tem `currency` (BRL|USD), `quote_provider`, `provider_symbol`, `active`; par de moedas não é ativo investível e não pertence a `assets`. `price_history` é único por `(ticker, date)`, com `source` por linha (`brapi | twelvedata | coingecko | b3_cotahist | synthetic`) e `adjusted_close`; ingestão idempotente por `ON CONFLICT (ticker, date)`.

**Estado da base de mercado.** Preços BR vêm do COTAHIST oficial da B3, com refresh agendado em dia útil. US/REIT e cripto ainda não têm refresh agendado — só carga manual, o que faz a flag de cotação antiga disparar legitimamente nessas classes. `adjusted_close = close` nos ativos BR: COTAHIST é preço bruto, e o ajuste por proventos depende do histórico de dividendos (Épico 3).

**Padrões de acesso.** Todo acesso a dados via hooks TanStack Query; services de módulo encapsulam o client Supabase; query keys `['dominio','recurso',...params]`; invalidar cache após mutation. Realtime apenas para alertas — dado alterado pelo próprio usuário se resolve com invalidação. Estado global em Zustand por módulo. Gráficos lazy-loaded. Edge Functions versionadas no repo com `verify_jwt` ativo; atenção: a anon key é JWT válido e público no bundle, então isso barra varredura anônima mas não quem leia o JS.

## UX & Interaction Patterns

Não existe artefato de UX no projeto; a referência são os protótipos HTML (`valora_carteira.html` e correlatos) e o design system compilado. Tema dark-only.

Carteira é a tela padrão pós-login. Menu lateral fixo com item ativo destacado e badge de alertas. Na Carteira convivem card de patrimônio total, card de composição com pizza, lista de posições e os alertas de inconsistência à vista. "Adicionar Posição" abre modal a partir da Carteira. A importação CSV é fluxo de duas etapas — upload com preview corrigível inline, depois confirmação — e ao concluir faz desaparecer os alertas de "posição sem transações" dos tickers importados.

## Cross-Story Dependencies

- **2.2** depende apenas do catálogo (2.1a, concluída) — está destravada e não espera as demais.
- **2.3 e 2.4** dependem do histórico de preços (2.1b) e de `assets.currency`/`type`; a conversão USD da 2.3 depende do hook de cotação do dólar.
- **2.5** é a única fonte de `transactions`, das quais dependem o alerta de "posição sem transações" (2.6) e os proventos do Épico 3; compartilha com a 2.2 a lógica de posição.
- **2.6** consome posições, transações e `price_history`; o alerta de dividendo não recebido só produz resultado com histórico de dividendos (Épico 3). Lista e badge são estendidos pelos alertas de valuation do Épico 6, que reutilizam o mesmo fluxo de geração.
- **2.7** define o padrão de exportação reaproveitado por Proventos (Épico 3) e Rentabilidade (Épico 4); **2.3** define o padrão de rastreabilidade reaproveitado pela tela de detalhe de ativo (Épico 6).
- **2.8** mantém o histórico atualizado; a pendência de `adjusted_close` nos ativos BR bloqueia o retorno total correto do Épico 4 até existir histórico de dividendos.
- As regras de classe de ativo e exposição internacional da 2.4 reaparecem nos cards do Épico 3 — devem viver em código compartilhado, não duplicadas.
