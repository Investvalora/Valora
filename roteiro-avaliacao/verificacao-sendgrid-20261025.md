# Verificação SendGrid — 25/10/2026

Revisão somente de leitura na conta autenticada, retomada a pedido do usuário.

- Email API: Free Trial, 100 emails/dia. Painel indicava 1 enviado e 99 restantes no dia.
- Teste gratuito termina em 18/11/2026; painel agenda mudança para End Of Trial. Não assumir continuidade gratuita após essa data.
- Sem forma de pagamento cadastrada. Nenhum plano contratado ou alterado nesta revisão.
- Remetente valorainvestbr@gmail.com com Single Sender Verification: Verified.
- Sem Domain Authentication nem Link Branding. A verificação individual não equivale à autenticação de domínio; o projeto não controla DNS de gmail.com.
- Open Tracking e Click Tracking aparecem Enabled na listagem carregada. Os links são reescritos pelo SendGrid. Nenhuma configuração alterada.
- Activity Feed de 22 a 25/10: oito mensagens, cinco Delivered e três Not Delivered. A confirmação do alias de homologação consta como Delivered, com um clique. Delivered confirma aceite pelo servidor destinatário, não chegada à caixa principal; usuário relatou spam nesse teste.
- Melhoria proposta: desativar rastreamento de cliques e aberturas para emails de autenticação. Usuário decidiu manter a configuração atual por enquanto; proposta adiada. Não alterar as opções globais da conta.

Fontes oficiais consultadas: https://www.twilio.com/en-us/products/email-api/pricing e https://support.sendgrid.com/hc/en-us/articles/18283315979931-Troubleshooting-Verified-Sender-Identity-Error . A Twilio desaconselha remetentes de provedores gratuitos por causa de políticas DMARC.
