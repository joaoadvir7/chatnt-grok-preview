# Automações — canvas e motor

Dois arquivos mandatórios:

- UI: `src/routes/automacoes.$id.tsx` (`FlowWorkspace`)
- Motor: `src/lib/automation-engine.ts`

Lista: `src/routes/automacoes.tsx`. Broadcasts reusam o canvas com `embedded`.

## Regras do canvas (não quebrar)

1. **Um editor.** Não duplicar `FlowWorkspace`. Broadcast passa `embedded`.
2. **Gatilho não tem porta de entrada.**
3. **Reply button = porta de fluxo.** `parseButtons` / `parseReplyButtons` com `type === "reply"`.
4. **Link / CTA = visual only.** `collectLinkButtons` une `msgButtons` + `msgStack[].buttons`. Render: `.fl-wa-btn.fl-wa-link` (ícone `ExternalLink`), **sem** handle de porta. No envio, vira `ctaUrls`.
5. Ligar **porta a porta**. Clique numa porta, clique na outra. Excluir linha: clique na aresta / tecla Delete conforme o editor.
6. Zoom/pan no viewport. Cards não distorcem.
7. Encaminhar: filtrar

```ts
a.source !== "broadcast" && !a.name.startsWith("Fluxo ·") && !a.trashed
```

8. Toggle: `toggleAutomation(id)` no store. Dedup por id. Persist `uniqueById`.

## Config do nó

`FlowNode.config: Record<string, string>`. JSON vive em strings (`msgButtons`, `msgStack`, `listSections`, `carouselCards`, grupos da condição).

Helpers: `src/lib/message-blocks.ts`.

Canais do bloco mensagem:

- `session` — janela 24h (texto, mídia, lista, contexto, carrossel)
- `flow` — WhatsApp Flow
- `template` — template aprovado (fora da janela)

## Gatilhos

Catálogo: `src/lib/automation-triggers.ts`.

Mais usados: `any_inbound`, `keyword`, `first_message`, `ctwa`, `tag` / `tag_removed`, `broadcast`, `contact_no_reply`, `agent_no_reply`.

O motor recebe `AutomationEvent` em `executeAutomations`. Inbound do Live Chat dispara evento `inbound`.

## Motor

`planAutomationRuns` decide quais automações correm (ativas, gatilho bate, não pausadas na conversa, dedup).  
Depois executa nós: mensagem → Graph (`sendWabaTextMessage` / `sendWabaInteractive` / `sendWabaTemplate`), tag, campo, delay, condição, random, assign, finalize, forward, optout.

`Conversation.waitingFlow` segura o contato num nó (lista / botões / stack) até a próxima resposta. `stackIndex` acompanha o stack 24h.

Mutex: não reentrar o mesmo evento. Contador `runCount` / `lastRunAt` na automação.

## Importar

`src/lib/import-automation.ts` — colar JSON de fluxo. Validar nós/edges antes de `saveFlow`.

## O que ainda não executa de verdade

| Bloco | UI | Runtime |
|---|---|---|
| HTTP | sim (`HttpRequestConfig`) | parcial |
| Google Sheets | sim | não |
| Conversion API | sim | não |
| SMS / call | sim | não |
| WhatsApp Flow (nativo) | config | não publicado na Meta |

## Teste rápido

1. Criar automação, gatilho “Cliente interagir”.
2. Nó mensagem com 1 reply + 1 link. O reply tem porta; o link não.
3. Ligar reply → tag / finalizar.
4. Ativar **só essa**.
5. Mandar inbound em Webhooks ou no número de teste.
6. Conferir bolha no Live Chat + `runCount`.
