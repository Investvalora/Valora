-- SEG-03: enforce referenced ownership even when RLS hides the referenced rule.
set lock_timeout = '5s';
alter table public.score_rules
  add constraint score_rules_user_id_id_key unique (user_id, id);
alter table public.user_preferences
  drop constraint user_preferences_default_score_rule_id_fkey,
  add constraint user_preferences_default_score_rule_owner_fkey
    foreign key (user_id, default_score_rule_id)
    references public.score_rules(user_id, id)
    on delete set null (default_score_rule_id);
-- Keeps existing delete behavior without clearing the preference row's owner.
