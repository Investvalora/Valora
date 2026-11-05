# Valora — retestes da terceira semana

Referência: relatório e planilha da semana 3, PR #106 integrada (`8dfaedb`), código de implementação `13f23a3`. Execução local em 04/11/2026, após publicação, fuso America/Sao_Paulo. Este registro distingue teste automatizado de inspeção HTTP e validação visual real.

## Resultado por apontamento

| Item | Resultado | Evidência / limite |
| --- | --- | --- |
| S3-01 / DF05 — rentabilidade | Causa de preço antigo corrigida e retestada | Mapa escolhe cotação mais recente em ambas as ordens; tabela usa recebimentos elegíveis e importados. -3,28% é compatível com o fechamento mensal de ITUB4 a R$ 38,69 para PM R$ 40; não forçar igualdade com a cotação intradiária. Não reconstruído todo o histórico da conta do avaliador. |
| S3-02 / DF48 — `/patrimonio` | Corrigido e retestado em componente | Composição compartilhada inclui renda fixa e preserva rota/gráfico. Sem homologação visual autenticada em produção. |
| S3-03 / DF07 — percentuais | Aprovado em componente | -3,28% em português; explicação de método permanece visível. CSV técnico preservado. |
| S3-04 / DF58 — alocação | Aprovado em componente | 100,00%, sinal negativo e arredondamento preservados. Teste original do link para resumo do ativo mantido e aprovado. |
| S3-05 / DF44 — nome longo | Aprovado em schema | 120 aceito; 121/300 rejeitados; schema compartilhado no cadastro desktop/móvel. Sem criação de contas reais. |
| S3-06 / DF24 — redefinição | Aprovado em formulário React | Serviço simulado retorna sessão ausente; mensagem em português e link para pedir novo acesso. Nenhuma senha real alterada. |
| S3-07 / DF46 — recuperação | Aprovado em formulários desktop/móvel | Falha de rede simulada, email preservado e nova tentativa bem-sucedida. Nenhum email real enviado. |
| S3-08 / DF56 — nome com letra | Pendente de melhoria | Não incluído nas correções da PR #106. |
| S3-09 / DF49 — títulos | Pendente de melhoria | Título por página ainda não implementado. |
| S3-10 / DF12 — setores | Pendente de funcionalidade | Não confundir com composição por classe já existente. |
| S3-11 / DF34 — IPCA | Pendente de funcionalidade | IFIX mantido; não houve alteração de benchmarks. |
| S3-12 / DF59 — botão de inclusão | Aprovado na suíte do modal | Variantes usam Adicionar lançamento; testes de gravação e guardas existentes passam com serviços simulados. |

## Regressão completa e investigação das falhas

Comando: `pnpm test:run --maxWorkers=2 --minWorkers=1`.

Primeira execução completa: **938 aprovados, 5 falhas, 943 testes / 134 arquivos**, 229,90 s. Log local: `output/reteste-terceira-semana.log` (fora do Git). Não registrar essa execução como totalmente aprovada.

- Um timeout de 5 s no teste de fallback cambial de `CarteiraPage` não se repetiu isoladamente, sem mudar o teste ou aumentar o limite. Não é prova de erro de câmbio em produção.
- Três falhas de `MobileCarteiraHome` vinham de seletor antigo que procurava uma área decorativa aria-hidden. A área atual é um botão acessível “Abrir carteiras”. Atualizado somente o seletor no teste; preservadas as asserções de gesto, troca, animação e conteúdo.
- Uma falha de `AccountPage` esperava a classe antiga text-rose-300; o app usa text-red-500 desde o refinamento de interface anterior à PR #106. Atualizada somente a expectativa do teste, sem alterar o design.

Adicionados cinco cenários: recuperação desktop, recuperação móvel, redefinição sem sessão, alocação em pt-BR e retorno em pt-BR. Testes originais preservados. Os retestes de formulários usam mocks dos serviços e não acessam dados reais.

## Produção e limites

Sete URLs verificadas por HTTP entregam o app com status 200; entry publicado `index-BjeXhQrH.js` contém rótulos das correções. Como é SPA, HTTP 200 não comprova renderização, 404 ou autorização. Evidência local: `output/reteste-terceira-semana-http.json`.

A ferramenta do navegador voltou a falhar ao inicializar (`failed to write kernel assets`). Portanto não foi executado novo roteiro visual autenticado em produção, PWA físico ou alteração real de lançamento. As validações anteriores de aparelhos não foram apagadas nem declaradas repetidas nesta rodada.

Não houve mudança em código de produto, valores de carteira, senhas reais, emails, banco, cotações, migrations ou agendamentos nesta rodada: somente documentação e testes. Melhorias S3-08 a S3-11 continuam abertas.


## Fechamento da rodada

Reteste final dos três arquivos inicialmente falhos e dos componentes com cenários novos: **51 aprovados em seis arquivos**, 16,93 s. Log local `output/reteste-terceira-semana-final.log`. Nenhuma das cinco falhas iniciais persistiu nessa execução. Não houve uma segunda execução integral após a manutenção dos testes; por isso o resultado completo permanece reportado separadamente como 938/5, com posterior reteste aprovado.

TypeScript (`pnpm exec tsc -b`), lint dos arquivos de teste alterados e `git diff --check` aprovados. A única expectativa inicialmente incorreta no novo teste de alocação foi ajustada para o arredondamento de -2,275% para -2,28%; o código de produto não foi modificado.
