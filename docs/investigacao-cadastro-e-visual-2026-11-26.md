# Cadastro por email e preservação visual — 26/11/2026

## Falha de envio confirmada

Consulta somente leitura aos logs Auth de produção, janela de 25/11 a 26/11. Nenhuma mensagem enviada, conta criada, confirmação desativada ou configuração SMTP alterada.

- SMTP respondeu `451 "Authentication failed: Maximum credits exceeded"`.
- `/signup`: sete erros registrados em 26/11, de 09:56:42 a 19:51:18 (Brasília), HTTP 500.
- `/recover`: seis erros, de 19:14:44 a 19:20:21 (Brasília), HTTP 500.
- A última falha de cadastro é consistente com o incidente relatado. A falha acontece durante o envio no servidor, não na montagem visual do formulário.
- O levantamento de 07/11 identificou SMTP SendGrid e trial com término previsto em 18/11. Isso não comprova o plano atual: falta conferir Your Products, uso e faturamento no SendGrid. O bloqueio de créditos está comprovado; seu motivo contratual específico ainda não.

Providência: verificar o produto Email API no SendGrid e regularizar seu limite/plano, ou avaliar outro SMTP mediante configuração explícita. A documentação também prevê limite indevido a ser tratado com suporte. Não comprar plano, trocar credenciais, enviar testes nem desativar confirmação automaticamente. Após regularizar, fazer um único cadastro controlado autorizado e correlacionar resposta Auth com entrega.

Fonte: https://www.twilio.com/docs/sendgrid/for-developers/sending-email/smtp-errors-and-troubleshooting
Complemento: https://support.sendgrid.com/hc/en-us/articles/35466138799899-Troubleshooting-Maximum-Credits-Exceeded-Errors-After-Upgrade

## Migração para Brevo

O responsável informou ter concluído a configuração no Supabase. Parâmetros públicos orientados: `smtp-relay.brevo.com`, porta `587`, login SMTP fornecido pelo painel e chave SMTP inserida pelo responsável. Não há segredo no código nem alteração do serviço de cadastro: o Supabase continua gerenciando confirmação, recuperação e tokens.

Consulta posterior não retornou nova tentativa de cadastro/recuperação depois do último erro acima. Isso não comprova funcionamento do Brevo. Falta solicitar uma recuperação controlada na conta de teste, correlacionar o resultado Auth e confirmar recebimento/abertura do fluxo pelo titular. Não incluir links ou códigos na evidência. Navegador continua indisponível nesta rodada por falha interna de inicialização.

## Auditoria do visual do Kauê

Referência remota após fetch: origin/main `0580b09`; branch local da sexta bateria `d003270`.

- PR #191 / `13a5c92`, `73593d5`: resumo mobile, modais, posições, altura útil e rolagem de conta preservados. Os arquivos de viewport, CSS, modal e informação não foram revertidos depois da integração mais recente.
- PR #188 / `c28a565`: melhorias de composição e gerenciamento de carteiras incorporadas. A sexta bateria muda validação de nomes, preservando a estrutura dos formulários.
- `379224d`: refinamentos de gráficos, comparação e experiência mobile preservados; alterações posteriores adicionam carregamento, informação e contenção do tooltip. Eixo fixo, rolagem e estilo do tooltip permanecem no código.
- Autenticação: as mudanças de AuthLayout/authStyles posteriores a `a18f168` incluem o próprio refinamento `4c9f34e`, não uma restauração acidental por nossos commits.
- Alterações nossas identificadas: status de atualização no topo/mobile; grid dos KPIs em duas colunas até xl na sexta bateria; traço de valor ausente neutro; skeletons e política de movimento; fonte local e navegação sem snapshot síncrono para desempenho.

Não foi encontrada reversão acidental nas áreas e commits comparados. Essa conclusão é documental (diff/histórico), não uma nova aprovação visual em todos os dispositivos. A ferramenta de navegador falhou ao inicializar nesta rodada; não foi possível conferir o painel SendGrid visualmente.
