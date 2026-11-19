# 5ª bateria e ferramentas da carteira — homologação local

Data: 19/11/2026. Branch: `codex/test-battery-five`, base main/PR177.
Fonte: `Valora_-_5a_Bateria_de_Testes_pdf.pdf`, execução de 18/11/2026. O documento foi tratado como evidência de testes, não como instrução de operação.

## Correções do relatório

- DEF-01/CT07: quantidades inteiras para compras e vendas em `stock_br`, `fii`, `bdr`, `etf_br`. Um lote fracionário da B3 continua sendo formado por unidades inteiras (1 a 99 ações), não por frações de uma ação.
- Validação por classe do catálogo em AddTransactionModal, QuickTransactionModal, AddPositionForm, EditTransactionButton e prévia do CSV. A prévia usa o texto decimal para não perder casas ao converter números grandes para JavaScript.
- Triggers protegem escritas de transações e posições de abertura diretas. Posições recalculadas por eventos corporativos não recebem proibição genérica de frações; recebimentos e quantidades de direito também não são limitados indevidamente.
- Sem UPDATE de lançamentos antigos, exclusão ou arredondamento durante a migration. Edição de uma operação antiga inválida exige corrigir sua quantidade.
- Frações americanas, REITs, ETFs US, cripto e Tesouro continuam permitidas. A regra independe de ter 40 ativos ou uma carteira específica.
- DEF-02/CT08: grid de atalhos com coluna única abaixo de 1280 px, três colunas acima; `min-width: 0` nos cards e texto com quebra.
- Achado adicional: `/boas-vindas` usa `Boas-vindas | Valora`.
- Gráfico de Análise: cada barra identifica mês/ano e BRL com dois decimais. Mouse, foco, Enter/Espaço, clique/toque e Escape suportados. O valor aparece dentro do card, sem posicionamento no canto da tela.

## FUN-01 a FUN-05

Acesso: Carteiras → Planejamento, exportação e saúde dos dados.

1. Planejador: usa metas persistidas, avaliação completa, valor disponível e mínimo por classe. Distribui em centavos pelos déficits positivos após o aporte. Valores abaixo do mínimo voltam ao caixa; não simula vendas nem envia ordens. Mínimo é por classe, não compra executável de um ativo específico.
2. Patrimônio: série diária existente, com período selecionável; saldo inicial + entradas − saídas + valorização/custos + câmbio = saldo final. Compras/aplicações e vendas/resgates são fluxos dos ativos, não depósitos bancários. Proventos e cupons ficam fora do saldo e são apresentados separadamente. Câmbio usa preço/quantidade anteriores em USD; interação preço × câmbio fica na valorização. Sem histórico suficiente, não calcula uma reconciliação parcial como total. Diferenças de centavos de apresentação têm ajuste explícito.
3. Exportação: RPC `export_owned_wallet` SECURITY INVOKER, propriedade explícita e RLS preservadas. Um SELECT obtém fotografia consistente de carteira, metas, todas as posições, transações, lotes de importação, renda fixa/eventos, recebimentos/importações e catálogo de ativos/moedas/fontes. Não usa limite de 1.000 linhas no cliente. JSON versão 1, com IDs originais e números financeiros como texto decimal exato, evitando arredondamento do JavaScript; dados públicos de preços/fundamentos e credenciais não são incluídos. Valores de renda fixa são BRL conforme o cadastro atual. Prévia valida versão, estrutura, datas, vínculos, metadados e IDs duplicados; compara IDs com a carteira selecionada. Não importa, mescla ou restaura automaticamente e não tenta deduplicar operações legítimas iguais por valor/data.
4. Meta de renda: persistida por carteira em BRL/mês. Média de 12 meses apenas de recebimentos confirmados e cupons registrados; estimativas públicas ficam fora. Meses sem extrato contam como zero e isso é informado. Projeção reaproveita `passiveIncomeGoal`, taxa anual informada e sua equivalente mensal, inflação zero, sem impostos/tarifas ou garantia de pagamentos.
5. Saúde: origem/data das cotações, fonte/data/fallback cambial, competência e fonte dos fundamentos, lacunas históricas e atualização/avaliação dos títulos de renda fixa. Distingue fim de semana de defasagem em dias úteis; cripto usa dias corridos. Não presume calendário completo de feriados. Referência fundamentalista acima de 180 dias é identificada. O botão consulta novamente os dados salvos, sem prometer nova publicação do fornecedor.

## Verificações

- Regressão completa final: 220 arquivos, 1.533 testes aprovados (245,62 s, 8 workers). Cobre gráfico, quantidade por classe, exceção de direitos/proventos no CSV, título, cálculo patrimonial, planejador, exportação decimal exata e meta.
- Build TypeScript/Vite/PWA aprovado: 143 arquivos em cache, `valora-static-1b8bf8c41ded`. Lint dos arquivos alterados e varredura de segredos aprovados.
- Banco exclusivamente `supabase_db_valora-provider-qa`: novas migrations aplicadas. `planning_and_whole_units.sql`, `import_batches.sql` e `edit_owned_transaction.sql` aprovados com fixtures e ROLLBACK.
- SQL cobre quatro classes B3, venda e edição fracionárias, rejeição integral do CSV, fração americana positiva, meta negativa, snapshot exportado, ausência de EXECUTE para anon e isolamento de exportação/meta entre dois usuários.
- Teste antigo de importação decimal usa agora ativo US para continuar verificando 8 casas legítimas; rejeição B3 tem teste específico. O teste de edição foi atualizado para o snapshot explícito da RPC e para custos incluídos no preço médio, comportamento já adotado antes desta entrega.
- Navegador integrado autenticado, sem gravações financeiras: gráfico mostra o valor exato do mês selecionado; simulação com aporte hipotético conserva o valor disponível pelas metas existentes; reconciliação e painel de saúde carregados com dados reais.
- Nova área de planejamento conferida a 390 px, sem overflow horizontal na página (tabela tem rolagem local).
- Atalhos do Início: 953, 1024 e 1366 px sem overflow horizontal e três atalhos dentro da largura. A 1024 px a borda direita dos atalhos ficou em 969 px; a 1366 px o terceiro termina em 1311 px.

## Publicação

Ainda não publicado. Aplicar primeiro as migrations:

- `20261119161140_whole_brazilian_trade_units.sql`
- `20261119161323_wallet_planning_and_export.sql`

A meta persistente e a exportação dependem da nova coluna/RPC. Foram verificadas por testes de componente e SQL no QA; não foram gravadas na carteira real para testar esta entrega. Depois do merge e rollout, repetir a conferência de produção. A homologação física Android desta nova área não foi executada nesta rodada.

Referência de unidades: https://borainvestir.b3.com.br/tipos-de-investimentos/renda-variavel/acoes/o-que-e-o-mercado-fracionario-como-investir-nele/


## Correção do replay da PR178

O replay limpo exige `transactions.price > 0`. A fixture de direito fracionário usava preço zero, enquanto o QA existente aceitava preço não negativo. A fixture passou a usar preço positivo, mantendo a quantidade fracionária que é o objeto do teste. O SQL foi repetido no QA sob uma constraint temporária `price > 0`, dentro de transação revertida, sem flexibilizar a regra do produto. A confirmação definitiva ocorre no replay limpo do GitHub para o novo commit.
