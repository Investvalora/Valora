# Homologação de produção — PR149 — 12/11/2026

Merge12743416411bae1a2d8f93c5247c9d365a728dfa. Checks da PR aprovados, incluindo migration-replay, isolamento, identidade do coletor e aplicação. CI da main43301757160 aprovado; Vercel da PR aprovado.

## Publicação

- Aplicada via MCP a migration dividend_provider_precision, correspondente a20261112200950 no repositório. Histórico hospedado usa o timestamp da aplicação pelo MCP.
- Confirmados numeric(20,8), validação trunc(amount,8) na RPC e ausência de EXECUTE para anon/authenticated.
- Publicada sync-international-announcements v11, mantendo verify_jwt=false e autenticação própria/OIDC anterior. Bundle inclui index, providers, githubOidc, officialFiles e jobRuns. Sem alteração de secrets.
- Health advisor sem achados; avisos de segurança pré-existentes: tabelas operacionais sem policies (sem acesso dos clientes), pg_net em public e proteção de senhas vazadas desabilitada. Nenhuma permissão ampliada nesta entrega.

## Reteste real

Workflow International announcements43302427965, dispatch na main, concluído com success às17h39 Brasília. Processou KO (Alpha,5 eventos) e MA (Marketstack,4 eventos), sem erro; audit_saved=true. SEC/BB sem falha; GOOG/GOOGL continuaram classificados explicitamente como unsupported na fonte Nasdaq. Não é prova de cadência automática nem cobertura integral.

https://github.com/Investvalora/Valora/actions/runs/43302427965

PRT foi reprocessado separadamente com consulta real Alpha, reserva de uma unidade na cota global e lease temporário somente da tarefa alpha_vantage/PRT, respeitando o limite20/dia. RPC liberou o lease ao concluir. Gravadas12 observações, incluindo ex30/09 com valor0.01962420, preservando o0.0196242 retornado. O erro provider_invalid_amount foi eliminado.

## Pendência encontrada — dados de PRT

A finalização retornou provider_event_conflict em11 eventos. A tabela pública Yahoo contém valores arredondados: por exemplo0.020000 contra0.01962420 em30/09, e0.016000 contra0.01620400 em30/10. Datas de pagamento desses registros públicos estão ausentes. A proteção não sobrescreveu os valores divergentes nem inventou pagamentos pessoais. Nenhum recebimento foi criado (received_income_created0).

Portanto a correção de precisão está validada, mas PRT não está totalmente conciliado. Confirmar fonte primária e definir precedência/precisão antes de substituir registros públicos; não relaxar conflito para tornar o job verde. Uma execução futura que processe um conflito real pode continuar falhando corretamente.

AMZN permanece com provider_calendar_unavailable e last_success_at nulo. O tratamento como cobertura parcial está publicado e coberto pelos testes; esse ticker não foi processado no dispatch acima. Não declarar nova auditoria parcial de AMZN observada em produção nesta rodada.

Lançamentos, quantidades e recebimentos pessoais da Investidor10 não foram alterados. Operações desta homologação limitaram-se a schema privado, função, fila/cota e observações públicas dos fornecedores.
