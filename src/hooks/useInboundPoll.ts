import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { pollWebhookEvents, subscribeWabaWebhook } from "@/lib/whatsapp-api";
import { useCrmStore } from "@/lib/store";
import { webhookCallbackUrl } from "@/lib/whatsapp";

type PollEvent = {
  id: string;
  type: string;
  from?: string;
  text?: string;
  contactName?: string;
  wamid?: string;
  phoneNumberId?: string;
  status?: string;
  referral?: string;
  ctwaClid?: string;
  ctwaId?: string;
  receivedAt?: string;
};

function applyEvents(
  events: PollEvent[],
  receiveInbound: (data: {
    phone: string;
    text: string;
    connectionId: string;
    name?: string;
    wamid?: string;
    referral?: string;
    ctwaClid?: string;
    ctwaId?: string;
  }) => { conversationId: string; messageId: string },
  updateMessageDeliveryByWamid: (
    wamid: string,
    status: "sent" | "delivered" | "read" | "failed",
  ) => void,
) {
  const cxs = useCrmStore.getState().connections;
  let applied = 0;
  for (const ev of events) {
    if (ev.type === "message_in" && ev.from) {
      if (ev.wamid && seenWamid.has(ev.wamid)) continue;
      const live = useCrmStore.getState();
      const already = ev.wamid
        ? live.messages.some((m) => m.wamid === ev.wamid)
        : false;
      if (already) {
        if (ev.wamid) seenWamid.add(ev.wamid);
        continue;
      }
      const connectionId =
        cxs.find((c) => c.waba?.phoneNumberId && c.waba.phoneNumberId === ev.phoneNumberId)
          ?.id ??
        live.preferredConnectionId ??
        cxs.find((c) => c.waba?.accessToken && !c.waba.demoMode)?.id ??
        cxs[0]?.id;
      if (!connectionId) continue;
      if (ev.wamid) seenWamid.add(ev.wamid);
      const text = (ev.text ?? "").trim() || "[mensagem]";
      receiveInbound({
        phone: ev.from,
        text,
        connectionId,
        name: ev.contactName,
        wamid: ev.wamid,
        referral: ev.referral,
        ctwaClid: ev.ctwaClid,
        ctwaId: ev.ctwaId,
      });
      applied += 1;
      toast.message(
        ev.contactName
          ? `WhatsApp · ${ev.contactName}`
          : "Nova mensagem no WhatsApp",
        { description: text.slice(0, 80) },
      );
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
    }
  }
  return applied;
}

async function pointWebhookHere() {
  const state = useCrmStore.getState();
  const cx =
    state.connections.find((c) => c.id === state.preferredConnectionId) ??
    state.connections.find((c) => c.waba?.accessToken && c.waba.phoneNumberId) ??
    state.connections[0];
  const w = cx?.waba;
  if (!w?.accessToken || w.accessToken.length < 20 || !w.phoneNumberId) return;
  const origin = window.location.origin;
  const callbackUrl = webhookCallbackUrl(origin);
  const verifyToken = w.webhookVerifyToken || "chatnt_verify_token";
  const res = await subscribeWabaWebhook({
    data: {
      accessToken: w.accessToken,
      wabaId: w.wabaId || undefined,
      phoneNumberId: w.phoneNumberId,
      callbackUrl,
      verifyToken,
    },
  });
  if (res.ok) {
    toast.success("Webhook da Meta apontado para o ChatNT — respostas do celular entram aqui");
  }
}

/** Aplica mensagens reais do webhook no CRM (dispara automações). */
const seenWamid = new Set<string>();
let pollInflight = false;

export function useInboundPoll(enabled = true) {
  const receiveInbound = useCrmStore((s) => s.receiveInbound);
  const updateMessageDeliveryByWamid = useCrmStore(
    (s) => s.updateMessageDeliveryByWamid,
  );
  const warned = useRef(false);
  const pointed = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    if (!pointed.current) {
      pointed.current = true;
      void pointWebhookHere().catch(() => {});
    }

    async function tick() {
      if (pollInflight) return;
      pollInflight = true;
      try {
        let events: PollEvent[] = [];
        try {
          const res = await fetch(
            `/api/whatsapp/webhook?poll=1&t=${Date.now()}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
              },
              credentials: "same-origin",
              body: "{}",
            },
          );
          if (res.ok) {
            const json = (await res.json()) as { events?: PollEvent[] };
            events = json.events ?? [];
          } else {
            throw new Error(`poll ${res.status}`);
          }
        } catch {
          const res = await pollWebhookEvents();
          events = (res.events ?? []) as PollEvent[];
        }
        if (cancelled) return;
        applyEvents(events, receiveInbound, updateMessageDeliveryByWamid);
      } catch {
        if (!warned.current) {
          warned.current = true;
          toast.error("Live Chat não conseguiu ler o webhook do WhatsApp");
        }
      } finally {
        pollInflight = false;
      }
    }

    void tick();
    const id = window.setInterval(tick, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, receiveInbound, updateMessageDeliveryByWamid]);
}
