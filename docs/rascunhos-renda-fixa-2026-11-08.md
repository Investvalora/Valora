# Rascunhos dos formulários antigos de renda fixa e Tesouro

Implementação local em 08/11/2026 na branch `codex/rascunhos-renda-fixa`.

- Renda fixa: emissor, tipo, taxa, valor aplicado e datas.
- Tesouro: título, taxa, quantidade, preço unitário, custos e datas.
- Separação por conta/carteira e categoria. Trocar de categoria preserva o rascunho anterior sem aplicar seus campos na outra categoria.
- Ao reabrir o modal vazio, opções indicam quais categorias têm rascunho; abrir a categoria não restaura os campos automaticamente.
- Restaurar é explícito e não grava aplicação. As validações existentes continuam no envio.
- Cancelar/fechar o modal ou concluir o cadastro limpa os rascunhos desse modal. Descartar também permite removê-los sem restaurar.
- Reutiliza armazenamento de sessão com expiração de oito horas, limpeza no logout e aviso de indisponibilidade. Não é backup nem gravação offline.

Validação automatizada: 26 testes de formulário/armazenamento aprovados, incluindo restauração dos dois tipos, alternância de categorias, cancelamento e sucesso simulado. TypeScript, lint e build/PWA aprovados. Nenhuma aplicação foi registrada no banco e nenhum saldo foi recalculado.

Limite: trata os formulários antigos dentro de AddTransactionModal. Os pontos atuais de chamada passam ticker para renda variável; o lançamento rápido usa seu próprio formulário e já recebeu rascunho na PR114. Não foi criado um novo atalho ou substituído o fluxo atual apenas para alcançar o formulário antigo. Conferência visual desse caminho legado permanece separada; não declarar homologação visual nem física com base nos testes automatizados.

Sem migrations, mudanças de cálculo, taxas ou aplicações existentes. Publicação e homologação em produção pendentes.
