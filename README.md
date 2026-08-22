# ChatNT — snapshot Grok (22/08/2026)

CRM de atendimento WhatsApp da **Escola Bíblica Novo Tempo**.

Este repositório é o **backup completo** do preview operacional (TanStack Start + Zustand + Cloud API).  
É a **fonte de verdade da UX** em 22 de agosto de 2026.

> Há outro código: [`joaoadvir7/chatnt`](https://github.com/joaoadvir7/chatnt) (Next.js + Prisma, 10/08).  
> **Não misture os dois em produção.** Leia [`docs/00-LEIA-PRIMEIRO.md`](docs/00-LEIA-PRIMEIRO.md).

## Programador sucessor

1. [`docs/COMO-CONTINUAR.md`](docs/COMO-CONTINUAR.md) — onboarding
2. [`docs/HANDOFF.md`](docs/HANDOFF.md) — pronto vs falta
3. [`docs/FUNCOES.md`](docs/FUNCOES.md) — cada função do produto
4. [`docs/CHECKLIST-PRODUCAO.md`](docs/CHECKLIST-PRODUCAO.md) — até o go-live

No app: rodapé da sidebar → chip do usuário → Documentação / Mapa / Encerrar o dia.

## Rodar

```bash
npm install
npm run dev      # http://0.0.0.0:8080
npx tsc --noEmit
```

Estado do CRM: `localStorage` chave `atendimento-nt-v17-name-fix` (inclui token WABA se houver — segredo, não commitar dump).

## Marca

Marinho `#031c45` · azul `#0050a0` · ouro `#f5c400`. Não usar verde Unnichat.

Funil: Lead → Aluno → Jornada → Visita → Estudo. Sem valores financeiros.

## Stack

React 19 · TanStack Router/Start · Zustand persist · Tailwind 4 · Lucide · Sonner · WhatsApp Graph API v21.0.

## Licença / dono

Produto interno da Escola Bíblica Novo Tempo.  
João Batista — `joao.advir@gmail.com` — [joaoadvir7](https://github.com/joaoadvir7).
