# Homologação local — BlackRock/BMN e META — 12/11/2026

Branch `codex/cobertura-blackrock-meta-cdi`. Sem publicação ou mutações em produção.

- 55 testes em seis arquivos aprovados: BlackRock, fontes primárias, fallback, coletor, CDI e auditoria de jobs.
- Build TypeScript/Vite/PWA aprovado: 131 arquivos em cache, `valora-static-9f2111cb9d16`. Somente avisos de comentários de pureza da dependência Zod; sem erro de build.
- Consulta real BlackRock identificou 13 eventos BMN. PDF municipal de setembro renderizado e conferido. Ex/record 15/10, pagamento 02/11 e USD 0,09925 correspondem à fonte.
- Banco isolado `valora-provider-qa`: replay dos 13 anúncios aprovou conciliação e auditoria de nove valores Yahoo anteriores. Lote completo passou por `finish_primary_dividends`: 13 salvos, lease liberado, sucesso registrado; token reutilizado rejeitado. Fixtures com rollback.
- META: data Yahoo 29/12 corrigida para 23/12, com valor/ex compatíveis, data anterior auditada e reexecução sem duplicação. Divergência de outro fornecedor permaneceu bloqueada.
- Replay integral final do schema aprovado, incluindo a nova migration. Os cinco testes SQL e os dois replays de dados reais passaram novamente no banco recém-criado.

Conferência visual indisponível: navegador integrado retornou `Local browser use is disabled in Work settings`. Nenhuma tela, CSS ou componente foi alterado nesta entrega; build não substitui conferência visual. Não houve teste autenticado de interface nesta rodada.

Após merge: aplicar migration `20261112225456_blackrock_primary_calendar.sql`, publicar função internacional e homologar o workflow com BMN/META. Nenhum recebimento pessoal deve ser criado ou sobrescrito por anúncios públicos. Cobertura integral das filas continua em acompanhamento.
