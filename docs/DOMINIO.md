# Domínio — Escola Bíblica Novo Tempo

## Organização

- **Central de Relacionamento** — vê consolidado, todos os números.
- **Sede regional** (associação/missão, ex. ANPA) — só o território e o próprio WhatsApp.
- **União** (UNB, UCB, USEB…) — agrupamento para relatório.

Sedes: `src/lib/scope.ts` (`SEDES_DEMO`) + tela `/sedes`.
Campo no contato: custom field `cf5`. União: `cf6`.

## Funil (não é vendas)

1. Lead  
2. Aluno  
3. Jornada (nutrição)  
4. Visita  
5. Estudo  

Implementação: `src/lib/funnel.ts` + tags `eb_*` em `src/lib/report-seed.ts` / `seed.ts`.
CRM Kanban (`/crm`) acompanha aluno, **value sempre 0**.

## Contato

Campos importantes:

- `name` — editável no Live Chat  
- `waProfileName` — perfil WhatsApp (Meta `contacts.profile.name`)  
- `phone` E.164 sem `+` na maioria dos fluxos  
- `tagIds`, `customFields`, `connectionId`, `assignee`  
- `isDemo` — ocultar em operação real  
- `optedOut`

## Filas do Live Chat

`novos` | `meus` (assignee = agente ativo) | `ia` | `finalizados`

Pegar atendimento: `setConversationQueue(..., "meus")` + `assignConversation`.

## Automações vs broadcasts

- Automação: gatilho (mensagem, tag, CTWA, horário…) → fluxo.
- Broadcast: disparo em massa (template fora da janela 24h) + fluxo pós-envio (`source: "broadcast"`, nome `Fluxo · …`).
- Encaminhar automação **não** lista fluxos de broadcast.

## Relatórios

Painel `/painel` e `/funil` devem refletir movimento real (etiquetas), por sede e consolidado. Seed `isDemo` não entra em operação real (`operationMode: "real"`).
