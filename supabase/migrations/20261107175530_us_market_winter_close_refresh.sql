-- US winter close is 22:00 UTC; the former 21:55 final run missed it.
DO $$
DECLARE task text;
BEGIN
 SELECT command INTO task FROM cron.job WHERE jobname='sync-global-assets-market';
 IF task IS NULL OR task NOT LIKE '%/functions/v1/sync-global-assets%' THEN
  RAISE EXCEPTION 'Expected global market job missing';
 END IF;
 PERFORM cron.schedule('sync-global-assets-market','*/5 13-22 * * 1-5',task);
END $$;
