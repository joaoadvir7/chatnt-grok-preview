import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "pt" | "en" | "es";

const KEY = "chatnt-lang";

const dict = {
  pt: {
    "nav.painel": "Painel",
    "nav.funil": "Funil",
    "nav.contatos": "Contatos",
    "nav.liveChat": "Live Chat",
    "nav.automacoes": "Automações",
    "nav.broadcasts": "Broadcasts",
    "nav.ia": "InteligêncIA",
    "nav.crm": "CRM",
    "nav.conexoes": "Conexões",
    "nav.sedes": "Sedes",
    "nav.atendentes": "Atendentes",
    "nav.webhooks": "Webhooks",
    "nav.monitoramento": "Monitoramento",
    "nav.meta": "Painel Meta",
    "nav.treinamentos": "Treinamentos",
    "theme.dark": "Modo noturno",
    "theme.light": "Modo claro",
    "lang.label": "Idioma",
    "lang.pt": "Português",
    "lang.en": "English",
    "lang.es": "Español",
    "scope.waExclusive": "WhatsApp exclusivo {phone}",
    "scope.visible": "{n} aluno{s} visíveis",
    "scope.hidden": "{n} de outras sedes ocultos",
    "scope.national": "Visão nacional · todas as associações e missões",
    "page.painel": "Painel",
    "page.funil": "Funil de captação",
    "page.contatos": "Contatos",
    "page.liveChat": "Live Chat",
    "page.automacoes": "Automações",
    "page.broadcasts": "Broadcasts",
    "page.ia": "InteligêncIA",
    "page.crm": "CRM — Funil",
    "page.conexoes": "Conexões · WhatsApp Business",
    "page.atendentes": "Atendentes",
    "page.webhooks": "Webhooks",
    "page.monitoramento": "Monitoramento",
    "page.meta": "Painel Meta",
    "page.treinamentos": "Treinamentos",
    "common.save": "Salvar",
    "common.cancel": "Cancelar",
    "common.add": "Adicionar",
    "common.create": "Criar",
    "common.edit": "Editar",
    "common.delete": "Excluir",
    "common.download": "Baixar",
    "common.back": "Voltar",
    "common.search": "Buscar",
    "common.actions": "Ações",
    "common.close": "Fechar",
    "crm.generateLabels": "Gerar etiquetas",
    "crm.selectToLabel": "Selecione os alunos para gerar as etiquetas",
    "crm.selected": "{n} selecionado{s}",
    "crm.clear": "Limpar",
    "crm.funnelTitle": "Funil da Escola Bíblica",
    "crm.funnelHint": "Lead → Aluno → Jornada → Visita ou Estudo · {n} alunos neste escopo",
    "crm.thisSede": " · apenas esta sede",
    "crm.allSedes": " · todas as sedes",
    "crm.nobody": "Ninguém nesta etapa",
    "crm.newColumn": "+ Nova coluna",
    "labels.title": "Sistema de Etiquetas de Visitação",
    "labels.subtitle": "Novo Tempo · Canal da Esperança",
    "labels.material": "Material a entregar ou solicitações nessa visita (aparece em todas as etiquetas)",
    "labels.materialLine": "Material a entregar ou solicitações nessa visita:",
    "labels.people": "{n} pessoa{s} · {d} distrito{ds}",
    "labels.pdf": "Gerar PDF das etiquetas",
    "labels.back": "Voltar ao CRM",
    "labels.requested": "Materiais já solicitados pelo aluno",
    "labels.scheduled": "Agendado em {date}",
    "labels.solicited": "Solicitado em {date}",
    "lc.novos": "Novos",
    "lc.meus": "Meus",
    "lc.ia": "IA",
    "lc.done": "Finalizados",
    "lc.all": "Todas",
    "lc.notes": "Anotações",
    "lc.reminders": "Lembretes",
    "lc.activities": "Atividades",
    "lc.fields": "Campos customizados",
    "lc.crm": "CRM — acompanhamento",
    "lc.addField": "Adicionar campo",
    "lc.useField": "Usar campo existente…",
    "lc.newField": "Ou criar novo campo…",
    "lc.fieldCreated": "Campo criado",
    "logged": "Logado como",
  },
  en: {
    "nav.painel": "Dashboard",
    "nav.funil": "Funnel",
    "nav.contatos": "Contacts",
    "nav.liveChat": "Live Chat",
    "nav.automacoes": "Automations",
    "nav.broadcasts": "Broadcasts",
    "nav.ia": "IntelligencIA",
    "nav.crm": "CRM",
    "nav.conexoes": "Connections",
    "nav.sedes": "Sedes",
    "nav.atendentes": "Agents",
    "nav.webhooks": "Webhooks",
    "nav.monitoramento": "Monitoring",
    "nav.meta": "Meta Panel",
    "nav.treinamentos": "Training",
    "theme.dark": "Dark mode",
    "theme.light": "Light mode",
    "lang.label": "Language",
    "lang.pt": "Português",
    "lang.en": "English",
    "lang.es": "Español",
    "scope.waExclusive": "Dedicated WhatsApp {phone}",
    "scope.visible": "{n} visible student{s}",
    "scope.hidden": "{n} from other sites hidden",
    "scope.national": "National view · all associations and missions",
    "page.painel": "Dashboard",
    "page.funil": "Acquisition funnel",
    "page.contatos": "Contacts",
    "page.liveChat": "Live Chat",
    "page.automacoes": "Automations",
    "page.broadcasts": "Broadcasts",
    "page.ia": "IntelligencIA",
    "page.crm": "CRM — Funnel",
    "page.conexoes": "Connections · WhatsApp Business",
    "page.atendentes": "Agents",
    "page.webhooks": "Webhooks",
    "page.monitoramento": "Monitoring",
    "page.meta": "Meta Panel",
    "page.treinamentos": "Training",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.add": "Add",
    "common.create": "Create",
    "common.edit": "Edit",
    "common.delete": "Delete",
    "common.download": "Download",
    "common.back": "Back",
    "common.search": "Search",
    "common.actions": "Actions",
    "common.close": "Close",
    "crm.generateLabels": "Generate labels",
    "crm.selectToLabel": "Select students to generate labels",
    "crm.selected": "{n} selected",
    "crm.clear": "Clear",
    "crm.funnelTitle": "Bible School funnel",
    "crm.funnelHint": "Lead → Student → Journey → Visit or Study · {n} students in this scope",
    "crm.thisSede": " · this site only",
    "crm.allSedes": " · all sites",
    "crm.nobody": "No one in this stage",
    "crm.newColumn": "+ New column",
    "labels.title": "Visit Label System",
    "labels.subtitle": "Novo Tempo · Channel of Hope",
    "labels.material": "Material to deliver or requests on this visit (appears on every label)",
    "labels.materialLine": "Material to deliver or requests on this visit:",
    "labels.people": "{n} person{s} · {d} district{ds}",
    "labels.pdf": "Generate label PDF",
    "labels.back": "Back to CRM",
    "labels.requested": "Materials already requested by the student",
    "labels.scheduled": "Scheduled on {date}",
    "labels.solicited": "Requested on {date}",
    "lc.novos": "New",
    "lc.meus": "Mine",
    "lc.ia": "AI",
    "lc.done": "Closed",
    "lc.all": "All",
    "lc.notes": "Notes",
    "lc.reminders": "Reminders",
    "lc.activities": "Activities",
    "lc.fields": "Custom fields",
    "lc.crm": "CRM — follow-up",
    "lc.addField": "Add field",
    "lc.useField": "Use existing field…",
    "lc.newField": "Or create a new field…",
    "lc.fieldCreated": "Field created",
    "logged": "Signed in as",
  },
  es: {
    "nav.painel": "Panel",
    "nav.funil": "Embudo",
    "nav.contatos": "Contactos",
    "nav.liveChat": "Live Chat",
    "nav.automacoes": "Automatizaciones",
    "nav.broadcasts": "Broadcasts",
    "nav.ia": "InteligencIA",
    "nav.crm": "CRM",
    "nav.conexoes": "Conexiones",
    "nav.sedes": "Sedes",
    "nav.atendentes": "Agentes",
    "nav.webhooks": "Webhooks",
    "nav.monitoramento": "Monitoreo",
    "nav.meta": "Panel Meta",
    "nav.treinamentos": "Capacitaciones",
    "theme.dark": "Modo nocturno",
    "theme.light": "Modo claro",
    "lang.label": "Idioma",
    "lang.pt": "Português",
    "lang.en": "English",
    "lang.es": "Español",
    "scope.waExclusive": "WhatsApp exclusivo {phone}",
    "scope.visible": "{n} alumno{s} visibles",
    "scope.hidden": "{n} de otras sedes ocultos",
    "scope.national": "Visión nacional · todas las asociaciones y misiones",
    "page.painel": "Panel",
    "page.funil": "Embudo de captación",
    "page.contatos": "Contactos",
    "page.liveChat": "Live Chat",
    "page.automacoes": "Automatizaciones",
    "page.broadcasts": "Broadcasts",
    "page.ia": "InteligencIA",
    "page.crm": "CRM — Embudo",
    "page.conexoes": "Conexiones · WhatsApp Business",
    "page.atendentes": "Agentes",
    "page.webhooks": "Webhooks",
    "page.monitoramento": "Monitoreo",
    "page.meta": "Panel Meta",
    "page.treinamentos": "Capacitaciones",
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.add": "Añadir",
    "common.create": "Crear",
    "common.edit": "Editar",
    "common.delete": "Eliminar",
    "common.download": "Descargar",
    "common.back": "Volver",
    "common.search": "Buscar",
    "common.actions": "Acciones",
    "common.close": "Cerrar",
    "crm.generateLabels": "Generar etiquetas",
    "crm.selectToLabel": "Seleccione los alumnos para generar las etiquetas",
    "crm.selected": "{n} seleccionado{s}",
    "crm.clear": "Limpiar",
    "crm.funnelTitle": "Embudo de la Escuela Bíblica",
    "crm.funnelHint": "Lead → Alumno → Jornada → Visita o Estudio · {n} alumnos en este alcance",
    "crm.thisSede": " · solo esta sede",
    "crm.allSedes": " · todas las sedes",
    "crm.nobody": "Nadie en esta etapa",
    "crm.newColumn": "+ Nueva columna",
    "labels.title": "Sistema de Etiquetas de Visitación",
    "labels.subtitle": "Novo Tempo · Canal de la Esperanza",
    "labels.material": "Material a entregar o solicitudes en esta visita (aparece en todas las etiquetas)",
    "labels.materialLine": "Material a entregar o solicitudes en esta visita:",
    "labels.people": "{n} persona{s} · {d} distrito{ds}",
    "labels.pdf": "Generar PDF de etiquetas",
    "labels.back": "Volver al CRM",
    "labels.requested": "Materiales ya solicitados por el alumno",
    "labels.scheduled": "Agendado el {date}",
    "labels.solicited": "Solicitado el {date}",
    "lc.novos": "Nuevos",
    "lc.meus": "Míos",
    "lc.ia": "IA",
    "lc.done": "Finalizados",
    "lc.all": "Todas",
    "lc.notes": "Notas",
    "lc.reminders": "Recordatorios",
    "lc.activities": "Actividades",
    "lc.fields": "Campos personalizados",
    "lc.crm": "CRM — seguimiento",
    "lc.addField": "Añadir campo",
    "lc.useField": "Usar campo existente…",
    "lc.newField": "O crear un campo nuevo…",
    "lc.fieldCreated": "Campo creado",
    "logged": "Conectado como",
  },
} as const;

export type I18nKey = keyof typeof dict.pt;

type Vars = Record<string, string | number>;

function interpolate(s: string, vars?: Vars) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

function readLang(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "en" || v === "es" || v === "pt") return v;
  } catch {
    /* ignore */
  }
  const nav = typeof navigator !== "undefined" ? navigator.language : "pt";
  if (nav.startsWith("en")) return "en";
  if (nav.startsWith("es")) return "es";
  return "pt";
}

const I18nCtx = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: I18nKey, vars?: Vars) => string;
} | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = l === "pt" ? "pt-BR" : l;
  }, []);

  const t = useCallback(
    (key: I18nKey, vars?: Vars) => {
      const table = dict[lang] ?? dict.pt;
      return interpolate(table[key] ?? dict.pt[key] ?? key, vars);
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n");
  return ctx;
}

export function useT() {
  return useI18n().t;
}
