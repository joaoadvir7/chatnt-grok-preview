# Módulos (tela → arquivo)

| Rota | Arquivo | Papel |
|---|---|---|
| `/painel` | `routes/painel.tsx` | Dashboard consolidado |
| `/funil` | `routes/funil.tsx` | Funil EB + gargalos |
| `/contatos` | `routes/contatos.tsx` | Base, tags, campos, import |
| `/live-chat` | `routes/live-chat.tsx` | Atendimento. Ice breakers overlay |
| `/automacoes` | `routes/automacoes.tsx` | Lista, pastas, toggle |
| `/automacoes/$id` | `routes/automacoes.$id.tsx` | Canvas (`FlowWorkspace`) |
| `/broadcasts` | `routes/broadcasts.tsx` | Disparos + editor embutido |
| `/ia` | `routes/ia.tsx` | InteligêncIA |
| `/crm` | `routes/crm.tsx` | Kanban |
| `/conexoes` | `routes/conexoes.tsx` | WABA / Meta |
| `/atendentes` | `routes/atendentes.tsx` | Equipe |
| `/webhooks` | `routes/webhooks.tsx` | Eventos / teste inbound |
| `/monitoramento` | `routes/monitoramento.tsx` | Fila da equipe |
| `/meta` | `routes/meta.tsx` | Painel Meta (config app) |
| `/sedes` | `routes/sedes.tsx` | Cadastro de campos |
| `/treinamentos` | `routes/treinamentos.tsx` | Placeholder |
| conta | `components/layout/ContaHub.tsx` | Mapa, docs, políticas, diário |

## Automações — canvas

Um único `FlowWorkspace` (prop `embedded` no broadcast). Não duplicar o editor.

Portas: entrada no topo esquerdo do card; saídas nos botões de resposta / “Próximo passo”.
Zoom: wheel; pan: arrastar fundo. Não distorcer no zoom (transform no viewport, não nos cards).

Blocos com config Unnichat: random, condition, forward, http, message (24h / flow / template).

Motor: `planAutomationRuns` + `executeAutomations`. Dedup por automation id + mutex de eventos.

## Live Chat

- Preferência de número: `preferredConnectionId`
- Composer: Enter envia (Shift+Enter quebra linha)
- Painel do contato só abre ao clicar no nome
- Filtro de conversas abre para a **direita** (não corta)

## Conexões

Cards no padrão Unnichat (WABA, limite, verificação, qualidade).
Criar: modal 4 opções. Sem `isDemo` na lista operacional.
