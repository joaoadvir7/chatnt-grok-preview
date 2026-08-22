import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ScopeBanner } from "@/components/ScopeBanner";
import { JornadaStrip } from "@/components/JornadaStrip";
import { TagChip } from "@/components/TagChip";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { useCrmStore } from "@/lib/store";
import { useScopedData } from "@/lib/useScopedData";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import {
  Download,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Tags,
  Trash2,
  Upload,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/contatos")({
  component: ContatosPage,
});

function ContatosPage() {
  const t = useT();
  const navigate = useNavigate();
  const {
    contacts,
    isRegional,
    sede,
    label: scopeLabel,
  } = useScopedData();
  const tags = useCrmStore((s) => s.tags);
  const customFields = useCrmStore((s) => s.customFields);
  const deals = useCrmStore((s) => s.deals);
  const agents = useCrmStore((s) => s.agents);
  const jornadaDone = useCrmStore((s) => s.jornadaDone);
  const addContact = useCrmStore((s) => s.addContact);
  const updateContact = useCrmStore((s) => s.updateContact);
  const deleteContact = useCrmStore((s) => s.deleteContact);
  const toggleContactTag = useCrmStore((s) => s.toggleContactTag);
  const setContactField = useCrmStore((s) => s.setContactField);
  const importContacts = useCrmStore((s) => s.importContacts);
  const addTag = useCrmStore((s) => s.addTag);
  const addCustomField = useCrmStore((s) => s.addCustomField);
  const addNote = useCrmStore((s) => s.addNote);
  const deleteNote = useCrmStore((s) => s.deleteNote);
  const openConversation = useCrmStore((s) => s.openConversationForContact);
  const addDeal = useCrmStore((s) => s.addDeal);
  const markJornadaDone = useCrmStore((s) => s.markJornadaDone);

  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newFieldName, setNewFieldName] = useState("");

  useEffect(() => {
    if (!jornadaDone.includes("contatos")) markJornadaDone("contatos");
  }, [jornadaDone, markJornadaDone]);

  // se o contato selecionado sumiu do escopo, limpa
  useEffect(() => {
    if (selected && !contacts.some((c) => c.id === selected)) {
      setSelected(contacts[0]?.id ?? null);
    }
  }, [contacts, selected]);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (tagFilter !== "all" && !c.tagIds.includes(tagFilter)) return false;
      if (q.trim()) {
        const s = q.toLowerCase();
        const fields = Object.values(c.customFields).join(" ").toLowerCase();
        if (
          !c.name.toLowerCase().includes(s) &&
          !c.phone.includes(s) &&
          !(c.email ?? "").toLowerCase().includes(s) &&
          !fields.includes(s)
        )
          return false;
      }
      return true;
    });
  }, [contacts, q, tagFilter, statusFilter]);

  const active = contacts.find((c) => c.id === selected) ?? null;

  function handleCreate() {
    if (!name.trim() || !phone.trim()) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }
    const digits = phone.replace(/\D/g, "");
    if (contacts.some((c) => c.phone === digits)) {
      toast.error("Já existe contato com este telefone neste escopo");
      return;
    }
    const id = addContact({
      name,
      phone,
      email: email || undefined,
    });
    setSelected(id);
    setShowNew(false);
    setName("");
    setPhone("");
    setEmail("");
    toast.success(
      isRegional
        ? `Contato criado na base ${sede?.code ?? ""}`
        : "Contato criado",
    );
  }

  function handleImport(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const lines = text.split(/\r?\n/).filter(Boolean);
      const rows = lines.slice(1).map((line) => {
        const [n, p, e] = line.split(/[,;]/).map((x) => x.trim());
        return { name: n || "Sem nome", phone: p || "", email: e };
      }).filter((r) => r.phone);
      const n = importContacts(rows);
      toast.success(`${n} contatos importados${isRegional ? ` · ${sede?.code}` : ""}`);
    };
    reader.readAsText(file);
  }

  function exportCsv() {
    const header = "nome,telefone,email,campo,uniao,tags\n";
    const body = filtered
      .map((c) => {
        const tagNames = c.tagIds
          .map((id) => tags.find((t) => t.id === id)?.name)
          .filter(Boolean)
          .join("|");
        return [
          c.name,
          c.phone,
          c.email ?? "",
          c.customFields.cf5 ?? "",
          c.customFields.cf6 ?? "",
          tagNames,
        ]
          .map((x) => `"${x}"`)
          .join(",");
      })
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contatos-${isRegional ? sede?.code ?? "sede" : "central"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell
      title={t("page.contatos")}
      actions={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowTagModal(true)}>
            <Tags className="size-3.5" />
            Tags / Campos
          </Button>
          <Button size="sm" onClick={() => setShowNew(true)}>
            <UserPlus className="size-3.5" />
            Novo
          </Button>
        </div>
      }
    >
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
        <JornadaStrip current="contatos" />
        <ScopeBanner />

        {isRegional && (
          <p className="text-sm text-[var(--color-muted)]">
            Base da sede <strong className="text-[var(--color-navy)]">{scopeLabel}</strong>.
            Você <strong>não</strong> vê alunos de outras associações/missões —
            segmentação pelo campo customizado «Campo / Associação».
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[var(--color-subtle)]" />
            <input
              className="h-10 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] pr-3 pl-9 text-sm"
              placeholder="Buscar nome, telefone, e-mail ou campo..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            className="h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          >
            <option value="all">Todas as tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos status</option>
            <option value="open">Aberto</option>
            <option value="pending">Pendente</option>
            <option value="resolved">Resolvido</option>
          </select>
          <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm">
            <Upload className="size-3.5" />
            Importar
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
              }}
            />
          </label>
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="size-3.5" />
            Exportar
          </Button>
        </div>

        <div className="grid min-h-[480px] gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 text-xs font-medium text-[var(--color-muted)]">
              {filtered.length} de {contacts.length} contatos
              {isRegional ? ` · ${sede?.code}` : " · visão nacional"}
            </div>
            <ul className="max-h-[560px] divide-y divide-[var(--color-border)] overflow-auto">
              {filtered.map((c) => {
                const agent = agents.find((a) => a.id === c.assignee);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(c.id)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-primary-soft)]/40",
                        selected === c.id && "bg-[var(--color-primary-soft)]",
                      )}
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-navy)] text-sm font-semibold text-white">
                        {c.name
                          .split(" ")
                          .slice(0, 2)
                          .map((p) => p[0])
                          .join("")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium text-[var(--color-fg)]">
                            {c.name}
                          </span>
                          <span className="shrink-0 rounded-[var(--radius-pill)] bg-[var(--color-navy)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-navy)]">
                            {c.customFields.cf5 || "—"}
                          </span>
                        </div>
                        <div className="mt-0.5 truncate text-xs text-[var(--color-muted)]">
                          {c.phone}
                          {agent ? ` · ${agent.name}` : ""}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {c.tagIds.slice(0, 3).map((tid) => {
                            const t = tags.find((x) => x.id === tid);
                            if (!t) return null;
                            return (
                              <span
                                key={tid}
                                className="rounded-[var(--radius-pill)] px-1.5 py-0.5 text-[10px] font-medium text-white"
                                style={{ backgroundColor: t.color }}
                              >
                                {t.name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="px-4 py-12 text-center text-sm text-[var(--color-muted)]">
                  Nenhum contato neste escopo.
                </li>
              )}
            </ul>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            {active ? (
              <ContactDetail
                contact={active}
                tags={tags}
                customFields={customFields}
                agents={agents}
                deals={deals.filter((d) => d.contactId === active.id)}
                onUpdate={(patch) => updateContact(active.id, patch)}
                onToggleTag={(tid) => toggleContactTag(active.id, tid)}
                onSetField={(fid, v) => setContactField(active.id, fid, v)}
                onAddNote={(t) => addNote(active.id, t)}
                onDeleteNote={(nid) => deleteNote(active.id, nid)}
                onDelete={() => {
                  deleteContact(active.id);
                  setSelected(null);
                  toast.success("Contato removido");
                }}
                onOpenChat={() => {
                  const cvId = openConversation(active.id);
                  void navigate({
                    to: "/live-chat",
                    search: { cv: cvId } as never,
                  });
                }}
                onAddDeal={() => {
                  addDeal(active.id, `${active.name} — negócio`, "s1");
                  toast.success("Negócio criado no CRM");
                }}
                lockCampo={isRegional}
              />
            ) : (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center text-sm text-[var(--color-muted)]">
                <Plus className="mb-2 size-8 opacity-40" />
                Selecione um contato para editar tags, campos, anotações e
                abrir o chat.
              </div>
            )}
          </div>
        </div>
      </div>

      {showNew && (
        <Modal title="Novo contato" onClose={() => setShowNew(false)}>
          {isRegional && sede && (
            <p className="mb-3 rounded-[var(--radius-sm)] bg-[var(--color-primary-soft)] px-3 py-2 text-xs text-[var(--color-fg)]">
              Será gravado automaticamente no campo{" "}
              <strong>{sede.code}</strong> ({sede.uniao}) · WhatsApp{" "}
              {sede.whatsapp}
            </p>
          )}
          <div className="space-y-3">
            <Field label="Nome">
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Telefone">
              <input
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="55..."
              />
            </Field>
            <Field label="E-mail">
              <input
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowNew(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate}>Salvar</Button>
            </div>
          </div>
        </Modal>
      )}

      {showTagModal && (
        <Modal title="Tags e campos" onClose={() => setShowTagModal(false)}>
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-xs font-semibold text-[var(--color-navy)] uppercase">
                Nova tag
              </div>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Nome da tag"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (!newTagName.trim()) return;
                    addTag(newTagName, "#12aa29");
                    setNewTagName("");
                    toast.success("Tag criada");
                  }}
                >
                  Criar tag
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.map((t) => (
                  <TagChip key={t.id} tag={t} />
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold text-[var(--color-navy)] uppercase">
                Novo campo customizado
              </div>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Nome do campo"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (!newFieldName.trim()) return;
                    addCustomField(newFieldName, "text");
                    setNewFieldName("");
                    toast.success("Campo criado");
                  }}
                >
                  Criar campo
                </Button>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {customFields.map((f) => (
                  <li key={f.id} className="text-[var(--color-muted)]">
                    {f.name}{" "}
                    <span className="text-xs">({f.type})</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Modal>
      )}

      <style>{`
        .input {
          width: 100%;
          height: 2.25rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          padding: 0 0.75rem;
          font-size: 0.875rem;
        }
      `}</style>
    </AppShell>
  );
}

function ContactDetail({
  contact,
  tags,
  customFields,
  agents,
  deals,
  onUpdate,
  onToggleTag,
  onSetField,
  onAddNote,
  onDeleteNote,
  onDelete,
  onOpenChat,
  onAddDeal,
  lockCampo,
}: {
  contact: import("@/lib/types").Contact;
  tags: import("@/lib/types").Tag[];
  customFields: import("@/lib/types").CustomFieldDef[];
  agents: import("@/lib/types").Agent[];
  deals: import("@/lib/types").Deal[];
  onUpdate: (p: Partial<import("@/lib/types").Contact>) => void;
  onToggleTag: (id: string) => void;
  onSetField: (id: string, v: string) => void;
  onAddNote: (t: string) => void;
  onDeleteNote: (id: string) => void;
  onDelete: () => void;
  onOpenChat: () => void;
  onAddDeal: () => void;
  lockCampo: boolean;
}) {
  const [note, setNote] = useState("");
  const agent = agents.find((a) => a.id === contact.assignee);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-navy)]">
            {contact.name}
          </h2>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--color-muted)]">
            <span className="inline-flex items-center gap-1">
              <Phone className="size-3" />
              {contact.phone}
            </span>
            {contact.email && (
              <span className="inline-flex items-center gap-1">
                <Mail className="size-3" />
                {contact.email}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-1.5 text-[var(--color-danger)] hover:bg-red-50"
          aria-label="Excluir"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onOpenChat}>
          <MessageSquare className="size-3.5" />
          Abrir chat
        </Button>
        <Button size="sm" variant="outline" onClick={onAddDeal}>
          + CRM
        </Button>
        <select
          className="h-8 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 text-xs"
          value={contact.status}
          onChange={(e) =>
            onUpdate({
              status: e.target.value as import("@/lib/types").Contact["status"],
            })
          }
        >
          <option value="open">Aberto</option>
          <option value="pending">Pendente</option>
          <option value="resolved">Resolvido</option>
        </select>
      </div>

      <div>
        <div className="mb-1.5 text-xs font-semibold tracking-wide text-[var(--color-navy)] uppercase">
          Tags
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => {
            const on = contact.tagIds.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onToggleTag(t.id)}
                className={cn(
                  "rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-medium transition-opacity",
                  on ? "text-white opacity-100" : "opacity-40 ring-1 ring-inset",
                )}
                style={
                  on
                    ? { backgroundColor: t.color }
                    : { color: t.color, borderColor: t.color }
                }
              >
                {t.name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-xs font-semibold tracking-wide text-[var(--color-navy)] uppercase">
          Campos (segmentação regional)
        </div>
        <div className="space-y-2">
          {customFields.map((f) => {
            const locked = lockCampo && (f.id === "cf5" || f.id === "cf6");
            return (
              <label key={f.id} className="block text-xs">
                <span className="mb-0.5 block text-[var(--color-muted)]">
                  {f.name}
                  {locked ? " · fixo da sede" : ""}
                </span>
                {f.type === "select" && f.options ? (
                  <select
                    className="input"
                    disabled={locked}
                    value={contact.customFields[f.id] ?? ""}
                    onChange={(e) => onSetField(f.id, e.target.value)}
                  >
                    <option value="">—</option>
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="input"
                    type={f.type === "date" ? "date" : "text"}
                    disabled={locked}
                    value={contact.customFields[f.id] ?? ""}
                    onChange={(e) => onSetField(f.id, e.target.value)}
                  />
                )}
              </label>
            );
          })}
        </div>
      </div>

      {agent && (
        <div className="text-xs text-[var(--color-muted)]">
          Atendente:{" "}
          <strong className="text-[var(--color-fg)]">{agent.name}</strong>
        </div>
      )}

      {deals.length > 0 && (
        <div className="text-xs text-[var(--color-muted)]">
          CRM: {deals.map((d) => d.title).join(", ")}
        </div>
      )}

      <div>
        <div className="mb-1.5 text-xs font-semibold tracking-wide text-[var(--color-navy)] uppercase">
          Anotações
        </div>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Nova anotação..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && note.trim()) {
                onAddNote(note);
                setNote("");
              }
            }}
          />
          <Button
            size="sm"
            onClick={() => {
              if (!note.trim()) return;
              onAddNote(note);
              setNote("");
            }}
          >
            Salvar
          </Button>
        </div>
        <ul className="mt-2 max-h-40 space-y-2 overflow-auto">
          {contact.notes.map((n) => (
            <li
              key={n.id}
              className="rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] px-2.5 py-2 text-xs"
            >
              <div className="flex justify-between gap-2">
                <span className="font-medium text-[var(--color-navy)]">
                  {n.author}
                </span>
                <button
                  type="button"
                  className="text-[var(--color-subtle)] hover:text-[var(--color-danger)]"
                  onClick={() => onDeleteNote(n.id)}
                >
                  <X className="size-3" />
                </button>
              </div>
              <p className="mt-0.5 text-[var(--color-fg)]">{n.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90dvh] w-full max-w-md overflow-auto rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-[var(--color-navy)]">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs text-[var(--color-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}
