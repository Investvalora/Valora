# Catálogo de demonstrações SEC — entrega local

Coleta limitada a duas ações americanas por execução, com lease, confirmação por token e intervalo de sete dias após sucesso. O workflow usa OIDC restrito ao arquivo e à main; não há segredo permanente adicional. Migration e função devem ser publicadas antes do workflow novo.

O catálogo compartilhado preserva documento, período, moeda e evidência. A interface apresenta margem operacional, fluxo de caixa livre, CAGR de receitas/lucros, dívida líquida/EBITDA e ROIC quando os componentes são comparáveis. Não altera automaticamente regras, estratégias ou alertas existentes. A falha do provedor básico não impede a leitura deste catálogo.

Consulta real a AAPL, MSFT, KO, MCD, GOOGL e COST encontrou margem e FCF nos seis; CAGR varia conforme a série disponível. Dívida líquida/EBITDA e ROIC permaneceram indisponíveis nos seis: não presumimos componentes ausentes iguais a zero. A reconstrução exige componentes completos, tratamento explícito de arrendamentos e períodos compatíveis.

## FIIs

O informe trimestral aberto da CVM contém imóveis e campos de vacância, mas a amostra XPML11 trouxe valores sem convenção de unidade suficientemente clara e sem pesos adequados para replicar o agregado do gestor. O relatório oficial FNET 1373061 informa vacância física de 5,3% para setembro de 2026. Não publicar agregação automática desses CSVs como equivalente; vacância financeira, concentração e WAULT seguem pendentes de fontes e bases completas.

## Evidências externas e agendamento

Data ex de XPML11, política futura explícita de BlackBerry, calendário atual de PERT e US$0,03 de PR continuam sem confirmação oficial suficiente. Por decisão do responsável, manter somente os rascunhos de consulta, sem enviar mensagens. O valor de PR continua fora do calendário.

O piloto publicado tem execução manual aprovada. A execução agendada de 19/11 só pode ser confirmada depois de 22:41 UTC (19:41 de Brasília); não confundir disparo manual com cron. O novo fluxo horário desta entrega ainda não foi publicado.

## Validação

Correção adicional do CI: o PDF oficial PRT de novembro produz `0.0084 79` no pypdf 6.21.4. O parser agora aceita espaços entre dígitos da parte decimal, limitado à precisão anterior e mantendo a conferência com o calendário oficial. Regressão com divergência e duplicidade aprovada; consulta real leu 12 eventos e confirmou o novo anúncio de US$0,008479, corte em 30/11 e pagamento em 14/12. Sem escrita nas filas durante a consulta.

Regressão completa: 230 arquivos e 1.579 testes aprovados. Build aprovado. Migration e regressão SQL aprovadas no banco QA isolado; nenhuma aplicação desta entrega em produção. Verificação JWT: 14 testes aprovados. Interface do componente real conferida em desktop e 375 px sem transbordamento, com números públicos de AAPL em página QA separada.
