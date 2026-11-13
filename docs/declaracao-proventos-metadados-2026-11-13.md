# Datas de declaração: conciliação sem escolha arbitrária

## Diagnóstico

A consulta real Marketstack/GOOGL retornou declaração 04/02/2026; Alpha registra 27/01. Ambos informam USD 0,21, ex/registro 09/03 e pagamento 16/03. O [comunicado de resultados da Alphabet](https://s206.q4cdn.com/479360582/files/doc_news/2026/Feb/04/attachments/2025q4-alphabet-earnings-release.pdf) foi publicado em 04/02 e confirma valor/registro/pagamento, mas não especifica uma data distinta de deliberação. Não é suficiente para substituir automaticamente a outra data.

A [orientação da SEC para investidores](https://www.investor.gov/introduction-investing/investing-basics/glossary/ex-dividend-dates-when-are-you-entitled-stock-and) distingue declaração, registro e ex. O direito ao pagamento depende das datas próprias de elegibilidade; não se deve usar declaração como substituta da data ex.

## Regra local

Implementação geral, sem ticker ou data especial para GOOGL:

1. Exigir coincidência exata de valor, ex, registro e pagamento entre fornecedores e um calendário público **já completo** de fonte primária/Alpha/Marketstack. Não basta um evento incompleto ou sintético/Yahoo.
2. Uma diferença isolada de declaração é registrada no diagnóstico privado com `metadata_only` e horário de revisão. Os snapshots originais e ambas as datas permanecem intactos; nenhuma é promovida como data verdadeira.
3. Datas de declaração continuam obrigatórias e validadas. Diferenças econômicas, ausência de âncora ou data ex confirmada divergente da SEC mantêm o bloqueio.
4. O calendário econômico pode ser processado; a resposta inclui `metadata_variations`, e a auditoria do job fica **partial**, não totalmente verde. Erros financeiros continuam falhando o workflow. Não amplia classificação de eventos especiais nem cria recebimentos.
5. Uma tentativa após publicação é solicitada apenas para conflitos existentes comprovadamente enquadráveis. Cotas e leases originais continuam obrigatórias; sem loop.

## Escopo e validação

Branch `codex/dividend-declaration-metadata`. Migration `20261113184511_dividend_declaration_metadata`. Ainda local: não aplicada em produção.

Homologação técnica local: 210 testes de proventos em 24 arquivos aprovados; 23 testes direcionados repetidos após a extração da classificação da auditoria. TypeScript e lint aprovados. Replay integral das migrations em banco novo e 17 baterias SQL aprovados, incluindo proteção contra data ex divergente da SEC e acesso indevido. Advisor sem erros; permanece apenas o aviso preexistente de `pg_net` no schema público. Sem mudança de interface nesta entrega.

Nenhuma alteração de posição, lançamento ou recebimento pessoal. A publicação precisa de migration e função internacional; o reteste HTTP posterior deve confirmar a classificação de GOOGL usando cota real. A diferença de datas fica visível como metadado, sem impedir o calendário econômico já coincidente.
