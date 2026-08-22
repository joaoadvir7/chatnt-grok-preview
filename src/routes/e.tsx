import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { entregaMessage, waMeUrl } from "@/lib/visit-labels";

type EntregaSearch = { n?: string; p?: string; c?: string; a?: string };

function qstr(v: unknown) {
  if (v == null) return "";
  return String(v);
}

export const Route = createFileRoute("/e")({
  validateSearch: (s: Record<string, unknown>): EntregaSearch => ({
    n: qstr(s.n),
    p: qstr(s.p),
    c: qstr(s.c),
    a: qstr(s.a),
  }),
  component: EntregaPage,
});

const NAME_KEY = "chatnt-entregador-nome";

function EntregaPage() {
  const { n, p, c, a } = Route.useSearch();
  const [name, setName] = useState(
    () => localStorage.getItem(NAME_KEY) || a || "",
  );
  const [draft, setDraft] = useState(name);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!p || !name || sent) return;
    setSent(true);
    const t = window.setTimeout(() => openWhatsApp(name), 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p, name]);

  const preview = useMemo(
    () =>
      entregaMessage({
        studentName: n || "aluno",
        agentName: name || "agente",
        city: c || "",
      }),
    [n, c, name],
  );

  function openWhatsApp(agentName: string) {
    const trimmed = agentName.trim();
    if (trimmed) {
      try {
        localStorage.setItem(NAME_KEY, trimmed);
      } catch {
        /* ignore */
      }
      setName(trimmed);
    }
    const text = entregaMessage({
      studentName: n || "aluno",
      agentName: trimmed || "agente",
      city: c || "",
    });
    const href = waMeUrl(p || "", text);
    if (href) window.location.href = href;
  }

  if (!p) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#eef2f8] p-6 text-center text-[#082b5e]">
        QR inválido
      </div>
    );
  }

  if (!name) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#eef2f8] p-5">
        <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-[15px] font-semibold text-[#082b5e]">
            Quem vai entregar?
          </div>
          <p className="mt-1 text-[13px] text-[#4a6280]">
            Seu nome entra na mensagem e fica salvo neste celular.
          </p>
          <input
            className="mt-3 h-10 w-full rounded-lg border border-[#d5dee8] px-3 text-[14px]"
            placeholder="Seu nome"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim()) openWhatsApp(draft);
            }}
          />
          <button
            type="button"
            className="mt-3 h-10 w-full rounded-lg bg-[#0d5c3d] text-[14px] text-white"
            onClick={() => draft.trim() && openWhatsApp(draft)}
          >
            Abrir WhatsApp
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#eef2f8] p-5">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-sm">
        <div className="text-[13px] text-[#4a6280]">Mensagem para {n}</div>
        <p className="mt-2 text-[14px] leading-snug text-[#082b5e]">{preview}</p>
        <button
          type="button"
          className="mt-4 h-10 w-full rounded-lg bg-[#25D366] text-[14px] text-white"
          onClick={() => openWhatsApp(name)}
        >
          Enviar no WhatsApp
        </button>
        <button
          type="button"
          className="mt-2 w-full text-[12px] text-[#4a6280] underline"
          onClick={() => {
            try {
              localStorage.removeItem(NAME_KEY);
            } catch {
              /* ignore */
            }
            setName("");
            setDraft("");
          }}
        >
          Trocar meu nome
        </button>
      </div>
    </div>
  );
}
