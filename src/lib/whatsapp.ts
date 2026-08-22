import type { Connection, WabaConfig } from "./types";

/** Máscara o token para exibição (mantém início e fim). */
export function maskToken(token: string | undefined): string {
  if (!token) return "—";
  if (token.length < 16) return "••••••••";
  return `${token.slice(0, 6)}…${token.slice(-4)}`;
}

export function emptyWaba(): WabaConfig {
  return {
    appId: "",
    wabaId: "",
    phoneNumberId: "",
    accessToken: "",
    webhookVerifyToken: "chatnt_verify_token",
    demoMode: false,
  };
}

export function wabaReady(w?: WabaConfig): boolean {
  if (!w) return false;
  // Demo desativado de vez: só token real + phone number id
  if (w.demoMode) return false;
  if (!w.accessToken || w.accessToken.startsWith("DEMO_")) return false;
  return Boolean(
    w.accessToken.length > 20 &&
      w.phoneNumberId &&
      w.phoneNumberId.length > 5,
  );
}

/** URL de callback sugerida (só use no cliente após mount). */
export function webhookCallbackUrl(origin?: string): string {
  const base = origin || "https://seu-dominio.com";
  return `${base.replace(/\/$/, "")}/api/whatsapp/webhook`;
}

export function connectionLabel(cx: Connection): string {
  if (cx.scope === "central") return "Central";
  return cx.campoCode ? `Sede ${cx.campoCode}` : "Regional";
}

export type ValidateResult = {
  ok: boolean;
  demo: boolean;
  displayPhone?: string;
  verifiedName?: string;
  quality?: "Alta" | "Média" | "Baixa";
  error?: string;
  raw?: string;
};

export type SendTestResult = {
  ok: boolean;
  demo: boolean;
  messageId?: string;
  error?: string;
};

/** Checklist de setup para a UI */
export const WABA_SETUP_STEPS = [
  {
    id: "app",
    title: "App Meta",
    detail:
      "Crie o app em developers.facebook.com → tipo Business → produto WhatsApp",
  },
  {
    id: "number",
    title: "Número / Phone Number ID",
    detail:
      "Em WhatsApp → API Setup, copie o Phone number ID (não o número formatado)",
  },
  {
    id: "token",
    title: "Access token",
    detail:
      "Token de teste dura ~1–2h. Em produção use System User token permanente",
  },
  {
    id: "webhook",
    title: "Webhook",
    detail:
      "Configure Callback URL + Verify Token e assine o campo messages",
  },
  {
    id: "test",
    title: "Mensagem de teste",
    detail:
      "Envie uma msg do WhatsApp para o número de teste (abre janela 24h) e teste o envio",
  },
] as const;
