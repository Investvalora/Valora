# Precisão CSV e recorrência — 11/11/2026

## CSV: causa e correção

A prévia preservava os dígitos originais, mas `importTransactions` convertia quantidade, preço e corretagem para `Number`. Valores válidos para numeric(18,s), com muitos dígitos, podiam perder casas antes de chegar ao servidor. A correção envia texto decimal normalizado para a RPC existente. Não muda a convenção escolhida pelo usuário nem o lançamento manual.

A RPC publicada já converte os campos JSON em numeric sem escala limitada antes de validar, normalizar e calcular o fingerprint. Textos e números equivalentes produzem o mesmo recibo, preservando compatibilidade com importações anteriores.

Validação local:29 testes de serviço/parser/prévia/duplicação aprovados. Fixture SQL no Docker descartável aprovada com ROLLBACK: fração0,12345678, preço12,3456 e custo0,0001 persistem exatamente; repetir os mesmos valores como números não duplica;1001 linhas são rejeitadas sem gravação;1000 compras idênticas são preservadas e repetir o lote não duplica. Nenhum teste de escrita foi executado na conta real. Publicação da correção de transporte permanece pendente.

## Recálculo automático observado

Crons macro diário/retry ativos. Em11/11 às20h de Brasília, a chamada retornou HTTP503 com13 posições atualizadas e uma falha explícita de preço oficial do Tesouro ausente/desatualizado. O HTTP do cron enfileirado como succeeded não significa que todas as posições recalcularam: a resposta HTTP foi consultada separadamente. CDI continua com referência10/11; Selic11/11. Não antecipar CDI nem inventar preço para eliminar a falha. Nenhum recálculo manual nesta auditoria.

## Agendamento internacional ainda não comprovado

Workflow ativo, main correta, repositório público, não fork/arquivado, Actions habilitadas e lotes dispatch aprovados; nenhuma execução schedule internacional encontrada. Esses dados não identificam uma causa única.

A [documentação GitHub](https://docs.github.com/en/actions/how-tos/troubleshoot-workflows) orienta alterar o cron por um usuário com escrita para reiniciar agendamentos. Mudança local dos minutos7/22/37/52 para8/23/38/53 mantém15min e os mesmos controles OIDC, como tentativa de reativação. Precisa merge e observação efetiva de evento schedule; não declarar resolvido por uma execução manual. Não foi criado token permanente nem serviço pago.

## Demais prioridades

## Homologação complementar solicitada

Teste integrado adicional aprovado: arquivo com ponto decimal passa pela página real, edição, hook/mutation e serviço até o payload RPC simulado, preservando `9999999999.12345679` sem Number. Somado aos29 testes anteriores,30 cenários desta rodada aprovados; TypeScript/ESLint novamente aprovados após adicionar a integração.

No navegador integrado autenticado local (`127.0.0.1:5176/ativos/importar`), prévia sintética preservou `9999999999,12345678`, preço/custo `0,0001`; linha com nove casas `0,000000001` foi diagnosticada e desmarcada. Edição para `9999999999,12345679` permaneceu exata. Nenhuma confirmação/importação real: após recarga, somente o rascunho sintético criado nesta homologação foi descartado pela interface. Investidor10 sem alterações.

A persistência/limites foram verificados na fixture SQL descartável já descrita, não pela conta real. Esta homologação local não confirma recorrência cron: depende da publicação e de evento schedule observado após merge.

TypeScript, ESLint e build/PWA106 arquivos também aprovados. Sem alteração visual nesta correção; publicação e conferência do transporte na versão publicada continuam pendentes.

MA continua com RI403; líquido pessoal depende do extrato. Ampliar formatos/fontes SEC e confirmar ex independente continuam separados desta correção. Anúncios sem ex permanecem fora do cálculo. Não foram alteradas carteiras, operações ou recebimentos reais.
