# Homologação — PR148 — 12/11/2026

## Reteste após login — produção

- Responsável confirmou sucesso do aviso após revogação real da conta de teste em produção. Novo login na aba integrada autenticou normalmente, sem manter o aviso na tela inicial.
- Rascunho: quantidade 3 e preço 10, sem ativo e sem salvar. Fechada a aba com o formulário aberto; nova aba na mesma conta/carteira ofereceu restauração explícita. Restaurar recuperou ambos os campos e total R$ 30,00. Cancelar limpou o rascunho; reabrir confirmou campos vazios e ausência da oferta. Fechar/cancelar o próprio modal descarta o rascunho intencionalmente e não representa interrupção de aba.
- Barra inferior: 390×844 → 390×500 → 390×844, sem campo em edição. Navegação permaneceu disponível e o botão central abriu o formulário. Viewport restaurado e abas de teste fechadas.
- Nenhum lançamento foi salvo; carteira Investidor10 preservada.
- Evidências locais: output/homologacao-pr148/rascunho-restaurado.png e barra-redimensionada.png.

Esses critérios web estão aprovados. Não comprovam atualização de um worker antigo no aparelho nem ganho de desempenho físico antes/depois.

## Registro inicial (substituído pelo reteste acima)

Merge `30d732113d5020a90481edfb1ce7d3f941bb2a0b`. CI/main `43292122246` e Vercel aprovados. Entrada publicada `/assets/index-B1K33nLh.js`.

Na aba real de produção, após recarga, a sessão previamente aberta foi encerrada e o app redirecionou ao login com “Sua sessão foi encerrada. Entre novamente para continuar.” Aviso visível confirmado; nenhuma nova revogação foi executada nesta homologação. Evidência local output/homologacao-pr148/login-aviso.png.

Login solicitado ao responsável para seguir com rascunho persistente e redimensionamento. Celular ausente no ADB. Novo login, limpeza do aviso, restauração em nova aba e barra inferior continuam aguardando esta etapa. Não declarar homologação integral.
