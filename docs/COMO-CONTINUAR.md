# Como continuar o ChatNT — guia do sucessor

Você está pegando um produto em uso (número de teste WABA já envia) que viveu **dois repositórios**. Este arquivo é o caminho de 30 minutos até conseguir commitar com segurança.

## Os dois repositórios

| Repo | O que é | Quando usar |
|---|---|---|
| [joaoadvir7/chatnt-grok-preview](https://github.com/joaoadvir7/chatnt-grok-preview) | TanStack Start + Zustand. UX de 22/08/2026. **Você está aqui.** | Entender telas, regras, motor de automação, Cloud API |
| [joaoadvir7/chatnt](https://github.com/joaoadvir7/chatnt) | Next.js + Prisma + Redis. Último commit 10/08/2026 | Schema, queues, auth pensados para produção |

Produto: CRM WhatsApp da **Escola Bíblica Novo Tempo**. João Batista · `joao.advir@gmail.com` · GitHub `joaoadvir7`.

## Subir este snapshot

```bash
git clone https://github.com/joaoadvir7/chatnt-grok-preview.git
cd chatnt-grok-preview
npm install
npm run dev          # 0.0.0.0:8080
npx tsc --noEmit
```

Estado do CRM: `localStorage` chave `atendimento-nt-v17-name-fix`.  
Limpar o storage apaga conversas. Tokens WABA, se existirem, estão **nesse** JSON — segredo.

## Ordem de leitura (não pule)

1. [00-LEIA-PRIMEIRO.md](./00-LEIA-PRIMEIRO.md) — dois códigos
2. [HANDOFF.md](./HANDOFF.md) — pronto vs falta
3. [FUNCOES.md](./FUNCOES.md) — o que cada tela faz
4. [FILEMAP.md](./FILEMAP.md) — onde está no disco
5. [STORE.md](./STORE.md) + [types.ts](../src/lib/types.ts)
6. [WHATSAPP.md](./WHATSAPP.md) + [AUTOMACOES.md](./AUTOMACOES.md)
7. [CONVENCOES.md](./CONVENCOES.md) — como não quebrar
8. [CHECKLIST-PRODUCAO.md](./CHECKLIST-PRODUCAO.md)
9. [DECISOES.md](./DECISOES.md) — por que está assim

No app: sidebar → chip do usuário → **Documentação** / **Mapa do projeto**.

## Primeira decisão (com João, não sozinho)

- **A** — Este stack vira produção; Prisma entra atrás do Zustand.
- **B** — Next continua produção; você reimplementa as telas Grok lá.

Até essa decisão, **só** trabalhe neste snapshot ou só no Next — nunca misture `src/` dos dois.

## Armadilhas já pagas

| Sintoma | Causa | Correção |
|---|---|---|
| React #185 no Live Chat | `useCrmStore(s => s.connections.filter())` | seletor cru + `useMemo` |
| Duas automações ligam juntas | ids duplicados no persist | `uniqueById` no merge + toggle por id |
| Botão de link some no canvas | só `parseButtons` (reply) | `collectLinkButtons` + `.fl-wa-link` |
| Encaminhar lista fluxo de disparo | `ensureBroadcastFlow` | filtrar `source === "broadcast"` e `Fluxo ·` |
| Verde na UI | copiar Unnichat | paleta NT em `styles.css` |
| Demo no Live Chat | `operationMode` / `isDemo` | manter real; não religar seed |

## Como João pede trabalho

Prints Unnichat + frase curta. Replicar **comportamento**. Marca ChatNT. Sem valores no funil. Sem QR não oficial.

## Segurança

- Não logar `accessToken`. Usar `maskToken`.
- PIN do diário ≠ login.
- Não commitar o dump do localStorage.
- App Meta: “Novo Tempo Pará - Igreja Adventista”.
