# Arquitetura

## Stack (Grok)

- React 19, TypeScript, Vite
- TanStack Router + TanStack Start (`createServerFn` para Graph API)
- Zustand + `persist` (localStorage)
- Tailwind 4 + tokens em `src/styles.css`
- better-auth + PGLite/Neon em `src/lib/db.ts` (auth; o CRM em si ainda é Zustand)
- Graph API Meta `v21.0`

Rotas: arquivos em `src/routes/*.tsx`.

## Runtime de mensagens

WhatsApp → POST `/api/whatsapp/webhook` → parseMetaWebhook → poll `useInboundPoll` → `receiveInbound` → `executeAutomations` → Graph API → Live Chat.

## Paleta

`#031c45` sidebar, `#0050a0` primary, `#f5c400` gold NT. Verde só nas bolhas WhatsApp, não na chrome.
