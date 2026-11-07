-- Keep enum changes in their own committed migration before index predicates.
alter type public.alert_type add value if not exists 'indicator';
alter type public.alert_type add value if not exists 'event';
