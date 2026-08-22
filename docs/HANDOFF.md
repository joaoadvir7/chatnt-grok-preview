# Handoff para o próximo programador

Última revisão: **22/08/2026**. Produto em uso real no número de teste WABA.

Leia antes: [COMO-CONTINUAR.md](./COMO-CONTINUAR.md).

## Objetivo do produto

CRM de atendimento da Escola Bíblica Novo Tempo:

- Vários números WhatsApp (central + sedes regionais / uniões).
- Live Chat humano + automações + broadcasts (templates Meta).
- Funil: **Lead → Aluno → Jornada → Visita → Estudo**.
- Relatório consolidado na central; cada sede só vê o próprio território.
- Sem faturamento. Tags e campos customizados geram as métricas.

Referência visual: Unnichat. Paleta ChatNT: marinho `#031c45` / `#003878` / `#0050a0` e ouro NT `#f5c400`. **Não copiar o verde Unnichat.**

## Backup — não perder este trabalho

| O quê | Onde |
|---|---|
| Código deste preview (TanStack) | **https://github.com/joaoadvir7/chatnt-grok-preview** |
| Código Next + Prisma (10/08) | https://github.com/joaoadvir7/chatnt |
| Docs no repo Next (não substitui o src) | `docs/grok-preview/` · [PR #1](https://github.com/joaoadvir7/chatnt/pull/1) |
| Estado CRM / token WABA | `localStorage["atendimento-nt-v17-name-fix"]` — **não está no Git** |

O sandbox Grok hiberna e pode ser substituído. **GitHub é o backup.** Conversas reais só no browser até existir Postgres.

## O que já funciona neste snapshot

- Live Chat real (envio/recebimento Cloud API, filas Novos/Meus/IA/Finalizados, papel de parede, composer com Enter, templates, áudio, arquivos).
- Nome do contato WhatsApp gravado (`waProfileName`).
- Ice breakers (iniciadores): até 4 × 80 chars, GET/POST `conversational_automation`.
- Automações: canvas com zoom/pan, ligar porta a porta, exclusão de linha, randomizador, condicional, encaminhar (só automações, sem fluxos de broadcast), HTTP, mensagem 24h (texto, mídia, lista, contexto, carrossel, reply + link visível no card).
- Broadcasts: pastas, rascunhos, 4 origens, construtor de fluxo próprio, arrastar pastas/cards.
- Conexões: cards Unnichat, Embedded Signup (nova / migrar / existente / coexistência), sem números fictícios.
- Sedes regionais (ícone no header).
- Funil + alertas de gargalo por etiqueta.
- Toggle de automação sem ativar duas; persist merge `uniqueById`.
- Menu da conta: mapa, docs, políticas, encerrar o dia + PIN.

## O que NÃO está pronto (produção)

1. **Dois stacks.** GitHub Next parado. Grok atual. Precisa de decisão A ou B ([DECISOES.md](./DECISOES.md) ADR-001).
2. **Estado do CRM no `localStorage`.** Não escala, não é multi-usuário de verdade, some se limpar o browser.
3. Webhook inbound: fila em arquivo `/tmp/chatnt-wa-events.json` + poll 2s no cliente. Em deploy multi-instância isso quebra. Use Redis/Postgres.
4. Tokens WABA no Zustand (browser). Mover para servidor (Prisma `WhatsappConnection` no GitHub Next já existe).
5. Coexistência oficial: o botão dispara `featureType: whatsapp_business_app_onboarding`. Falta sync `history` / `smb_message_echoes` e SMB App Data API em 24h.
6. Mensagem pelo ChatNT **é cobrada pela Meta**. App/Web no modo coexistência não. Não existe “enviar pelo CRM de graça”.
7. Google Sheets, API de conversão, SMS/áudio na ligação: UI de bloco existe; execução incompleta.
8. Atribuição automática, avaliação de atendimento, dashboard da engrenagem: menu Unnichat ainda não portado por completo.
9. Auth Better Auth está no scaffold; o CRM não isola dados por usuário logado (só `sessionScope` central/regional no Zustand).
10. Testes: quase só scripts PWA. Sem suíte do motor de automação.

## Decisão recomendada

**Curto prazo (já feito neste handoff):** snapshot `src/` + docs em `joaoadvir7/chatnt-grok-preview`.

**Médio prazo:**
- (A) promover TanStack Start e persistir o Zustand no Prisma, ou
- (B) reaplicar as telas Grok no Next.js existente, reusando actions e workers Redis.

Não rode os dois em produção. Checklist: [CHECKLIST-PRODUCAO.md](./CHECKLIST-PRODUCAO.md).

## Riscos conhecidos

- `useCrmStore(s => s.connections.filter(...))` gera loop infinito (React #185). Sempre selecionar o array cru e filtrar com `useMemo`.
- Toggle de automação: `toggleAutomation(id)` no store (dedup por id). Não bump `updatedAt` no status.
- Encaminhar automação: excluir `source === "broadcast"` e nomes `Fluxo ·`.
- Botão de link **não** vira porta de fluxo; só reply buttons ramificam.
- Gatilho não tem porta de entrada.
- Demo (`isDemo`) deve permanecer oculto. Não religar seed fictício no Live Chat.

## Contatos / contas

- Produto: João Batista · `joao.advir@gmail.com` · GitHub `joaoadvir7`
- WABA de teste já usada no preview (Phone Number ID no Zustand da conexão — não versionar)
- App Meta: “Novo Tempo Pará - Igreja Adventista”
