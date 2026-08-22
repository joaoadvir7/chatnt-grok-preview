# WhatsApp Cloud API no ChatNT

Graph: `https://graph.facebook.com/v21.0` (`src/lib/whatsapp-api.ts`).

## Credenciais por conexão

`WabaConfig`: `appId`, `wabaId`, `phoneNumberId`, `accessToken`, `webhookVerifyToken`, `coexistence?`, `iceBreakers?`.

Pronto para enviar: `wabaReady()` — token real (>20 chars, não `DEMO_`) + phoneNumberId.

## Webhook

- Callback: `{origin}/api/whatsapp/webhook`
- GET: verificação `hub.mode=subscribe` + `hub.verify_token`
- POST: mensagens e statuses
- Poll interno: `?poll=1` (Live Chat) — **não é a Meta**

Verify token padrão: `chatnt_verify_token` (pode ser outro gravado na conexão).

Assinar: `subscribeWabaWebhook` (subscribed_apps + override_callback_uri).

## Envio

- Texto: `sendWabaTextMessage`
- Interativo (botões, lista, CTA URL): `sendWabaInteractive`
- Template: `sendWabaTemplate`
- Teste: `sendWabaTestMessage`

Janela 24h: sessão. Fora: template aprovado.

## Ice breakers (iniciadores)

- UI: Live Chat → engrenagem → Iniciadores de conversa (`IceBreakers.tsx`)
- GET `/{phone-number-id}?fields=conversational_automation`
- POST `/{phone-number-id}/conversational_automation` `{ prompts: string[] }`
- Máx. 4, 80 chars, sem emoji
- Só no **primeiro** chat; `wa.me` com texto pronto **não** mostra
- Toque chega como mensagem inbound normal (dispara automação)

## Embedded Signup

`src/lib/meta-signup.ts` + tela Conexões:

| Tipo | `featureType` |
|---|---|
| Nova | `""` |
| Migrar | `only_waba_sharing` |
| Coexistência | `whatsapp_business_app_onboarding` + `sessionInfoVersion: "3"` |
| Existente | lista WABAs com o token (`listMetaWhatsAppAccounts`) |

Precisa App ID + Configuration ID do Embedded Signup (`metaPlatform` no store).

## Cobrança (não negociável)

| Origem | Meta cobra? |
|---|---|
| WhatsApp Business App / Web (coexistência) | Não |
| ChatNT (live, automação, broadcast) | Sim — Cloud API |

A partir de **1º/out/2026** resposta de serviço na API também é cobrada. O app continua grátis.

Não implementar Baileys/QR não oficial. Risco de banimento.

## Coexistência — o que falta

- Webhooks `history`, `smb_app_state_sync`, `smb_message_echoes`
- SMB App Data API nas primeiras 24h
- Número coexistência: throughput 20 mps; não usar Deregister API
