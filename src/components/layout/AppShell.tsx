import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  BookOpen,
  Building2,
  Cable,
  ContactRound,
  Copy,
  FileText,
  Filter,
  Globe2,
  GraduationCap,
  Kanban,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Settings2,
  Shield,
  Sparkles,
  Sun,
  Users,
  Webhook,
  Workflow,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCrmStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { useI18n } from "@/lib/i18n";
import { useBottleneckAlerts } from "@/lib/useBottleneckAlerts";
import { useDismissOnOutside } from "@/hooks/use-dismiss-on-outside";
import { ContaHub, SessionLock, type ContaTab } from "@/components/layout/ContaHub";

const NAV = [
  { to: "/painel", key: "nav.painel" as const, icon: LayoutDashboard },
  { to: "/funil", key: "nav.funil" as const, icon: Filter },
  { to: "/contatos", key: "nav.contatos" as const, icon: ContactRound },
  { to: "/live-chat", key: "nav.liveChat" as const, icon: WhatsAppIcon },
  { to: "/automacoes", key: "nav.automacoes" as const, icon: Workflow },
  { to: "/broadcasts", key: "nav.broadcasts" as const, icon: Radio },
  { to: "/ia", key: "nav.ia" as const, icon: Sparkles },
  { to: "/crm", key: "nav.crm" as const, icon: Kanban },
  { to: "/conexoes", key: "nav.conexoes" as const, icon: Cable },
  { to: "/atendentes", key: "nav.atendentes" as const, icon: Users },
  { to: "/webhooks", key: "nav.webhooks" as const, icon: Webhook },
  { to: "/monitoramento", key: "nav.monitoramento" as const, icon: Activity },
  { to: "/meta", key: "nav.meta" as const, icon: Settings2 },
  { to: "/treinamentos", key: "nav.treinamentos" as const, icon: GraduationCap },
] as const;

const COLLAPSE_KEY = "chatnt-sidebar-collapsed";
const THEME_KEY = "chatnt-theme";

function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      /* ignore */
    }
    setDark(next);
  }
  return { dark, toggle };
}

export function AppShell({
  children,
  title,
  actions,
  fullBleed = false,
}: {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  fullBleed?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { dark, toggle: toggleDark } = useDarkMode();
  const { t, lang, setLang } = useI18n();
  const [langOpen, setLangOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [contaTab, setContaTab] = useState<ContaTab | null>(null);
  const locked = useCrmStore((s) => s.sessionLocked);
  const pinHash = useCrmStore((s) => s.securityPinHash);
  const closeDayLock = useCrmStore((s) => s.closeDay);
  const agentForLock = useCrmStore((s) =>
    s.agents.find((a) => a.id === s.activeAgentId),
  );

  const dismissAccount = useCallback(() => {
    setAccountOpen(false);
    setPolicyOpen(false);
  }, []);
  useDismissOnOutside(dismissAccount, accountOpen);

  useEffect(() => {
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const agent = useCrmStore((s) =>
    s.agents.find((a) => a.id === s.activeAgentId),
  );
  const sessionScope = useCrmStore((s) => s.sessionScope);
  const setSessionScope = useCrmStore((s) => s.setSessionScope);
  const sedes = useCrmStore((s) => s.sedes ?? []);
  const { alerts: bottleneckAlerts } = useBottleneckAlerts();

  const scopeValue =
    sessionScope.mode === "central"
      ? "central"
      : `regional:${sessionScope.campoCode ?? ""}`;

  return (
    <div className="flex h-[100dvh] min-h-0 bg-[var(--color-bg)] pt-[var(--grok-banner-h,0px)]">
      {open && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-[var(--color-sidebar)] text-[var(--color-sidebar-fg)] transition-[width,transform] duration-200 ease-out lg:static lg:translate-x-0",
          "pt-[var(--grok-banner-h,0px)] lg:pt-0",
          open ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-[72px]" : "w-[232px]",
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            "border-b border-white/10 bg-white",
            collapsed ? "px-2 py-3" : "px-3 py-3",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2",
              collapsed ? "flex-col" : "justify-between",
            )}
          >
            <Link
              to="/painel"
              onClick={() => setOpen(false)}
              className={cn(
                "flex min-w-0 items-center gap-2.5",
                collapsed && "justify-center",
              )}
              aria-label="ChatNT — início"
            >
              {collapsed ? (
                <img
                  src="/chatnt-mark.png"
                  alt="ChatNT"
                  className="h-10 w-10 shrink-0 object-contain"
                />
              ) : (
                <img
                  src="/chatnt-logo.png"
                  alt="ChatNT — Jornada de Atendimento de Ponta a Ponta"
                  className="h-12 w-auto max-w-[192px] object-contain object-left"
                />
              )}
            </Link>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                className="hidden rounded-[var(--radius-sm)] p-1.5 text-[var(--color-navy)] hover:bg-[var(--color-surface-2)] lg:inline-flex"
                onClick={toggleCollapsed}
                aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
                title={collapsed ? "Expandir menu" : "Recolher menu"}
              >
                {collapsed ? (
                  <PanelLeftOpen className="size-4" />
                ) : (
                  <PanelLeftClose className="size-4" />
                )}
              </button>
              <button
                type="button"
                className="shrink-0 rounded-[var(--radius-sm)] p-2 text-[var(--color-navy)] hover:bg-[var(--color-surface-2)] lg:hidden"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Seletor de sede / escopo */}
        <div
          className={cn(
            "border-b border-white/10",
            collapsed ? "px-1.5 py-1.5" : "px-2.5 py-2",
          )}
        >
          {!collapsed && (
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-[var(--color-sidebar-muted)] uppercase">
              {sessionScope.mode === "central" ? (
                <Globe2 className="size-3" />
              ) : (
                <Building2 className="size-3" />
              )}
              Visão / Sede
            </label>
          )}
          {collapsed ? (
            <button
              type="button"
              title={
                sessionScope.mode === "central"
                  ? "Central de Relacionamento"
                  : (sessionScope.campoCode ?? "Sede")
              }
              onClick={toggleCollapsed}
              className="flex w-full flex-col items-center gap-0.5 rounded-[var(--radius-sm)] py-2 text-[var(--color-sidebar-muted)] hover:bg-[var(--color-sidebar-hover)]"
            >
              {sessionScope.mode === "central" ? (
                <Globe2 className="size-4" />
              ) : (
                <Building2 className="size-4" />
              )}
              <span className="max-w-full truncate px-0.5 text-[9px] font-semibold">
                {sessionScope.mode === "central"
                  ? "CTR"
                  : (sessionScope.campoCode ?? "—")}
              </span>
            </button>
          ) : (
            <>
              <select
                value={scopeValue}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "central") {
                    setSessionScope({ mode: "central", campoCode: null });
                  } else {
                    const code = v.replace("regional:", "");
                    setSessionScope({ mode: "regional", campoCode: code });
                  }
                }}
                className="h-9 w-full rounded-[var(--radius-sm)] border border-white/15 bg-[var(--color-sidebar-2)] px-2 text-xs font-medium text-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="central">🌐 Central de Relacionamento</option>
                <optgroup label="Sedes regionais">
                  {sedes.map((s) => (
                    <option key={s.code} value={`regional:${s.code}`}>
                      {s.code} · {s.name}
                    </option>
                  ))}
                </optgroup>
              </select>
              {sessionScope.mode === "regional" && (
                <p className="mt-1.5 text-[10px] leading-snug text-[var(--color-sidebar-muted)]">
                  Isolado: só alunos deste campo · WhatsApp exclusivo
                </p>
              )}
            </>
          )}
        </div>

        <nav
          className={cn(
            "scrollbar-thin flex-1 space-y-0.5 overflow-y-auto py-3",
            collapsed ? "px-1.5" : "px-2",
          )}
        >
          {NAV.map((item) => {
            const active =
              pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                title={t(item.key)}
                className={cn(
                  "relative flex items-center rounded-lg text-[16.5px] font-normal transition-colors",
                  collapsed
                    ? "justify-center px-0 py-2"
                    : "gap-2.5 px-3 py-2",
                  active
                    ? "nt-gold font-normal text-[#163a86]"
                    : "text-[var(--color-sidebar-fg)] hover:bg-[var(--color-sidebar-hover)]",
                )}
              >
                <Icon className="size-[22px] shrink-0 opacity-90" />
                {!collapsed && (
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate">{t(item.key)}</span>
                    {item.to === "/funil" && bottleneckAlerts.length > 0 && (
                      <span className="rounded-full bg-[#f5c400] px-1.5 py-px text-[10px] font-bold text-[#163a86]">
                        {bottleneckAlerts.length}
                      </span>
                    )}
                  </span>
                )}
                {collapsed && item.to === "/funil" && bottleneckAlerts.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-[#f5c400]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div
          className={cn(
            "relative border-t border-white/10",
            collapsed ? "p-1.5" : "p-3",
          )}
          data-menu
        >
          {accountOpen && !collapsed && (
            <div className="absolute bottom-full left-2 right-2 mb-2 overflow-hidden rounded-2xl bg-[#163a86] py-1 text-white shadow-2xl">
              <div className="px-3.5 py-2 text-[12.5px] text-white/70">
                O que gostaria de fazer?
              </div>
              <AccountItem
                icon={Map}
                label="Mapa do projeto"
                onClick={() => {
                  setAccountOpen(false);
                  setContaTab("mapa");
                }}
              />
              <AccountItem
                icon={BookOpen}
                label="Documentação"
                onClick={() => {
                  setAccountOpen(false);
                  setContaTab("docs");
                }}
              />
              <AccountItem
                icon={Shield}
                label="Encerrar o dia / diário"
                onClick={() => {
                  setAccountOpen(false);
                  setContaTab("diario");
                }}
              />
              <AccountItem
                icon={Bell}
                label="Notificações"
                onClick={() => {
                  setAccountOpen(false);
                  toast.message("Notificações do Live Chat na engrenagem da fila");
                }}
              />
              <div className="relative">
                <AccountItem
                  icon={FileText}
                  label="Políticas"
                  chevron
                  onClick={() => setPolicyOpen((v) => !v)}
                />
                {policyOpen && (
                  <div className="absolute bottom-0 left-full z-10 ml-1 w-[240px] rounded-2xl bg-[#163a86] py-1 shadow-xl">
                    <AccountItem
                      icon={FileText}
                      label="Política de uso do WhatsApp Business"
                      onClick={() => {
                        setAccountOpen(false);
                        setContaTab("politicas");
                      }}
                    />
                    <AccountItem
                      icon={FileText}
                      label="Política de privacidade"
                      onClick={() => {
                        setAccountOpen(false);
                        setContaTab("politicas");
                      }}
                    />
                    <AccountItem
                      icon={FileText}
                      label="Termos de Uso"
                      onClick={() => {
                        setAccountOpen(false);
                        setContaTab("politicas");
                      }}
                    />
                  </div>
                )}
              </div>
              <AccountItem
                icon={Copy}
                label="Copiar link da página"
                onClick={() => {
                  void navigator.clipboard.writeText(window.location.href);
                  setAccountOpen(false);
                  toast.success("Link copiado");
                }}
              />
              <AccountItem
                icon={LogOut}
                label="Sair"
                onClick={() => {
                  setAccountOpen(false);
                  if (!pinHash) {
                    setContaTab("diario");
                    toast.message("Defina um PIN e encerre o dia");
                    return;
                  }
                  closeDayLock({
                    date: new Date().toISOString().slice(0, 10),
                    closedAt: new Date().toISOString(),
                    summary: "Sessão encerrada pelo menu Sair",
                    notes: "",
                    checklist: [],
                    author: agentForLock?.name ?? "Atendente",
                  });
                }}
              />
            </div>
          )}
          <button
            type="button"
            className={cn(
              "w-full rounded-[var(--radius-md)] bg-[var(--color-sidebar-2)] text-left hover:bg-white/10",
              collapsed ? "flex flex-col items-center px-1 py-2" : "flex items-center gap-2.5 px-3 py-2.5",
            )}
            onClick={() => {
              if (collapsed) toggleCollapsed();
              setAccountOpen((v) => !v);
            }}
          >
            <div className="flex size-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-bold text-white">
              {(agent?.name ?? "A")
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-[15.5px] font-medium text-white">
                  {agent?.name ?? "Atendente"}
                </div>
                <div className="truncate text-[12.5px] text-[var(--color-sidebar-muted)]">
                  {agent?.email ?? agent?.area}
                </div>
              </div>
            )}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </Button>
          {/* desktop: also allow expand when collapsed via header if needed */}
          {collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:inline-flex"
              onClick={toggleCollapsed}
              aria-label="Expandir menu"
              title="Expandir menu"
            >
              <PanelLeftOpen className="size-5" />
            </Button>
          )}
          {title ? (
            <h1 className="min-w-0 flex-1 truncate text-[16px] font-semibold text-[var(--color-navy)]">
              {title}
            </h1>
          ) : (
            <div className="flex-1" />
          )}
          {sessionScope.mode === "regional" && (
            <span className="hidden rounded-[var(--radius-pill)] bg-[var(--color-primary-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-primary)] sm:inline">
              {sessionScope.campoCode}
            </span>
          )}
          {actions}
          <Link
            to="/sedes"
            title={t("nav.sedes")}
            aria-label={t("nav.sedes")}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full border bg-[var(--color-surface-2)] hover:bg-[var(--color-border)]",
              pathname === "/sedes"
                ? "border-[var(--color-navy)] text-[var(--color-navy)]"
                : "border-[var(--color-border)] text-[var(--color-navy)]",
            )}
          >
            <Building2 className="size-4" />
          </Link>
          <div className="relative">
            <button
              type="button"
              className="flex h-9 items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 text-[12px] font-medium text-[var(--color-navy)]"
              onClick={() => setLangOpen((v) => !v)}
              title={t("lang.label")}
            >
              {lang.toUpperCase()}
            </button>
            {langOpen && (
              <div className="absolute top-full right-0 z-50 mt-1 w-36 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg">
                {(["pt", "en", "es"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={cn(
                      "flex w-full px-3 py-2 text-left text-[13px] hover:bg-[var(--color-surface-2)]",
                      lang === l && "font-medium text-[var(--color-navy)]",
                    )}
                    onClick={() => {
                      setLang(l);
                      setLangOpen(false);
                    }}
                  >
                    {l === "pt" ? t("lang.pt") : l === "en" ? t("lang.en") : t("lang.es")}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-navy)] hover:bg-[var(--color-border)]"
            onClick={toggleDark}
            title={dark ? t("theme.light") : t("theme.dark")}
            aria-label={dark ? t("theme.light") : t("theme.dark")}
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </header>

        <main
          className={cn(
            "min-h-0 flex-1",
            fullBleed || contaTab
              ? "flex min-h-0 flex-1 flex-col overflow-hidden"
              : "overflow-auto p-3 sm:p-5",
          )}
        >
          {contaTab ? (
            <ContaHub
              tab={contaTab}
              onTab={setContaTab}
              onClose={() => setContaTab(null)}
            />
          ) : (
            children
          )}
        </main>
      </div>
      {locked && <SessionLock />}
    </div>
  );
}

function AccountItem({
  icon: Icon,
  label,
  onClick,
  chevron,
}: {
  icon: typeof Map;
  label: string;
  onClick: () => void;
  chevron?: boolean;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13.5px] hover:bg-white/10"
      onClick={onClick}
    >
      <Icon className="size-4 shrink-0 opacity-90" />
      <span className="min-w-0 flex-1">{label}</span>
      {chevron ? <span className="opacity-70">›</span> : null}
    </button>
  );
}
