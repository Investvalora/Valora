# Recebimentos por extrato

Em Proventos, use **Importar recebimentos**, selecione o CSV e confira a prévia. **Validar no banco** não grava créditos. A gravação exige marcar a conferência e usar **Confirmar importação**.

O arquivo deve ser UTF-8, separado por ponto e vírgula, com até 300 KB e 500 créditos. Use o modelo da própria tela. Não envie arquivos contendo senha, conta bancária, documento ou outros dados pessoais: o formato precisa somente dos campos abaixo.

| Campo | Conteúdo |
|---|---|
| corretora | Nome estável da corretora; normalizado para minúsculas |
| referencia | Identificador único do crédito no extrato, preservado em toda reimportação |
| data | Data efetiva do crédito, AAAA-MM-DD ou DD/MM/AAAA |
| ticker | Código já cadastrado no Valora, em maiúsculas |
| tipo | `dividend` ou `jcp` |
| moeda | `BRL` ou `USD`, igual à moeda cadastrada do ativo |
| bruto | Valor bruto confirmado no extrato |
| imposto | Retenção confirmada; preencher 0 somente quando comprovadamente zero |
| tarifa | Tarifa confirmada; preencher 0 somente quando comprovadamente zero |
| liquido | Bruto menos imposto e tarifa, exatamente na moeda original |
| quantidade | Opcional; vazio significa desconhecida |
| valor_unitario | Opcional; vazio significa desconhecido |
| data_com | Opcional; data COM confirmada, nunca presumida pela data do crédito |

Valores monetários aceitam vírgula ou ponto decimal, até oito casas, sem separadores de milhares, sinais ou símbolos. Quantidade aceita até oito casas e valor unitário até dez. Não converter dólares para reais no arquivo. O histórico continua usando a conversão já existente na apresentação; os custos do extrato são identificados na moeda original.

## Repetição e conciliação

A mesma corretora/referência com o mesmo conteúdo é ignorada como já importada. A mesma referência com outro conteúdo é um conflito; não altera o crédito anterior. Corrija o arquivo de origem em vez de inventar outra referência para contornar o bloqueio.

Créditos antigos sem referência que coincidam em ativo/tipo/moeda e data de pagamento ou data COM exigem conciliação manual. Referências distintas para o mesmo evento não podem ser identificadas com certeza automaticamente. Pagamentos parcelados devem manter referências próprias.

Um lote é transacional: qualquer erro na validação do banco desfaz suas gravações. Entretanto, se a conexão cair após enviar a confirmação, o cliente pode não saber se o banco concluiu. Nesse caso, valide novamente o mesmo arquivo; a identificação estável evita repetir os créditos já gravados.

Cada importação confirma somente suas linhas. Não confirma um mês inteiro, não substitui o calendário público e não cria compras, vendas ou quantidades de posições.

## Publicação

A migration `20261118205935_receipt_statement_import.sql` precisa ser aplicada antes de usar a importação. A leitura de históricos antigos possui compatibilidade quando as colunas opcionais ainda não foram publicadas. Os créditos novos exigem a RPC publicada. Nenhuma migration desta entrega foi aplicada em produção durante a implementação.
