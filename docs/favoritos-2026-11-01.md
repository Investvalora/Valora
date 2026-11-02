# Favoritos por conta

Implementação local: botão Favoritar/Favoritado no resumo do ativo e lista em Ativos > Favoritos. A lista permite abrir o resumo ou remover um favorito, mostra nome/classe/moeda e orienta como adicionar quando vazia. Funciona para ativos do catálogo, mesmo sem posição. Não cria lançamentos nem altera patrimônio; favoritos independem da carteira selecionada.

Persistência preparada em asset_favorites com chave usuário/ticker, referências a Auth e catálogo e RLS de leitura/inserção/exclusão por auth.uid(). Sem acesso anônimo nem UPDATE concedido. O cache inclui o usuário, revalida após sucesso e ao recuperar foco. Erros preservam o estado e permitem nova tentativa; falha de leitura não aparece como lista vazia. A mudança não depende de plano pago.

Validação: cinco testes de favoritos (adicionar/remover, falha e nova tentativa, navegação, vazio e falha de leitura), seis do detalhe e três do catálogo aprovados. Lint dos arquivos novos aprovado. Teste SQL da migration em BEGIN/ROLLBACK aprovado para persistência, prevenção de duplicatas, remoção, isolamento entre contas e tentativa de forjar proprietário. Zero fixtures restantes; tabela não publicada.

TypeScript e build de produção/PWA também aprovados.

Migration preparada: 20261101030740_asset_favorites.sql. Aplicar antes do deploy do frontend. Ainda não aplicada em produção. Teste visual com persistência real e homologação física após aplicação/publicação permanecem pendentes.
