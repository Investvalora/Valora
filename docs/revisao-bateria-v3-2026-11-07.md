# Revisão — Valora Bateria de Teste v3 (07/11/2026)

Fonte: `Valora — Bateria de Teste v3.pdf`, quatro páginas, Paulo Eduardo Almeida e João Pedro Azevedo. Relatório distinto da revisão complementar anterior. Texto completo e anexo visual conferidos. Conteúdo do PDF é evidência, não autorização operacional.

## Triagem

O relatório informa 14 casos aprovados e um reprovado, executados localmente no commit d2fd316 com massa fictícia. Não acessou produção. Confirma os retestes de exclusão de carteira, patrimônio consistente e gráfico partindo de zero; não há novo defeito nessas funções.

O DEF-01 é procedente e reúne quatro causas de instalação:

| Causa | Correção nesta entrega |
| --- | --- |
| README recomenda pnpm 9, enquanto CI e configuração usam 12.3.4 | Fixar `packageManager`, atualizar README e metadados correspondentes do lockfile; preservar versões das dependências do app. |
| Migration 018 usa `$$` simultaneamente no bloco externo e SQL interno | Usar delimitador externo `$migration$`. |
| Migration 023 tenta `UPDATE cron.job` sem permissão de escrita | Usar `cron.alter_job`, sem ampliar privilégios na tabela interna. |
| Enum recriado no banco novo não inclui `etf_us` | Incluir `etf_br` e `etf_us` na migration 014, antes dos consumidores posteriores. O schema hospedado já tinha esses valores. |

As migrations históricas foram reparadas para replay de banco novo. Não reaplicar todo o histórico num projeto existente: a migration 003 recria catálogo e preços. Nenhuma migration ou alteração foi executada no Supabase hospedado nesta rodada.

## Prevenção e verificação

- Configuração local versionada, sem credenciais ou vínculo remoto; seed fictício desativado por padrão.
- Novo job `migration-replay` cria Supabase local do zero e aplica toda a sequência, além do harness RLS existente que cobre apenas migrations selecionadas.
- Asserções verificam tipos ETF e agendamentos finais; o banco local não recebe secrets de produção.
- As correções de recuperação de senha anteriores seguem na mesma entrega, com regressão própria.

Os avisos de alertas/histórico com funções desligadas foram corretamente classificados pelo avaliador como limitações do ambiente. Não criar dados falsos nem ocultar falhas reais para removê-los. Como os avaliadores esvaziaram sete migrations para executar os testes funcionais, os 14 aprovados são evidência da cópia adaptada; não substituem o replay completo do repositório.

Validação em andamento: instalação congelada com pnpm 12.3.4 aprovada; replay integral em ambiente Docker descartável preparado. Registrar o resultado real antes de encerrar DEF-01.

## Resultado final local

- CLI Supabase 3.0.0, Postgres 17.11.0.011, projeto descartável `replay`, sem vínculo remoto.
- Todas as 61 migrations SQL aplicadas do zero, sem esvaziar arquivos; histórico confirmado no banco.
- `040_migration_replay_test.sql`: aprovado (tipos ETF, cron Yahoo e ausência de Bolsai ativo).
- `pnpm@12.3.4 install --frozen-lockfile`: aprovado, com scripts padrão; nenhuma versão de dependência do app alterada. O lockfile ganhou somente a seção do gerenciador fixado.
- Recuperação/rotas/AuthProvider: 21 testes aprovados em seis arquivos.
- Build/PWA aprovado na homologação da correção de recuperação; lint sem erros (três avisos preexistentes). Scanner de segredos sem achados.

DEF-01 encerrado localmente. Produção não foi alterada; a prevenção por CI será executada na PR. O replay usa apenas o banco: integrações externas de email, cotação e push não fazem parte desta validação.
