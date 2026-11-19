# Ajuda contextual

Ícones “i” dentro dos elementos que explicam, sem faixa global no topo. No início ficam nos cards de patrimônio, proventos e rentabilidade. Nas demais telas ficam junto aos títulos dos gráficos, tabelas, composição, score, comparação, estratégias e regras de alerta. Cada ferramenta possui ajuda junto ao seu título; no lançamento rápido ela fica ao lado do rótulo Quantidade.

Reposicionamento validado localmente com 54 testes, build e lint aprovados. Em 390 × 844, documento com largura de 390 px, sem faixa de ajuda superior. Fechar a ajuda de quantidade por Escape preserva o lançamento e devolve o foco ao ícone. Nenhuma operação financeira foi gravada. Este reposicionamento ainda não está publicado.

Os 13 tópicos centralizados explicam significado, uso, regras e um exemplo numérico. Os diálogos reutilizam o Modal acessível, incluindo Escape, foco e retorno ao acionador. Botões têm rótulo específico, área mínima de 36 px e não submetem formulários. Não dependem de hover.

Validação local: 25 testes passaram (ajuda, shell, ferramentas e lançamento). Navegador autenticado: ajuda do planejador aberta, fechada por Escape e conferida a 390 × 844; diálogo entre x=16 e x=374, documento com largura de 390 px. Nenhum lançamento ou meta foi gravado.

A PR #180 foi mergeada na main antes da #181. Como a #181 tinha a branch da #180 como destino, suas alterações não chegaram à main. Esta entrega reaplica somente o commit das ajudas sobre a main, sem duplicar a correção de carregamento. A homologação em produção aguarda esse merge.
