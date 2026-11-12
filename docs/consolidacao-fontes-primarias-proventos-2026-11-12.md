# Conciliação de fontes primárias e filas — 12/11/2026

Implementação local na branch `codex/concilia-proventos-fontes-primarias`. Ainda não publicada. Não altera posições, lançamentos, quantidades ou recebimentos pessoais.

## PRT e META

- PRT é PermRock Royalty Trust. O coletor descobre os PDFs em https://permrock.com/news-releases/ e cruza valor e datas com https://permrock.com/cash-distributions/. A tabela explicita ex/record; o PDF preserva a precisão que a tabela arredonda. Consulta real encontrou 12 anúncios. Setembro confirma USD 0,0196242 por cota, pago em 15/10/2026.
- META usa releases oficiais da companhia distribuídos pela PRNewswire e publicados no Nasdaq, exigindo identidade, origem e datas. Consulta real encontrou quatro anúncios. Exemplo: https://www.nasdaq.com/press-release/meta-announces-quarterly-cash-dividend-2026-09-10 informa USD 0,525, record 21/09 e pagamento 28/09. A data ex precisa corresponder a um evento independente já existente; não é deduzida da record.
- Conciliação guarda valor anterior e URL em auditoria privada. Corrige valor Yahoo apenas quando ele corresponde exatamente ao arredondamento de três casas do valor primário. Divergências de datas ou valores não explicadas continuam bloqueadas. Observações dos fornecedores permanecem preservadas.
- Observação arredondada confirmada pelo emissor recebe diagnóstico parcial de precisão, sem bloquear o valor exato de outro fornecedor. Zero por arredondamento continua indisponível, sem presumir provento zero.
- Dados públicos consultados em produção: 11 eventos PRT arredondados; META dezembro/2025 tem pagamento 29/12 no Valora contra 23/12 no release. Esse META fica pendente, sem sobrescrever. Os outros três eventos META têm âncoras compatíveis.

## AMZN e filas

A FAQ oficial https://ir.aboutamazon.com/faqs/default.aspx declara que a Amazon nunca declarou ou pagou dividendos em dinheiro. A política datada de 12/11 expira em 12/12/2026; não constitui exclusão permanente. Um anúncio positivo posterior invalida a classificação. A fonte retornou 403 ao coletor direto e foi conferida por consulta web; a renovação dessa evidência não é automática nesta entrega.

Primeira passagem do catálogo tem prioridade. Tarefas sem tentativa há mais de quatro dias também ganham prioridade para evitar concentração nas mesmas posições. Alpha Vantage usa janela de 72 horas e Marketstack sete dias. Permanecem os limites globais de 20/16 consultas por dia e os limites existentes por chave. O diagnóstico distingue cota esgotada de coletor parado. O fallback Supabase passa de uma tentativa por hora para três, sem aumentar cotas.

Esses intervalos são políticas de agendamento, não garantia de cobertura ou de escoamento completo. O calendário depende da disponibilidade e da precisão das fontes. A execução GitHub e as cotas reais continuam em acompanhamento após publicação.

## Operação e homologação

O workflow instala `pypdf==6.21.4` em ambiente virtual, com extração limitada de PDFs públicos (tamanho, páginas e tempo). URLs são restritas aos emissores esperados; nenhum comando deriva do conteúdo remoto.

Validações locais: 43 testes de coletores/auditoria, TypeScript e lint dos arquivos alterados aprovados. Replay integral final das migrations no Supabase Docker isolado e cinco regressões SQL aprovados, incluindo rejeição de fonte nula, preservação de conflitos reais, precisão entre fornecedores, permissões, cotas e prioridade das filas. O replay dos 16 anúncios reais aceitou 12 PRT e três META; preservou a divergência do quarto META. As fixtures SQL usam rollback. Build/PWA em verificação final.

Publicação exige migration `20261112204929_primary_dividend_reconciliation.sql`, Edge `sync-international-announcements` e workflow atualizado. Depois, homologar execução real: confirmar 12 PRT, três META compatíveis, uma divergência de pagamento META preservada, auditoria e liberação das leases. Não encerrar cobertura universal, medição física ou atualização de worker antigo com esses testes.
