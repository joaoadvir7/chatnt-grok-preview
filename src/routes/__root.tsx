import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { I18nProvider } from "@/lib/i18n";
import { CreatedWithGrokBanner } from "@/components/created-with-grok-banner";
import { Toaster } from "sonner";
import { useInboundPoll } from "@/hooks/useInboundPoll";
import appCss from "../styles.css?url";

const APP_NAME = "ChatNT";
const host = import.meta.env.VITE_PUBLIC_HOSTNAME;
const ogImage = host
  ? `https://og.grok.me/v1/card.png?host=${encodeURIComponent(host)}&title=${encodeURIComponent(APP_NAME)}`
  : undefined;

function InboundPoller() {
  useInboundPoll(true);
  return null;
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { name: "theme-color", content: "#031c45" },
      {
        name: "description",
        content:
          "ChatNT — Jornada de Atendimento de Ponta a Ponta · CRM WhatsApp Escola Bíblica",
      },
      ...(ogImage
        ? [
            { property: "og:image", content: ogImage },
            { property: "og:image:width", content: "1200" },
            { property: "og:image:height", content: "630" },
          ]
        : []),
    ],
    links: [
      { rel: "icon", href: "/favicon.svg?v=nt3", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon-32.png?v=nt3", type: "image/png", sizes: "32x32" },
      { rel: "icon", href: "/favicon-48.png?v=nt3", type: "image/png", sizes: "48x48" },
      { rel: "shortcut icon", href: "/favicon-32.png?v=nt3" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=nt3", sizes: "180x180" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;1,14..32,400&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
    ],
  }),
  component: () => (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("chatnt-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body>
        <CreatedWithGrokBanner />
        <AuthProvider>
          <I18nProvider>
          <InboundPoller />
          <Outlet />
          <Toaster richColors position="top-right" closeButton />
          </I18nProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
