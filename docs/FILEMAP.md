# Mapa de arquivos — ChatNT (preview Grok)

Última revisão: **22/08/2026**. Todo o domínio do CRM está em `src/`.  
Arquivos de plataforma Grok (`public/__grok/`, `server/`, `scripts/grok-pwa-*`) existem para o preview; o próximo programador **não** precisa portá-los.

## Entrada

| Arquivo | Papel |
|---|---|
| `src/router.tsx` | Cria o TanStack Router |
| `src/routes/__root.tsx` | Shell da árvore de rotas, i18n, toasts |
| `src/routeTree.gen.ts` | Gerado pelo plugin. Não editar à mão salvo emergência |
| `src/styles.css` | Tailwind 4 + paleta NT (`@theme`) + classes do canvas (`.fl-wa-*`) |
| `src/lib/error-component.tsx` | Tela de erro padrão do router |

## Estado e domínio

| Arquivo | Papel |
|---|---|
| `src/lib/types.ts` | Tipos do CRM. **Comece aqui.** |
| `src/lib/store.ts` | Zustand + persist. Toda regra de negócio. ~2450 linhas |
| `src/lib/seed.ts` | Dados iniciais (tags, agentes, conexões, funil) |
| `src/lib/report-seed.ts` | Campos/uniões para o painel consolidado |
| `src/lib/scope.ts` | Central vs sede (`cf5`/`cf6`), `SEDES_DEMO` |
| `src/lib/funnel.ts` | Lead → Aluno → Jornada → Visita → Estudo |
| `src/lib/jornada.ts` | Etapas de nutrição (checklist) |
| `src/lib/visit-labels.ts` | Etiquetas de visita/estudo |
| `src/lib/audience.ts` | Segmentação de broadcast |
| `src/lib/interpolate.ts` | Variáveis `{{nome}}` nas mensagens |
| `src/lib/system-record.ts` | Registro de sistema (⋮ detalhes) |
| `src/lib/useScopedData.ts` | Hook: filtra contatos pelo território |
| `src/lib/useBottleneckAlerts.ts` | Alertas de gargalo do funil |
| `src/lib/live-report.ts` | Métricas do Live Chat |
| `src/lib/export-report-pdf.ts` | PDF do relatório |
| `src/lib/docs-content.ts` | Handbook in-app (menu da conta) |
| `src/lib/utils.ts` | `cn()` e helpers |
| `src/lib/i18n.tsx` | pt / en / es |

## WhatsApp

| Arquivo | Papel |
|---|---|
| `src/lib/whatsapp-api.ts` | `createServerFn` Graph v21.0 (envio, signup, ice breakers, webhook subscribe) |
| `src/lib/whatsapp.ts` | Helpers de telefone / janela 24h |
| `src/lib/whatsapp-webhook.server.ts` | Buffer `/tmp/chatnt-wa-events.json` |
| `src/lib/meta-signup.ts` | FB.login Embedded Signup |
| `src/routes/api/whatsapp/webhook.ts` | GET verify + POST inbound + `?poll=1` |

## Automações

| Arquivo | Papel |
|---|---|
| `src/lib/automation-engine.ts` | Planeja e executa fluxos (`planAutomationRuns`) |
| `src/lib/automation-triggers.ts` | Catálogo de gatilhos Unnichat |
| `src/lib/message-blocks.ts` | Stack 24h: texto, mídia, lista, carrossel, **reply vs link** |
| `src/lib/import-automation.ts` | Importar fluxo |
| `src/components/automation/MessageComposer.tsx` | Inspector do bloco mensagem |
| `src/components/automation/ConditionConfig.tsx` | Condicional |
| `src/components/automation/HttpRequestConfig.tsx` | HTTP |

## Rotas (telas)

| Rota | Arquivo | Notas |
|---|---|---|
| `/` | `routes/index.tsx` | Redirect → `/painel` |
| `/painel` | `routes/painel.tsx` | Dashboard consolidado |
| `/funil` | `routes/funil.tsx` | Funil EB + gargalos |
| `/contatos` | `routes/contatos.tsx` | Base, tags, import |
| `/live-chat` | `routes/live-chat.tsx` | Atendimento (~1875 linhas) |
| `/automacoes` | `routes/automacoes.tsx` | Lista / pastas / toggle |
| `/automacoes/$id` | `routes/automacoes.$id.tsx` | Canvas `FlowWorkspace` (~2890 linhas) |
| `/broadcasts` | `routes/broadcasts.tsx` | Disparos + editor embutido |
| `/ia` | `routes/ia.tsx` | InteligêncIA |
| `/crm` | `routes/crm.tsx` | Kanban (value = 0) |
| `/conexoes` | `routes/conexoes.tsx` | WABA / Embedded Signup |
| `/atendentes` | `routes/atendentes.tsx` | Equipe |
| `/webhooks` | `routes/webhooks.tsx` | Eventos / teste inbound |
| `/monitoramento` | `routes/monitoramento.tsx` | Fila da equipe |
| `/meta` | `routes/meta.tsx` | App ID / Configuration ID |
| `/sedes` | `routes/sedes.tsx` | Cadastro de campos |
| `/treinamentos` | `routes/treinamentos.tsx` | Placeholder |
| `/e` | `routes/e.tsx` | Rota auxiliar (não é nav) |

## Layout e Live Chat

| Arquivo | Papel |
|---|---|
| `src/components/layout/AppShell.tsx` | Sidebar, `NAV`, menu da conta, lock de sessão |
| `src/components/layout/ContaHub.tsx` | Mapa / docs / políticas / diário / SessionLock |
| `src/components/live-chat/IceBreakers.tsx` | Iniciadores de conversa (Meta) |
| `src/hooks/useInboundPoll.ts` | Poll 2s do buffer de webhook |
| `src/hooks/use-dismiss-on-outside.ts` | Fecha menus ao clicar fora |

## Componentes de UI de produto

| Arquivo | Papel |
|---|---|
| `src/components/Avatar.tsx` | Avatar com iniciais |
| `src/components/TagChip.tsx` | Chip de etiqueta |
| `src/components/JornadaStrip.tsx` | Faixa da jornada no contato |
| `src/components/VisitLabels.tsx` | Visita / estudo |
| `src/components/ScopeBanner.tsx` | Banner “você está na sede X” |
| `src/components/RelativeTime.tsx` | “há 3 min” |
| `src/components/WhatsAppIcon.tsx` | Ícone WA na nav |
| `src/components/system/DetailsModal.tsx` | Modal ⋮ detalhes |
| `src/components/ui/*` | Button, Input, Textarea, Badge |

## Auth (scaffold — **não** isola o CRM)

`src/lib/auth/*` + `src/lib/db.ts` + `migrations/0001_auth.sql`  
Better Auth + PGLite. O CRM **não** filtra por usuário logado; usa `sessionScope` no Zustand.

## Config

| Arquivo | Papel |
|---|---|
| `package.json` | Scripts: `dev` em `0.0.0.0:8080` |
| `vite.config.ts` | Vite + TanStack Start + PWA Grok |
| `tsconfig.json` | `@/*` → `src/*` |
| `startup.sh` | Revive do sandbox Grok (irrelevante fora dele) |
