# Investigações INV-02/03 — 31/10/2026

## Encerramento das investigações

INV-02 e INV-03 encerradas como **não reproduzidas na versão atual**, com causa histórica indeterminada por ausência da massa original. Não são classificadas como defeitos antigos comprovadamente corrigidos. Reabrir com ticker, preço/condição, carteira, período, sequência de ações e mensagem/captura da nova ocorrência.

O achado independente de orientação do formulário atual foi corrigido localmente: código 23505 informa duplicidade de preço/condição; 23503 orienta conferir ticker e seleção; falha desconhecida mantém mensagem segura. Layout, autocomplete, cotação sugerida e regras de criação preservados. A recuperação sem perder campos é coberta na tela atual para desktop e mobile. Código ainda não publicado.

O gráfico não exigiu mudança: mantém meses encerrados, parcial inicial e interrupções legítimas por falta de histórico. Não inventamos preços nem removemos avisos para encerrar a investigação.

Validação final: 29 testes aprovados nos quatro arquivos de alertas/hook/séries, lint dos dois arquivos de alertas alterados aprovado e build TypeScript/produção/PWA aprovado. Falhas simuladas somente nos testes; nenhum alerta de produção criado ou editado para provocar erro. A melhoria visual dos proventos é uma alteração separada já conferida localmente.

As seções abaixo documentam o diagnóstico anterior ao encerramento e à correção local.

Comparação no navegador local Brave, perfil Trabalho, acessando a versão de produção. Base revisada: `origin/main` em `1397bba`. Falhas isoladas do emulador não foram consideradas evidência de defeito do produto.

## INV-03: gráfico vazio

- Investidor10: quatro curvas visíveis, período com dados de 30/10/2025 a 30/09/2026, retorno 12M +11,36%.
- Minha Carteira: gráfico preenchido no mesmo intervalo, retorno 12M +2,84%.
- Carteira carro: patrimônio zero; exibe “Sem dados no período” e “Sem dados suficientes para a tabela mensal”, sem reutilizar a série da carteira anterior.
- Outubro não aparece na tabela mensal porque ainda é o mês corrente. Essa ausência corresponde à regra documentada de meses encerrados. Não houve alteração de fórmula.
- Testes do hook e das séries: nove aprovados, cobrindo mês fechado, parcial inicial, carteira vazia, troca de filtros, base anterior e lacunas sem inventar cobertura.

Conclusão: não reproduzido nas carteiras atuais. O relato original segue sem causa histórica determinada, pois faltam a massa e o estado daquela execução. Não há correção de gráfico justificada por este reteste.

## INV-02: criação de alerta

No navegador, formulário atual abriu, buscou MXRF11 e sugeriu cotação R$ 8,90. Campos obrigatórios e preço zero impediram envio; formulário cancelado sem salvar. Nenhum alerta novo nem push criado nesta investigação.

Achado de cobertura: `PriceAlertForm.test.tsx` testa o componente antigo `PriceAlertForm`; a tela `/alertas` usa `PriceTargetForm`, interno a `AlertsPage.tsx`. Portanto, o teste anterior de mensagens específicas por código não comprova esse comportamento na tela atual.

O formulário atual usa texto da exceção para reconhecer duplicidade e mostra mensagem genérica para os demais casos, inclusive código 23503 de ativo inexistente. É uma lacuna real de orientação ao usuário, sem comprovar a causa do erro do relatório E. Pendência: classificar os códigos 23505/23503 no formulário efetivamente usado e testar recuperação nele, preservando layout/autocomplete/cotação.

Foram adicionados três casos ao teste de AlertsPage: ticker vazio/preço zero em desktop e mobile; falha 23503 com mensagem segura, preservação de campos e segunda tentativa. Os 12 testes de AlertsPage passaram. Os três testes do formulário antigo também passaram, mas permanecem evidência somente desse componente. Total desta execução: 24 testes aprovados em quatro arquivos.

## Limites e preservação

Não houve escrita financeira, criação de conta/carteira, alerta ou push. Investidor10 restaurada ao terminar. Alterações somente em testes e documentação; nenhum código de produção alterado. Não foram simuladas falhas do provedor em produção, nem recuperada a massa original dos avaliadores.

PWA físico/iOS e push com processo do navegador encerrado continuam pendentes. Fechar o navegador pessoal durante esta comparação interromperia a sessão do responsável; não foi realizado. O teste anterior em segundo plano não equivale a processo encerrado.
