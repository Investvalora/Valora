# Chaves adicionais Alpha Vantage

Cinco credenciais adicionais cadastradas no Vault, sem valores em arquivos versionados. O backend lê `alpha_vantage_key_2` a `_6` pelo leitor restrito; mantém a credencial principal existente. O pool admite no máximo oito credenciais únicas, incluindo env, lista e entradas numeradas. Nenhum fingerprint ou segredo aparece no retorno do coletor.

Failover limitado a recusa explícita por limite, credencial inválida ou frequência. Cada tentativa usa reserva atômica e lease válido; uma mesma credencial não é repetida no mesmo lease. Falhas de rede, conteúdo inválido e exigência de plano pago não causam troca de chave. Cooldowns persistem entre instâncias Edge.

O orçamento global continua em 20 consultas por dia, compartilhado por todas as chaves. A primeira tentativa já é cobrada pela reivindicação da tarefa; retries debitam esse mesmo orçamento, sem duplicar a primeira cobrança. Adicionar credenciais não comprova cotas independentes e não desbloqueia a execução após o teto interno. Sem reset de uso, mudanças de prioridade ou mutação de carteiras.

Configuração de produção: credenciais já armazenadas; código e migration devem passar por merge antes de publicar a função. Não foram feitas consultas reais às cinco novas credenciais, pois o orçamento diário atual já estava esgotado. O cadastro não equivale à validação de acesso aos endpoints.

Execução manual solicitada em 16/11: [43940351497](https://github.com/Investvalora/Valora/actions/runs/43940351497), aprovada em 27s, duas filas públicas consultadas, zero falhas e nenhuma tarefa pública devida. Nenhum fornecedor consultou eventos: Alpha sem orçamento (20/20), demais sem tarefa devida. O resultado não homologa o failover local nem encerra as pendências de cobertura. Não foram alterados limites ou vencimentos das tarefas.
