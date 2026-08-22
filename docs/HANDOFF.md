# Handoff — ChatNT (versão Grok, agosto 2026)

Leia isto primeiro se for continuar o projeto.

## Duas bases de código

| | **Atual (use esta)** | **Legado no GitHub** |
|---|---|---|
| Onde | Preview Grok (`chatnt.grok.me`) + [chatnt-grok-preview](https://github.com/joaoadvir7/chatnt-grok-preview) | [joaoadvir7/chatnt](https://github.com/joaoadvir7/chatnt) |
| Stack | Vite + TanStack Start/Router + Zustand | Next.js + Prisma + Redis/BullMQ |
| Paleta | Azul-marinho ChatNT (`#031c45`, `#0050a0`, dourado NT) | Docs antigos falam em verde Unnichat — **não copiar** |
| Estado | `localStorage` Zustand (`atendimento-nt-v17-name-fix`) | PostgreSQL |

A UI e as regras que o João validou estão nesta versão Grok. O Prisma/Redis do `chatnt` é alvo de persistência em produção, não o desenho da tela.

## Produto

- Captação de alunos (TV, revistas, anúncios Meta, formulários)
- WhatsApp **Cloud API oficial** (não usar Baileys / QR não oficial)
- CRM **sem valores financeiros** — Kanban de acompanhamento
- Funil: **Lead → Aluno → Jornada → Visita → Estudo**
- Multi-sede: cada campo tem número próprio; a central vê consolidado e por união
- Relatórios saem das **etiquetas** dos contatos

## Como rodar

```bash
npm install
npm run dev          # 0.0.0.0:8080
npm run typecheck
```

## Regras fechadas pelo João

1. Sem demo. `operationMode: "real"`.
2. Não copiar o verde Unnichat.
3. App/Web grátis; ChatNT (API) cobrado. Coexistência não zera tarifa.
4. Forward lista só automações, nunca fluxos de broadcast.
5. Toggle não pode ativar duas — sem bump de `updatedAt`.
6. Botão de link no card, sem porta de fluxo.
7. Ice breakers: 4 × 80, só no primeiro contato.
8. Broadcast e automação compartilham `FlowWorkspace`.

## Como não perder o trabalho

1. Este repositório no GitHub
2. Estado operacional (contatos, token) está no **navegador**. Exportar antes de limpar dados do site.
3. Encerrar o dia: menu da conta → Segurança e diário → PIN
