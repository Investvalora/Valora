# Homologação de produção — PR150 — 12/11/2026

Merge `88bdf988572013e4fa3c4e98f3348ee6958dd0c2`. Checks da PR, Vercel e CI/main `43318717343` aprovados.

## Publicação

Migration `primary_dividend_reconciliation` aplicada pelo MCP com timestamp hospedado `20261112223753` (arquivo versionado `20261112204929`). Função `sync-international-announcements` v12 ACTIVE, autenticação própria/OIDC preservada. Requisição sem autenticação retornou 401. Evidências privadas não têm SELECT de anon nem EXECUTE da RPC para authenticated. Health advisor sem achados. Informativos de RLS sem policies nas tabelas operacionais privadas são esperados; avisos pré-existentes de pg_net em public e proteção de senhas vazadas permanecem.

Cron `international-provider-fallback` confirmado em `11,31,51 * * * *`. Política AMZN ativa, com expiração original preservada. As cotas não foram ampliadas.

## Execução real

Antecipadas somente as tarefas públicas PRT e META, sem lease ativo, para testar pela execução da main. [Workflow 43321785301](https://github.com/Investvalora/Valora/actions/runs/43321785301).

- PRT: 12 anúncios processados, 12 salvos, zero conflitos/lacunas. Auditoria preserva 11 valores anteriores Yahoo. Ex 30/09/2026: USD 0,0196242, pagamento 15/10, fonte issuer_primary. Lease liberado e last_success_at 22:38:58 UTC.
- META: quatro anúncios, três salvos, zero conflitos, uma lacuna `issuer_ex_unconfirmed`. Dezembro/2025 preservado: pagamento 29/12 no banco versus 23/12 no release. Lease liberado; nenhum sucesso integral presumido.
- SEC/BMN: zero eventos, sem falha.
- Etapa de fornecedores: Alpha/BMN retornou 12 observações e `provider_event_conflict`; auditoria salva. Workflow terminou com falha por essa pendência, não por PRT ou META.

BMN tem nove diferenças públicas contra Alpha. Exemplo de outubro: Yahoo USD 0,099 versus Alpha 0,09925; meses anteriores 0,094 versus 0,09375. É compatível com arredondamento, mas exige fonte primária antes de corrigir. Valores públicos não foram sobrescritos para tornar o workflow verde.

Recebimentos pessoais antes/depois: 208 registros, checksum `14453d1c05f93ee28296f0cea79b5f17` idêntico. Não foram criados recebimentos, lançamentos ou alterações de carteira nesta homologação.

## Limites

Entrega PRT/META e publicação aprovadas com a lacuna META explicitada. Pipeline integral não aprovado por conflito BMN. Marketstack não foi consultada nessa execução; fila/cotas por chave continuam em acompanhamento. Confirmar cadência automática e escoamento; dispatch não substitui essas evidências. Não encerra cobertura universal, worker antigo ou comparação de desempenho físico.
