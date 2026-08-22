# Automações e broadcasts

Editor: `src/routes/automacoes.$id.tsx` (`FlowWorkspace`). Broadcasts reusa `embedded`.

Zoom no scroll, pan no fundo, ligar arrastando ponto a ponto. Gatilho sem entrada.

`parseButtons` só reply. Links: `collectLinkButtons` + `ctaUrls`.

Toggle: `setAutomationActive(id, next)` sem bump de `updatedAt`.
Forward: excluir `source === "broadcast"` e nomes `Fluxo ·`.

Motor: `src/lib/automation-engine.ts`. Dedup `uniqueById` + mutex de run.
