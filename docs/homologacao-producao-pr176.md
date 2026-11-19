# Homologação em produção — PR176

Concluída em 19/11/2026, aproximadamente 11h38 de Brasília.

- PR: https://github.com/Investvalora/Valora/pull/176
- Merge: `9cf2b0bca6e156f6084f960bbdf67237c169e009`, 11h32 de Brasília.
- Security and regression do merge: execução `44544792911`, sucesso. Vercel do merge: sucesso, deployment `CFmfPjjQ2X8vThXo8BWkL1EuD423`.
- Migration do repositório: `20261119032021_reviewed_ra_graco_calendar.sql`. Aplicada pelo MCP como `reviewed_ra_graco_calendar`; histórico remoto registrou versão `20261119143501`. Mapeamento explícito; nenhum reparo de histórico executado.

## Banco e coleta real

Cinco eventos conferidos após publicação, todos com `source=issuer_primary` e URL da evidência:

| Ativo | Ex | Pagamento | USD/cota |
|---|---|---|---:|
| RA | 09/10/2026 | 23/10/2026 | 0,118 |
| RA | 12/11/2026 | 27/11/2026 | 0,118 |
| RA | 10/12/2026 | 24/12/2026 | 0,118 |
| GGG | 19/10/2026 | 04/11/2026 | 0,295 |
| GOOG | 07/12/2026 | 14/12/2026 | 0,22 |

A tarefa GOOG foi antecipada e o workflow principal foi disparado uma vez: https://github.com/Investvalora/Valora/actions/runs/44545606466 . Resultado sucesso: cinco eventos, zero datas ausentes, erro nulo, zero conflitos, zero recebimentos criados. `saved=0`: os eventos já estavam presentes; a revisão oficial não foi substituída. `last_success_at=2026-11-19T14:36:57.153754Z`, `last_error=null`.

Fingerprint agregado de transactions/positions/wallet_income antes da migration, depois e após a coleta: `d51816838e8092245dc7abdeb432d78d`, idêntico. Fingerprint dos eventos originais de fornecedores: `1ce5c84cdccb093eb5fffafb76fbfd2b`, idêntico. Sem eventos duplicados por ticker/ex/tipo. Hold de PR USD0,03 preservado.

Permissões verificadas: authenticated sem INSERT na tabela de revisões e sem EXECUTE na função; anon também sem EXECUTE. Advisors antes/depois com os mesmos avisos existentes: tabelas internas com RLS sem políticas, pg_net em public e proteção de senhas vazadas desativada. Não foram ampliados acessos.

## Navegador integrado

Produção autenticada pelo responsável. Proventos pagos, Anunciados/a receber e filtro GOOGL carregaram; valor USD0,22, ex 07/12 e pagamento 14/12, com quantidade estimada e direito não consolidado. Layout estreito visualmente íntegro, barra inferior visível e console sem erros capturados. Bundle observado: `/assets/index-DX6wCHB2.js` (não houve alteração frontend nesta PR).

GOOG/RA/GGG foram validados diretamente no calendário do banco; a carteira aberta não os mostrou entre seus anúncios, cujo filtro se restringe aos ativos atuais. Nenhum ativo foi adicionado para produzir evidência visual. Não houve importação, lançamento ou alteração de recebimento pessoal.

## Limites preservados

BB, PERT, confirmação oficial do PR USD0,03, integração XPML11 e demais calendários incompletos continuam pendentes. A homologação desta entrega não declara cobertura integral nem um novo teste físico de PWA.
