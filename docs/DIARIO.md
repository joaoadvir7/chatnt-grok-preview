# Diário de encerramento

## No produto

Menu do usuário (rodapé da sidebar) → **Encerrar o dia / diário**.

1. Resumo do que avançou
2. Checklist (tokens, conexões, automações, fila, diário)
3. PIN (4–6 dígitos) na primeira vez
4. **Encerrar com segurança** → `sessionLocked: true`
5. Reabrir com o PIN (`SessionLock`)

Dados: `CrmState.diario[]`, `securityPinHash`, `sessionLocked`.

Isso **não** substitui o backup do código. Encerrar o **ambiente de criação Grok** exige o repositório GitHub.

## 22/08/2026

- Ice breakers oficiais na engrenagem do Live Chat; loop #185 no seletor Zustand corrigido.
- Coexistência documentada: API continua cobrada; app não.
- Menu da conta: mapa, docs, políticas, diário + PIN.
- `types.ts` reconstruído (houve overwrite acidental; tsc verde de novo).
- Documentação profissional: COMO-CONTINUAR, FUNCOES, FILEMAP, STORE, AUTOMACOES, CHECKLIST, DECISOES.
- **Backup do src:** repositório `joaoadvir7/chatnt-grok-preview` (este snapshot).
- Docs também copiados para `joaoadvir7/chatnt` em `docs/grok-preview/` ([PR #1](https://github.com/joaoadvir7/chatnt/pull/1)).
- GitHub Next+Prisma de 10/08 **não** contém este `src/` TanStack.

Pendências: unificar stacks; webhook persistente; tokens no servidor; exportar localStorage das conversas reais do browser de João.
