# Auditoria de datas da interface — 24/11/2026

Revisão estática de src, excluindo testes e fixtures; não equivale a navegar manualmente por todas as telas.

| Área | Origem | Comportamento |
|---|---|---|
| Início: saudação/data | new Date() | Calculada na renderização; não possui relógio que force a virada do dia |
| Início: aviso de rentabilidade | endDate da série histórica | Dinâmica conforme período efetivamente disponível |
| Atualizações: última atualização/referência | updated_at/date das cotações e registros | Dinâmica quando as consultas retornam novos dados |
| Atualizações: próxima atualização | nextCollection + horário atual | Data calculada; regras UTC da agenda estão fixadas em collectionSchedule.ts, não lidas do cron em tempo real |
| Atualizações: próxima consulta da tela | temporizador usePanelRefresh | Dinâmica, com pausa por visibilidade/conexão |
| Ativos e lançamentos | datas de preços, operações, aquisição e vencimento | Dados dos registros; não datas literais dos avisos |
| Renda fixa/Tesouro | valuation_price_date/last_updated_at | Referência econômica e atualização do saldo vindas dos registros |
| Proventos | ex_date/payment_date/record_date, meses derivados | Datas dos eventos e agregações, não calendário fixo na mensagem |
| Fundamentos/score/ferramentas | reference_date/updated_at e dados informados | Referências dos registros; limiares de antiguidade são regras, não datas fixas |
| Avisos de sincronização/histórico | estado das consultas e issues | Mensagens calculadas; datas eventualmente presentes vêm do resultado |
| Termos/privacidade | PublicInfoPage: versão de 25 de outubro de 2026 | Fixa intencionalmente: versão do documento, não data atual |
| Onboarding/demonstração | AssetPreview: série de 2025 | Fictícia e fixa para demonstração; não carteira real |
| Exemplos de importação/indicadores | ReceiptImport e StatementIndicators: 2020 | Exemplos literais intencionais, não atualização do usuário |

## Ajustes
- Rótulos: Última atualização: e Próxima atualização:.
- Próxima atualização identifica a tentativa prevista de coleta; a consulta periódica local mantém rótulo separado.
- Retirada da data literal de auditoria da agenda nos avisos do painel e do topo. A evidência histórica permanece na documentação/comentário técnico.
- Nenhuma data de documento legal, exemplo ou demonstração foi convertida para hoje artificialmente.

## Limite da previsão
O cálculo avança com o relógio ao renderizar, mas a configuração de horários permanece versionada no frontend. Alterar o cron no servidor exige atualizar essa configuração. A previsão não prova execução ou sucesso nem entrega de todos os ativos do lote.

Validação: 23 testes de planejamento aprovados; revisão de TypeScript/lint e diff.
