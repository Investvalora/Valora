# Aviso após encerramento involuntário

Reteste real autorizado revogou somente a conta de teste. Responsável confirmou redirecionamento ao login sem explicação. AuthProvider aceitava SIGNED_OUT, removia a sessão e ProtectedRoute redirecionava antes que SessionRecovery pudesse manter um aviso.

Correção local: transição de identidade autenticada para sessão nula marca encerramento involuntário no estado em memória. Login desktop e móvel mostram “Sua sessão foi encerrada. Entre novamente para continuar.” Não afirma causa específica como revogação quando só conhece a perda da sessão. Novo login limpa a marca. Logout explícito usa marcador durante signOut e não gera aviso; escopo de logout e validação no servidor permanecem intactos. Visita inicial sem sessão também não gera aviso. O marcador não é credencial, não é persistido e não autoriza acesso.

Testes integrados exercitam evento SIGNED_OUT, aviso, novo login, logout voluntário e inicialização sem sessão. Homologação de produção após publicação ainda necessária; relato anterior não é considerado aprovação do aviso novo.

Validação:60 testes de autenticação passaram antes do último cenário; arquivo integrado final passou com5 testes, incluindo visita inicial sem sessão. TypeScript, lint dos arquivos alterados e build/PWA aprovados (cache `valora-static-9557b13909d2`). Sem nova revogação em produção nesta correção.
