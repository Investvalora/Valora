# Rentabilidade histórica: movimentos e cobertura

## Problema corrigido

A soma das posições atuais em dias com cobertura diferente de preços gerava patrimônio parcial. A volta de cotações podia aparecer como rendimento. A antiga comparação entre saldos também não separava entradas e saídas de capital.

## Comportamento

O novo cálculo reconstrói quantidades por carteira/ticker a partir de compras e vendas, incluindo ativos vendidos. Uma posição sem movimentos usa o cadastro como abertura na data de aquisição. Divergência entre razão e quantidade atual impede o cálculo; não é criado um saldo inicial por suposição.

Para cada dia: `(saldo final + vendas líquidas + renda paga) / (saldo anterior + compras com custos) - 1`. Os fatores diários são compostos por mês. Por não haver horários de execução, a convenção considera compras no início do dia e vendas no fim. Isso é uma aproximação diária explícita, não uma afirmação de TWR intradiário exato. A carteira não possui um saldo de caixa independente neste modelo; compras e vendas representam entradas/saídas da exposição investida.

Preços podem ser carregados da última data anterior por até dez dias para acomodar calendários diferentes. Ausência de histórico inicial, preço mais antigo, câmbio ausente, movimento incompatível ou indexador sem cobertura resultam em lacuna. Não há uso de preço futuro, FX atual ou soma parcial como saldo completo. Pares cripto BRL podem usar história USD com FX histórico disponível. Cupons/resgates de renda fixa entram pelos eventos e saldo contratual; a renda fixa continua sendo estimativa bruta sem marcação a mercado.

Proventos entram apenas no pagamento, usando os registros existentes de elegibilidade/importação e o FX histórico da moeda do recebimento. O cálculo não comprova a qualidade dos dados da API nem a conciliação com extratos.

Meses sem cobertura ficam sem percentual. Uma lacuna no intervalo impede o acumulado desse intervalo e o gráfico da carteira, embora meses posteriores completos possam ser apresentados individualmente. Um período recente completo pode ter retorno mesmo quando o histórico total está incompleto. Preservada a apresentação por meses encerrados, com resultado parcial para carteira iniciada no mês corrente. Início e Desempenho usam a mesma base, com aviso de cobertura e metodologia.

## Verificação

- Regressão completa: 695 testes aprovados em 81 arquivos. Após adicionar dois cenários finais, 16 testes dirigidos de cálculo e integração aprovados. Build web/PWA e ESLint aprovados.
- Cenários: aporte estável sem rendimento, venda total com ganho realizado, nova posição sem retroatividade, calendários diferentes, ausência inicial de preço, preço antigo, FX futuro rejeitado, custos, proventos em USD, razão divergente, cupom/resgate, períodos e isolamento por carteira/classe.
- Conferência local com `pnpm dev`, Brave e sessão existente: histórico total sem cobertura aparece como `—` e aviso; um intervalo recente completo apresenta retorno. Patrimônio, custo e ganho em reais continuam disponíveis. Nenhuma posição ou movimento foi alterado para obter o resultado.

## Escopo e publicação

Sem migrations, mudanças no banco, preenchimento artificial de histórico ou publicação direta. A tabela por ativo continua apresentando ganho sobre o preço médio; a alteração trata do retorno histórico agregado e da tabela mensal. Histórico faltante precisa ser obtido da fonte; corrigir o algoritmo não inventa esses dados. Merge reservado ao usuário.
