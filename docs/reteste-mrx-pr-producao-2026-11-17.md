# Retestes MRX/PR em produção — 17/11/2026

Autorização: usuário solicitou executar os testes restantes após homologação da PR168. Antecipadas somente quatro tarefas provider/ticker MRX/PR com lease livre, sem alteração de quota, dados pessoais ou valores oficiais. Datas originais: Alpha MRX 19/11 01:31 UTC, PR 19/11 02:31 UTC; Marketstack MRX 20/11 00:51 UTC, PR 20/11 01:51 UTC. Cada conclusão volta à cadência normal.

Chamadas autenticadas server-side da Edge v27, modo providers, via Vault/pg_net. Credenciais não retornadas. IDs de transporte 12008 e 12009, ambos HTTP 200, auditoria persistente salva e received_income_created=0.

- MRX: Alpha e Marketstack retornaram dois eventos cada, error=null e metadata_variations=1. Data ex/record 16/11, pagamento 02/12 e valor 0,16 coincidem. Datas de declaração observadas 03/11 e 05/11 permanecem em suas fontes; catálogo oficial mantém declaração desconhecida e anúncio 05/11. last_success_at atualizado nos dois fornecedores, nenhum lease retido. Reteste do reconciliador concluído.
- PR/Alpha: quatro eventos válidos processados; erro provider_partial_invalid_amount, diagnóstico seguro row=2, ex=30/06/2026, kind=range, value_type=string, decimal_places=1. O valor bruto inválido não é registrado nem inferido. last_success_at não foi falsamente atualizado. O calendário deixou de ser totalmente bloqueado pela linha inválida. Reteste da coleta parcial concluído; linha ruim do fornecedor continua lacuna.
- PR/Marketstack: quatro eventos retornados; erro provider_distribution_unverified. A observação privada ex/record 30/06, pagamento 10/07 e 0,03 continua preservada e fora do calendário público. last_success_at anterior mantido. Reteste do hold concluído; falta evidência oficial para classificar essa distribuição.
- PR públicos revisados de junho/dezembro mantêm 0,16 e fonte issuer_primary. Snapshot bruto dos fornecedores e histórico de divergências não foram apagados.
- Rodízio confirmado novamente: uso de chaves passou de [20,1] para [20,3]; não houve reset. Nenhuma credencial foi exposta.
- Hashes financeiros antes/depois iguais: transactions 2c719e7834e3874bd0a48b3b8b027276, positions 8ab31fc81cd171db7f7cce6bf72c4058, wallet_income 65c15fcfb4457c7eb242c40fe9fdf09c.

Conclusão: testes operacionais pendentes de MRX/PR executados. MRX conciliado; mecanismos de coleta parcial/hold PR aprovados, mas dados PR dos fornecedores ainda não permitem declarar cobertura completa. Não confundir regressão aprovada com correção do dado na fonte.
