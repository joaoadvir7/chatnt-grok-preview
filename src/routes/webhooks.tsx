import { createFileRoute, Link } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Loader2,
  Play,
  ShieldCheck,
  Trash2,
  Webhook,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { RelativeTime } from "@/components/RelativeTime";
import { ScopeBanner } from "@/components/ScopeBanner";
import { Button } from "@/components/ui/button";
import {
  pollWebhookEvents,
  registerWebhookVerifyToken,
} from "@/lib/whatsapp-api";
import { useCrmStore } from "@/lib/store";
import { useScopedData } from "@/lib/useScopedData";
import { cn } from "@/lib/utils";
import { webhookCallbackUrl } from "@/lib/whatsapp";

export const Route = createFileRoute("/webhooks")({
  component: WebhooksPage,
});

function WebhooksPage() {
  const t = useT();
  const { connections } = useScopedData();
  const allEvents = useCrmStore((s) => s.webhookEvents);
  const clearWebhookEvents = useCrmStore((s) => s.clearWebhookEvents);
  const pushWebhookEvent = useCrmStore((s) => s.pushWebhookEvent);
  const receiveInbound = useCrmStore((s) => s.receiveInbound);
  const updateMessageDeliveryByWamid = useCrmStore(
    (s) => s.updateMessageDeliveryByWamid,
  );
  const findConnectionByPhoneNumberId = useCrmStore(
    (s) => s.findConnectionByPhoneNumberId,
  );

  const [origin, setOrigin] = useState("https://seu-dominio.com");
  const [polling, setPolling] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    ok: boolean;
    status: number;
    body: string;
    url: string;
  } | null>(null);
  const [customToken, setCustomToken] = useState("");
  const [customChallenge, setCustomChallenge] = useState(
    () => `chatnt_${Date.now().toString(36)}`,
  );

  const primary = connections[0];
  const activeToken =
    customToken.trim() ||
    primary?.waba?.webhookVerifyToken ||
    "chatnt_verify_token";

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (primary?.waba?.webhookVerifyToken) {
      setCustomToken(primary.waba.webhookVerifyToken);
      void registerWebhookVerifyToken({
        data: { token: primary.waba.webhookVerifyToken },
      }).catch(() => {});
    }
  }, [primary?.id, primary?.waba?.webhookVerifyToken]);

  const connIds = useMemo(
    () => new Set(connections.map((c) => c.id)),
    [connections],
  );
  const events = allEvents.filter((e) => connIds.has(e.connectionId));
  const callback = webhookCallbackUrl(origin);

  function copy(text: string, label: string) {
    void navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copiado`);
    });
  }

  /** Simula exatamente o que a Meta faz no botão "Verify and save" */
  async function runMetaVerify() {
    setVerifyBusy(true);
    setVerifyResult(null);
    try {
      // Garante que o token está na allow-list do servidor
      await registerWebhookVerifyToken({ data: { token: activeToken } });

      const challenge = customChallenge.trim() || `hub_${Date.now()}`;
      const url = new URL(callback);
      url.searchParams.set("hub.mode", "subscribe");
      url.searchParams.set("hub.verify_token", activeToken);
      url.searchParams.set("hub.challenge", challenge);

      const res = await fetch(url.toString(), { method: "GET" });
      const body = await res.text();
      const ok = res.ok && body === challenge;

      setVerifyResult({
        ok,
        status: res.status,
        body: body.slice(0, 500),
        url: url.toString(),
      });

      const cxId = primary?.id ?? connections[0]?.id ?? "cx_central";
      pushWebhookEvent({
        connectionId: cxId,
        type: ok ? "verify" : "error",
        summary: ok
          ? `Verify OK · challenge ecoado (${challenge.slice(0, 24)}…)`
          : `Verify falhou · HTTP ${res.status}: ${body.slice(0, 80)}`,
        payload: JSON.stringify({
          hub: {
            mode: "subscribe",
            verify_token: `${activeToken.slice(0, 6)}…`,
            challenge,
          },
          response: { status: res.status, body: body.slice(0, 200) },
        }),
        ok,
      });

      if (ok) toast.success("Validação do webhook OK (como a Meta)");
      else toast.error(`Falha na validação · HTTP ${res.status}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no verify");
    } finally {
      setVerifyBusy(false);
    }
  }

  async function runVerifyFailDemo() {
    setVerifyBusy(true);
    try {
      const url = new URL(callback);
      url.searchParams.set("hub.mode", "subscribe");
      url.searchParams.set("hub.verify_token", "token_invalido_proposital");
      url.searchParams.set("hub.challenge", "nao_deve_passar");
      const res = await fetch(url.toString());
      const body = await res.text();
      setVerifyResult({
        ok: false,
        status: res.status,
        body: body.slice(0, 500),
        url: url.toString(),
      });
      toast.message(`Token errado → HTTP ${res.status} (esperado 403)`);
    } finally {
      setVerifyBusy(false);
    }
  }

  function simulateInbound() {
    const cx = connections[0];
    if (!cx) {
      toast.error("Nenhuma conexão no escopo");
      return;
    }
    const phone = "5591987654321";
    const text = "Olá! Simulação de entrada via webhook Meta.";
    const r = receiveInbound({
      phone,
      text,
      connectionId: cx.id,
      name: "João (perfil WhatsApp)",
      wamid: `wamid.SIM_${Date.now()}`,
    });
    pushWebhookEvent({
      connectionId: cx.id,
      type: "message_in",
      summary: `Simulado · ${text.slice(0, 60)}`,
      payload: JSON.stringify({
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                value: {
                  metadata: { phone_number_id: cx.waba?.phoneNumberId },
                  messages: [
                    {
                      from: phone,
                      type: "text",
                      text: { body: text },
                    },
                  ],
                },
              },
            ],
          },
        ],
      }),
      ok: true,
    });
    toast.success(
      r.conversationId
        ? "Entrada simulada · mensagem no Live Chat"
        : "Entrada simulada",
    );
  }

  async function pollServer() {
    setPolling(true);
    try {
      const res = await pollWebhookEvents();
      let applied = 0;
      for (const ev of res.events) {
        if (ev.type === "message_in" && ev.from && ev.text) {
          const connectionId =
            connections.find(
              (c) =>
                c.waba?.phoneNumberId &&
                c.waba.phoneNumberId === ev.phoneNumberId,
            )?.id ??
            findConnectionByPhoneNumberId(ev.phoneNumberId ?? "")?.id ??
            connections[0]?.id;
          if (!connectionId) continue;
          receiveInbound({
            phone: ev.from,
            text: ev.text,
            connectionId,
            name: ev.contactName,
            wamid: ev.wamid,
          });
          pushWebhookEvent({
            connectionId,
            type: "message_in",
            summary: ev.summary,
            payload: ev.payload,
            ok: ev.ok,
          });
          applied++;
        } else if (ev.type === "status" && ev.wamid && ev.status) {
          const st =
            ev.status === "read"
              ? "read"
              : ev.status === "delivered"
                ? "delivered"
                : ev.status === "failed"
                  ? "failed"
                  : "sent";
          updateMessageDeliveryByWamid(ev.wamid, st);
          const connectionId = connections[0]?.id;
          if (connectionId) {
            pushWebhookEvent({
              connectionId,
              type: "status",
              summary: ev.summary,
              payload: ev.payload,
              ok: ev.ok,
            });
          }
          applied++;
        } else if (ev.type === "verify" || ev.type === "error") {
          const connectionId = connections[0]?.id;
          if (connectionId) {
            pushWebhookEvent({
              connectionId,
              type: ev.type,
              summary: ev.summary,
              payload: ev.payload,
              ok: ev.ok,
            });
            applied++;
          }
        }
      }
      toast.success(
        applied
          ? `${applied} evento(s) do servidor aplicados`
          : "Nenhum evento novo no buffer do servidor",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no poll");
    } finally {
      setPolling(false);
    }
  }

  return (
    <AppShell title={t("page.webhooks")}>
      <div className="mx-auto max-w-[1000px] space-y-5">
        <ScopeBanner />

        {/* Callback URL */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
          <div className="flex flex-wrap items-start gap-3">
            <div className="rounded-[var(--radius-md)] bg-[var(--color-primary-soft)] p-2.5 text-[var(--color-primary)]">
              <Webhook className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-[var(--color-navy)]">
                Callback URL (cole na Meta)
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Em Meta → App → WhatsApp → Configuration → Webhook. Assine o
                campo{" "}
                <code className="rounded bg-[var(--color-surface-2)] px-1">
                  messages
                </code>
                . Credenciais em{" "}
                <Link
                  to="/conexoes"
                  className="font-medium text-[var(--color-primary)] underline"
                >
                  Conexões
                </Link>
                .
              </p>
              <code className="mt-2 block break-all rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] px-2 py-1.5 font-mono text-xs">
                {callback}
              </code>
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copy(callback, "Callback URL")}
                >
                  <Copy className="size-3.5" />
                  Copiar URL
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Explorador de validação */}
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-navy)]/20 bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-navy)] px-4 py-3 text-white">
            <ShieldCheck className="size-5" />
            <div>
              <h2 className="text-sm font-semibold">
                Explorar validação do webhook
              </h2>
              <p className="text-[11px] text-white/75">
                Simula o GET que a Meta envia ao clicar em "Verify and
                save"
              </p>
            </div>
          </div>
          <div className="space-y-4 p-4 sm:p-5">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-[var(--color-muted)]">
              <li>
                Meta chama{" "}
                <code className="text-xs">
                  GET …/webhook?hub.mode=subscribe&hub.verify_token=…&hub.challenge=…
                </code>
              </li>
              <li>
                O ChatNT confere se o{" "}
                <strong className="text-[var(--color-fg)]">Verify Token</strong>{" "}
                é o mesmo cadastrado em Conexões
              </li>
              <li>
                Se ok, responde <strong className="text-[var(--color-fg)]">200</strong>{" "}
                com o <em>challenge</em> em texto puro — a Meta libera o webhook
              </li>
              <li>
                Token errado → <strong className="text-[var(--color-fg)]">403 Forbidden</strong>
              </li>
            </ol>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-[var(--color-muted)]">
                  Verify Token (mesmo valor na Meta)
                </span>
                <div className="flex gap-2">
                  <input
                    className="h-10 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-3 font-mono text-sm"
                    value={customToken}
                    onChange={(e) => setCustomToken(e.target.value)}
                    placeholder="chatnt_nt_para_verify"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => copy(activeToken, "Verify token")}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
                <p className="mt-1 text-[10px] text-[var(--color-subtle)]">
                  Conexão: {primary?.name ?? "—"} · token da conexão carregado
                  automaticamente
                </p>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-[var(--color-muted)]">
                  hub.challenge (Meta gera; aqui você escolhe)
                </span>
                <input
                  className="h-10 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-3 font-mono text-sm"
                  value={customChallenge}
                  onChange={(e) => setCustomChallenge(e.target.value)}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => void runMetaVerify()}
                disabled={verifyBusy || !activeToken}
                className="bg-[var(--color-navy)] hover:bg-[var(--color-sidebar-2)]"
              >
                {verifyBusy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Play className="size-3.5" />
                )}
                Testar validação (como a Meta)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void runVerifyFailDemo()}
                disabled={verifyBusy}
              >
                Testar token errado (403)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void registerWebhookVerifyToken({
                    data: { token: activeToken },
                  }).then(() =>
                    toast.success("Token registrado no servidor"),
                  );
                }}
              >
                Registrar token no servidor
              </Button>
            </div>

            {verifyResult && (
              <div
                className={cn(
                  "rounded-[var(--radius-md)] border px-3 py-3 text-sm",
                  verifyResult.ok
                    ? "border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]"
                    : "border-[var(--color-danger)]/30 bg-red-50",
                )}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {verifyResult.ok ? (
                    <CheckCircle2 className="size-4 text-[var(--color-primary)]" />
                  ) : (
                    <XCircle className="size-4 text-[var(--color-danger)]" />
                  )}
                  HTTP {verifyResult.status} ·{" "}
                  {verifyResult.ok ? "Válido" : "Recusado"}
                </div>
                <p className="mt-1 break-all font-mono text-[11px] text-[var(--color-muted)]">
                  {verifyResult.url}
                </p>
                <pre className="mt-2 max-h-28 overflow-auto rounded bg-white/80 px-2 py-1.5 font-mono text-xs">
                  {verifyResult.body || "(vazio)"}
                </pre>
                {verifyResult.ok && (
                  <p className="mt-2 text-xs text-[var(--color-fg)]">
                    O corpo da resposta é o mesmo <em>challenge</em> — é isso
                    que a Meta exige para ativar o webhook.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Ações de tráfego */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={simulateInbound}>
            <ArrowDownLeft className="size-3.5" />
            Simular mensagem entrada
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void pollServer()}
            disabled={polling}
          >
            {polling ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Webhook className="size-3.5" />
            )}
            Buscar eventos do servidor
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              clearWebhookEvents();
              toast.message("Log limpo");
            }}
          >
            <Trash2 className="size-3.5" />
            Limpar log
          </Button>
        </div>

        {/* Log */}
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 text-xs font-medium text-[var(--color-muted)]">
            {events.length} evento(s) no escopo
          </div>
          <ul className="divide-y divide-[var(--color-border)]">
            {events.map((ev) => {
              const cx = connections.find((c) => c.id === ev.connectionId);
              return (
                <li key={ev.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <span
                        className={cn(
                          "mt-0.5 rounded p-1",
                          ev.type === "message_in" &&
                            "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
                          ev.type === "test_out" && "bg-sky-50 text-sky-700",
                          ev.type === "error" &&
                            "bg-red-50 text-[var(--color-danger)]",
                          (ev.type === "status" ||
                            ev.type === "verify" ||
                            ev.type === "template") &&
                            "bg-[var(--color-surface-2)] text-[var(--color-navy)]",
                        )}
                      >
                        {ev.type === "message_in" ? (
                          <ArrowDownLeft className="size-3.5" />
                        ) : ev.type === "test_out" ? (
                          <ArrowUpRight className="size-3.5" />
                        ) : ev.ok ? (
                          <CheckCircle2 className="size-3.5" />
                        ) : (
                          <XCircle className="size-3.5" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[var(--color-fg)]">
                          {ev.summary}
                        </div>
                        <div className="mt-0.5 text-xs text-[var(--color-muted)]">
                          {cx?.name || ev.connectionId} · {ev.type} ·{" "}
                          <RelativeTime iso={ev.createdAt} />
                        </div>
                        {ev.payload && (
                          <pre className="mt-1 max-h-16 overflow-auto rounded bg-[var(--color-surface-2)] px-2 py-1 font-mono text-[10px] text-[var(--color-muted)]">
                            {ev.payload.slice(0, 280)}
                          </pre>
                        )}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "rounded-[var(--radius-pill)] px-2 py-0.5 text-[10px] font-medium",
                        ev.ok
                          ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                          : "bg-red-50 text-[var(--color-danger)]",
                      )}
                    >
                      {ev.ok ? "OK" : "Erro"}
                    </span>
                  </div>
                </li>
              );
            })}
            {events.length === 0 && (
              <li className="px-4 py-12 text-center text-sm text-[var(--color-muted)]">
                Nenhum evento ainda. Teste a validação ou simule uma entrada.
              </li>
            )}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
