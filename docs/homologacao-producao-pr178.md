# PR178 — homologação de produção

Data: 19/11/2026. Merge `967eecf7c4ae95b25f2d36ca019a76ce4ce68d9e`.

## Confirmado

- Deploy Vercel aprovado e CI da main concluído com sucesso: https://github.com/Investvalora/Valora/actions/runs/44576468467.
- Migrations aplicadas ao projeto de produção: `whole_brazilian_trade_units` (`20261119172705`) e `wallet_planning_and_export` (`20261119172712`). Correspondem aos arquivos locais `20261119161140` e `20261119161323`.
- Dois triggers de unidades inteiras presentes. RPC `export_owned_wallet(uuid)` presente, execução negada a anon e permitida a authenticated. Todas as metas inicialmente zero.
- Rota publicada `/carteiras/planejamento` abriu autenticada, com carteira selecionada, cinco abas e metas por classe carregadas. Campo de aporte preenchido sem salvar; aba de reconciliação abriu e iniciou o carregamento do histórico.
- Nenhuma operação financeira, meta ou recebimento real foi alterado nesta homologação. As migrations não reescrevem lançamentos históricos.

## Retomada — verificações concluídas

- Navegador e revisão automática voltaram a funcionar. Teste SQL autenticado com carteira temporária e ROLLBACK aprovado: gravação de meta positiva, rejeição de meta negativa, RPC de exportação e rejeição de compra fracionária nas quatro classes brasileiras. Confirmado zero carteiras temporárias remanescentes.
- Isolamento: atualização de carteira de outro proprietário afetou zero linhas e exportação foi negada. A primeira tentativa usava equivocadamente uma carteira da própria conta; sua exceção abortou a transação. Meta original zero reconfirmada antes do reteste com outro proprietário.
- Planejador distribuiu um orçamento hipotético integralmente, sem excedê-lo nem gravar ordens. Reconciliação carregou entradas, saídas, valorização/custos, câmbio, ajuste de arredondamento e proventos separados; componentes apresentados reconciliam com o saldo final.
- Backup baixado pela interface com transações, posições, títulos e recebimentos; contagens conferidas com o banco para a carteira. Valores financeiros como strings; arquivo aprovado pelo `backupSchema` real do projeto (zero erros). Não houve envio de arquivo a terceiros nem restauração.
- Meta carregou média confirmada de 12 meses; aviso inicial de indisponibilidade desapareceu após carregamento. Persistência da meta validada por SQL com rollback, sem salvar meta na carteira real pela interface.
- Saúde dos dados exibiu fontes/datas de cotação, fundamentos, câmbio e período histórico. Sem erros/warnings no console durante a conferência das ferramentas.
- Gráfico compacto: mouse sobre agosto mostrou mês/ano e centavos exatos; seleção de novembro mostrou valor correspondente. Evidência privada em `output/homologacao-pr178/proventos-hover.png`, fora do Git.
- Responsividade: página de planejamento com viewport 390 px sem overflow horizontal; Início em 1024 px sem overflow e atalho Análise terminando em 969 px. Formulário manual de BBAS3 com quantidade 0,5 reportou `stepMismatch`, `step=1` e validade falsa; cancelado sem salvar.
- Viewport temporário restaurado. Não equivale a um novo ensaio em Android físico. Demais regressões locais/QA: `homologacao-quinta-bateria-e-ferramentas.md`.

Resultado: verificações de produção desta rodada aprovadas. Sem alteração persistente de operações, recebimentos ou metas reais. Restauração automática não faz parte da entrega.
