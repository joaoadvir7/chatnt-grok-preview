# Catálogo de funções — o que o ChatNT faz

Documento para o programador que **não** esteve no preview Grok.  
Comportamento observado em **22/08/2026**. UX de referência: Unnichat. Marca: ChatNT (marinho/ouro).

---

## 1. Live Chat (`/live-chat`)

Atendimento humano no mesmo número da Cloud API.

- Filas: **Novos / Meus / IA / Finalizados**.
- Pegar conversa: move para `meus` e atribui o agente ativo.
- Composer: **Enter envia**, Shift+Enter quebra linha.
- Painel do contato abre **só ao clicar no nome** (não no header inteiro).
- Filtro de conversas abre para a **direita**.
- Nome editável no CRM; `waProfileName` vem do perfil WhatsApp e não deve ser sobrescrito sem querer.
- Papel de parede: `chatWallpaperId` + arquivos em `public/wallpapers/`.
- Preferência de número: `preferredConnectionId`.
- Engrenagem (parcial Unnichat): **Iniciadores de conversa** implementado; dashboard / atribuição automática / avaliação **ainda não**.
- Ice breakers: overlay `IceBreakers.tsx`. Máx. 4 frases × 80 caracteres, sem emoji. Só no primeiro contato. `wa.me?text=` esconde. Publica em `/{phone-number-id}/conversational_automation`.
- Inbound: poll 2s → `receiveInbound` → motor de automação.

**Não filtrar arrays no seletor Zustand** (React #185). Ver [CONVENCOES.md](./CONVENCOES.md).

## 2. Automações (`/automacoes`, `/automacoes/$id`)

Editor visual tipo Unnichat, um único `FlowWorkspace`.

- Lista com pastas, lixeira, duplicar, arrastar.
- Toggle **não** deve ligar duas automações por acidente (`toggleAutomation` deduplica por id; `merge` usa `uniqueById`).
- Canvas: zoom (wheel), pan (arrastar fundo). Transform no viewport — **não** nos cards.
- Portas: entrada no topo-esquerdo (exceto gatilho). Saídas nos botões **reply** e em “Próximo passo”.
- Botão **link / CTA URL** aparece no card (`collectLinkButtons`) mas **não** vira porta.
- Encaminhar (`forward`): lista só automações reais. Excluir `source === "broadcast"` e nomes `Fluxo ·`.
- Broadcast reusa o mesmo canvas com `embedded`.

Blocos (`FlowNodeType`): trigger, message, template, tag, fields, http, condition, delay, crm, assign, finalize, forward, optout, random, system, conversion, call, sheets.

Execução incompleta (UI existe): Google Sheets, API de conversão, SMS/chamada.

Motor: `planAutomationRuns` + `executeAutomations`. Ver [AUTOMACOES.md](./AUTOMACOES.md).

## 3. Broadcasts (`/broadcasts`)

Disparo em massa (template Meta fora da janela 24h).

- Pastas, rascunhos, 4 origens de público (`audience.ts`).
- Cada broadcast gera automação `source: "broadcast"` nomeada `Fluxo · {nome}` via `ensureBroadcastFlow`.
- **Não** misturar esse fluxo no picker de encaminhar.

## 4. Conexões (`/conexoes`)

Vários números (central + sedes).

- Cards Unnichat: qualidade, limite, verificação, WABA.
- Criar: **Nova / Migrar / Existente / Coexistência**.
- Coexistência: `featureType: whatsapp_business_app_onboarding` + `sessionInfoVersion: 3`.
- Sem números fictícios na lista operacional (`isDemo` oculto).
- Tokens no Zustand (browser) — **mover para servidor** em produção.
- Cobrança: App/Web grátis; **ChatNT (API) cobrado**. Não existe “enviar pelo CRM de graça”. Sem Baileys/QR.

## 5. Contatos (`/contatos`)

Base, tags, campos customizados, import CSV, notas.  
`cf5` = campo/sede, `cf6` = união.

## 6. Funil (`/funil`) e CRM (`/crm`)

Funil **não é vendas**: Lead → Aluno → Jornada → Visita → Estudo.  
Kanban `value` sempre 0. Gargalos por etiqueta (`useBottleneckAlerts`).

## 7. Painel (`/painel`)

Dashboard consolidado da Central. Regionais só vêem o território (`useScopedData`).

## 8. Sedes (`/sedes`) + escopo

`sessionScope.mode`: `central` | `regional`.  
Troca de sede no header. Relatório por união (UNB, UCB, USEB…).

## 9. Atendentes / Monitoramento / Webhooks / Meta / IA / Treinamentos

| Tela | Estado |
|---|---|
| Atendentes | Cadastro de agentes (papel central/regional) |
| Monitoramento | Visão da fila da equipe |
| Webhooks | Log + simular inbound |
| Meta | App ID + Configuration ID do Embedded Signup |
| IA | Tela InteligêncIA (não é o motor principal) |
| Treinamentos | Placeholder |

## 10. Menu da conta (rodapé da sidebar)

Inspirado no “O que gostaria de fazer?” do Unnichat:

- Mapa do projeto
- Documentação (este handbook, resumido)
- Políticas / mecanismo de segurança
- Encerrar o dia + atualizar o diário (PIN SHA-256 `chatnt-pin:{pin}`)
- Notificações (entrada de menu)
- Copiar link
- Sair (sem PIN → abre o diário; **não** trava)

Lock: `sessionLocked` + overlay `SessionLock`. **Não é auth corporativa.**

## 11. i18n e tema

`src/lib/i18n.tsx` (pt/en/es). Dark mode: `chatnt-theme` no localStorage. Sidebar colapsável: `chatnt-sidebar-collapsed`.
