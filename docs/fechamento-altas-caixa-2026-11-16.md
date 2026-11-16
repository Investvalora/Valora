# Correções das prioridades altas — 16/11/2026

Branch `codex/close-high-coverage`. Implementação local; não aplicada em produção.

## ITA — três eventos por cota original

Revisões explícitas: março 0,151325 USD, junho 0,16358 USD e setembro 0,25052 USD. A base é a cota original na data de pagamento, adequada à quantidade histórica, sem multiplicar o valor ajustado arredondado nem alterar quantidades/recebimentos.

[Tabela oficial indexada do emissor](https://www.ishares.com/us/products/239502/ishares-us-aerospace-defense-etf?ihpq=true) registrava os valores originais; hoje a resposta ao vivo está ajustada ao split. Os valores originais também estão nos avisos oficiais da Cboe de junho/setembro e coincidem com as observações Alpha preservadas. A revisão de março não inventa declaração: mantém esse campo desconhecido. As declarações oficiais de junho/setembro são separadas da data 2025 informada pela Alpha.

Fontes de junho/setembro: avisos de dividendos Cboe, data de declaração 12/06/2026 e 14/09/2026, firma iShares e linha ITA; os links completos ficam no catálogo privado da migration. Não há reconstrução automática por fator três nesta entrega.

## SAP — taxa bruta final do ADR

Revisão para 2,940725, record 05/05 e pagamento 15/05, com identidade SAP SE/CUSIP 803054204 na [API pública do depositário](https://adr.db.com/drwebrebrand/api/druniverse/dividend-history/1109). O valor é bruto do evento, não líquido pessoal. Não copia imposto, tarifa ou recebimento para a carteira.

Ex e declaração continuam explicitamente atribuídos à observação independente do fornecedor; o banco não os informa como campos oficiais do evento. O valor anterior Yahoo 2,929 e as observações Alpha/Marketstack são preservados. A taxa inicial difere materialmente da final, portanto não é tratada como arredondamento.

## MRX — anúncio e deliberação distintos

O [release arquivado na SEC](https://www.sec.gov/Archives/edgar/data/1997464/000199746426000075/q32026earningsrelease.htm) confirma anúncio em 05/11, 0,16 USD, record 16/11 e pagamento 02/12. O novo catálogo permite `declaration_date = null` e `announcement_date = 05/11`. Não se cria declaração fictícia no reconciliador legado.

O classificador de metadados existente só libera a divergência 03/11 versus 05/11 depois de confirmar calendário público completo e coincidência econômica entre evidências independentes. As datas originais ficam intactas e uma mudança econômica continua bloqueada.

## PR — calendário oficial e observação não confirmada

Publicação preparada dos eventos base de junho/dezembro, ambos 0,16 USD, mediante [RI de maio](https://permianres.com/permian-resources-declares-quarterly-cash-dividend-13/) e [comunicado de novembro](https://www.businesswire.com/news/home/20261104654343/en/). Ex continua ancorada em observações independentes.

O snapshot Marketstack ex 30/06/pagamento 10/07/0,03 é retido como `provider_distribution_unverified`: não há prova para publicá-lo como parcela do dividendo base. O registro original não é apagado. Uma revisão privada identifica a observação exata; mudanças de valor/data não são silenciosamente incluídas na exceção. Cobertura permanece explicitamente parcial.

Para Alpha, o parser mantém o modo estrito por padrão. Na coleta explicitamente parcial, uma linha com valor inválido é excluída e diagnosticada; linhas válidas ainda passam pela validação SQL e conciliação originais. O RPC parcial não renova `last_success_at`; calendário inteiramente inválido continua falhando. Conflitos econômicos, identidade, calendário inválido e exceções de rede não são ocultados.

Diagnóstico privado: índice da linha, ex normalizada, tipo do valor, categoria e número de casas decimais. Nenhum valor bruto, URL, token ou payload de fornecedor entra na auditoria. O erro real Alpha/PR ainda precisa de nova consulta após renovação de orçamento; esta implementação não afirma ter observado a resposta que causou a falha em produção.

## Proteções e validação

- Catálogos/revisões privados, RLS ativada, sem SELECT ou RPC para anon/authenticated. Functions security invoker e search_path fixo.
- Substituições restritas aos valores/fontes antigos expressamente revisados. Datas conflitantes, pagamento ambíguo e falta de ex independente bloqueiam a aplicação. Estado anterior auditado uma única vez; reaplicação idempotente.
- 24 baterias SQL aprovadas, com fixture de compra e recebimento e comparação de hashes. Snapshots dos fornecedores e dados pessoais preservados. Sincronização Yahoo posterior não desfaz a correção oficial.
- 283 testes em 30 arquivos aprovados; TypeScript do projeto, Deno check da Edge, importação Node com strip-types e lint dos testes alterados aprovados. Os arquivos Edge são ignorados pelo ESLint do app e foram verificados por Deno.
- Filas públicas foram drenadas na auditoria anterior, mas a cadência automática futura permanece acompanhamento operacional, não promessa de pontualidade do GitHub.

## Publicação e critérios restantes

Após merge: aplicar `resolve_high_priority_cash_events`, publicar `sync-international-announcements` com os módulos compartilhados alterados, então executar coleta limitada. Conferir as sete revisões, metadados MRX, cobertura parcial PR e hashes financeiros. A nova consulta real Alpha/PR depende de orçamento; não ampliar quota para obter resultado. Não declarar cobertura universal nem o evento PR 0,03 confirmado.
