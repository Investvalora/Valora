# Indicadores, simulações e aceite operacional — 19/11/2026

## Operação: critérios conferidos em produção, sem escrita financeira

- Disparador independente: 96 registros nas 24 horas consultadas, todos `accepted`, resposta GitHub 204. Maior intervalo observado de 902,31 s (15 min 2,31 s). `accepted` confirma o pedido, não o término do workflow.
- Término conferido separadamente no GitHub: seis execuções `workflow_dispatch`, de 18:49 a 20:04 UTC, todas aprovadas e espaçadas em 15 minutos. Última: [44604794288](https://github.com/Investvalora/Valora/actions/runs/44604794288).
- Filas primária, SEC, Alpha e Marketstack: zero tarefas **elegíveis** vencidas; nenhuma primeira tentativa pendente nos fornecedores. Contadores brutos agendados e políticas de não pagamento continuam separados.
- Alpha: seis chaves disponíveis; 14 requisições no dia, 106 reservas disponíveis pelo pool e 146 no teto agregado. Uso atual concentrado em uma chave não é falha de rodízio: nenhuma precisou atingir seu limite nesta janela. O failover efetivo já possui homologação anterior; não esgotamos chaves para fabricar novo teste.
- Marketstack: sete configuradas/quatro disponíveis; uso diário distribuído em três chaves (2, 2, 2), saldo efetivo 8 na consulta. A elegibilidade respeita cooldown, reservas e limite global.
- Fornecedores ainda têm diagnósticos de calendário ausente, precisão limitada, desacordo com fonte primária e distribuição não verificada. São lacunas de dados, não jobs silenciosamente perdidos. Alpaca possui respostas incompletas; não tratadas como ausência comprovada de dividendos.
- Macro/Tesouro automático de **19/11 às 17h Brasília**: início 20:00:01 UTC, fim 20:00:04 UTC, `success`, 13 posições atualizadas, `errors=[]`, `calculation_errors=[]`. Sem disparo manual nesta rodada.

Aceite operacional desta rodada concluído. Não é garantia de ausência de falhas futuras nem remoção da observabilidade. Novos alertas justificam reabertura; acompanhamento contínuo não é uma pendência finita de implementação.

## Payout integrado

`payout_ratio` passa ao contrato de fundamentos/score e alertas. Estratégias personalizadas usam `payoutPercent`, mesma leitura da tabela. Percentual do Yahoo com LPA positivo, compatível apenas com ações BR/US e BDRs; não inferido por DY × P/L ou recebimentos pessoais. Valores acima de 100% não são truncados. Sem fonte/base válida, resultado indisponível.

A migration acrescenta o enum, permite a nova métrica, atualiza helpers/monitor e o validador de estratégia. Nenhum limite antigo, lançamento ou recebimento é convertido. Snapshots dos contratos históricos e migrations anteriores permanecem inalterados. Migration aplicada somente no QA; publicação depende da entrega.

## Demais indicadores: cálculo disponível, cobertura automática ainda aberta

Área **Análise → Estratégias → Indicadores por demonstrativo — pesquisa manual**. Nenhum dado manual é gravado no catálogo ou reutilizado em alertas/score. O link é referência informada pelo usuário, não documento validado automaticamente.

| Indicador | Convenção adotada | Proteção |
|---|---|---|
| Dívida líquida/EBITDA | (dívida financeira − caixa) / EBITDA | EBITDA positivo, mesma moeda/data/base; caixa líquido negativo preservado |
| ROIC | EBIT × (1 − imposto) / capital investido médio | Capital inicial/final positivos; NOPAT e base de capital conferidos; percentual do período, sem anualização automática |
| CAGR receitas/lucros | (final / inicial)^(1/5) − 1 | Seis exercícios anuais consecutivos, completos, moeda/base iguais e positivos |
| Margem operacional | EBIT / receita × 100 | Mesma competência e receita positiva |
| FCL | fluxo operacional − saída positiva de CAPEX | Não é FCFF; não transforma sinal desconhecido em módulo positivo |
| Vacância física | área vaga / área locável | Fundo de imóveis, base completa; não aplicado a papel/FOF/misto |
| Vacância financeira | aluguel potencial perdido por vacância / potencial total | Não agrega inadimplência, carência ou descontos |
| Concentração | maior imóvel por valor; maior locatário por aluguel anual agregado | Listas completas; identifica múltiplos contratos do mesmo locatário |
| WAULT | soma(aluguel anual × prazo restante) / aluguel anual total | Contratos únicos e cobertura completa; sem presumir renovação |

Métricas empresariais não são aplicadas automaticamente a bancos/seguradoras. Ausência, erro e incompatibilidade não viram zero.

Fontes metodológicas primárias: [definições de Damodaran/NYU](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/definitions.html), [variáveis e ROIC](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/variable.htm), [fluxos de caixa](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/littlebook/cashflows.htm). As convenções locais estão explícitas; não são atribuídas exclusivamente a um canal.

Cobertura pesquisada: documentação [Alpha Vantage](https://www.alphavantage.co/documentation/) oferece demonstrativos, mas a chamada demo de INCOME_STATEMENT/BALANCE_SHEET não retornou dados nesta rodada. Não foi assumido acesso gratuito real nem consumido o orçamento de dividendos para um coletor ainda não validado. O [dicionário mensal CVM/FII](https://dados.cvm.gov.br/dados/FII/DOC/INF_MENSAL/META/meta_inf_mensal_fii.zip) foi extraído: arquivos de ativo/passivo, complemento e geral não expõem diretamente as quatro bases requeridas de vacância/concentração/WAULT. Relatórios gerenciais ou informes mais detalhados exigem ingestão própria, identidade e referência verificadas. Portanto IND-02 a IND-11 não estão encerrados como cobertura automática.

## Simulações

- SIM-01: comparação simultânea com/sem reinvestimento, mesmo orçamento/preço/DY/prazo. Separa saldo investido, retiradas, recursos totais, cotas, caixa e renda do mês seguinte. Não soma provento reinvestido novamente ao patrimônio.
- SIM-02: sete cenários, alterando aporte, rendimento e inflação um de cada vez. Variações editáveis, taxas em pontos percentuais, saldo real por divisão composta. Nenhum cenário é previsão de fornecedor. Sem impostos/tarifas; juros no saldo inicial e aporte no fim.
- SIM-03: mesma cota/capital de referência para comparar distribuição FII e rendimento anual líquido simplificado. Exibe inflação, taxa real, imposto, prêmio, diferença em pontos percentuais e limitações (prazo, custódia, marcação a mercado e fluxo tributário).

## Revisão da planilha e canais

Documento original somente lido, sem copiar/editar: [SimuladorJuros Compostos](https://docs.google.com/spreadsheets/d/1EYnMo-Alb2NxJJcuwus6VgQSEvplOPlHFYO8-SQak2Q/edit). Três abas confirmadas pela metadata; fórmulas e valores inspecionados em A1:N16 de cada aba, além de Juros F20:K23, FIIs F100:J102 e Objetivo F176:J180.

- **Juros Compostos Mensal:** C8 deriva CDI da Selic por desconto fixo; C10 subtrai inflação antes da equivalência mensal. J11:J16 aplicam fator fixo de imposto ao rendimento mensal. O Valora não transforma essas premissas em taxas oficiais nem aplica imposto fixo oculto. O reajuste do aporte mantém a convenção explícita a cada 12 meses; a primeira linha da planilha é estado inicial, não mesmo fechamento do mês do app.
- **Fundos Imobiliários Mensal:** C7 divide DY por 12, H9:I16 usam preço constante; J9:J16 compram cotas inteiras e acumulam sobras. G6 é aporte em número de cotas. No Valora o aporte é informado em reais e sobras de aporte/proventos ficam em caixa. As duas bases não devem ser comparadas sem alinhar entradas e datas.
- **Objetivo Renda Passiva:** C8 subtrai inflação da taxa nominal; C12:D15 estimam capital com/sem fator fixo de imposto. G10:J16 constroem renda crescente e aporte variável. No app a meta é nominal, a inflação desconta poder de compra por divisão composta, e o aporte requerido é constante. Não se promete igualdade numérica entre modelos diferentes.

Conferência posterior: na aba Juros, K21 reajusta o aporte no rótulo mês 12, mas esse aporte entra no saldo da linha seguinte; alinhar início/fim do mês ao comparar. Na aba FIIs, G100:G102 contém 3382/3440/3500 cotas; o Valora reproduziu esses valores nos fechamentos 91/92/93 usando inicial zero, aporte R$203,06, cota R$9,23 e DY13%, preservando as sobras. Na aba Objetivo, H176 é negativo (retirada implícita) e G178 zera após o horizonte por construção da fórmula; não interpretar esse zero como desaparecimento do patrimônio nem transportar a retirada para um simulador de aportes constantes sem explicar a mudança de método.

Fundamentei/SCI acessível e Clube FII conferido como material educativo de contexto. Nenhum acesso premium foi presumido. Página Suno consultada retornou timeout nesta rodada (referências anteriores preservadas). Os dois vídeos identificados no registro anterior continuaram sem transcrição verificável; não alegar revisão integral audiovisual. REF-01 continua parcial apenas por esse recorte, não por falta do link da planilha, agora revisada.

## Validação e publicação

- Testes unitários de cálculo, interface, payout e SQL com rollback executados; não há escrita financeira em produção. Replay novo: 101 migrations aplicadas na instância isolada `valora-indicators-qa`; regressão original de replay, payout e classes aprovadas. Cron desse QA desativado e somente seu container encerrado ao concluir.
- Suíte inicial: 1556 aprovados, duas expectativas antigas de contagem de indicadores e um timeout de importação lazy. Contagens ajustadas para o payout. Ambos os arquivos retestados isoladamente: 30 testes aprovados, incluindo o gráfico real. Rodada ampla final: 225 arquivos/1563 testes aprovados e um timeout de 20s no arquivo CarteiraPage durante carga da máquina. O arquivo inteiro foi retestado sem alterar timeout: 27/27 aprovados em 16,14s. Testes finais de pesquisa manual/cálculos: 7/7 aprovados, incluindo o caso acrescentado de CAGR. Não afirmar uma execução monolítica sem timeout.
- Build TypeScript/Vite/PWA aprovado, cache `valora-static-fbbdf46a76d2`; lint dos arquivos alterados e verificação de diff aprovados. Scan incluindo arquivos novos preparados: 1086 arquivos de texto, zero achados. Contratos históricos gerados continuam aprovados em `--check`.
- Necessário publicar migration antes ou junto ao frontend e homologar regras novas somente no QA/conta de teste. O navegador integrado informou uso desativado em duas tentativas; conferência visual local desta nova entrega ainda não realizada.
