import { createFileRoute } from "@tanstack/react-router";
import {
  isValidVerifyToken,
  listEvents,
  claimUnconsumedEvents,
  markConsumed,
  parseMetaWebhook,
  pushEvent,
  registerVerifyToken,
} from "@/lib/whatsapp-webhook.server";

/**
 * Endpoint oficial para a Meta Cloud API.
 * GET  — verificação do webhook (hub.challenge)
 * POST — mensagens inbound + status de entrega
 * GET  ?poll=1 — o CRM busca eventos ainda não consumidos
 */
export const Route = createFileRoute("/api/whatsapp/webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        // Poll interno do CRM (não é a Meta)
        if (url.searchParams.get("poll") === "1") {
          const onlyUnconsumed = url.searchParams.get("unconsumed") !== "0";
          const events = listEvents({ onlyUnconsumed, limit: 50 });
          return Response.json(
            { ok: true, events },
            {
              headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate",
                Pragma: "no-cache",
              },
            },
          );
        }

        if (mode === "subscribe" && challenge) {
          if (isValidVerifyToken(token)) {
            pushEvent({
              type: "verify",
              summary: "Webhook verificado pela Meta (hub.mode=subscribe)",
              payload: JSON.stringify({
                mode,
                token: token ? `${token.slice(0, 6)}…` : null,
              }),
              ok: true,
            });
            return new Response(challenge, {
              status: 200,
              headers: { "Content-Type": "text/plain" },
            });
          }
          pushEvent({
            type: "error",
            summary: "Falha na verificação: verify_token inválido",
            payload: JSON.stringify({ mode, token: token?.slice(0, 8) }),
            ok: false,
          });
          return new Response("Forbidden", { status: 403 });
        }

        return Response.json({
          ok: true,
          service: "ChatNT WhatsApp Cloud API webhook",
          usage: {
            verify: "GET ?hub.mode=subscribe&hub.verify_token=…&hub.challenge=…",
            inbound: "POST Meta payload",
            poll: "GET ?poll=1",
          },
        });
      },

      POST: async ({ request }) => {
        const url = new URL(request.url);

        // Poll interno do CRM (POST evita cache de proxy)
        if (url.searchParams.get("poll") === "1") {
          const events = claimUnconsumedEvents(50);
          return Response.json(
            { ok: true, events },
            {
              headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate",
              },
            },
          );
        }

        // Marcar eventos consumidos (CRM)
        if (url.searchParams.get("ack") === "1") {
          try {
            const body = (await request.json()) as { ids?: string[] };
            markConsumed(body.ids ?? []);
            return Response.json({ ok: true });
          } catch {
            return Response.json({ ok: false, error: "bad body" }, { status: 400 });
          }
        }

        // Registrar verify token extra (CRM salva credenciais)
        if (url.searchParams.get("register_token") === "1") {
          try {
            const body = (await request.json()) as { token?: string };
            if (body.token) registerVerifyToken(body.token);
            return Response.json({ ok: true });
          } catch {
            return Response.json({ ok: false }, { status: 400 });
          }
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          pushEvent({
            type: "error",
            summary: "POST com body não-JSON",
            payload: "",
            ok: false,
          });
          // Meta espera 200 mesmo em alguns erros para não reenviar em loop
          return new Response("OK", { status: 200 });
        }

        parseMetaWebhook(body);
        // Sempre 200 para a Meta (evita retries agressivos)
        return new Response("EVENT_RECEIVED", { status: 200 });
      },
    },
  },
});
