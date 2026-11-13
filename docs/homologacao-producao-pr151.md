# Homologação de produção — PR151 — 12/11/2026

Merge `af84f2c859efe768de84a951c33a1d48b61d5ff2`. Checks da PR/Vercel e CI/main `43328754533` aprovados.

Migration `blackrock_primary_calendar` aplicada via MCP, timestamp hospedado `20261112232635` (arquivo `20261112225456`). Função internacional v13 ACTIVE, mantendo autenticação própria/OIDC. POST sem autenticação retornou 401; RPCs de conciliação sem EXECUTE para anon/authenticated. Health advisor sem achados.

Antecipadas apenas as tarefas públicas BMN e META sem lease ativo. [Workflow real 43328937876](https://github.com/Investvalora/Valora/actions/runs/43328937876), main, dispatch com `probe_only=false`, terminou com sucesso.

- BMN: 13 eventos consultados, 13 salvos, zero conflitos/lacunas. Auditoria guarda nove valores anteriores Yahoo. Lease liberado e sucesso registrado às 23:27:14 UTC.
- META: quatro eventos consultados e salvos, zero conflitos/lacunas. Evento ex 15/12/2025 mantém USD 0,525; pagamento corrigido para 23/12, data anterior 29/12 em auditoria. Lease liberado e sucesso registrado às 23:27:15 UTC.
- SEC/BN: zero eventos, sem falha. Alpha/CRI: quatro eventos, sem erro; auditoria salva.
- Recebimentos pessoais antes/depois: 208, checksum `14453d1c05f93ee28296f0cea79b5f17` preservado. Nenhum recebimento pessoal criado pela execução.

Teste adicional com rollback reprocessou as 12 observações BMN já armazenadas da Alpha pela RPC publicada, sem conflito após a conciliação primária. Não fez HTTP nem consumiu cota; tampouco registrou sucesso novo de fornecedor. O erro histórico Alpha/BMN permanece até a próxima consulta real agendada; não foi apagado artificialmente. Marketstack não foi consultada nesse dispatch.

Entrega BMN/META aprovada em produção. Permanecem acompanhamento de cadência/primeira passagem das filas dentro das cotas e cobertura de outros emissores. Uma execução bem-sucedida não comprova cobertura universal. Sem alterações de interface nesta entrega.
