# Quatro melhorias da terceira semana

Implementação autorizada pelo responsável após os retestes da PR #106. O objetivo é completar S3-08 a S3-11, preservando cálculos, dados e funcionalidades existentes.

## Nome e títulos

O schema do perfil, já compartilhado com o cadastro desktop/móvel, exige ao menos uma letra Unicode. Os limites de 3 e 120 caracteres e a normalização de espaços são mantidos. A regra não limita o nome ao alfabeto latino, não remove números de nomes mistos e não reescreve cadastros existentes.

PageTitle acompanha useLocation no conjunto de rotas. Há títulos para páginas públicas, carteiras, ativos, desempenho, análise, regras e estratégias. O ticker é validado para o título dinâmico; escapes inválidos não quebram a página. Query string e identificadores pessoais não aparecem na aba. Nenhuma rota foi removida ou redirecionada por essa melhoria.

## Setores

Ativos > Composição ganha a opção Setor no desktop e no seletor móvel. Reutiliza os valores de mercado já derivados e o denominador da carteira filtrada. Classificação é consultada somente quando essa opção é aberta, com cache de 24 horas e nova tentativa em falha.

Fonte: [listagem pública da Brapi](https://brapi.dev/docs/acoes/list), tipos stock e bdr, paginação limitada e validada. Documentação consultada informa que esse endpoint não exige token. Conferência HTTP real retornou 200 e Access-Control-Allow-Origin: *, inclusive com Origin do Valora. Não são enviados tickers da carteira, user ID, wallet ID, chaves ou credenciais. Setores conhecidos são traduzidos; valores não reconhecidos são preservados como rótulos do provedor.

A cobertura inicial é de ações brasileiras e BDRs. Empresas estrangeiras/fundos sem fonte confiável ficam em Não classificado; ETFs, cripto e renda fixa ficam em Sem setor econômico. O total é preservado, sem inferir segmento de FII a partir de setor genérico. O grupo vazio ou indisponibilidade do provedor não altera as posições ou as opções de classe/ativo/exterior.

## IPCA

Comparação adicional em Desempenho > Rentabilidade e na tela legada, preservando o gráfico com CDI, IBOV e IFIX. Por ter periodicidade diferente, o card Carteira × IPCA usa apenas meses inteiros com dados comuns. Não acrescenta uma falsa série diária ao gráfico existente.

Fonte: [BCB/SGS 433](https://www3.bcb.gov.br/sgspub/consultarvalores/consultarValoresSeries.do?method=consultarSeries&series=433). Consulta paginada de macro_rates para series=ipca, filtrada antes do mês corrente. Essa base já é atualizada pelo sync-macro-rates existente; não foi necessário novo provedor, segredo, agendamento ou migration.

O início é um fechamento mensal comum à cobertura disponível. A carteira e o IPCA são normalizados a 100 nessa mesma data. As taxas mensais são compostas por produto, incluindo deflação. O mês inicial parcial é excluído; primeiro mês ausente ou lacuna da carteira interrompe a comparação. Sem meses completos em comum, aparece indisponibilidade em vez de inflação zero. Não se trata de rentabilidade real calculada nem projeção de inflação. A consulta de produção desta implementação tinha IPCA até setembro de 2026, portanto outubro não é inventado.

## Validação

- Regressão completa: 967 testes aprovados em 139 arquivos, zero falhas; 195,83 s. Log local output/melhorias-terceira-semana-regressao.log.
- Casos novos: letras Unicode e limites, navegação com título dinâmico, setores incompletos sem mudar os totais, paginação pública, filtro de fundos, normalização mensal, deflação, mês ausente, lacuna da carteira e ausência de IPCA no componente.
- Regressão preserva filtros de ativos, composição por classe/ativo/exterior, retorno histórico, meses fechados, modais e os testes anteriores do gesto/conta.
- TypeScript, lint dos arquivos afetados e build de produção/PWA aprovados na implementação. Nenhum dado real foi escrito.
- A ferramenta de navegador permanece indisponível nesta sessão; não foi declarada conferência visual autenticada. A publicação dessas melhorias depende da integração da branch pelo responsável.

O relatório semanal em PDF foi mantido como registro da rodada anterior. Novas validações não foram retroativamente atribuídas àquela entrega.
