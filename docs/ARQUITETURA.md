# Arquitetura (preview Grok)

## Stack

- **UI:** React 19, TanStack Router/Start, Tailwind 4, Lucide, Sonner
- **Estado CRM:** Zustand + `persist` (`localStorage` name `atendimento-nt-v17-name-fix`)
- **Tipos:** `src/lib/types.ts`
- **WhatsApp:** Graph API `v21.0` via `createServerFn` em `src/lib/whatsapp-api.ts`
- **Webhook:** `src/routes/api/whatsapp/webhook.ts` + buffer `src/lib/whatsapp-webhook.server.ts`
- **Auth scaffold:** Better Auth + PGLite/Neon (`src/lib/db.ts`) — **não** é o banco do CRM ainda
- **i18n:** `src/lib/i18n.tsx` (pt / en / es)

Dev: `vite dev --host 0.0.0.0 --port 8080` (`startup.sh` no sandbox Grok).

## Fluxo de uma mensagem inbound

```
WhatsApp → POST /api/whatsapp/webhook
        → parseMetaWebhook → /tmp/chatnt-wa-events.json
        → Live Chat poll (2s) GET/POST ?poll=1  ou  pollWebhookEvents()
        → receiveInbound() no store
        → executeAutomations() (automation-engine.ts)
        → sendWabaTextMessage / sendWabaInteractive
```

Outbound pelo atendente: `live-chat.tsx` → `sendWabaTextMessage` → `sendMessage` no store (bolha + `deliveryStatus`).

## Pastas

```
src/routes/                 telas (file-based)
src/components/layout/      AppShell, ContaHub
src/components/automation/  MessageComposer, Condition, HTTP
src/components/live-chat/   IceBreakers
src/lib/store.ts            TODA a regra de negócio do CRM
src/lib/automation-engine.ts execução de fluxos
src/lib/automation-triggers.ts gatilhos (keyword, CTWA, tag, 24h…)
src/lib/message-blocks.ts   stack de mensagem 24h
src/lib/scope.ts            central vs sede (cf5 Campo, cf6 União)
src/lib/funnel.ts           Lead→Estudo + gargalos
src/lib/whatsapp-api.ts     Graph (envio, signup, ice breakers)
src/lib/meta-signup.ts      FB.login Embedded Signup
```

Rotas: ver `src/components/layout/AppShell.tsx` constante `NAV`.
`routeTree.gen.ts` é gerado — ao criar arquivo em `src/routes/*.tsx` o plugin regenera; se não, edite o gen.

## Persistência Zustand

`partialize` em `store.ts` grava tags, contatos, conversas, mensagens, automações, conexões (com token), broadcasts, sedes, diário, PIN.

`merge` reidrata, aplica `uniqueById` em automações e completa `waba` com `emptyWaba()`.

**Não** coloque token no log. Mascare com `maskToken`.

## Escopo multi-sede

`sessionScope: { mode: "central" | "regional", campoCode }`
`useScopedData()` filtra contatos pelo campo customizado `cf5`.
Conexão regional tem `campoCode` + `scope: "regional"`.

## Paleta

Definida em `src/styles.css` `@theme`. Sidebar `#031c45`. Item ativo: classe `.nt-gold`.
