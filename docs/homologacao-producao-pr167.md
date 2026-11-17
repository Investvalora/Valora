# Homologação PR167 — 16/11/2026

- Merge `62f6fd47f74079979f71825855baede7581706ef`, checks da PR aprovados.
- Migration `alpha_key_failover` aplicada. Função `sync-international-announcements` ACTIVE v26, autenticação própria preservada.
- Leitor restrito do Vault reconhece seis credenciais únicas. Nenhum segredo retornado nesta homologação; apenas contagem.
- Três tabelas de controle com RLS e sem SELECT para anon/authenticated; RPC de reserva e leitor de secrets privados. Advisor apresenta apenas INFO de RLS sem política (negação intencional de acesso nessas tabelas) e os avisos gerais já existentes de pg_net em public e proteção de senhas vazadas desativada.
- Execução real [43942820754](https://github.com/Investvalora/Valora/actions/runs/43942820754): duas filas públicas consultadas, zero falhas, deadline não atingido. Nenhum fornecedor com tarefa processada nesta rodada; auditoria salva.
- Alpha permanece em 20/20, zero reservas novas. A função reconheceu a configuração, mas o teste real de troca de credencial não ocorreu. Não houve reset de contador ou aumento de limite. Testes de failover continuam cobertos pelo QA, sem declaração de validação das novas chaves perante o fornecedor.
- Hashes pós-publicação iguais ao baseline: transactions `2c719e7834e3874bd0a48b3b8b027276`, positions `8ab31fc81cd171db7f7cce6bf72c4058`, wallet_income `65c15fcfb4457c7eb242c40fe9fdf09c`.
- Pendente: reteste real das credenciais/failover e Alpha/PR quando houver orçamento e tarefa elegível. Publicação concluída; homologação desse caminho de rede ainda parcial.
