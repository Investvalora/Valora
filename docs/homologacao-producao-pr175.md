# Homologação de produção — PR175 — 19/11/2026

## Publicação

- PR175 mergeada em `a89522f44b6f49b7b917289e35e0a36dcb3f3a87`.
- Checks da PR aprovados, incluindo app, isolamento e replay de migrations. Workflow Security and regression da main aprovado: run `44449419623`.
- Vercel publicou o commit mergeado com sucesso. Asset observado no aparelho: `/assets/index-DX6wCHB2.js`.
- Migration `20261118205935_receipt_statement_import.sql` aplicada pelo MCP como `receipt_statement_import`; versão registrada pelo servidor `20261119031108`. Esse identificador remoto difere do timestamp do arquivo; preservar esse mapeamento ao reconciliar o histórico pelo CLI.

## Banco e preservação

- RPC presente, SECURITY INVOKER, execução permitida a authenticated e negada a anon.
- Antes e depois da migration e da prévia: 208 créditos, três lotes e fingerprint dos campos financeiros originais `25df18f0efb8efbb7a9fe353fccc11aa`.
- Nenhuma importação confirmada, compra, venda ou posição alterada durante esta homologação.

## Android físico / PWA publicado

- Galaxy A31 autenticado em produção, 411 px.
- Botão Importar recebimentos presente e painel sem overflow horizontal.
- CSV fictício carregado apenas em memória: MA/USD, data antiga de teste, bruto 0,06, imposto 0,02, tarifa 0, líquido 0,04; referência exclusiva de prévia.
- Validação real pela interface/RPC com `p_commit=false`: um crédito novo, zero referências duplicadas.
- Confirmação permaneceu desabilitada e caixa de conferência desmarcada. Não foi acionado o commit.
- Painel fechado ao terminar; prévia e arquivo fictício descartados.
- PWA continuou em standalone com worker controlador e cache `valora-static-f9d3051e6811`. Não houve limpeza de cache nem chamada manual de atualização.

## Escopo

Homologação aprovada para publicação, leitura, layout e validação real sem escrita. Gravação transacional, repetição, conflitos, rollback e isolamento foram testados no QA e no CI; não foram forçados com créditos pessoais em produção.

Continuam separadas as evidências externas de BB/PERT/PR US$ 0,03 e a ausência de baseline histórico equivalente pelo CDN. A PR175 não declara essas pendências encerradas.
