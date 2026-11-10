# Homologação da PR114 — 07/11/2026

Commit de merge `166951419bcf92fdd29e5c4aab7261d87cb556de`. Deploy Vercel do merge com sucesso; checks app, database-isolation e migration-replay aprovados. As duas migrations foram aplicadas e verificadas antes desta homologação.

## Produção — navegador integrado

O titular autorizou criar, testar e limpar somente a carteira temporária “Homologação PR114”. A carteira Investidor10 foi preservada.

- Carteira temporária criada pela interface e destino conferido em Importar transações.
- CSV sintético: duas compras iguais de PETR4, 1 unidade a R$10 em 06/11/2026, sem custos. A prévia preservou as duas linhas e bloqueou a confirmação até conferir duplicidade.
- Recarga antes do envio ofereceu Restaurar prévia; restauração recuperou as duas linhas, revalidou o catálogo e exigiu novamente a conferência. Não houve envio automático.
- Primeira confirmação mostrou “2 transações importadas com sucesso”.
- Nova seleção e confirmação do mesmo arquivo, após recarga, mostrou “Este lote de 2 transações já foi importado nesta carteira. Nenhuma transação foi duplicada”.
- Consulta independente confirmou duas transações, um recibo e uma posição PETR4 de duas unidades, preço médio10. Não foram gravadas quatro transações.
- Lançamento rápido: quantidade3 e preço12 sobreviveram à recarga, foram restaurados explicitamente e cancelados. Não se clicou em Salvar.
- PETR4: resumo exibiu fonte Yahoo, P/L4,33, P/VP1,22, ROE30,27%, DY8,08%, Dívida/PL76,07% e margem24,32%. Score Dividendos Premium permaneceu4, com critérios/pontos observados. Valores são o retrato da consulta, não promessa de cotação permanente.
- Navegação autenticada e recargas funcionaram sem diálogo de sessão revogada. Não foi revogada sessão real: o caso negativo permanece coberto pelo teste automatizado e harness local documentado na entrega.
- Nenhum erro capturado no console da aba durante esta rodada.

## Limpeza e preservação

Limpeza executada pela função de exclusão do produto via plugin, com identidade/destino restritos à carteira temporária autorizada. Resultado: zero carteira temporária, transações, posições ou recibos remanescentes. A execução também comparou os digests dos lançamentos e das quantidades/preços médios da Investidor10 com o início e confirmou igualdade. Não houve recálculo de seus saldos. Seleção Investidor10 restaurada na interface.

Evidências locais não versionadas em `output/homologacao-pr114/`: importacao-sucesso.png, lote-sem-duplicacao.png e rascunho-restaurado.png. Nenhum identificador de conta ou credencial foi incluído neste documento.

## Critérios ainda separados

Homologação web concluída no recorte acima. Android físico/PWA solicitado ao titular conforme combinado; aguarda resultado. Esta rodada não mede desempenho físico ou instalação completa, não simula queda de rede depois do commit em produção e não repete concorrência real entre dois dispositivos: esses casos permanecem sustentados pelos testes locais SQL/duas conexões e pela restrição única no banco. Rascunhos nos demais formulários continuam na TODO.

## Validação complementar do responsável

Em 08/11/2026, o responsável informou ter conferido a versão PWA e que tudo está funcional após verificar o ajuste local da barra de ações em Ativos > Lançamentos. Essa confirmação encerra a pendência de teste físico desta rodada no recorte informado; não representa medição de desempenho em aparelho ou cobertura de todos os formulários.

Correção adicional delimitada: busca ocupa uma linha no celular e Importar CSV/Lançamento podem quebrar de linha como controles completos, sem cortar o botão na lateral do card Renda variável. Apenas classes responsivas desse cabeçalho foram alteradas; formulário, logo, ícones e cálculos não receberam alterações nesta correção. TypeScript e lint do arquivo aprovados. Validação visual final informada pelo responsável, pois a ferramenta de navegador estava indisponível.
