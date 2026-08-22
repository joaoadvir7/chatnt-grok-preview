# Registro de decisões (ADR curto)

## ADR-001 — Dois códigos até 22/08/2026

**Contexto.** O GitHub `joaoadvir7/chatnt` (Next.js App Router + Prisma + Redis) parou em **10/08/2026**. O preview Grok (TanStack Start + Zustand) avançou até **22/08/2026** com Live Chat real, canvas de automação, coexistência, ice breakers e menu da conta.

**Decisão.** Tratar o Grok como **fonte de verdade da UX e das regras**. Tratar o Next como **candidato a persistência**. Não mergear as árvores no `main` do Next.

**Consequência.** O próximo programador escolhe A (promover TanStack) ou B (portar UI para Next). Rodar os dois em produção é bug garantido.

## ADR-002 — Unnichat é UX, não marca

João manda prints do Unnichat. Replicar densidade, menus, canvas, filas. **Não** copiar o verde. Paleta: `#031c45` / `#003878` / `#0050a0` / ouro `#f5c400`.

## ADR-003 — Funil sem dinheiro

Escola Bíblica, não SaaS de vendas. Lead → Aluno → Jornada → Visita → Estudo. `Deal.value` = 0. Tags `eb_*` geram o relatório.

## ADR-004 — Demo off na operação

`isDemo` some da UI operacional. Seed existe para desenvolvimento. Live Chat em modo real **não** mistura fictício. João reiterou.

## ADR-005 — Cloud API, sem Baileys

Pedido de “enviar igual WhatsApp Web sem cobrar”: **não dá** na API oficial. Coexistência oficial (`whatsapp_business_app_onboarding`) mantém o App/Web grátis no mesmo número; envio pelo ChatNT continua cobrado. QR/Baileys viola ToS e foi recusado.

A partir de 1º/out/2026 resposta de serviço na Cloud API também é cobrada.

## ADR-006 — Estado no localStorage (provisório)

Zustand persist `atendimento-nt-v17-name-fix`. Serve o preview. Não escala, não é multi-usuário, some se limpar o browser, **guarda token WABA no cliente**. Produção = Postgres + token no servidor.

## ADR-007 — Webhook em arquivo + poll

Sandbox sem Redis estável. Buffer `/tmp/chatnt-wa-events.json` + poll 2s. Produção precisa de fila durável.

## ADR-008 — Reply ramifica, link não

No WhatsApp, botão resposta continua o fluxo; URL é CTA. O canvas reflete isso: `parseButtons` (portas) vs `collectLinkButtons` (linhas `.fl-wa-link`).

## ADR-009 — Fluxos de broadcast fora do encaminhar

`ensureBroadcastFlow` cria automação `source: "broadcast"` / `Fluxo · …`. Encaminhar outra automação **não** pode listar esses fluxos.

## ADR-010 — Seletores Zustand puros

`useCrmStore(s => s.x.filter())` gerou React #185 no Live Chat (ice breakers). Sempre: seletor cru + `useMemo`.

## ADR-011 — PIN do diário não é auth

SHA-256 `chatnt-pin:{pin}` no persist. Trava a sessão no browser. Não substitui Better Auth / SSO.

## ADR-012 — Onde mora o código deste preview

Snapshot publicado em **https://github.com/joaoadvir7/chatnt-grok-preview** (22/08/2026).  
Docs também em `docs/grok-preview/` no repo Next (`joaoadvir7/chatnt`, PR #1).  
O ambiente Grok pode hibernar ou sumir — **não** é backup.
