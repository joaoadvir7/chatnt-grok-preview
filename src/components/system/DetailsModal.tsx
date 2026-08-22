import { Copy, X } from "lucide-react";
import { toast } from "sonner";
import type { SystemRecord } from "@/lib/system-record";

function jsLiteral(value: unknown) {
  if (value === null) return { text: "null", kind: "null" as const };
  if (typeof value === "string") return { text: `"${value}"`, kind: "str" as const };
  if (typeof value === "number" || typeof value === "boolean") {
    return { text: String(value), kind: "num" as const };
  }
  return { text: JSON.stringify(value), kind: "str" as const };
}

export function DetailsModal({
  title = "Detalhes",
  record,
  onClose,
}: {
  title?: string;
  record: SystemRecord;
  onClose: () => void;
}) {
  const entries = Object.entries(record);
  const raw = `{\n${entries
    .map(([k, v]) => `  ${k}: ${jsLiteral(v).text},`)
    .join("\n")}\n}`;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[560px] overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#1c1c1c] text-[#e8e8e8] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-[#e11d48] text-white hover:bg-[#be123c]"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X className="size-4" />
        </button>
        <div className="flex items-center justify-between px-5 pt-4 pb-2 pr-14">
          <p className="text-[13px] font-medium text-[#9ca3af]">{title}</p>
          <button
            type="button"
            className="flex items-center gap-1 text-[12px] text-[#9ca3af] hover:text-white"
            onClick={() => {
              void navigator.clipboard.writeText(raw);
              toast.success("Copiado");
            }}
          >
            <Copy className="size-3.5" /> Copiar
          </button>
        </div>
        <pre className="max-h-[min(70vh,520px)] overflow-auto px-5 pb-5 font-mono text-[14px] leading-7">
          <span className="text-[#c4c4c4]">{"{"}</span>
          {"\n"}
          {entries.map(([key, value]) => {
            const lit = jsLiteral(value);
            return (
              <span key={key}>
                {"  "}
                <span className="text-[#e5e7eb]">{key}</span>
                <span className="text-[#9ca3af]">: </span>
                <span
                  className={
                    lit.kind === "str"
                      ? "text-[#b7f07a]"
                      : lit.kind === "null"
                        ? "text-[#9ca3af]"
                        : "text-[#93c5fd]"
                  }
                >
                  {lit.text}
                </span>
                <span className="text-[#6b7280]">,</span>
                {"\n"}
              </span>
            );
          })}
          <span className="text-[#c4c4c4]">{"}"}</span>
        </pre>
      </div>
    </div>
  );
}
