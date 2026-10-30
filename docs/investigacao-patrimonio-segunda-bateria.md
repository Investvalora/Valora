# Investigação de patrimônio — Início versus Ativos

Data: 30/10/2026. Base: `481ddb6`. Origem: DEF-02 do [relatório V.2](https://drive.google.com/file/d/1-Bt9wbgPgfgB8Pxq5CwlxKSHCbv3Vfu-/view), que registra R$ 523,60 no Início e R$ 2.230,86 em Ativos.

## Resultado

**Encerrado na versão atual após reteste e alinhamento com o responsável em 30/10.** A divergência não foi reproduzida nos cálculos atuais nem na sessão disponível em produção. A causa histórica e a correção específica responsável não foram determinadas. Não foi confirmada a hipótese de exclusão de renda fixa no Início. Os dados persistidos compatíveis com a composição descrita no relatório foram encontrados e conferidos por consultas somente de leitura. O teste integrado dos hooks das duas telas concorda com a soma desses dados.

Isso não invalida a captura do avaliador nem comprova que a interface autenticada dessa conta mostrou o mesmo valor durante o teste original. Não houve acesso à sessão do avaliador, impersonação ou alteração de seus dados.

## Conferência da massa

Foi localizada a carteira com as duas ações e o lote de renda fixa descritos no relatório, distinguindo-a de outro cadastro de nome semelhante com carteira vazia. Nenhum identificador de usuário ou email foi copiado para este documento.

| Componente | Base consultada de 30/10 | Valor |
| --- | --- | --- |
| PETR4 | 10 unidades × R$ 53,20 | R$ 532,00 |
| KLBN4 | 31 unidades × R$ 3,38 | R$ 104,78 |
| Renda fixa ativa | Saldo persistido do único lote | R$ 1.600,00 |
| Total | Ações + renda fixa | **R$ 2.236,78** |

Não faltavam cotações dessas duas ações na janela atual, não havia conversão de moeda e as outras duas carteiras da mesma composição estavam vazias. A posição KLBN4 foi criada em 29/10 às 16:48:00 de Brasília; o lote de renda fixa, às 16:48:48. PETR4 já existia desde 23/10. A ordem de inclusão torna relevante conferir se as capturas ocorreram antes/depois das inclusões, mas **não comprova** que isso explique a divergência.

Os preços persistidos consultados agora para o fechamento de 29/10 são diferentes da base implícita dos valores do relatório. Não há snapshot das respostas de API e do cache da sessão original. Portanto, não usar preços de 30/10 para exigir que o total atual seja igual a R$ 2.230,86 nem atribuir a diferença a um arredondamento. A pequena mudança entre totais de dias diferentes é distinta da diferença grande entre telas relatada no mesmo ensaio.

## Caminhos de cálculo e atualização

- Início recebe `useDashboard(...).totalPatrimonioBRL`, inclusive no componente móvel. Esse valor vem de `useWalletTotals`, que soma posições da carteira e renda fixa ativa.
- Ativos usa `useAtivosValuation`, com a mesma derivação de posições/câmbio e saldo de renda fixa retornado pelo mesmo serviço. Seu resultado respeita filtros de nome e classe; Início mantém a carteira completa. Comparações exigem filtros limpos.
- Inclusão/exclusão de transação invalida o prefixo de posições do usuário. Inclusão, desativação, recálculo e eventos de renda fixa invalidam o prefixo de renda fixa. Esses prefixos abrangem consultas por carteira e de todas as carteiras.
- As consultas de todas as carteiras e de uma carteira possuem entradas de cache distintas. Isso exige verificar o instante das respostas; não prova erro de cache na sessão original. Alterações por outro cliente e recálculos no servidor não equivalem a uma mutation local.
- Sem cotação, as duas derivações testadas mantêm patrimônio indisponível, em vez de apresentar apenas a parcela conhecida como total completo.

## Verificação automatizada

Foram acrescentados quatro cenários de conciliação a `useWalletTotals.test.tsx`, executando juntos os hooks de Início e Ativos:

1. Carteira mista, compra adicional, resgate parcial e mudança de cotação após invalidar os mesmos prefixos usados pelas mutations.
2. Filtro de classe em Ativos produz subtotal diferente; limpar o filtro restabelece igualdade.
3. Cotação ausente deixa o total indisponível nas duas telas.
4. Composição persistida descrita acima, com as cotações consultadas de 30/10, resulta em R$ 2.236,78 nas duas derivações.

Comando: `pnpm test:run src/modules/portfolio/hooks/useWalletTotals.test.tsx src/modules/ativos/assetValuation.test.ts --maxWorkers=2 --minWorkers=1`.

Resultado: **14 testes aprovados em dois arquivos**. Lint do arquivo de teste aprovado. Log local: `output/auditoria-segunda-bateria/investigacao-patrimonio.log`. Estes testes não simulam o clique real nas mutations nem substituem um ensaio ponta a ponta da sessão original; verificam os cálculos e a reação à invalidação correspondente.

## Reteste e encerramento

### Reteste visual em produção — 30/10/2026

Depois da investigação inicial, foram comparadas as telas publicadas em `https://investvalora.vercel.app`, usando a sessão já autenticada disponível no navegador do responsável. Não foi criada conta nova nem usada a sessão do avaliador. Navegação feita pelos links do app, aguardando o término do carregamento e conferindo a carteira selecionada.

| Carteira | Comparação Início × Ativos / Posições |
| --- | --- |
| Minha Carteira | Patrimônio coincidente |
| Investidor10 | Patrimônio coincidente |

Nas duas carteiras também coincidiram valor investido e ganho de capital. A renda fixa estava incluída no patrimônio. Não havia indicador de filtros ativos em Ativos. A seleção de Investidor10 foi restaurada ao final. Os saldos pessoais detalhados da sessão não integram esta documentação de PR.

**A divergência não foi reproduzida nessa sessão publicada.** O teste é de leitura e navegação; não abrange cadastrar/resgatar em produção, aparelho PWA instalado ou a conta específica do relatório. Nenhum lançamento ou preferência de estratégia foi alterado.

INV-01 foi **retirado das pendências ativas**, considerando os retestes consistentes e o alinhamento com o responsável de que o comportamento já foi corrigido. Não é necessário reconstruir a sessão antiga para manter este encerramento. Se a divergência reaparecer, reabrir com carteira, filtros, valores e horários das respostas registrados, comparando ambas as telas na mesma base. O encerramento não atribui uma causa histórica que não foi comprovada.

Escopo desta etapa: testes e documentação. Nenhuma fórmula, tela, configuração, registro financeiro ou migration foi alterada. Logs e advisors do projeto foram consultados antes da inspeção de dados; não se identificou nesta etapa evidência que ligue seus avisos à diferença relatada.
