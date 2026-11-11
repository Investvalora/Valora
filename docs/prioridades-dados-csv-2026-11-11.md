# Prioridades de dados e CSV — 11/11/2026

## Correções locais

- CSV: rejeitar quantidade com mais de oito casas significativas e preço/corretagem com mais de quatro, conforme o armazenamento existente. Zeros finais são aceitos. Limites inteiros também verificados; não arredondar para conseguir importar.
- Migration `20261111210332_import_numeric_precision.sql`: validar numerics sem escala antes da conversão para as colunas e antes de criar o recibo. Não modifica lançamentos existentes. Mantém propriedade, atomicidade e deduplicação do lote.
- Sincronização de pagamentos: distinguir HTTP da fonte, timeout, falha de armazenamento e conflito de evento. Persistir apenas códigos limitados, sem corpo remoto ou credenciais. Não altera regras de elegibilidade, valores ou recebimentos pessoais.

## Validação

- 25 testes de CSV aprovados, incluindo exatamente 1.000 linhas, rejeição de 1.001, frações, precisão excedida e formatos explícitos.
- Oito testes de fontes de pagamento e CDI existentes aprovados. Isso não comprova cobertura integral do calendário CDI.
- ESLint dos arquivos de CSV alterados aprovado.
- Build TypeScript/Vite/PWA aprovado; apenas avisos de anotações da dependência Zod.
- Testes SQL de rejeição atômica adicionados a `supabase/tests/import_batches.sql`, executado pelo job de replay da CI. Execução local ainda pendente: Docker não disponibilizou o daemon, inclusive após iniciar Docker Desktop. Nenhum teste realizado no banco de produção para substituir esse isolamento.
- Migration e função ainda não publicadas. Não declarar a proteção do servidor ativa antes da aplicação e teste SQL.

## Investigação das demais prioridades

- Filas consultadas: B3 e iShares com sucessos recentes; FIIs consultados também sincronizaram. Mastercard sem sucesso, com código antigo genérico `source_or_event_conflict`; a nova classificação permite fechar a causa na próxima execução após publicação.
- Nasdaq público retornou linhas futuras para AAPL e COST. MA, JPM e IVV não retornaram linhas no teste: não é uma substituição universal. O cabeçalho de AAPL estava atrasado em relação às linhas; uma integração deve ler e validar as linhas, não confiar no resumo.
- COST: conflito de data ex entre fontes permanece pendente. Não deslocar elegibilidade global por suposição.
- MA líquido pessoal continua dependendo do extrato. Um calendário público não demonstra o imposto efetivamente retido pela corretora.
- CDI: a guarda atual de dez dias não identifica toda ausência de dia útil. Ainda precisa calendário bancário confiável e tratamento do atraso de publicação; não substituir por segunda–sexta ignorando feriados.

Automação internacional e cobertura CDI permanecem abertas; investigação não equivale a entrega dessas integrações. Carteira Investidor10 e recebimentos Nomad preservados.

## PR132 — conferência após abertura

- [PR132](https://github.com/Investvalora/Valora/pull/132) aberta; checks `app`, `database-isolation`, `migration-replay` e Vercel aprovados no commit c020879.
- O replay da CI executou a migration e os testes SQL de importação/concorrência em banco descartável. Assim, a proteção no banco possui validação isolada aprovada, embora não tenha sido aplicada ao projeto hospedado.
- Servidor local reiniciado em http://127.0.0.1:5176/. Conferência visual bloqueada nesta sessão: ferramenta informa uso de navegador desativado nas configurações. Não considerar homologação visual concluída pelos testes automatizados.
