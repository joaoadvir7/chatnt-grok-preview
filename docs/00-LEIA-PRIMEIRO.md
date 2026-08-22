# ChatNT — leia isto primeiro

**ChatNT** é o CRM de atendimento WhatsApp da **Escola Bíblica Novo Tempo**.
Não é um clone comercial do Unnichat: o Unnichat é só a referência de UX.
O funil é de captação de alunos (Lead → Aluno → Jornada → Visita → Estudo), **sem valores financeiros**.

Data desta documentação: **22 de agosto de 2026**.

**Programador sucessor: comece em [COMO-CONTINUAR.md](./COMO-CONTINUAR.md).**

---

## Há dois códigos. Não misture.

| | [joaoadvir7/chatnt](https://github.com/joaoadvir7/chatnt) | [joaoadvir7/chatnt-grok-preview](https://github.com/joaoadvir7/chatnt-grok-preview) (este snapshot) |
|---|---|---|
| Última atualização | 10/08/2026 | 22/08/2026 (**fonte de verdade da UX**) |
| Stack | Next.js App Router + Prisma + Redis queues | TanStack Start + Zustand persist + Graph API |
| Banco | PostgreSQL (Prisma) | `localStorage` (`atendimento-nt-v17-name-fix`) + PGLite só para auth |
| Live Chat / automação visual | Parcial | Quase paridade Unnichat |
| O que é | Base persistente pensada para produção | Protótipo operacional real (número de teste WABA já envia) |

**O próximo programador deve:**

1. Tratar **este snapshot Grok** como especificação viva (telas, fluxos, regras de negócio).
2. Tratar o **GitHub Next.js** como candidato a backend persistente (Prisma já tem Contact, Conversation, Automation, Broadcast, CRM).
3. **Não** reescrever a UX do zero. Portar o que está no Grok para o Next **ou** promover este stack e ligar Prisma por trás do Zustand.

João (produto): [joaoadvir7](https://github.com/joaoadvir7) · `joao.advir@gmail.com`.

O ambiente de criação Grok **pode sumir**. O backup do código é o repositório acima. O estado do CRM (conversas reais) vive no `localStorage` do browser — exportar à parte (ver [STORE.md](./STORE.md)).

---

## Como rodar este snapshot

```bash
git clone https://github.com/joaoadvir7/chatnt-grok-preview.git
cd chatnt-grok-preview
npm install
npm run dev          # 0.0.0.0:8080
npx tsc --noEmit
```

Persistência do CRM: Zustand `persist` no navegador. Limpar o storage apaga conversas reais do preview.

---

## Índice

| Doc | Conteúdo |
|---|---|
| [COMO-CONTINUAR.md](./COMO-CONTINUAR.md) | Onboarding de 30 min do sucessor |
| [HANDOFF.md](./HANDOFF.md) | O que está pronto, o que falta, riscos |
| [FUNCOES.md](./FUNCOES.md) | Catálogo de cada função do produto |
| [FILEMAP.md](./FILEMAP.md) | Cada arquivo e o que faz |
| [ARQUITETURA.md](./ARQUITETURA.md) | Pastas, dados, rotas, fluxo inbound |
| [STORE.md](./STORE.md) | Zustand: persist, merge, ações |
| [DOMINIO.md](./DOMINIO.md) | Sedes, funil, tags, papéis |
| [WHATSAPP.md](./WHATSAPP.md) | Cloud API, webhook, coexistência, ice breakers |
| [AUTOMACOES.md](./AUTOMACOES.md) | Canvas, portas, motor |
| [MODULOS.md](./MODULOS.md) | Tela → arquivo |
| [CONVENCOES.md](./CONVENCOES.md) | Como continuar sem quebrar |
| [CHECKLIST-PRODUCAO.md](./CHECKLIST-PRODUCAO.md) | Tarefas até go-live |
| [DECISOES.md](./DECISOES.md) | ADRs (por que está assim) |
| [DIARIO.md](./DIARIO.md) | Encerramento do dia + histórico 22/08 |
