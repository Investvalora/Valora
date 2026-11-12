# RP04 — consistência da prévia do score

Encontrada leitura direta de fundamentos na prévia, diferente do catálogo usado pelo cálculo final. A prévia podia aprovar uma regra Dívida/PL de fonte incompatível ou demonstrativa e tratava dados ausentes como condição reprovada. Também exibia pontos negativos com sinal `+-` e números sem unidade/localização consistente.

Correção: prévia usa `indicatorValue`, incluindo compatibilidade por classe quando disponível na posição. Formatação compartilhada mantém unidades do catálogo, sem multiplicar ou converter limites. Dados ausentes mostram “Sem dados · 0”; condição falsa continua “Não atende · 0”. Pontuação negativa preserva o sinal correto. Painel de fundamentos reutiliza a mesma formatação, mantendo a precisão visual anterior de duas casas.

Validação direcionada: 23 testes passaram (prévia, catálogo, fundamentos e rascunhos). Não há gravação no Supabase, alteração dos limites antigos ou mudança da fórmula do score final. RP04 permanece parcial: interpretação dos limites legados de Dívida/PL depende do responsável; essa correção não os converte automaticamente. RP06/07/09 continuam com os critérios próprios de validação física e entre dispositivos.

Homologação visual local concluída no navegador integrado autenticado: regra Dívida/PL mostrou limite 1,5%, valores observados percentuais e ausência de dados separada de condição falsa. Alteração temporária de pontos para -2 mostrou “Atende · -2”; cancelamento retornou à lista com os pontos originais +2 e limite 1,5 preservados. Nenhuma regra foi salva. Formulário conferido em largura móvel, sem corte horizontal nos campos e ações.

Regressão ampliada: 87 testes em 12 arquivos passaram. TypeScript, lint direcionado e build de produção/PWA aprovados. O build precisou executar fora da restrição de leitura do sandbox; apresentou somente avisos de anotações de dependência. Publicação e homologação em produção continuam pendentes.
