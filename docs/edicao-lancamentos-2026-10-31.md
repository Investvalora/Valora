# Edição de lançamentos com recálculo — implementação local

## Escopo

Botão Editar para compras/vendas nas listas desktop/mobile de lançamentos, no histórico por ativo e na aba Lançamentos do detalhe. Proventos e bonificações não são editáveis por esse formulário. Ativo, carteira, proprietário, id e sequência permanecem fixos. Tipo compra/venda, data civil, quantidade, preço, custos e impostos podem ser corrigidos.

Moeda consultada no catálogo; envio bloqueado enquanto indisponível. Valores preenchidos sem arredondar a quantidade exibida no formulário (AAPL: 0,0661). Decimais usam vírgula; quantidade limitada a oito casas e valores monetários a quatro, conforme a precisão do diário. Excesso é recusado no cliente/RPC, sem arredondamento silencioso. Data futura, valores negativos e quantidade zero recusados. A edição não envia ordens à corretora.

## Servidor

Migration `20261031230501_edit_transactions_with_history_validation.sql`, gerada pelo CLI, preparada mas **não aplicada em produção**. Publicar o frontend somente após aplicar as migrations preparadas de exclusão e edição, em ordem de versão. Não alterar migration 018.

- RPC `edit_owned_transaction` SECURITY INVOKER, search_path vazio e execução apenas para authenticated. Identidade deriva da sessão/RLS; parâmetros não permitem mudar usuário, carteira ou ticker.
- Comparação do snapshot original de tipo/data/quantidade/preço/custos/impostos impede sobrescrever mudanças concorrentes (40001). Em conflito, cliente invalida consultas e bloqueia reenvio do formulário antigo.
- Trigger serializa escritas do diário pela carteira. Outro trigger verifica todo o saldo cronológico do ticker em UPDATE, inclusive vendas posteriores; alterações diretas também passam pela validação. Ordem do mesmo dia permanece por seq. Não foi feito ensaio paralelo de carga; validação concorrente coberta por snapshot desatualizado e revisão dos locks.
- Trigger de recálculo existente permanece ativo: reconstrói quantidade, preço médio e aquisição. Rejeições revertem a edição e seu recálculo na mesma transação. Custos/impostos são preservados ou corrigidos nos registros; não foi alterada a convenção atual de cálculo do preço médio para incorporá-los.
- Não foram introduzidas novas regras de saldo para criação/exclusão individual de lançamentos. O guard de saldo se aplica à edição; o lock de carteira cobre todas as mutações. Históricos já inconsistentes podem exigir conciliação antes de aceitar uma edição.
- Depois do sucesso, cache de posições, recebimentos, histórico e totais invalidado. Dados públicos faltantes continuam sinalizados; editar uma data não inventa preços históricos.

## Testes e limites

- 25 testes aprovados em cinco arquivos (formulário, contrato RPC, hook/cache, detalhe e filtros), incluindo quantidade mínima 0,00000001 sem notação científica e rejeição de precisão monetária excedida; lint aprovado. Build de produção/PWA e TypeScript aprovados.
- Regressão geral: resumo de 894 testes aprovados em 123 arquivos, em `output/regressao-edicao-lancamentos-final.log` (fora do commit). Após essa rodada, acrescentada a recusa explícita de mais de quatro casas monetárias e testados novamente os oito casos do editor, SQL e build. A rodada anterior havia carregado a formatação antiga durante a inclusão do caso de fração mínima e falhou nesse caso; a execução estável seguinte passou.
- `supabase/tests/edit_owned_transaction.sql` executado com migration e contas fictícias aleatórias em BEGIN/ROLLBACK. Confere compra corrigida e PM, mudança de data, edição de venda com zeragem intermediária, sequência no mesmo dia, snapshot antigo, data futura, quantidade zero, venda sem saldo, atualização direta, identidade fixa e isolamento entre contas. Quantidade/PM originais preservados após falhas; custos/impostos gravados na fixture.
- As migrations de edição e exclusão foram testadas juntas; os testes de remoção de carteira e rollback tardio continuaram aprovados.
- Consulta posterior: zero contas de teste restantes e ambas as RPCs ainda ausentes em produção. Nenhum lançamento real foi editado e nenhuma carteira real foi excluída.
- Brave local autenticado: AAPL preenchido em USD e BBAS3 em BRL, 390 px legível, 320 × 640 com área interna rolável e sem alargamento. Conferência cancelada sem salvar; tamanho do navegador restaurado. Envio real pelo navegador não exercitado porque a migration ainda não está publicada; fluxo de salvamento coberto por testes de componente/serviço e SQL.

Validação no aparelho físico da nova edição permanece posterior à publicação; iOS está adiado por decisão do responsável.
