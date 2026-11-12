# RP-09 — preservar revogação confirmada durante a recuperação

A revisão encontrou que iniciar uma nova tentativa removia o diálogo de sessão revogada antes de receber a resposta. Se a nova verificação falhasse por rede/timeout/503, a interface passava a mostrar apenas o aviso de indisponibilidade. Uma falha temporária não é evidência de recuperação de uma sessão já revogada.

O diálogo agora permanece durante a tentativa e após indisponibilidade. Nesse caso explica que não conseguiu verificar o novo login. A liberação exige resposta sem erro e usuário correspondente à sessão atual. Usuário ausente/incompatível não é tratado como validação bem-sucedida. Falhas temporárias sem revogação anterior continuam como aviso, sem logout. Formulário permanece montado; escopo de logout e autorização no servidor não foram alterados.

Validação controlada: 10 testes em dois arquivos aprovados, cobrindo revogação→tentativa pendente→503→validação da mesma conta, usuário ausente/incompatível, timeout, resposta tardia, reautenticação da mesma conta e isolamento na troca de identidade. Nenhuma sessão real foi revogada e nenhum lançamento foi alterado. Homologação conjunta e reteste entre dispositivos reais permanecem pendentes; RP-09 não foi encerrado.

Referência consultada: [getUser](https://supabase.com/docs/reference/javascript/auth-getuser), além do changelog do Supabase; sem mudança de SDK ou API nesta etapa.
