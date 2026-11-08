# Rascunhos do detalhe e da edição de alertas — 08/11/2026

## Implementação local

- Lançamento de renda variável pelo detalhe agora guarda rascunho na sessão da aba, por conta, carteira e ticker. Restaurar preenche tipo, data, quantidade, preço e custos sem enviar a operação. O preço manual restaurado não é substituído pela cotação automática.
- Edição de alerta guarda título, descrição, preço e condição. O rascunho só é oferecido para a mesma conta e snapshot original; uma atualização no alerta não recebe texto antigo automaticamente.
- Reutiliza o armazenamento de sessão existente, com expiração de oito horas e tratamento de falha. Cancelar, fechar e sucesso removem o rascunho. Fechar a sessão da aba pode apagar o conteúdo: não é backup ou gravação offline.
- Mensagem compartilhada do rascunho ficou neutra para atender também lançamentos. Não houve mudança de layout, logo, cálculo, autenticação ou critérios dos alertas.

## Verificação

105 testes em 18 arquivos de alertas, lançamento do detalhe e hook de rascunho aprovados. TypeScript, lint dos arquivos alterados e build/PWA aprovados. Testes adicionais cobrem restauração explícita, manutenção de preço manual, isolamento entre tickers, cancelamento e snapshot alterado.

Navegador integrado autenticado local: lançamento de PETR4 com quantidade 2,5 e preço 40,12 sobreviveu à recarga e voltou após Restaurar rascunho. Edição de RADL3 recuperou título de teste após recarga. Ambos cancelados sem clicar em salvar/adicionar. Nenhuma modificação de alertas ou lançamentos no banco; carteira Investidor10 preservada. Evidências não versionadas em `output/qa-rascunhos-detalhe/`.

Reteste final em 390 × 844: lançamento do detalhe restaurou quantidade 2,5 e preço manual 40,12; Cancelar removeu o rascunho, confirmado em nova abertura. Botões do rodapé visíveis e formulário encerrado sem envio. Homologação local do escopo concluída; não representa novo teste em aparelho físico. Evidência: `lancamento-mobile.png`.

## Critérios ainda separados

- Publicação e reteste em produção desta extensão.
- Formulários antigos de cadastro de renda fixa/Tesouro e outros formulários ainda não cobertos: não encerrar RP-06 integralmente.
- RP-04: limites personalizados antigos não serão convertidos sem confirmar intenção.
- RP-07: medição física de desempenho/rede/instalação ainda necessária.
- RP-09: recuperação entre abas/dispositivos permanece com validação simulada e não deve revogar a sessão real para testar.
- Cobertura CDI, calendários de proventos e cadastro Tesouro desconhecido continuam pendentes, sem alterações nesta rodada.
