# Correção do orçamento Alpha por chave

O coletor passa a reivindicar tarefas por `claim_alpha_provider`, consultando o saldo do pool privado de fingerprints. O bloqueio legado de 20 consultas globais continua disponível apenas para clientes antigos; o caminho novo não o utiliza.

Cada chamada HTTP, inclusive a primeira, deve passar por `reserve_alpha_key`. A reserva debita uma consulta no contador da chave e no agregado diário sob o mesmo lock transacional. Reivindicar uma tarefa não debita consulta. Ao consumir 20 de uma chave, a reserva seleciona outra; bloqueios explícitos do fornecedor continuam sendo respeitados. Pool limitado a oito credenciais únicas e teto agregado de segurança de 160, sem garantia de cotas independentes no provedor. Se o fornecedor retornar recusa, aplica-se cooldown e o coletor não insiste na mesma chave.

Uma única chave também segue o caminho atômico, sem atalho HTTP. Contadores anteriores não são alterados. Com seis chaves, o saldo local é a soma dos saldos individuais, sem tratar o consumo global de 20 como esgotamento de todo o pool.

Health agora informa `configured_keys`, `available_keys`, `per_key_daily_limit`, `key_daily_remaining`, `effective_daily_remaining`, `global_safety_limit` e se a configuração está recente. O saldo considera bloqueios persistentes e consumo de chaves removidas não reduz os contadores existentes.

Publicação após merge: aplicar `alpha_per_key_budget`, publicar a Edge e executar uma rodada limitada. Não altera vencimentos/prioridades de MRX/PR nem saldos financeiros. Testar no QA uma chave em 20, agregado em 20, segunda disponível, pool inteiro esgotado, lease inválido e RPC privado; depois verificar a reserva real em produção. Reconhecimento de chave não equivale a confirmação de acesso ao endpoint.

Validação local em 17/11: 287 testes em 30 arquivos aprovados no ambiente DOM do projeto; Deno, TypeScript, importação Node e lint aprovados. A primeira tentativa de regressão ampla em ambiente Node puro foi descartada por ausência de document nos testes React e repetida com DOM, passando. Após recuperação do Docker, migration aplicada no QA e 25 baterias SQL aprovadas. A expectativa antiga de esgotamento global foi substituída por fixture de chave realmente esgotada. Também há teste de fila atrasada com saldo em outra chave, evitando herdar o stale=false do teto legado. Nenhuma alteração de produção nesta correção.
