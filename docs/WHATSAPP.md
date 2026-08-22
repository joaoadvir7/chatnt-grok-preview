# WhatsApp Cloud API

Credenciais por conexão em `WabaConfig`. Nunca logar o token. UI usa `maskToken`.

Webhook: `/api/whatsapp/webhook` — GET verify, POST Meta, poll interno.

Envio: `sendWabaTextMessage`, `sendWabaInteractive`, `sendWabaTemplate`.
Link = `cta_url`. Reply = `button`. Não misturar no mesmo payload.

Ice breakers: `POST /{phone-number-id}/conversational_automation` — até 4 × 80, sem emoji, só primeira conversa.

Coexistência: `featureType: whatsapp_business_app_onboarding`. App grátis; API cobrada. Não implementar Baileys.

Graph: `https://graph.facebook.com/v21.0`
