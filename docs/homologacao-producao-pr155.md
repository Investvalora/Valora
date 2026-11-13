# Homologação PR155 — 13/11/2026

## Reteste HTTP concluído — 16h23 Brasília

Nova chave autorizada pelo usuário salva no backend em `MARKETSTACK_API_KEY_3`, sem chave em arquivo/repositório. Reteste restrito ao modo `providers` da função publicada, sem workflow amplo: Alpha bloqueado por cota; GOOGL era a única nova tentativa elegível da Marketstack. Requisição interna `7145`, HTTP 200, sem timeout:

```json
{"provider":"marketstack","ticker":"GOOGL","events":5,"error":null,"metadata_variations":1,"audit_saved":true,"received_income_created":0}
```

Tarefa GOOGL com sucesso às 19h23 UTC, sem erro, lease liberada e solicitação única não mais pendente. Snapshots preservam as duas declarações (Alpha 27/01; Marketstack 04/02), com valor USD 0,21 e datas econômicas coincidentes. Diagnóstico classificado `metadata_only=true`. Auditoria do job **partial**, com zero erros, conservando a ressalva de metadado e o adiamento Alpha por cota. Uma consulta da nova chave consumida dentro do orçamento.

Checksums de lançamentos, posições e 208 recebimentos pessoais continuam iguais aos registrados abaixo. **Homologação ponta a ponta desta correção concluída.** Este resultado substitui a pendência de nova consulta descrita no registro inicial abaixo; não encerra cobertura/cadência geral dos fornecedores.

Merge `20094c6c01e9e457c33016b2b9c2c463b57e318a`. Checks da PR e CI/main `43489322650` aprovados.

Migration `dividend_declaration_metadata` aplicada via MCP, versão hospedada `20261113191056`. Função internacional publicada ACTIVE v17, com os arquivos versionados. Autenticação própria/OIDC preservada: POST sem autenticação retornou 401. Helper privado sem EXECUTE de anon; authenticated sem UPDATE da classificação. Health advisor sem achados.

## Validação de GOOGL em produção

Replay da resposta real já armazenada da Marketstack (quatro observações aceitas e o evento diagnosticado de março) usando as novas funções em transação com rollback:

```json
{"error":null,"conflicts":0,"observations":1,"reconciled":0,"metadata_variations":1,"received_income_created":0}
```

O caso 27/01 versus 04/02 é aceito como metadado sob as guardas de concordância econômica; nenhuma data é escolhida ou sobrescrita. O rollback não gravou atualização fictícia de fornecedor nem classificou o teste como nova consulta HTTP. A tarefa preservou o erro histórico e `last_attempt_at` de 18h36 UTC; a solicitação de tentativa única segue elegível, sem lease retida.

## Limite da homologação

**Ainda falta a consulta HTTP real após publicação.** A leitura inicial do health mostrava uma consulta restante no retrato de preflight anterior. O contador atômico confirmou que a nova chave já havia usado duas consultas; o novo preflight com as seis chaves configuradas retornou `false`. Health atualizado: zero chaves disponíveis, quatro unidades globais restantes, orçamento efetivo zero. Aguardar renovação em 14/11 00h UTC, equivalente a **13/11 21h Brasília**.

Não foram zeradas cotas nem reaproveitadas credenciais para desviar do orçamento. Nenhum workflow amplo foi disparado nesta rodada. O job automático das 19h11 UTC registrou parcial por indisponibilidade de orçamento. Após a renovação, verificar resposta real GOOGL com `metadata_variations=1`, ausência de conflito econômico, lease liberada e auditoria parcial explícita; só então encerrar o reteste HTTP.

## Preservação

Antes/depois: 272 lançamentos, checksum `f88fa98884ab110a7b5586e5a34acf7b`; posições `99ec048cc73ed73f84c1f3b08b999ec1`; 208 recebimentos pessoais, checksum `14453d1c05f93ee28296f0cea79b5f17`. Todos preservados.

Publicação, segurança e regra de conciliação aprovadas. Homologação ponta a ponta com nova resposta do fornecedor permanece pendente de cota. Sem mudança visual nesta entrega.
