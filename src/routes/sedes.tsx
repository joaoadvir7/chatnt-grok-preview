import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { useCrmStore } from "@/lib/store";
import { UNIOES, type SedeRegional } from "@/lib/scope";

export const Route = createFileRoute("/sedes")({
  component: SedesPage,
});

const EMPTY: {
  code: string;
  name: string;
  uniao: string;
  tipo: SedeRegional["tipo"];
  regiao: string;
  whatsapp: string;
} = {
  code: "",
  name: "",
  uniao: "UNB",
  tipo: "associacao",
  regiao: "",
  whatsapp: "",
};

function SedesPage() {
  const sedes = useCrmStore((s) => s.sedes ?? []);
  const createSede = useCrmStore((s) => s.createSede);
  const updateSede = useCrmStore((s) => s.updateSede);
  const deleteSede = useCrmStore((s) => s.deleteSede);
  const setSessionScope = useCrmStore((s) => s.setSessionScope);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function patch<K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function startCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function startEdit(s: SedeRegional) {
    setEditing(s.code);
    setForm({
      code: s.code,
      name: s.name,
      uniao: s.uniao,
      tipo: s.tipo,
      regiao: s.regiao,
      whatsapp: s.whatsapp,
    });
    setOpen(true);
  }

  function save() {
    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    if (!code || !name) {
      toast.error("Informe o código e o nome da sede");
      return;
    }
    if (editing) {
      updateSede(editing, {
        name,
        uniao: form.uniao,
        tipo: form.tipo,
        regiao: form.regiao.trim(),
        whatsapp: form.whatsapp.trim(),
      });
      toast.success("Sede atualizada");
    } else {
      if (sedes.some((s) => s.code === code)) {
        toast.error(`Já existe a sede ${code}`);
        return;
      }
      createSede({
        code,
        name,
        uniao: form.uniao,
        tipo: form.tipo,
        regiao: form.regiao.trim(),
        whatsapp: form.whatsapp.trim(),
      });
      toast.success(`${code} cadastrada — conecte o WhatsApp em Conexões`);
    }
    setOpen(false);
  }

  return (
    <AppShell title="Sedes regionais">
      <div className="mx-auto max-w-[1100px] space-y-4">
        <section className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[#e2e7f0] bg-white px-5 py-4">
          <div>
            <h2 className="text-[18px] font-semibold text-[#1a2744]">
              Associações e missões
            </h2>
            <p className="mt-1 max-w-[640px] text-[14.5px] leading-snug text-[#5a6780]">
              Cada sede tem visão isolada e pode ter o próprio número WhatsApp.
              Depois de cadastrar, use o seletor da barra lateral e conecte o
              número em Conexões.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#031c45] px-4 text-[14.5px] font-medium text-white hover:bg-[#003878]"
            onClick={startCreate}
          >
            <Plus className="size-4" /> Nova sede
          </button>
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          {sedes.map((s) => (
            <article
              key={s.code}
              className="rounded-2xl border border-[#e2e7f0] bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-[#e6eef8] text-[#0050a0]">
                    <Building2 className="size-5" />
                  </span>
                  <div>
                    <div className="text-[16px] font-semibold text-[#1a2744]">
                      {s.code} · {s.name}
                    </div>
                    <div className="text-[13.5px] text-[#5a6780]">
                      {s.tipo === "missao" ? "Missão" : "Associação"} · União{" "}
                      {s.uniao}
                      {s.regiao ? ` · ${s.regiao}` : ""}
                    </div>
                  </div>
                </div>
                {s.isDemo && (
                  <span className="rounded-full bg-[#f3f5fa] px-2 py-0.5 text-[11px] font-medium text-[#8b95a8]">
                    Demo
                  </span>
                )}
              </div>
              <p className="mt-3 text-[13.5px] text-[#5a6780]">
                WhatsApp: {s.whatsapp || "ainda sem número"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#c5cde0] px-3 text-[13.5px] hover:bg-[#f4f6fa]"
                  onClick={() => {
                    setSessionScope({ mode: "regional", campoCode: s.code });
                    toast.message(`Visão ${s.code}`);
                  }}
                >
                  Abrir visão
                </button>
                <Link
                  to="/conexoes"
                  className="inline-flex h-9 items-center rounded-xl border border-[#c5cde0] px-3 text-[13.5px] hover:bg-[#f4f6fa]"
                  onClick={() =>
                    setSessionScope({ mode: "regional", campoCode: s.code })
                  }
                >
                  Conectar WhatsApp
                </Link>
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-xl border border-[#c5cde0] text-[#5a6780] hover:bg-[#f4f6fa]"
                  onClick={() => startEdit(s)}
                  title="Editar"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-xl border border-[#c5cde0] text-[#5a6780] hover:bg-red-50 hover:text-red-600"
                  onClick={() => {
                    if (!confirm(`Remover a sede ${s.code}?`)) return;
                    deleteSede(s.code);
                    toast.success("Sede removida");
                  }}
                  title="Excluir"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[460px] rounded-3xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[18px] font-semibold text-[#1a2744]">
              {editing ? `Editar ${editing}` : "Nova sede regional"}
            </h3>
            <label className="mt-4 block text-[13px] text-[#5a6780]">
              Código (sigla)
              <input
                className="mt-1 h-10 w-full rounded-xl border border-[#c5cde0] px-3 text-[14.5px] uppercase outline-none focus:border-[#0050a0]"
                value={form.code}
                disabled={Boolean(editing)}
                onChange={(e) => patch("code", e.target.value)}
                placeholder="Ex.: ANPA"
                autoFocus={!editing}
              />
            </label>
            <label className="mt-3 block text-[13px] text-[#5a6780]">
              Nome
              <input
                className="mt-1 h-10 w-full rounded-xl border border-[#c5cde0] px-3 text-[14.5px] outline-none focus:border-[#0050a0]"
                value={form.name}
                onChange={(e) => patch("name", e.target.value)}
                placeholder="Associação Norte do Pará"
              />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block text-[13px] text-[#5a6780]">
                Tipo
                <select
                  className="mt-1 h-10 w-full rounded-xl border border-[#c5cde0] bg-white px-3 text-[14.5px] outline-none focus:border-[#0050a0]"
                  value={form.tipo}
                  onChange={(e) =>
                    patch("tipo", e.target.value as SedeRegional["tipo"])
                  }
                >
                  <option value="associacao">Associação</option>
                  <option value="missao">Missão</option>
                </select>
              </label>
              <label className="block text-[13px] text-[#5a6780]">
                União
                <select
                  className="mt-1 h-10 w-full rounded-xl border border-[#c5cde0] bg-white px-3 text-[14.5px] outline-none focus:border-[#0050a0]"
                  value={form.uniao}
                  onChange={(e) => patch("uniao", e.target.value)}
                >
                  {UNIOES.map((u) => (
                    <option key={u.code} value={u.code}>
                      {u.code}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-3 block text-[13px] text-[#5a6780]">
              Região / cidade
              <input
                className="mt-1 h-10 w-full rounded-xl border border-[#c5cde0] px-3 text-[14.5px] outline-none focus:border-[#0050a0]"
                value={form.regiao}
                onChange={(e) => patch("regiao", e.target.value)}
                placeholder="Belém / Pará"
              />
            </label>
            <label className="mt-3 block text-[13px] text-[#5a6780]">
              WhatsApp (opcional)
              <input
                className="mt-1 h-10 w-full rounded-xl border border-[#c5cde0] px-3 text-[14.5px] outline-none focus:border-[#0050a0]"
                value={form.whatsapp}
                onChange={(e) => patch("whatsapp", e.target.value)}
                placeholder="+55 91 9…"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="h-9 rounded-xl border border-[#c5cde0] px-3 text-[14px]"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="h-9 rounded-xl bg-[#031c45] px-4 text-[14px] font-medium text-white"
                onClick={save}
              >
                Salvar sede
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
