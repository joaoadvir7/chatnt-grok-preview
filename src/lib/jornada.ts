/** Etapas da jornada de atendimento ChatNT (ordem de correção / MVP). */
export const JORNADA = [
  {
    id: "contatos",
    step: 1,
    label: "Contatos",
    path: "/contatos",
    blurb: "Base: cadastro, tags, campos, import/export",
  },
  {
    id: "conexoes",
    step: 2,
    label: "Conexões",
    path: "/conexoes",
    blurb: "Canal WhatsApp (WABA) e qualidade",
  },
  {
    id: "live-chat",
    step: 3,
    label: "Live Chat",
    path: "/live-chat",
    blurb: "Atendimento manual, filas e handoff",
  },
  {
    id: "automacoes",
    step: 4,
    label: "Automações",
    path: "/automacoes",
    blurb: "Fluxos, gatilhos e ações",
  },
  {
    id: "crm",
    step: 5,
    label: "CRM",
    path: "/crm",
    blurb: "Pipeline e temperatura do lead",
  },
  {
    id: "broadcasts",
    step: 6,
    label: "Broadcasts",
    path: "/broadcasts",
    blurb: "Disparos segmentados com template",
  },
  {
    id: "ia",
    step: 7,
    label: "InteligêncIA",
    path: "/ia",
    blurb: "Agentes e sugestão de resposta",
  },
  {
    id: "atendentes",
    step: 8,
    label: "Equipe",
    path: "/atendentes",
    blurb: "Atendentes, áreas e monitoramento",
  },
] as const;

export type JornadaId = (typeof JORNADA)[number]["id"];
