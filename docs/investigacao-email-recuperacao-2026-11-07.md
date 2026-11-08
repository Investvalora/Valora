# Investigação de recuperação de senha — 07/11/2026

## Escopo e estado

Somente leitura: código, logs Auth e configurações no painel Supabase. Não enviado e-mail, não aberta URL contendo token, nenhuma senha, chave, remetente ou configuração alterados. Skill email-best-practices usada para separar solicitação, entrega e uso do link. O acesso ao SendGrid foi solicitado ao responsável; a causa da latência permanece em investigação.

## Configuração atual conferida no painel

- SMTP personalizado habilitado, host smtp.sendgrid.net, porta587. Portanto o provedor de entrega deste fluxo é SendGrid, não Resend nem o SMTP padrão Supabase.
- Email OTP expiration3600 segundos (1 hora), OTP8 dígitos. Configuração atual não prova o valor histórico no momento do teste.
- Intervalo mínimo por usuário30 segundos. Não foi revelado valor de credencial, usuário SMTP nem remetente.
- Template de recuperação usa ConfirmationURL e tem botão Criar nova senha; a prévia não informa validade ou que reenvio pode tornar o link anterior inutilizável. Foi apenas consultada, sem salvar edição.
- Aplicativo chama resetPasswordForEmail diretamente; não existe fila local de20 minutos. O componente de redefinição usa updateUser e depois encerra a sessão. Não testado com senha real nesta investigação.

## Linha do tempo encontrada

Logs retornam timestamps UTC; tabela abaixo convertida para America/Sao_Paulo. Janela consultada:06/11 17h50–18h50 UTC. As três solicitações abaixo pertencem a uma mesma identidade segundo contagem agregada do ator (não incluído o identificador no documento).

| Horário BRT06/11 | Evento | Resultado |
| --- | --- | --- |
|15:14:46|user_recovery_requested|HTTP200|
|15:16:19|user_recovery_requested|HTTP200|
|15:31:01|Email link is invalid or has expired|erro403, sem ator correlacionável no resultado consultado|
|15:32:02|user_recovery_requested|HTTP200|
|15:32:15|login porGET, mesma identidade das solicitações|303|
|15:32:36|user_modified e logout, mesma identidade|200/204|

A primeira resposta de recuperação foi registrada16min15s antes do erro, e houve um reenvio intermediário. O erro403 não identifica por si qual link/identidade, então não afirmar que pertence ao avaliador. O login13s após a terceira solicitação e a modificação posterior são compatíveis com recuperação bem-sucedida, mas user_modified não detalha o campo alterado nos dados consultados. Não tratar200 da solicitação como prova de entrega na caixa de entrada.

As durações brutas das solicitações foram1911160867,1911454073 e2000149253; não foram convertidas em segundos sem confirmar a unidade do campo. Nenhum erroSMTP/rate-limit foi encontrado nos filtros da janela diária06/11; ausência no filtro não prova entrega rápida nem ausência de falha do provedor.

Correção da limitação da triagem anterior: o campo path dos eventos Auth relevantes está como/, então filtro literal por/recover ou/verify não os encontra. A busca por auth_event.action recuperou as três solicitações. Não concluir ausência de uso a partir de path.

## Hipóteses e evidência

1. **Link anterior após reenvio:** hipótese compatível com a sequência. O código público Supabase sendPasswordRecovery gera e persiste um novo recovery_token em cada envio bem-sucedido. Não foi verificada a versão exata implantada nem correlacionado o token recusado, portanto causa do incidente ainda não confirmada. Fonte:https://github.com/supabase/auth/blob/master/internal/api/mail.go .
2. **Scanner ou pré-abertura:** possível para links de uso único. Supabase documenta consumo por scanners e problemas com rastreamento de links do SMTP. Não há evidência de scanner neste incidente. Fonte:https://supabase.com/docs/guides/deployment/going-into-prod#email-link-validity .
3. **Atraso da entrega:** exige comparar processed/deferred/delivered do SendGrid e cabeçalhos Received da mensagem. A documentação explica que deferred representa tentativa adiada pelo servidor destinatário; isso não foi observado na conta porque o painel SendGrid ainda não foi consultado. Fontes:https://www.twilio.com/docs/sendgrid/ui/analytics-and-reporting/email-activity-feed e https://www.twilio.com/docs/sendgrid/concepts/deliverability/deferrals .
4. **Prazo curto:** a configuração atual de1h não explica sozinha expiração em20min. Não aumentar validade sem necessidade comprovada.

## Próximos passos sem presumir causa

- Consultar atividade SendGrid de06/11, assunto de recuperação e horários correspondentes; conferir tempo processed→delivered e eventuais deferred, bloqueios ou supressões.
- Conferir rastreamento de cliques especificamente dos e-mails de autenticação. Não desativar rastreamento global sem avaliar outros envios.
- Se necessário e autorizado pelo titular, realizar uma única solicitação de teste controlada e conferir entrega/primeiro acesso, sem pedir token ou senha no chat.
- Melhorar o template com validade e instrução sobre o link mais recente; qualquer alteração deve ser revisada antes de publicação. Isso esclarece UX, não corrige uma filaSMTP por si só.

## Conclusão após acesso ao SendGrid — 07/11/2026

Esta seção substitui a limitação anterior de falta de acesso ao provedor. Conferidos Email Logs > três mensagens Resete sua senha de06/11 e Settings > Sender Authentication/Tracking, somente leitura. Não incluir emails de destinatários, IPs, IDs de mensagens ou URLs de recuperação no histórico versionado.

### Atraso confirmado e causa explícita

| Mensagem | Processada BRT | Aceita pelo Gmail BRT | Latência processed→delivered |
| --- | --- | --- | --- |
| Primeira |15:14:46|15:30:11|15min25s|
| Segunda |15:16:19|15:39:02|22min43s|
| Terceira |15:32:02|15:32:04|2s|

Primeira e segunda mensagens tiveram seis eventos deferred cada. No primeiro deferred da primeira mensagem, o Gmail respondeu421 4.7.32: limite temporário porque o domínio do From não estava alinhado com o domínio organizacional autenticado por SPF ou DKIM. A conta usa endereço de remetente @gmail.com via SendGrid, com Single Sender Verification; painel não apresenta domínio próprio autenticado. Portanto a causa do atraso dessa primeira mensagem está comprovada na resposta do servidor destinatário. Entregue significa aceita pelo servidor, não prova momento exato em que ficou visível na caixa de entrada.

O primeiro e-mail foi aberto15:30:49 e clicado15:31:01, mesmo segundo do erro de link inválido no Supabase. Já existia pedido posterior15:16:19. A terceira mensagem foi aberta15:32:14 e clicada15:32:15, coincidente com o login303 e modificação da conta em seguida nos logs Auth. A hipótese de link anterior após reenvio ganha forte suporte; sem ler/comparar tokens e sem versão histórica exata do Auth, não rotular o erro como simples vencimento temporal. A validade atual1h não explicaria sozinha esse intervalo.

### Configuração adicional observada

- Click Tracking e Open Tracking aparecem Enabled após carregamento. Reescrita dos links está ativa; não comprova que causou o403. Não foi lido nem aberto destino de link de recuperação.
- Sender Authentication oferece Authenticate Your Domain; somente remetente individual Gmail aparece verificado. Essa verificação autoriza o envio na plataforma, mas não permite configurar SPF/DKIM do domínio gmail.com.
- Conta mostra trial encerrando em18/11/2026. Isso é dependência operacional adicional a conferir para continuidade do envio, sem contratar plano nesta investigação.

### Correção recomendada, ainda não aplicada

1. Usar domínio próprio controlado pela equipe e autenticar o domínio de envio no SendGrid com os registrosDNS exigidos; conferir SPF/DKIM/DMARC e alinhamento do From. Não é possível corrigir o DNS de gmail.com como cliente.
2. Após validar domínio, trocar somente o remetente SMTP do Supabase por endereço desse domínio; manter Reply-To de suporte se adequado. Não escolher domínio/endereço por suposição nem trocar provedor/credenciais sem necessidade.
3. Evitar click tracking nos links de autenticação, preferindo exclusão específica a desligamento global; conferir outros tipos de envio antes de alterar qualquer configuração.
4. Template deve explicar validade, uso único e uso do e-mail mais recente após reenvio. Essas instruções complementam a correção de entrega; não substituem autenticação de domínio.
5. Com domínio validado, fazer uma solicitação autorizada de teste e correlacionar processed/delivered/click e redefinição, sem compartilhar token/senha. Só depois encerrar a correção como homologada.

Fontes oficiais consultadas: https://www.twilio.com/docs/sendgrid/ui/sending-email/sender-verification (alerta sobre endereços de grandes provedores e DMARC), https://support.google.com/mail/answer/81126 (autenticação/alinhamento de remetentes) e https://supabase.com/docs/guides/deployment/going-into-prod#email-link-validity (riscos de rastreamento/scanners). Causa diagnosticada, solução depende do domínio/DNS da equipe; nenhum ajuste de produção aplicado.

## Simulação controlada antes de qualquer ajuste — 07/11,21h BRT

Titular autorizou dois pedidos de recuperação para a conta de homologação já confirmada e acompanhou a caixa. Requests feitos ao mesmo endpoint público/Auth do app, com a chave pública já usada pelo frontend, redirect produção/reset-password. Nenhum segredo retornado no rastreamento. A execução por API testa envio/backend; não é submissão do formulário no navegador. Não foram alterados SMTP, template, rastreamento ou validade.

| Evento | Horário BRT | Evidência |
| --- | --- | --- |
|A solicitado|21:00:43,699|relógio do cliente|
|A aceito|21:00:45,669|HTTP200; Auth21:00:45|
|B solicitado|21:01:20,892|mais de30s após aceite deA|
|B aceito|21:01:22,659|HTTP200; Auth21:01:22|
|Link recusado|21:02:04|Auth403 Email link is invalid or has expired|
|Recuperação aceita|21:02:09|AuthloginGET303|

Usuário forneceu prints: mensagemA às21h00 na pastaSpam; mensagemB às21h01 tambémSpam, From@gmail.com e enviado/assinado por sendgrid.net. Depois relatou que ambos os links abriram a tela de mudar senha. O log mostra uma rejeição seguida de autenticação, portanto chegar ao formulário não comprova validade. A sequência é compatível com A invalidado após B; a associação exata A→403/B→303 não foi confirmada por detalhe individual dos cliques no SendGrid nesta rodada. Não ampliar a conclusão além disso.

**Defeito de UX reproduzido:** /reset-password é uma rota pública que monta o formulário sem antecipar o erro devolvido na abertura do link. ResetPasswordForm só apresenta mensagem de link inválido após falha de updateUser. Assim, o usuário percebe dois links como funcionais porque vê a mesma tela. Nenhuma senha foi submetida ou redefinida na simulação, e não há user_modified no intervalo consultado.

**Entrega:** Spam reproduzido pelos prints. Não reproduzido atraso de15–22min nesta rodada; esse atraso e o421DMARC já estão provados no incidente06/11. Não inferir tempo exato de entrega a partir do horário exibido no Gmail. A listagem SendGrid começou a indexarA como Processed e o detalhe retornou erro de carregamento; filtro manualUTC incluindo08/11 também falhou. Isso limita detalhe de entrega do teste atual, não invalida os prints ou logs Auth. Não enviar terceiro pedido para compensar atraso de indexação.

Rastreamento local: output/recovery-trace-2026-11-07.jsonl guarda apenas rótuloA/B, horário de início/fim e HTTPstatus. Prints originais permanecem fora doGit. Scripts locais não contêm chaves literais; leem somente a chave pública do frontend em tempo de execução. Nenhum token/link de recuperação foi solicitado no chat.

### Próxima correção proposta (não aplicada, conforme pedido de simular antes)

- Detectar rejeição/erro do retorno de recuperação antes de mostrar campos de senha e orientar novo pedido; validar sessão/fluxo correto sem confundir uma sessão anterior com link aceito. Preservar casos de link válido e testes desktop/PWA.
- Resolver remetente/alinhamento de domínio separadamente para Spam/deferral. Não aumentar validade nem presumir que formulário visível comprova sucesso.

### Fechamento da simulação pelo titular

O titular informou ter submetido uma nova senha e recebido sucesso. Nova consulta correlacionada à identidade dos pedidos confirmou user_modified PUT200 e logout204 às21:03:14 BRT. A senha foi alterada pelo titular, não pelo agente; isso substitui a observação anterior de ausência de alteração, que valia até21:02. Não solicitar, armazenar nem restaurar a senha.

Cronologia final:403 de link inválido21:02:04; loginGET303 às21:02:09; novo403 às21:02:39; user_modified200/logout204 às21:03:14. O sucesso de redefinição é corroborado pelo relato e pela modificação bem-sucedida no backend. Isso NÃO prova validade dos dois links: uma sessão de recuperação aceita pode permitir salvar a senha mesmo depois de abrir novamente um link rejeitado. Sem isolamento de sessão e correlação individual do token, não atribuir a atualização a ambos os links.

Resultado: recuperação válida funciona; rejeição de link também ocorreu e a apresentação do formulário não a distinguiu claramente. Spam foi reproduzido. Nenhuma configuração SMTP/Auth/template foi alterada. O erro de UX e a autenticação do domínio continuam pendentes, apesar do sucesso final do teste.

## Investigação isolada dos dois pontos restantes — 07/11

Por orientação do titular, atraso de entrega fora desta rodada. Nenhum pedido de e-mail, redefinição, logout real ou alteração de produto/configuração executados.

1. **Link rejeitado: defeito confirmado por reprodução de componente.** ResetPasswordForm não lê error/error_code da URL e não valida contexto de recuperação antes de montar campos. AuthProvider aceita sessões genericamente e não fornece estado de fluxo PASSWORD_RECOVERY ao formulário. A rota/reset-password é pública fora de ProtectedRoute/PublicOnlyRoute. Teste de caracterização com fragmento fictício error=access_denied/error_code=otp_expired comprovou formulário e botãoSalvar habilitados, semalert inicial. Esse teste documenta o defeito atual, não um critério correto de aceite. Não implica quebra do backend: os tokens rejeitados continuam sendo recusados; sessão válida anterior pode tornar a percepção enganosa.

   Correção indicada: capturar erro do retorno desde a inicialização, bloquear o formulário nesse caso e mostrar Solicitar novo link; aguardar conclusão da inicializaçãoAuth e diferenciar recuperação válida de sessão comum/antiga. Preservar recarga de um fluxo válido e compatibilidade do fluxo implícito atual; não aceitar somente type=recovery daURL como prova de autorização. Evitar exibir ou registrar tokens e error_description bruto. Testar link válido, expirado, ausência de sessão, sessão anterior e recarga. Ainda não implementado nesta investigação.

2. **404 após logout: não reproduzido pela guarda.** Novo cenário com sessão aberta foi encerrado no store de teste; ProtectedRoute removeu conteúdo privado e levou a/login, sem404. Testes existentesAuthProvider confirmam que getSession tardio não restaura sessão apósSIGNED_OUT. O fallback404 fica fora da guarda e atende URLs desconhecidas. /dashboard não existe no roteamento, enquanto/inicio e/analise/score existem e redirecionam sem sessão. Não há evidência que justifique mudar toda URL inexistente para/login; a URL exata do avaliador continua necessária. O relatório não comprova defeito da guarda nem vazamento.

Rodada final:11 testes aprovados em quatro arquivos (ResetLinkInvestigation, ProtectedRoute, AuthProvider, RecoveryRetest). Adicionados somente testes e documentação. Navegador integrado retornou Local browser use is disabled in Work settings; não houve nova homologação visual nesta rodada. A evidência de produção da simulação anterior permanece válida e foi complementada por reprodução isolada.

## Correção aplicada localmente após autorização

ResetPasswordForm agora reconhece error/error_code no retorno (query ou fragmento), preserva um sinal booleano capturado antes da inicialização do SDK e bloqueia os campos imediatamente, mesmo com sessão prévia. Não guarda nem mostra token/descrição bruta. Sem sessão também oferece novo link; aguarda loadingAuth antes de apresentar o formulário. Guarda de submissão impede chamadas durante bloqueio/carregamento. A verificação do token e autorização de mudança continuam no Supabase; uma sessão autenticada sem erro explícito mantém o fluxo anterior. Não foi introduzido rastreamento persistente de recuperação em storage, nem aceito type=recovery sozinho como autorização.

Teste de caracterização substituído por critérios corretos: retorno expirado em query/fragmento, sessão prévia, ausência/carregamento de sessão e submissão válida com tratamento de senha repetida.16 testes aprovados em quatro arquivos; TypeScript e lint aprovados. Proteção/logout retestados, sem alterar comportamento. Sem mudançaSMTP/template/validade ou envio adicional. Homologação visual não realizada, navegador desabilitado nesta sessão; publicar e testar um callback rejeitado fictício sem token real antes de encerrar homologação de produção.

## Homologação local concluída — 07/11

Navegador integrado reconectado e Vite iniciado na porta 5176. Retorno fictício com error=access_denied/error_code=otp_expired exibiu aviso e ocultou campos, inclusive com sessão anterior aberta. A conferência encontrou um segundo defeito: Solicitar novo link era redirecionado para início pela PublicOnlyRoute. Corrigido permitindo a rota de recuperação também a usuários autenticados; reteste visual abriu o formulário de envio corretamente. Nenhum email foi enviado.

Acesso sem erro explícito, com sessão válida, manteve os campos de nova senha. Não houve submissão, alteração de senha, logout real ou alteração de carteira. Isso confirma a preservação visual do fluxo autenticado, sem representar novo teste de um token real de recuperação. O teste real anterior foi realizado pelo titular.

Regressão final: 21 cenários aprovados em seis arquivos, incluindo inicialização/encerramento da sessão e acesso à recuperação com sessão prévia. Lint sem erros, com três avisos existentes. Evidências locais: output/revisao-pdf-s3/reset-link-invalido-local.png e recuperar-com-sessao-local.png. Correção ainda local, sem publicação ou nova PR nesta rodada.
