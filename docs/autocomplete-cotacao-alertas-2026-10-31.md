# Cotação na criação de alertas — implementação local

- Autocomplete por nome/ticker com nome, classe e moeda nos resultados. Apenas a seleção consulta o preço; digitar o termo consulta somente o catálogo.
- Seleção preenche o preço-alvo uma vez. Alterações de condição, re-render e foco não consultam novamente nem sobrescrevem um preço manual. Selecionar novamente o mesmo ativo também não repete a busca.
- Botão Atualizar cotação realiza uma nova consulta explícita e usa o resultado no preço-alvo. O campo continua editável. Se a pessoa digitar enquanto a consulta está pendente, a edição mais recente prevalece.
- Respostas de outro ticker ou de formulário já fechado são ignoradas. Falha mantém o preço-alvo e permite tentar novamente; ausência de cotação permite informar o preço manualmente.
- Fluxo compartilhado entre `/alertas`, Análise > Alertas e o formulário aberto pelo detalhe. No detalhe, o ticker já definido é resolvido e carregado uma vez ao abrir.
- Fonte: último fechamento disponível no backend, sem polling de preço e sem o cache antigo da carteira prevalecer sobre a consulta explícita. Quando não há preço no histórico, usa o lookup existente do servidor. Não é promessa de cotação em tempo real; data do fechamento exibida quando disponível. Nenhuma credencial nova ou alteração de provedor/plano.

Validação: oito casos específicos de autocomplete/preenchimento/edição/races/falhas/teclado aprovados; 26 testes existentes de tela/formulário/detalhe preservados. Lint e build/PWA aprovados. Conferência local autenticada com MXRF11: alvo vazio ao digitar, preenchimento R$ 8,90 ao selecionar, edição para R$ 7,50 mantida ao trocar condição e retorno a R$ 8,90 somente pelo botão. Nenhum alerta salvo durante a conferência.

Alterações locais; não publicadas. Não exige nova migration. As migrations de edição de lançamentos e exclusão de carteira continuam preparadas separadamente.
