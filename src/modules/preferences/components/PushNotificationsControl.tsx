import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "../../../shared/services/supabaseClient";
import { useAuth } from "../../auth/hooks/useAuth";

const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function decodeVapidKey(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  const key = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(key);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return key;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Tente novamente.";
}

export function PushNotificationsControl() {
  const { user } = useAuth();
  const userId = user?.id;
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  useEffect(() => {
    if (!userId || !supported || !publicKey) return;
    let cancelled = false;
    async function refresh() {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) return;
        const { data, error: queryError } = await supabase
          .from("push_subscriptions")
          .select("id")
          .eq("user_id", userId)
          .eq("endpoint", subscription.endpoint)
          .maybeSingle();
        if (queryError) throw queryError;
        if (!cancelled) setEnabled(Boolean(data));
      } catch (cause) {
        if (!cancelled)
          setError(
            `Não foi possível consultar as notificações: ${errorMessage(cause)}`,
          );
      }
    }
    void refresh();
    return () => {
      cancelled = true;
    };
  }, [userId, supported]);

  async function toggle() {
    if (!userId || !publicKey || busy) return;
    setBusy(true);
    setError("");
    try {
      if (!enabled && Notification.permission !== "granted") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setError("Permissão de notificações não concedida no navegador.");
          return;
        }
      }

      const registration = await navigator.serviceWorker.ready;
      const previous = await registration.pushManager.getSubscription();
      if (enabled) {
        if (previous) {
          const { error: deleteError } = await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", userId)
            .eq("endpoint", previous.endpoint);
          if (deleteError) throw deleteError;
          await previous.unsubscribe();
        }
        setEnabled(false);
        return;
      }

      if (previous) await previous.unsubscribe();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidKey(publicKey),
      });
      const keys = subscription.toJSON().keys;
      if (!keys?.p256dh || !keys.auth) {
        await subscription.unsubscribe();
        throw new Error("O navegador não forneceu as chaves da inscrição.");
      }
      const { error: insertError } = await supabase
        .from("push_subscriptions")
        .insert({
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        });
      if (insertError) {
        await subscription.unsubscribe();
        throw insertError;
      }
      setEnabled(true);
    } catch (cause) {
      setError(
        `Não foi possível alterar as notificações: ${errorMessage(cause)}`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border-b border-white/[0.1] py-6 lg:pt-0">
      <div className="flex items-center gap-2.5">
        <Bell
          className="h-4 w-4 text-white/50"
          strokeWidth={1.8}
          aria-hidden="true"
        />
        <h2 className="text-sm font-semibold text-white">Notificações</h2>
      </div>
      <p className="mt-2 text-sm text-white/45">
        Receba avisos quando surgir um alerta novo.
      </p>
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy || !publicKey || !supported}
        aria-pressed={enabled}
        className="mt-4 inline-flex min-h-10 items-center rounded-xl border border-white/[0.2] px-4 text-sm font-medium text-white transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy
          ? "Aguarde..."
          : !supported
            ? "Notificações indisponíveis"
            : enabled
              ? "Desativar notificações"
              : "Ativar notificações"}
      </button>
      {!supported && (
        <p className="mt-2 text-xs text-white/45">
          Este navegador/ambiente não oferece suporte a notificações push.
        </p>
      )}
      {!publicKey && (
        <p className="mt-2 text-xs text-white/45">
          Notificações ainda não ativadas nesse dispositivo.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-300">
          {error}
        </p>
      )}
    </section>
  );
}
