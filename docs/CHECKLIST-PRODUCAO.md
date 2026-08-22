# Checklist do próximo programador

Ordem sugerida. Não pule o item 0.

## 0. Antes de escrever código

- [ ] Ler [00-LEIA-PRIMEIRO.md](./00-LEIA-PRIMEIRO.md) e [HANDOFF.md](./HANDOFF.md)
- [ ] Clonar **este** snapshot TanStack (`chatnt-grok-preview`) **e** o repo Next (`joaoadvir7/chatnt`)
- [ ] Rodar este snapshot: `npm install && npm run dev`
- [ ] Abrir o app, sidebar, Live Chat, Automações, Conexões — bater com o que João descreve
- [ ] **Decidir stack** com João (ver [DECISOES.md](./DECISOES.md)):  
      (A) promover TanStack + Prisma atrás do Zustand, ou  
      (B) portar telas Grok para o Next existente
- [ ] **Não** misturar os dois em produção
- [ ] **Não** religar demo no Live Chat

## 1. Não perder dados do preview

- [ ] Exportar `localStorage["atendimento-nt-v17-name-fix"]` (contém token — segredo)
- [ ] Confirmar que este repositório GitHub está cloneável (código, não o localStorage)
- [ ] Confirmar logos em `public/chatnt-*` e wallpapers

## 2. Persistência de verdade

- [ ] Mover CRM (contatos, conversas, mensagens, automações, conexões) para Postgres
- [ ] Schema Prisma do `joaoadvir7/chatnt` já tem Contact, Conversation, Automation, Broadcast, WhatsappConnection — reusar se for caminho B
- [ ] Tokens WABA **só no servidor**
- [ ] Webhook: sair de `/tmp/chatnt-wa-events.json` → Redis/Postgres + worker
- [ ] Auth real: Better Auth já está no scaffold; isolar dados por usuário/sede

## 3. WhatsApp produção

- [ ] Webhook público HTTPS com verify token por conexão
- [ ] Assinar `subscribed_apps` + `override_callback_uri`
- [ ] Status de entrega (`sent` / `delivered` / `read` / `failed`) via webhook
- [ ] Coexistência: implementar `history`, `smb_message_echoes`, SMB App Data API (24h)
- [ ] Ice breakers: já há GET/POST; testar no número real depois do #185
- [ ] Templates aprovados para fora da janela 24h / após 1º/out/2026 (serviço cobrado)

## 4. Automações

- [ ] Suíte de testes do `planAutomationRuns` (keyword, CTWA, tag, waitingFlow, forward)
- [ ] Completar HTTP, Sheets, conversion, SMS/call **ou** esconder os blocos
- [ ] Garantir que toggle + `uniqueById` sobrevivem à migração de banco

## 5. Multi-sede

- [ ] `sessionScope` virar membership no banco (agente ↔ campo)
- [ ] Relatório consolidado na central; regional só `cf5`
- [ ] Um WABA por sede; central pode ter vários

## 6. UX que João ainda pediu (Unnichat)

- [ ] Engrenagem Live Chat: dashboard, atribuição automática, avaliação, som
- [ ] Atribuição automática de conversa
- [ ] Restante de densidade/ícones se ainda divergir do print

## 7. Qualidade

- [ ] `npx tsc --noEmit` verde
- [ ] Não logar access token (`maskToken`)
- [ ] Paleta só marinho/ouro — zero verde Unnichat
- [ ] Seletores Zustand nunca retornam `.filter()` inline

## 8. Entrega

- [ ] README do repo escolhido para produção atualizado
- [ ] Este handbook copiado/linkado
- [ ] Diário do dia no produto (menu da conta) no go-live
