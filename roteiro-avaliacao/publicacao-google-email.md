# Preparação de publicação e envio de email — 25/10/2026

## Publicação concluída — 25/10

Páginas aprovadas publicadas pela PR https://github.com/Investvalora/Valora/pull/69, merge commit 28a0ef5cc220b2150b825350021dca603da28cc6. Preview e produção Vercel passaram. As três rotas e a navegação foram conferidas no navegador em https://investvalora.vercel.app. Homepage /sobre, privacidade /privacidade e termos /termos salvos no Google Cloud; painel confirmou Branding changes saved.

Após autorização explícita do usuário ("Sim, publicar o OAuth para contas Google externas"), a publicação foi confirmada. O painel Audience do projeto valora-512619 exibiu Publishing status: In production e User type: External. A restrição ao grupo de testes foi retirada. A revisão automática havia bloqueado a tentativa anterior por falta dessa autorização específica; o novo clique ocorreu somente após a resposta do usuário. Não foi realizado novo login com uma segunda conta externa nesta etapa.

Publicação feita em branch isolada codex/public-pages a partir da main, somente com os cinco arquivos das páginas/links/teste. As demais correções locais permanecem no checkout original. Oito testes, build TypeScript/Vite/PWA e lint passaram novamente na versão isolada. Checkout de publicação limpo e arquivamento gerenciado confirmado após o merge.

## Páginas locais prontas para revisão

- Apresentação: http://localhost:5173/sobre
- Privacidade: http://localhost:5173/privacidade
- Termos: http://localhost:5173/termos

Rotas acessíveis com e sem sessão, fora de PublicOnlyRoute/ProtectedRoute. Links adicionados ao rodapé das telas de acesso e às três páginas. O texto anterior de aceite automático no login foi substituído por acesso aos documentos, sem acrescentar registro de consentimento ou checkbox.

Texto base descreve os dados realmente encontrados no código: cadastro, carteira, Google apenas para identificação básica, Supabase, hospedagem Vercel, provedor de email e armazenamento de sessão/preferências no navegador. Não promete retorno de investimento, entrega de email ou segurança absoluta. Não foram inventados CNPJ, endereço, representante, prazo numérico de retenção ou URLs já publicadas.

Por orientação expressa do usuário, a identificação pública permanece apenas Valora, com o email do projeto como contato, sem nomes de pessoas. Em 25/10 o usuário confirmou que revisou e aprovou os textos e pediu para deixar os assuntos do SendGrid de lado. Publicação das páginas aprovada; SMTP e limites de envio preservados.

Após revisão e deploy, conferir HTTP/rotas e navegação sem autenticação e configurar no Google:

- Home: https://investvalora.vercel.app/sobre
- Privacidade: https://investvalora.vercel.app/privacidade
- Termos: https://investvalora.vercel.app/termos

Links salvos no Google somente após a publicação e a conferência das páginas. Sem domínio comprado, a implantação continua na Vercel existente.

## Capacidade real de envio — assunto adiado pelo usuário

Painel Authentication → Rate Limits consultado em 25/10: limite de email **30 por hora**, intervalo mínimo por usuário **30 segundos**. Valores preservados. SMTP próprio SendGrid já está ativo, mas isso não remove os controles do Supabase Auth.

Há duas camadas: rate limit do Supabase e cota/controles do provedor SMTP. Com SMTP próprio, a documentação permite configurar o limite de email do Supabase. Gmail pessoal também tem limite diário (a documentação informa bloqueio ao ultrapassar 500 emails/dia, além de controles de abuso). Não há recomendação de trocar para Gmail para ganhar capacidade.

SMTP Gmail é uma alternativa gratuita de baixo volume sem domínio próprio, mediante conta elegível com 2FA e senha de app; não garante inbox. Como o usuário priorizou capacidade, o SendGrid foi preservado. Nenhum segredo ou configuração de envio foi alterado.

O plano/cota SendGrid não foi confirmado: o painel redirecionou ao login. Não classificar a conta como ilimitada sem verificar Billing/Usage. A chegada ao spam segue pendente de diagnóstico por cabeçalhos, alinhamento de remetente, conteúdo e reputação; não atribuir uma causa única sem evidência.

Fontes oficiais:

- https://supabase.com/docs/guides/auth/rate-limits
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/kb/troubleshooting/using-google-smtp-with-supabase-custom-smtp-ZZzU4Y
- https://support.google.com/mail/answer/22839?hl=pt-BR
- https://support.google.com/accounts/answer/185833?hl=pt-BR
- https://www.twilio.com/docs/sendgrid/for-developers/sending-email/sender-identity

Validação: oito testes passaram (rotas públicas e login), build TypeScript/Vite/PWA e lint dos arquivos alterados passaram; navegação real entre Sobre e Privacidade conferida localmente. Alterações sem novo commit ou publicação.
