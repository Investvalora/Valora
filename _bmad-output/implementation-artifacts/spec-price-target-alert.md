---
title: 'Story — Alertas de Preço-Alvo (price_target)'
type: 'feature'
created: '2026-09-20'
status: 'in-progress'
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-6-alertas-badge-geracao-on-demand.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-2-alertas-de-oportunidade-e-sobrevalizacao.md'
---

## Intent

**Problema:** O módulo de alertas gera notificações automáticas (inconsistências, Bazin), mas o usuário não pode criar seus próprios alertas manuais de preço. Não há forma de dizer "me avise quando MXRF11 bater R$9,00".

**Abordagem:** Adicionar o tipo `price_target` à tabela `alerts`, permitindo ao usuário criar alertas manuais com ticker + preço-alvo + condição (abaixo/acima). Uma nova Edge Function `check-price-targets` compara a cotação mais recente de cada alerta ativo com o preço-alvo do usuário, disparando o alerta quando a condição for satisfeita. Na tela, ao ver um alerta disparado, o usuário escolhe entre manter ativo ou fechar.

## Boundaries & Constraints

**Always:**
- Novo valor `'price_target'` no ENUM `alert_type` via migration `020`.
- Colunas `target_price NUMERIC(12,4) NOT NULL` e `condition TEXT CHECK IN ('above','below') NOT NULL` — opcionais para os outros tipos (nullable), obrigatórias para `price_target`.
- Novo UNIQUE INDEX para `price_target`: `(user_id, type, ticker, target_price, condition) WHERE type = 'price_target' AND status <> 'ignorado'` — permite múltiplos preços-alvo para o mesmo ticker.
- Edge Function `check-price-targets`: autentica via JWT, busca alertas `price_target` com `status IN ('novo', 'lido')` do usuário, busca cotação mais recente de cada ticker, dispara (atualiza para `novo`) quando condição satisfeita.
- Pós-disparo: `AlertCard` para `price_target` com status `novo` exibe pergunta "Manter alerta ativo?" com botões "Manter" (volta para monitoramento sem status change — apenas marca como `lido`) e "Fechar" (`ignorado`).
- Seguir padrão de Edge Function existente: sem `@supabase/supabase-js`, `verify_jwt=false` com `authenticatedUser()` manual, chamadas via PostgREST `fetch`.
- Invalidar `['alerts', userId]` após criar, verificar ou atualizar status.
- RLS existente cobre o novo tipo sem alteração (políticas são por `user_id`).

**Ask First:**
- Enviar notificação push além de marcar no banco.
- Permitir que o alerta dispare múltiplas vezes sem intervenção do usuário.

**Never:**
- Aceitar `user_id` do body da Edge Function.
- Usar `@supabase/supabase-js` na Edge Function.
- Modificar as funções `authenticatedUser`, `response`, `rest` existentes.

## I/O & Edge-Case Matrix

| Cenário | Input / Estado | Saída / Comportamento |
|---------|---------------|----------------------|
| Criar alerta abaixo | ticker=MXRF11, target=9.00, condition=below | Alerta `price_target` inserido com status `lido` (aguardando disparo) |
| Criar alerta acima | ticker=PETR4, target=45.00, condition=above | Alerta `price_target` inserido com status `lido` |
| Duplicata ativa | Mesmo ticker+preço+condição já existe | Retorna erro, sem duplicata |
| Check: condição satisfeita below | cotação=8.90, target=9.00 | Alerta atualizado para `novo` |
| Check: condição não satisfeita | cotação=9.50, target=9.00, below | Nenhuma alteração |
| Check: sem cotação | ticker sem price_history | Skip silencioso |
| Pós-disparo: manter | usuário clica "Manter" | Status volta para `lido` |
| Pós-disparo: fechar | usuário clica "Fechar" | Status vira `ignorado` |

## Tasks & Acceptance

- [ ] `supabase/migrations/020_add_price_target_alert.sql` — ENUM + colunas + índice
- [ ] `supabase/functions/check-price-targets/index.ts` — Edge Function de verificação
- [ ] `src/modules/alerts/types.ts` — AlertType + AlertCondition + campos Alert
- [ ] `src/modules/alerts/services/alertsService.ts` — createPriceTargetAlert + checkPriceTargets
- [ ] `src/modules/alerts/hooks/useAlertMutations.ts` — useCreatePriceTargetAlert + useCheckPriceTargets
- [ ] `src/modules/alerts/components/AlertsPage.tsx` — formulário + botão check + AlertCard atualizado

## Acceptance Criteria

- Dado um usuário autenticado, quando cria alerta MXRF11 abaixo de R$9,00, então o alerta aparece na lista com status monitorando.
- Dado alerta ativo com mesmos ticker+preço+condição, quando tenta criar outro, então recebe erro de duplicata.
- Dado cotação de MXRF11 = R$8,90 com alerta below@9,00, quando verifica preços-alvo, então alerta vira `novo` na lista.
- Dado alerta `price_target` com status `novo`, quando o usuário clica "Manter", então status volta para `lido` e alerta continua monitorando.
- Dado alerta `price_target` com status `novo`, quando o usuário clica "Fechar", então status vira `ignorado`.
