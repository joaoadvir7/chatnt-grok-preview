/** Handbook in-app (mesmo conteúdo de /docs, resumido). */
export const DOCS_SECTIONS: { id: string; title: string; body: string }[] = [
  {
    id: "dois",
    title: "Dois códigos — leia primeiro",
    body: "Há dois repositórios. (1) github.com/joaoadvir7/chatnt-grok-preview — este ChatNT TanStack + Zustand, UX de 22/08/2026, fonte de verdade das telas. (2) github.com/joaoadvir7/chatnt — Next.js + Prisma parado em 10/08, candidato a persistência. Não misture os dois em produção. O ambiente Grok pode sumir: o backup do código é o GitHub. Conversas reais ficam no localStorage (atendimento-nt-v17-name-fix), não no Git.",
  },
  {
    id: "rodar",
    title: "Como rodar",
    body: "git clone github.com/joaoadvir7/chatnt-grok-preview && npm install && npm run dev (porta 8080). tsc --noEmit depois de mudar types/store. Token Meta nunca no log. Dump do localStorage é segredo (contém WABA).",
  },
  {
    id: "live",
    title: "Live Chat",
    body: "Mesmo número da API. Enter envia. Painel do contato só ao clicar no nome. Ice breakers: engrenagem → Iniciadores (4×80, primeiro contato). Nome WhatsApp em waProfileName. Seletor Zustand nunca com .filter() inline (React #185).",
  },
  {
    id: "auto",
    title: "Automações",
    body: "Um FlowWorkspace (embedded no broadcast). Ligar porta a porta. Reply ramifica; link aparece no card mas não é porta. Encaminhar lista só automações (não Fluxo · broadcast). Toggle explícito, uniqueById no persist. Motor: automation-engine.ts.",
  },
  {
    id: "cx",
    title: "Conexões e cobrança",
    body: "Embedded Signup: nova, migrar, existente, coexistência (whatsapp_business_app_onboarding). Mensagem pelo app (coexistência) não é cobrada. Pelo ChatNT (API) é cobrada. Sem QR/Baileys. Tokens hoje no browser — produção no servidor.",
  },
  {
    id: "sede",
    title: "Sedes e funil",
    body: "Central vê tudo; regional só cf5. Funil Lead → Aluno → Jornada → Visita → Estudo, sem dinheiro. Relatório por etiqueta e união.",
  },
  {
    id: "conv",
    title: "Convenções e docs",
    body: "Paleta marinho/ouro. Sem verde Unnichat. Sem demo na operação. Docs completos na pasta docs/ (COMO-CONTINUAR, HANDOFF, FUNCOES, FILEMAP, STORE, AUTOMACOES, CHECKLIST, DECISOES). Menu da conta → Encerrar o dia grava o diário e trava com PIN (não é auth).",
  },
];
