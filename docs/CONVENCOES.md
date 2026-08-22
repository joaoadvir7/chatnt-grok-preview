# Convenções — como continuar

## Produto

- João descreve por print Unnichat. Replicar **comportamento e densidade**, não o verde.
- Fontes/ícones: mirar o tamanho Unnichat (pedido reiterado). Sidebar ~16.5px, ícone ~22px.
- Demo off. `isDemo` some da UI operacional.
- Mudou automação → o fluxo do broadcast correspondente deve acompanhar (`ensureBroadcastFlow`, `source: "broadcast"`).

## Código

- Estado novo: campo em `types.ts` + `seed()` + `partialize` + `merge`.
- Seletores Zustand: nunca retornar array filtrado inline (loop React #185).
- Server functions WhatsApp: validar Zod, recusar token `DEMO_`.
- Não logar access token.
- `tsc --noEmit` depois de mudança de tipos/store.

## UI

- Paleta só via CSS vars / navy ChatNT.
- Menus: `data-menu` + `useDismissOnOutside`. Clique fora desmarca.
- Modais/listas: ⋮ com as mesmas ações Unnichat (mover, excluir, detalhes via `DetailsModal` / `system-record.ts`).

## Segurança

- PIN do dia: SHA-256 `chatnt-pin:{pin}` no persist. Não é auth corporativa.
- Encerrar o dia trava a sessão (`sessionLocked`).
- Tokens Meta: tela Conexões mascara; nunca dump no diário nem no Git.

## GitHub

| Repo | Uso |
|---|---|
| https://github.com/joaoadvir7/chatnt-grok-preview | **Este código** (TanStack, 22/08/2026) |
| https://github.com/joaoadvir7/chatnt | Next.js + Prisma (10/08). Docs de ponte em `docs/grok-preview/` |

Não commitar `node_modules`, dumps de localStorage, tokens, `.env`.
