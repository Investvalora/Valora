# Conferência de produção da PR #100

Conferência autenticada no Brave em https://investvalora.vercel.app após o merge `7653fcf12b54aadcfa435a6b58d01f36691b15a0`. O GitHub registra a PR como MERGED e check Vercel SUCCESS. A presença dos novos controles no domínio público confirma os fluxos observados, sem atribuir isoladamente o SHA ao bundle de produção.

## Aprovado na interface

- Alertas: digitar MXRF mostra MXRF11, Maxi Renda, FIIs e BRL; alvo permanece vazio antes da seleção. Seleção apresenta fechamento R$ 8,90 de 30/10/2026. Edição para 7,50 permanece ao trocar para Acima de; Atualizar cotação retorna o campo a 8,90. Formulário fechado sem criar alerta.
- Carteiras: principal sem ação Excluir; secundárias com ação. Diálogo de carro informa escopo permanente e exige nome, com confirmação desabilitada enquanto vazio. Cancelado sem excluir.
- Catálogo: pesquisa Microsoft retorna MSFT em USD e MSFT34 em BRL. MSFT abre resumo com nome, cotação e quantidade zero na carteira selecionada. Nenhuma compra registrada.

## Pendência de banco confirmada

Consulta somente leitura em pg_proc não encontrou `public.delete_owned_wallet` nem `public.edit_owned_transaction`. As migrations `20261031224122_delete_owned_wallet.sql` e `20261031230501_edit_transactions_with_history_validation.sql` ainda precisam ser aplicadas. Os botões já publicados não equivalem a validação do salvamento: edição/exclusão não foram executadas e dependem dessas funções.

Nenhum lançamento real editado, carteira excluída ou alerta salvo. A conferência não incluiu novo teste em aparelho físico nem iOS.
