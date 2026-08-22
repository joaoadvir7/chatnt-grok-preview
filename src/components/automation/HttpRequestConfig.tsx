import { Braces, HelpCircle, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCrmStore } from "@/lib/store";
import type { FlowNode } from "@/lib/types";
import { cn, uid } from "@/lib/utils";

const METHODS: { id: string; title: string; hint: string }[] = [
  {
    id: "POST",
    title: "POST",
    hint: "Fará uma requisição enviando os dados do contato no corpo da requisição.",
  },
  {
    id: "PUT",
    title: "PUT",
    hint: "Fará uma requisição enviando os dados do contato no corpo da requisição.",
  },
  {
    id: "GET",
    title: "GET",
    hint: "Uma requisição GET não envia dados no corpo (body); ela é utilizada apenas para realizar consultas em uma API ou site.",
  },
  {
    id: "DELETE",
    title: "DELETE",
    hint: "Uma requisição DELETE não enviará dados no corpo; ela será utilizada apenas para realizar uma solicitação em uma API ou site.",
  },
];

type Hdr = { id: string; key: string; value: string };

function parseHeaders(raw?: string): Hdr[] {
  try {
    const v = JSON.parse(raw || "[]") as unknown;
    if (!Array.isArray(v)) return [];
    return v.map((h, i) => ({
      id: String((h as Hdr).id || `h${i}`),
      key: String((h as Hdr).key ?? ""),
      value: String((h as Hdr).value ?? ""),
    }));
  } catch {
    return [];
  }
}

function parseMap(raw?: string): Record<string, string> {
  try {
    const v = JSON.parse(raw || "{}") as Record<string, string>;
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

export function HttpRequestConfig({
  selected,
  setCfg,
  customFields,
}: {
  selected: FlowNode;
  setCfg: (patch: Record<string, string>) => void;
  customFields: { id: string; name: string }[];
}) {
  const addCustomField = useCrmStore((s) => s.addCustomField);
  const cfg = selected.config ?? {};
  const method = (cfg.method || "POST").toUpperCase();
  const headers = parseHeaders(cfg.headers);
  const fieldMap = parseMap(cfg.fieldMap);
  const customBody = cfg.customBody === "1";
  const [hint, setHint] = useState(false);
  const [varsOpen, setVarsOpen] = useState(false);
  const [newField, setNewField] = useState("");

  const vars = useMemo(
    () => [
      { k: "{{nome}}", l: "Nome" },
      { k: "{{telefone}}", l: "Telefone" },
      { k: "{{email}}", l: "E-mail" },
      ...customFields.map((f) => ({ k: `{{${f.name}}}`, l: f.name })),
    ],
    [customFields],
  );

  function writeHeaders(next: Hdr[]) {
    setCfg({ headers: JSON.stringify(next) });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-[#8b95a8] uppercase">
            HTTP
          </p>
          <h3 className="text-[22px] font-bold text-[#1a2744]">
            Requisição HTTP
          </h3>
        </div>
        <button
          type="button"
          className="flex size-7 items-center justify-center rounded-full text-[#8b95a8] hover:bg-[#f4f6fa]"
          onClick={() => setHint((v) => !v)}
        >
          <HelpCircle className="size-4" />
        </button>
      </div>
      <p className="text-[14.5px] leading-snug text-[#5a6780]">
        Selecione o tipo de requisição e, se desejar, atualize um campo do
        contato com a resposta obtida.
      </p>
      {hint && (
        <p className="rounded-xl bg-[#f4f6fa] px-3 py-2 text-[12.5px] leading-snug text-[#5a6780]">
          Em POST/PUT o ChatNT envia os dados do aluno no body, salvo se você
          ligar um JSON customizado. Mapeie a resposta nos campos abaixo.
        </p>
      )}

      <button
        type="button"
        className="ml-auto flex h-10 items-center gap-1 rounded-full border border-[#c5cde0] px-4 text-[13.5px] font-medium text-[#1a2744]"
        onClick={() => setHint(true)}
      >
        Dados da requisição
        <HelpCircle className="size-3.5 text-[#8b95a8]" />
      </button>

      <div>
        <h4 className="text-[16px] font-semibold text-[#1a2744]">
          Configuração basica da requisição
        </h4>
        <div className="relative mt-3">
          <input
            className="h-12 w-full rounded-xl border border-[#c5cde0] pr-12 pl-4 text-[14.5px] outline-none focus:border-[#0050a0]"
            placeholder="Enviar requisição para *"
            value={cfg.url ?? ""}
            onChange={(e) => setCfg({ url: e.target.value })}
          />
          <button
            type="button"
            className="absolute top-1.5 right-1.5 flex size-9 items-center justify-center rounded-lg border border-[#e2e7f0] text-[#5a6780] hover:bg-[#f4f6fa]"
            title="Inserir variável"
            onClick={() => setVarsOpen((v) => !v)}
          >
            <Braces className="size-4" />
          </button>
          {varsOpen && (
            <div className="absolute top-12 right-0 z-20 w-48 overflow-hidden rounded-xl border border-[#e2e7f0] bg-white py-1 shadow-lg">
              {vars.map((v) => (
                <button
                  key={v.k}
                  type="button"
                  className="flex w-full px-3 py-1.5 text-left text-[13px] hover:bg-[#f4f6fa]"
                  onClick={() => {
                    setCfg({ url: `${cfg.url ?? ""}${v.k}` });
                    setVarsOpen(false);
                  }}
                >
                  {v.l}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {METHODS.map((m) => {
          const on = method === m.id;
          return (
            <button
              key={m.id}
              type="button"
              className={cn(
                "w-full rounded-2xl border px-4 py-3.5 text-left",
                on
                  ? "border-[#e8c39a] bg-[#fffaf4]"
                  : "border-[#e2e7f0] bg-white hover:border-[#d5dae3]",
              )}
              onClick={() => setCfg({ method: m.id })}
            >
              <p className="text-[11px] font-semibold tracking-wide text-[#8b95a8] uppercase">
                HTTP
              </p>
              <p className="text-[18px] font-bold text-[#1a2744]">{m.title}</p>
              <p className="mt-1 text-[13.5px] leading-snug text-[#5a6780]">
                {m.hint}
              </p>
            </button>
          );
        })}
      </div>

      <div>
        <h4 className="text-[16px] font-semibold text-[#1a2744]">
          Adicionar headers na requisição
        </h4>
        <p className="mt-1 text-[13.5px] leading-snug text-[#5a6780]">
          Adicione os campos que deseja enviar no header da requisição. Eles são
          úteis para autenticação e outras informações exigidas pela API.
        </p>
        <div className="mt-2 space-y-2">
          {headers.map((h) => (
            <div key={h.id} className="flex gap-1.5">
              <input
                className="h-10 min-w-0 flex-1 rounded-xl border border-[#c5cde0] px-3 text-[13px]"
                placeholder="Header"
                value={h.key}
                onChange={(e) =>
                  writeHeaders(
                    headers.map((x) =>
                      x.id === h.id ? { ...x, key: e.target.value } : x,
                    ),
                  )
                }
              />
              <input
                className="h-10 min-w-0 flex-1 rounded-xl border border-[#c5cde0] px-3 text-[13px]"
                placeholder="Valor"
                value={h.value}
                onChange={(e) =>
                  writeHeaders(
                    headers.map((x) =>
                      x.id === h.id ? { ...x, value: e.target.value } : x,
                    ),
                  )
                }
              />
              <button
                type="button"
                className="flex size-10 items-center justify-center text-[#8b95a8] hover:text-red-600"
                onClick={() => writeHeaders(headers.filter((x) => x.id !== h.id))}
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-3 flex h-11 w-full items-center justify-center rounded-full border border-[#031c45] text-[14.5px] font-medium text-[#031c45] hover:bg-[#f4f6fa]"
          onClick={() =>
            writeHeaders([...headers, { id: uid("h"), key: "", value: "" }])
          }
        >
          Adicionar campo de header
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-[16px] font-semibold text-[#1a2744]">
            Adicionar body customizável
          </h4>
          <button
            type="button"
            role="switch"
            aria-checked={customBody}
            className={cn(
              "relative h-6 w-11 shrink-0 rounded-full transition-colors",
              customBody ? "bg-[#031c45]" : "bg-[#c5cde0]",
            )}
            onClick={() => setCfg({ customBody: customBody ? "0" : "1" })}
          >
            <span
              className={cn(
                "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
                customBody ? "left-[22px]" : "left-0.5",
              )}
            />
          </button>
        </div>
        <p className="mt-1 text-[13.5px] leading-snug text-[#5a6780]">
          Adicione um body a requisição em formato JSON. Utilizado para
          customizar a interação com a API.
        </p>
        {customBody && (
          <textarea
            className="mt-3 min-h-[120px] w-full rounded-2xl border border-[#c5cde0] p-3 font-mono text-[13px] outline-none focus:border-[#0050a0]"
            placeholder={'{\n  "phone": "{{telefone}}"\n}'}
            value={cfg.body ?? ""}
            onChange={(e) => setCfg({ body: e.target.value })}
          />
        )}
      </div>

      <div>
        <h4 className="text-[16px] font-semibold text-[#1a2744]">
          Campos para atualizar o contato
        </h4>
        <p className="mt-1 text-[13.5px] leading-snug text-[#5a6780]">
          Configure o que fazer com a resposta da requisição. Você pode extrair
          valores retornados e salvar nos campos personalizados do contato.
        </p>
        <button
          type="button"
          className="mt-3 flex h-11 w-full items-center justify-center rounded-full border border-[#031c45] text-[14.5px] font-medium text-[#031c45] hover:bg-[#f4f6fa]"
          onClick={() => setCfg({ fieldMap: "{}" })}
        >
          Redefinir a estrutura de dados
        </button>
        <div className="mt-3 space-y-3">
          {customFields.map((f) => (
            <label key={f.id} className="block">
              <span className="mb-1 flex items-center gap-1 text-[12.5px] text-[#8b95a8]">
                Tr {f.name}
              </span>
              <input
                className="h-11 w-full rounded-full border border-[#c5cde0] px-4 text-[14px] outline-none focus:border-[#0050a0]"
                placeholder="caminho.json da resposta"
                value={fieldMap[f.id] ?? ""}
                onChange={(e) =>
                  setCfg({
                    fieldMap: JSON.stringify({
                      ...fieldMap,
                      [f.id]: e.target.value,
                    }),
                  })
                }
              />
            </label>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            className="h-11 min-w-0 flex-1 rounded-full border border-[#c5cde0] px-4 text-[14px]"
            placeholder="Nome do campo"
            value={newField}
            onChange={(e) => setNewField(e.target.value)}
          />
          <button
            type="button"
            className="flex h-11 shrink-0 items-center gap-1 rounded-full border border-[#031c45] px-4 text-[13.5px] font-medium text-[#031c45]"
            onClick={() => {
              const name = newField.trim();
              if (!name) return;
              addCustomField(name, "text");
              setNewField("");
              toast.success("Campo customizado criado");
            }}
          >
            <Plus className="size-4" /> Adicionar novo campo customizado
          </button>
        </div>
      </div>

      <button
        type="button"
        className="flex h-11 w-full items-center justify-center rounded-full bg-[#031c45] text-[15px] font-semibold text-white hover:bg-[#003878]"
        onClick={() =>
          (cfg.url ?? "").trim()
            ? toast.success("Requisição HTTP salva")
            : toast.error("Informe a URL")
        }
      >
        Salvar
      </button>
    </div>
  );
}
