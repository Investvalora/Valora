BEGIN;

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE CHECK (length(endpoint) BETWEEN 1 AND 2048),
  p256dh text NOT NULL CHECK (length(p256dh) BETWEEN 1 AND 512),
  auth text NOT NULL CHECK (length(auth) BETWEEN 1 AND 512),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX push_subscriptions_user_id_idx ON public.push_subscriptions(user_id);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário lê suas inscrições push"
  ON public.push_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Usuário cria suas inscrições push"
  ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário remove suas inscrições push"
  ON public.push_subscriptions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON public.push_subscriptions FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

-- O webhook só recebe o ID. O conteúdo do alerta é lido pela function com
-- service_role; nenhuma chave ou dado da carteira entra na fila do pg_net.
CREATE FUNCTION public.enqueue_alert_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  project_url text;
  service_key text;
BEGIN
  SELECT decrypted_secret INTO project_url
  FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

  IF project_url IS NOT NULL AND service_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := rtrim(project_url, '/') || '/functions/v1/send-alert-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object('alert_id', NEW.id),
      timeout_milliseconds := 10000
    );
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.enqueue_alert_push() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER send_push_on_new_alert
  AFTER INSERT ON public.alerts
  FOR EACH ROW
  WHEN (NEW.status = 'novo')
  EXECUTE FUNCTION public.enqueue_alert_push();

CREATE TRIGGER send_push_on_alert_status_change
  AFTER UPDATE OF status ON public.alerts
  FOR EACH ROW
  WHEN (NEW.status = 'novo' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.enqueue_alert_push();

COMMIT;
