-- UTC: 21:30, 22:30 and 23:30 = 18:30, 19:30 and 20:30 Brasília.
-- Capture the close after Yahoo's delay, with retries for late publication.
-- Copy only the existing service-only job body; never embed credentials.
DO $$
DECLARE task text;
BEGIN
  SELECT command INTO task FROM cron.job WHERE jobname='sync-brapi-1930';
  IF task IS NULL OR task NOT LIKE '%/functions/v1/sync-brapi-prices%' THEN
    RAISE EXCEPTION 'Expected market quote job missing; cannot schedule close refresh';
  END IF;
  PERFORM cron.schedule('sync-br-quotes-post-close','30 21,22,23 * * 1-5',task);
END $$;
