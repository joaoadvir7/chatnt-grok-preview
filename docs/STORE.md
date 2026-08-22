# Store Zustand — API interna

Arquivo: [`src/lib/store.ts`](../src/lib/store.ts)  
Persist: `localStorage` chave **`atendimento-nt-v17-name-fix`**.

Se mudar o `name`, o usuário **perde** conversas reais do preview. Só bump se a forma do estado for incompatível **e** houver `merge` de migração.

## Como usar

```ts
const connections = useCrmStore((s) => s.connections); // array cru
const ready = useMemo(
  () => connections.filter((c) => c.status === "conectado"),
  [connections],
);
```

**Proibido:** `useCrmStore(s => s.connections.filter(...))` — array novo a cada snapshot → React error #185 (loop infinito). Já quebrou o Live Chat em 22/08.

## Estado persistido (`partialize`)

tags, customFields, contacts, conversations, messages, folders, automations, stages, deals, agents, connections (**inclui `waba.accessToken`**), connectionFolders, webhookEvents, audit, templates, broadcasts, broadcastFolders, activeAgentId, sessionScope, preferredConnectionId, operationMode, chatWallpaperId, lastInboundConversationId, jornadaDone, bottleneckSettings, metaPlatform, sedes, diario, securityPinHash, sessionLocked.

## `merge` na reidratação

- Completa `waba` com `emptyWaba()` se faltar.
- `uniqueById` nas automações (evita duplicata que ligava dois toggles).
- Garante `customFields` oficiais (`CUSTOM_FIELDS`) mesmo se o persist for antigo.
- Fallback de `sedes`, `diario`, PIN, lock.

## Ações (resumo)

### Sessão / operação
`setSessionScope` · `setActiveAgent` · `setPreferredConnection` · `setOperationMode` · `setChatWallpaper` · `enableRealOperation` · `resetDemo`

### Contatos
`addContact` · `updateContact` · `deleteContact` · `toggleContactTag` · `setContactField` · `addNote` · `deleteNote` · `importContacts` · `addTag` · `addCustomField`

### Mensagens / conversas
`sendMessage` — grava bolha local (não chama Graph).  
`receiveInbound` — webhook/simulação; cria contato+conversa.  
`logOutboundByPhone` — depois do envio Cloud API.  
`updateMessageDelivery` / `updateMessageDeliveryByWamid`  
`markConversationRead` · `markConversationUnread` · `markConversationResponded`  
`setConversationQueue` · `assignConversation` · `patchConversation`  
`pushConversationEvent` · `deleteConversation` · `openConversationForContact`  
`transferDealsForContacts`

### Automações
`createAutomation` · `updateAutomation` · `saveFlow` · `toggleAutomation`  
`duplicateAutomation` · `deleteAutomation` · `trashAutomation` · `restoreAutomation`  
pastas: `createFolder` · `renameFolder` · `deleteFolder` · `moveFolder` · `reorderFolders`  
`executeAutomations({ conversationId, contactId, inboundText, forceAutomationId?, event? })`

`toggleAutomation` inverte `active` do id e **deduplica** o array. Não bump `updatedAt` no toggle (pedido do produto: não bagunçar “atualizado recentemente”).

### CRM / funil
`moveDeal` · `addDeal` · `deleteDeal` · `closeDeal` · estágios (`add/rename/delete/reorder/setStageColor`)

### Broadcasts
`createBroadcast` · `updateBroadcast` · `deleteBroadcast` · `trashBroadcast` · `restoreBroadcast`  
`sendBroadcast` · `previewAudience` · `ensureBroadcastFlow`  
pastas + `reorderBroadcasts`

### Conexões
`createConnection` · `updateConnection` · `updateWaba` · `setConnectionStatus`  
`trashConnection` · `restoreConnection` · `deleteConnection`  
`findConnectionByPhoneNumberId`  
`pushWebhookEvent` · `clearWebhookEvents`

### Sedes / Meta / diário
`createSede` · `updateSede` · `deleteSede`  
`setMetaPlatform`  
`setBottleneckSettings` · `setBottleneckRule` · `markJornadaDone`  
`setSecurityPin` · `closeDay` · `unlockSession`

## Seed vs operação real

`operationMode: "demo" | "real"`. Em real, a UI operacional **esconde** `isDemo`.  
**Não religar seed fictício no Live Chat.** João já pediu isso várias vezes.

## Exportar dados do preview

No DevTools:

```js
copy(localStorage.getItem("atendimento-nt-v17-name-fix"))
```

Guardar o JSON. Contém **token WABA** — tratar como segredo. Não commitar.

Para importar em outro browser: `localStorage.setItem("atendimento-nt-v17-name-fix", "<json>")` e recarregar.
