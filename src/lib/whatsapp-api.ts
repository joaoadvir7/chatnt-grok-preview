import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SendTestResult, ValidateResult } from "./whatsapp";

const GRAPH = "https://graph.facebook.com/v21.0";

const credsSchema = z.object({
  accessToken: z.string().min(1),
  phoneNumberId: z.string().min(1),
  demoMode: z.boolean().optional(),
});

const sendSchema = credsSchema.extend({
  to: z.string().min(8),
  text: z.string().min(1).max(4096),
});

const templateSchema = credsSchema.extend({
  to: z.string().min(8),
  templateName: z.string().min(1),
  language: z.string().default("pt_BR"),
  bodyParams: z.array(z.string()).optional(),
});

export const validateWabaCredentials = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => credsSchema.parse(data))
  .handler(async ({ data }): Promise<ValidateResult> => {
    if (
      data.demoMode ||
      !data.accessToken ||
      data.accessToken.startsWith("DEMO_") ||
      data.accessToken.length < 20
    ) {
      return {
        ok: false,
        demo: false,
        error:
          "Modo demo desativado. Cole um Access Token real da Meta (System User) em Conexões.",
      };
    }

    try {
      const url = new URL(`${GRAPH}/${encodeURIComponent(data.phoneNumberId)}`);
      url.searchParams.set(
        "fields",
        "display_phone_number,verified_name,quality_rating,id",
      );
      url.searchParams.set("access_token", data.accessToken);

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const json = (await res.json()) as Record<string, unknown>;

      if (!res.ok) {
        const err = json.error as { message?: string } | undefined;
        return {
          ok: false,
          demo: false,
          error:
            err?.message ||
            `Graph API ${res.status}: falha ao validar Phone Number ID / token`,
          raw: JSON.stringify(json).slice(0, 500),
        };
      }

      const qualityRaw = String(json.quality_rating ?? "").toUpperCase();
      let quality: "Alta" | "Média" | "Baixa" = "Média";
      if (qualityRaw.includes("GREEN") || qualityRaw === "HIGH") quality = "Alta";
      if (qualityRaw.includes("YELLOW") || qualityRaw === "MEDIUM")
        quality = "Média";
      if (qualityRaw.includes("RED") || qualityRaw === "LOW") quality = "Baixa";

      return {
        ok: true,
        demo: false,
        displayPhone: String(json.display_phone_number ?? ""),
        verifiedName: String(json.verified_name ?? ""),
        quality,
      };
    } catch (e) {
      return {
        ok: false,
        demo: false,
        error: e instanceof Error ? e.message : "Erro de rede ao falar com a Meta",
      };
    }
  });

export const sendWabaTestMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => sendSchema.parse(data))
  .handler(async ({ data }): Promise<SendTestResult> => {
    const to = data.to.replace(/\D/g, "");

    if (
      data.demoMode ||
      !data.accessToken ||
      data.accessToken.startsWith("DEMO_") ||
      data.accessToken.length < 20
    ) {
      return {
        ok: false,
        demo: false,
        error:
          "Modo demo desativado. Configure token real em Conexões para enviar.",
      };
    }

    try {
      const res = await fetch(
        `${GRAPH}/${encodeURIComponent(data.phoneNumberId)}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "text",
            text: { preview_url: false, body: data.text },
          }),
        },
      );
      const json = (await res.json()) as {
        messages?: { id: string }[];
        error?: { message?: string };
      };

      if (!res.ok) {
        return {
          ok: false,
          demo: false,
          error:
            json.error?.message ||
            `Falha no envio (${res.status}). Confira janela 24h e token.`,
        };
      }

      return {
        ok: true,
        demo: false,
        messageId: json.messages?.[0]?.id,
      };
    } catch (e) {
      return {
        ok: false,
        demo: false,
        error: e instanceof Error ? e.message : "Erro de rede no envio",
      };
    }
  });

export const sendWabaTextMessage = sendWabaTestMessage;

export const sendWabaTemplate = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => templateSchema.parse(data))
  .handler(async ({ data }): Promise<SendTestResult> => {
    const to = data.to.replace(/\D/g, "");

    if (
      data.demoMode ||
      !data.accessToken ||
      data.accessToken.startsWith("DEMO_") ||
      data.accessToken.length < 20
    ) {
      return {
        ok: false,
        demo: false,
        error: "Configure token real em Conexões para enviar template.",
      };
    }

    try {
      const components =
        data.bodyParams && data.bodyParams.length
          ? [
              {
                type: "body",
                parameters: data.bodyParams.map((text) => ({
                  type: "text",
                  text,
                })),
              },
            ]
          : undefined;
      const res = await fetch(
        `${GRAPH}/${encodeURIComponent(data.phoneNumberId)}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
              name: data.templateName,
              language: { code: data.language || "pt_BR" },
              ...(components ? { components } : {}),
            },
          }),
        },
      );
      const json = (await res.json()) as {
        messages?: { id: string }[];
        error?: { message?: string };
      };
      if (!res.ok) {
        return {
          ok: false,
          demo: false,
          error: json.error?.message || `Falha no template (${res.status})`,
        };
      }
      return {
        ok: true,
        demo: false,
        messageId: json.messages?.[0]?.id,
      };
    } catch (e) {
      return {
        ok: false,
        demo: false,
        error: e instanceof Error ? e.message : "Erro de rede no template",
      };
    }
  });

export const sendWabaInteractive = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        accessToken: z.string().min(1),
        phoneNumberId: z.string().min(1),
        to: z.string().min(8),
        body: z.string().min(1).max(1024),
        header: z.string().optional(),
        footer: z.string().optional(),
        buttons: z
          .array(z.object({ id: z.string(), label: z.string() }))
          .optional(),
        listButton: z.string().optional(),
        listSections: z
          .array(
            z.object({
              title: z.string(),
              rows: z.array(z.object({ id: z.string(), title: z.string() })),
            }),
          )
          .optional(),
        ctaUrl: z
          .object({
            displayText: z.string().min(1).max(20),
            url: z.string().min(8),
          })
          .optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<SendTestResult> => {
    const to = data.to.replace(/\D/g, "");
    if (!data.accessToken || data.accessToken.startsWith("DEMO_")) {
      return {
        ok: false,
        demo: false,
        error: "Token inválido para envio interativo",
      };
    }

    const interactive =
      data.listSections && data.listSections.length
        ? {
            type: "list",
            ...(data.header
              ? { header: { type: "text", text: data.header.slice(0, 60) } }
              : {}),
            body: { text: data.body.slice(0, 1024) },
            ...(data.footer
              ? { footer: { text: data.footer.slice(0, 60) } }
              : {}),
            action: {
              button: (data.listButton || "Opções").slice(0, 20),
              sections: data.listSections.slice(0, 10).map((s) => ({
                title: s.title.slice(0, 24),
                rows: s.rows.slice(0, 10).map((r) => ({
                  id: r.id.slice(0, 200),
                  title: r.title.slice(0, 24),
                })),
              })),
            },
          }
        : data.ctaUrl && !(data.buttons && data.buttons.length)
          ? {
              type: "cta_url",
              ...(data.header
                ? { header: { type: "text", text: data.header.slice(0, 60) } }
                : {}),
              body: { text: data.body.slice(0, 1024) },
              ...(data.footer
                ? { footer: { text: data.footer.slice(0, 60) } }
                : {}),
              action: {
                name: "cta_url",
                parameters: {
                  display_text: data.ctaUrl.displayText.slice(0, 20),
                  url: data.ctaUrl.url,
                },
              },
            }
          : {
            type: "button",
            ...(data.header
              ? { header: { type: "text", text: data.header.slice(0, 60) } }
              : {}),
            body: { text: data.body.slice(0, 1024) },
            ...(data.footer
              ? { footer: { text: data.footer.slice(0, 60) } }
              : {}),
            action: {
              buttons: (data.buttons ?? []).slice(0, 3).map((b) => ({
                type: "reply",
                reply: {
                  id: b.id.slice(0, 256),
                  title: b.label.slice(0, 20),
                },
              })),
            },
          };

    try {
      const res = await fetch(
        `${GRAPH}/${encodeURIComponent(data.phoneNumberId)}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "interactive",
            interactive,
          }),
        },
      );
      const json = (await res.json()) as {
        messages?: { id: string }[];
        error?: { message?: string };
      };
      if (!res.ok) {
        return {
          ok: false,
          demo: false,
          error: json.error?.message || `Falha interativa (${res.status})`,
        };
      }
      return { ok: true, demo: false, messageId: json.messages?.[0]?.id };
    } catch (e) {
      return {
        ok: false,
        demo: false,
        error: e instanceof Error ? e.message : "Erro de rede no interativo",
      };
    }
  });

export const postSimulatedWebhook = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        phoneNumberId: z.string().min(1),
        from: z.string().min(8),
        contactName: z.string().optional(),
        text: z.string().min(1),
        wabaId: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: data.wabaId || "WABA_DEMO",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "15550000000",
                  phone_number_id: data.phoneNumberId,
                },
                contacts: [
                  {
                    profile: { name: data.contactName || "Aluno WhatsApp" },
                    wa_id: data.from.replace(/\D/g, ""),
                  },
                ],
                messages: [
                  {
                    from: data.from.replace(/\D/g, ""),
                    id: `wamid.IN_${Date.now()}`,
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    type: "text",
                    text: { body: data.text },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const { parseMetaWebhook } = await import("./whatsapp-webhook.server");
    const events = parseMetaWebhook(payload);
    return { ok: true as const, count: events.length, events };
  });

export const pollWebhookEvents = createServerFn({ method: "GET" }).handler(
  async () => {
    const { claimUnconsumedEvents } = await import("./whatsapp-webhook.server");
    return { events: claimUnconsumedEvents(40) };
  },
);

export const ackWebhookEvents = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ ids: z.array(z.string()) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { markConsumed } = await import("./whatsapp-webhook.server");
    markConsumed(data.ids);
    return { ok: true as const };
  });

export const registerWebhookVerifyToken = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ token: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { registerVerifyToken } = await import("./whatsapp-webhook.server");
    registerVerifyToken(data.token);
    return { ok: true as const };
  });

export const subscribeWabaWebhook = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        accessToken: z.string().min(10),
        wabaId: z.string().optional(),
        phoneNumberId: z.string().optional(),
        callbackUrl: z.string().url(),
        verifyToken: z.string().min(1),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { registerVerifyToken } = await import("./whatsapp-webhook.server");
    registerVerifyToken(data.verifyToken);

    const errors: string[] = [];
    let wabaOk = false;
    let phoneOk = false;

    if (data.wabaId) {
      try {
        const res = await fetch(
          `${GRAPH}/${encodeURIComponent(data.wabaId)}/subscribed_apps`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${data.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              override_callback_uri: data.callbackUrl,
              verify_token: data.verifyToken,
            }),
          },
        );
        const json = (await res.json()) as {
          success?: boolean;
          error?: { message?: string };
        };
        if (res.ok && json.error == null) wabaOk = true;
        else errors.push(json.error?.message || `WABA ${res.status}`);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "falha WABA");
      }
    }

    if (data.phoneNumberId) {
      try {
        const res = await fetch(
          `${GRAPH}/${encodeURIComponent(data.phoneNumberId)}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${data.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              webhook_configuration: {
                override_callback_uri: data.callbackUrl,
                verify_token: data.verifyToken,
              },
            }),
          },
        );
        const json = (await res.json()) as {
          success?: boolean;
          error?: { message?: string };
        };
        if (res.ok && json.error == null) phoneOk = true;
        else errors.push(json.error?.message || `número ${res.status}`);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "falha número");
      }
    }

    return {
      ok: wabaOk || phoneOk,
      wabaOk,
      phoneOk,
      error: errors.join(" · ") || undefined,
      callbackUrl: data.callbackUrl,
    };
  });

export type EmbeddedSignupResult = {
  ok: boolean;
  accessToken?: string;
  wabaId?: string;
  phoneNumberId?: string;
  displayPhone?: string;
  verifiedName?: string;
  quality?: "Alta" | "Média" | "Baixa";
  error?: string;
};

export const completeEmbeddedSignup = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        appId: z.string().min(1),
        appSecret: z.string().optional(),
        code: z.string().optional(),
        accessToken: z.string().optional(),
        wabaId: z.string().optional(),
        phoneNumberId: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<EmbeddedSignupResult> => {
    let token = data.accessToken?.trim() || "";

    if (!token && data.code && data.appSecret) {
      try {
        const url = new URL(`${GRAPH}/oauth/access_token`);
        url.searchParams.set("client_id", data.appId);
        url.searchParams.set("client_secret", data.appSecret);
        url.searchParams.set("code", data.code);
        const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
        const json = (await res.json()) as {
          access_token?: string;
          error?: { message?: string };
        };
        if (!res.ok || !json.access_token) {
          return {
            ok: false,
            error:
              json.error?.message ||
              "Não foi possível trocar o código da Meta por um token. Confira o App Secret.",
          };
        }
        token = json.access_token;
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : "Falha ao falar com a Meta",
        };
      }
    }

    if (!token) {
      return {
        ok: Boolean(data.wabaId || data.phoneNumberId),
        wabaId: data.wabaId,
        phoneNumberId: data.phoneNumberId,
        error: data.wabaId
          ? undefined
          : "Painel da Meta abriu, mas ainda falta o token. Cole o App Secret para concluir automático.",
      };
    }

    let wabaId = data.wabaId?.trim() || "";
    let phoneNumberId = data.phoneNumberId?.trim() || "";
    let displayPhone = "";
    let verifiedName = "";
    let quality: "Alta" | "Média" | "Baixa" = "Média";

    try {
      if (!wabaId) {
        const debug = new URL(`${GRAPH}/debug_token`);
        debug.searchParams.set("input_token", token);
        debug.searchParams.set("access_token", `${data.appId}|${data.appSecret || token}`);
        const dres = await fetch(debug.toString(), { headers: { Accept: "application/json" } });
        const djson = (await dres.json()) as {
          data?: { granular_scopes?: { scope: string; target_ids?: string[] }[] };
        };
        const targets =
          djson.data?.granular_scopes?.flatMap((s) => s.target_ids ?? []) ?? [];
        if (targets[0]) wabaId = targets[0];
      }

      if (wabaId && !phoneNumberId) {
        const pres = await fetch(
          `${GRAPH}/${encodeURIComponent(wabaId)}/phone_numbers?access_token=${encodeURIComponent(token)}`,
          { headers: { Accept: "application/json" } },
        );
        const pjson = (await pres.json()) as {
          data?: {
            id: string;
            display_phone_number?: string;
            verified_name?: string;
            quality_rating?: string;
          }[];
        };
        const first = pjson.data?.[0];
        if (first) {
          phoneNumberId = first.id;
          displayPhone = first.display_phone_number ?? "";
          verifiedName = first.verified_name ?? "";
          const q = String(first.quality_rating ?? "").toUpperCase();
          if (q.includes("GREEN") || q === "HIGH") quality = "Alta";
          if (q.includes("RED") || q === "LOW") quality = "Baixa";
        }
      }

      if (phoneNumberId) {
        const nres = await fetch(
          `${GRAPH}/${encodeURIComponent(phoneNumberId)}?fields=display_phone_number,verified_name,quality_rating&access_token=${encodeURIComponent(token)}`,
          { headers: { Accept: "application/json" } },
        );
        const njson = (await nres.json()) as {
          display_phone_number?: string;
          verified_name?: string;
          quality_rating?: string;
          error?: { message?: string };
        };
        if (!njson.error) {
          displayPhone = njson.display_phone_number || displayPhone;
          verifiedName = njson.verified_name || verifiedName;
          const q = String(njson.quality_rating ?? "").toUpperCase();
          if (q.includes("GREEN") || q === "HIGH") quality = "Alta";
          if (q.includes("RED") || q === "LOW") quality = "Baixa";
        }
      }

      if (wabaId) {
        await fetch(`${GRAPH}/${encodeURIComponent(wabaId)}/subscribed_apps`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }).catch(() => undefined);
      }
    } catch (e) {
      return {
        ok: Boolean(token && (wabaId || phoneNumberId)),
        accessToken: token,
        wabaId,
        phoneNumberId,
        displayPhone,
        verifiedName,
        quality,
        error: e instanceof Error ? e.message : undefined,
      };
    }

    return {
      ok: Boolean(token && (phoneNumberId || wabaId)),
      accessToken: token,
      wabaId,
      phoneNumberId,
      displayPhone,
      verifiedName,
      quality,
    };
  });

export type MetaWabaPhone = {
  phoneNumberId: string;
  displayPhone: string;
  verifiedName: string;
  quality: "Alta" | "Média" | "Baixa";
  wabaId: string;
  wabaName: string;
  businessId: string;
  businessName: string;
};

function mapQuality(raw: string): "Alta" | "Média" | "Baixa" {
  const q = raw.toUpperCase();
  if (q.includes("GREEN") || q === "HIGH") return "Alta";
  if (q.includes("RED") || q === "LOW") return "Baixa";
  return "Média";
}

async function graphJson(
  path: string,
  token: string,
  search?: Record<string, string>,
): Promise<Record<string, unknown>> {
  const url = new URL(`${GRAPH}/${path.replace(/^\//, "")}`);
  url.searchParams.set("access_token", token);
  if (search) {
    for (const [k, v] of Object.entries(search)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  return (await res.json()) as Record<string, unknown>;
}

export const listMetaWhatsAppAccounts = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        accessToken: z.string().min(10),
        knownWabaIds: z.array(z.string()).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; accounts: MetaWabaPhone[]; error?: string }> => {
    const token = data.accessToken.trim();
    const accounts: MetaWabaPhone[] = [];
    const seen = new Set<string>();

    async function addPhones(
      wabaId: string,
      wabaName: string,
      businessId: string,
      businessName: string,
    ) {
      if (!wabaId) return;
      const json = await graphJson(`${wabaId}/phone_numbers`, token, {
        fields: "id,display_phone_number,verified_name,quality_rating",
      });
      const rows = (json.data as
        | {
            id?: string;
            display_phone_number?: string;
            verified_name?: string;
            quality_rating?: string;
          }[]
        | undefined) ?? [];
      for (const p of rows) {
        if (!p.id || seen.has(p.id)) continue;
        seen.add(p.id);
        accounts.push({
          phoneNumberId: p.id,
          displayPhone: p.display_phone_number ?? "",
          verifiedName: p.verified_name ?? "",
          quality: mapQuality(String(p.quality_rating ?? "")),
          wabaId,
          wabaName,
          businessId,
          businessName,
        });
      }
    }

    try {
      const businesses: { id: string; name: string }[] = [];
      const meBiz = await graphJson("me/businesses", token, { fields: "id,name", limit: "50" });
      const bizRows = (meBiz.data as { id?: string; name?: string }[] | undefined) ?? [];
      for (const b of bizRows) {
        if (b.id) businesses.push({ id: b.id, name: b.name ?? "Business Manager" });
      }

      if (businesses.length === 0) {
        const me = await graphJson("me", token, { fields: "id,name" });
        if (me.id) {
          businesses.push({
            id: String(me.id),
            name: String(me.name ?? "Conta Meta"),
          });
        }
      }

      for (const biz of businesses) {
        for (const edge of [
          "owned_whatsapp_business_accounts",
          "client_whatsapp_business_accounts",
        ]) {
          const wabas = await graphJson(`${biz.id}/${edge}`, token, {
            fields: "id,name",
            limit: "50",
          });
          const wRows = (wabas.data as { id?: string; name?: string }[] | undefined) ?? [];
          for (const w of wRows) {
            if (w.id) await addPhones(w.id, w.name ?? "WABA", biz.id, biz.name);
          }
        }
      }

      const mine = await graphJson("me/whatsapp_business_accounts", token, {
        fields: "id,name",
        limit: "50",
      });
      const mineRows = (mine.data as { id?: string; name?: string }[] | undefined) ?? [];
      for (const w of mineRows) {
        if (w.id) await addPhones(w.id, w.name ?? "WABA", "", "");
      }

      const assigned = await graphJson("me/assigned_whatsapp_business_accounts", token, {
        fields: "id,name",
        limit: "50",
      });
      const asg = (assigned.data as { id?: string; name?: string }[] | undefined) ?? [];
      for (const w of asg) {
        if (w.id) await addPhones(w.id, w.name ?? "WABA", "", "");
      }

      for (const id of data.knownWabaIds ?? []) {
        if (!id) continue;
        const info = await graphJson(id, token, { fields: "id,name" });
        await addPhones(id, String(info.name ?? "WABA"), "", "");
      }

      return {
        ok: accounts.length > 0,
        accounts,
        error:
          accounts.length > 0
            ? undefined
            : "Nenhum número encontrado nesta conta Meta. Confira se o token tem permissão whatsapp_business_management.",
      };
    } catch (e) {
      return {
        ok: accounts.length > 0,
        accounts,
        error: e instanceof Error ? e.message : "Falha ao ler contas da Meta",
      };
    }
  });

export const fetchIceBreakers = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        accessToken: z.string().min(10),
        phoneNumberId: z.string().min(5),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    try {
      const url = new URL(
        `${GRAPH}/${encodeURIComponent(data.phoneNumberId)}`,
      );
      url.searchParams.set("fields", "conversational_automation");
      url.searchParams.set("access_token", data.accessToken);
      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });
      const json = (await res.json()) as {
        conversational_automation?: { prompts?: string[] };
        error?: { message?: string };
      };
      if (!res.ok) {
        return {
          ok: false as const,
          prompts: [] as string[],
          error: json.error?.message || `Graph ${res.status}`,
        };
      }
      const prompts = (json.conversational_automation?.prompts ?? [])
        .map((p) => String(p).trim())
        .filter(Boolean)
        .slice(0, 4);
      return { ok: true as const, prompts };
    } catch (e) {
      return {
        ok: false as const,
        prompts: [] as string[],
        error: e instanceof Error ? e.message : "Falha ao ler iniciadores",
      };
    }
  });

export const publishIceBreakers = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        accessToken: z.string().min(10),
        phoneNumberId: z.string().min(5),
        prompts: z.array(z.string().max(80)).max(4),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    try {
      const res = await fetch(
        `${GRAPH}/${encodeURIComponent(data.phoneNumberId)}/conversational_automation`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            enable_welcome_message: true,
            prompts: data.prompts,
          }),
        },
      );
      const json = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || json.error) {
        return {
          ok: false as const,
          error: json.error?.message || `Graph ${res.status}`,
        };
      }
      return { ok: true as const };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : "Falha ao publicar iniciadores",
      };
    }
  });
