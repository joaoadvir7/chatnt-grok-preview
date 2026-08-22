type FbLoginResponse = {
  authResponse?: { code?: string; accessToken?: string };
  status?: string;
};

declare global {
  interface Window {
    FB?: {
      init: (opts: Record<string, unknown>) => void;
      login: (
        cb: (res: FbLoginResponse) => void,
        opts: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

export type SignupSession = {
  code?: string;
  accessToken?: string;
  wabaId?: string;
  phoneNumberId?: string;
  businessId?: string;
};

function parseSignupMessage(raw: unknown): SignupSession | null {
  let data: Record<string, unknown> | null = null;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  } else if (raw && typeof raw === "object") {
    data = raw as Record<string, unknown>;
  }
  if (!data) return null;
  const type = String(data.type ?? data.event ?? "");
  const inner = (data.data ?? data) as Record<string, unknown>;
  if (
    type !== "WA_EMBEDDED_SIGNUP" &&
    String(inner.type ?? "") !== "WA_EMBEDDED_SIGNUP" &&
    !inner.phone_number_id &&
    !inner.waba_id
  ) {
    return null;
  }
  const payload = (inner.data ?? inner) as Record<string, unknown>;
  const event = String(data.event ?? inner.event ?? payload.event ?? "");
  if (event && event !== "FINISH" && event !== "finish") {
    if (event === "CANCEL" || event === "cancel") return { wabaId: "" };
    return null;
  }
  return {
    wabaId: String(payload.waba_id ?? payload.wabaId ?? "").trim() || undefined,
    phoneNumberId:
      String(payload.phone_number_id ?? payload.phoneNumberId ?? "").trim() ||
      undefined,
    businessId:
      String(payload.business_id ?? payload.businessId ?? "").trim() || undefined,
  };
}

export function loadFacebookSdk(appId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.FB) {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version: "v21.0",
      });
      resolve();
      return;
    }
    const prev = window.fbAsyncInit;
    window.fbAsyncInit = () => {
      prev?.();
      window.FB?.init({
        appId,
        cookie: true,
        xfbml: false,
        version: "v21.0",
      });
      resolve();
    };
    if (document.getElementById("facebook-jssdk")) return;
    const s = document.createElement("script");
    s.id = "facebook-jssdk";
    s.async = true;
    s.defer = true;
    s.crossOrigin = "anonymous";
    s.src = "https://connect.facebook.net/pt_BR/sdk.js";
    s.onerror = () => reject(new Error("Não foi possível carregar o SDK da Meta"));
    document.head.appendChild(s);
    window.setTimeout(() => {
      if (!window.FB) reject(new Error("SDK da Meta não inicializou"));
    }, 12000);
  });
}

export async function launchEmbeddedSignup(opts: {
  appId: string;
  configId?: string;
  featureType?: string;
  setup?: Record<string, unknown>;
}): Promise<SignupSession> {
  const session: SignupSession = {};

  const onMessage = (ev: MessageEvent) => {
    if (
      typeof ev.origin === "string" &&
      !ev.origin.includes("facebook.com") &&
      !ev.origin.includes("meta.com")
    ) {
      return;
    }
    const parsed = parseSignupMessage(ev.data);
    if (!parsed) return;
    if (parsed.wabaId) session.wabaId = parsed.wabaId;
    if (parsed.phoneNumberId) session.phoneNumberId = parsed.phoneNumberId;
    if (parsed.businessId) session.businessId = parsed.businessId;
  };
  window.addEventListener("message", onMessage);

  try {
    await loadFacebookSdk(opts.appId);
    const login = await new Promise<FbLoginResponse>((resolve, reject) => {
      if (!window.FB) {
        reject(new Error("SDK da Meta indisponível"));
        return;
      }
      const loginOpts: Record<string, unknown> = {
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: opts.setup ?? {},
          featureType: opts.featureType ?? "",
          sessionInfoVersion: "3",
        },
      };
      if (opts.configId) loginOpts.config_id = opts.configId;
      else {
        loginOpts.scope =
          "whatsapp_business_management,whatsapp_business_messaging,business_management";
      }
      window.FB.login((res) => resolve(res ?? {}), loginOpts);
    });

    session.code = login.authResponse?.code;
    session.accessToken = login.authResponse?.accessToken;
    await new Promise((r) => window.setTimeout(r, 400));
    return session;
  } finally {
    window.removeEventListener("message", onMessage);
  }
}

export async function loginFacebookBusiness(appId: string): Promise<SignupSession> {
  await loadFacebookSdk(appId);
  const login = await new Promise<FbLoginResponse>((resolve, reject) => {
    if (!window.FB) {
      reject(new Error("SDK da Meta indisponível"));
      return;
    }
    window.FB.login((res) => resolve(res ?? {}), {
      scope:
        "business_management,whatsapp_business_management,whatsapp_business_messaging",
      return_scopes: true,
    });
  });
  return {
    code: login.authResponse?.code,
    accessToken: login.authResponse?.accessToken,
  };
}
