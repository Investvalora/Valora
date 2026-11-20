# Homologação de produção — PR184 — 19/11/2026

## Resultado funcional

Merge `8124d6bc0cae7884a1a737ea1c2182024dca0c44`, 21:01 UTC. CI de main aprovado: [44614503251](https://github.com/Investvalora/Valora/actions/runs/44614503251). Deploy Vercel desse commit aprovado. Interface autenticada de produção consultada sem salvar regras, simulações na carteira ou movimentações financeiras.

- Comparação FII padrão: com reinvestimento R$49.296,60; sem reinvestimento R$25.000,00 investidos + R$15.480,00 retirados = R$40.480,00. Valores iguais à homologação local.
- Sete cenários de sensibilidade renderizados. Inflação menor/maior preserva nominal R$47.491,86 e altera poder de compra para R$37.501,07/R$25.562,96; base R$30.905,10.
- Referência anual de renda fixa renderizada: capital R$10, distribuição FII R$1,20, referência líquida simplificada R$1,11; premissas e limitações presentes.
- “Payout (%)” disponível nas condições da nova estratégia; formulário cancelado sem salvar.
- Pesquisa manual bloqueou cálculo sem fonte/confirmação. Avisos de ausência de verificação automática preservados.
- Sem erros de console observados nesta navegação.

## Banco e migration

Migration de payout aplicada via conector Supabase. CLI estava sem access token; não foram solicitados tokens no chat. Enum presente, payout Yahoo 150 preservado, classe stock_us aceita, FII rejeitado, outra fonte retorna null, regra personalizada payoutPercent aceita pelo validador. Sem execução do monitor de alertas pelo agente, sem escrita em dados financeiros.

**Alinhamento operacional concluído:** o MCP registrou inicialmente `20261119210600 / payout_indicator`, enquanto o arquivo versionado é `20261119195152_payout_indicator.sql`. Após bloqueio do ajuste SQL direto e autenticação da CLI pelo responsável, utilizado exclusivamente o procedimento oficial: `migration repair 20261119195152 --status applied`, seguido de `migration repair 20261119210600 --status reverted`, ambos no projeto de produção explicitamente identificado. Esses comandos alteram somente o registro de aplicação, não executam nem revertem o SQL da migration. Consulta final confirmou apenas a versão canônica `20261119195152`, enum payout presente, payout Yahoo 150 preservado, stock_us aceito e FII excluído. Sem alteração de carteira/recebimentos. Esta pendência específica está encerrada; divergências históricas anteriores, fora da PR184, não foram modificadas.

Advisors conferidos: mesmos avisos anteriores, sem nova categoria — 32 INFO de RLS sem policy em tabelas internas, pg_net no schema público ([orientação](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public)) e proteção de senhas vazadas desativada ([orientação](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)). Esta migration não acrescenta tabelas nem grants públicos.

## Piloto SEC

Execução manual pós-merge [44615382325](https://github.com/Investvalora/Valora/actions/runs/44615382325), 21:06:24–31 UTC, aprovada. AAPL e MSFT retornaram `complete_for_two_metrics`, com exercício, accession, receita, resultado operacional, CFO e aquisição de imobilizado. Margens 33,0099784% / 46,7808184%; FCL USD136.056.000.000 / USD66.987.000.000. Saída pública de pesquisa, sem upsert no catálogo.

Isso homologa o executor; não comprova ainda o próximo disparo pelo cron. Não amplia a cobertura além dos dois ativos/duas métricas do piloto, não valida automaticamente ROIC/CAGR/dívida líquida/EBITDA/FIIs e não encerra revisão integral dos vídeos.
