import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { Contact } from "./types";
import { formatPhone } from "./utils";

export type VisitLabel = {
  contactId: string;
  name: string;
  phone: string;
  distrito: string;
  endereco: string;
  dataSolicitacao: string;
  dataAgendamento: string;
  materiais: string;
  solicitacao: string;
  campo: string;
  cidade: string;
  agentName: string;
};

function cf(contact: Contact, id: string) {
  return (contact.customFields?.[id] ?? "").trim();
}

function fmtDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR");
}

export function buildVisitLabel(
  contact: Contact,
  extra?: { agentName?: string },
): VisitLabel {
  const endereco = [cf(contact, "cf12"), cf(contact, "cf11"), cf(contact, "cf10")]
    .filter(Boolean)
    .join(" · ");
  const materiais = [cf(contact, "cf16"), cf(contact, "cf14")]
    .filter(Boolean)
    .join(" · ");
  const notes = (contact.notes ?? [])
    .slice(-2)
    .map((n) => n.text)
    .join(" · ");
  return {
    contactId: contact.id,
    name: contact.name,
    phone: formatPhone(contact.phone),
    distrito: cf(contact, "cf1") || cf(contact, "cf11") || "Sem distrito",
    endereco: endereco || "—",
    dataSolicitacao: fmtDate(cf(contact, "cf4") || contact.createdAt),
    dataAgendamento: fmtDate(cf(contact, "cf17")),
    materiais: materiais || "—",
    solicitacao: cf(contact, "cf22") || notes || "—",
    campo: cf(contact, "cf5"),
    cidade: cf(contact, "cf10") || cf(contact, "cf1") || "",
    agentName: extra?.agentName ?? "",
  };
}

export function greetingNow() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function entregaMessage(opts: {
  studentName: string;
  agentName: string;
  city: string;
}) {
  const oi = greetingNow();
  const aluno = opts.studentName.trim() || "tudo bem";
  const agente = opts.agentName.trim() || "agente";
  const cidade = opts.city.trim();
  const onde = cidade ? `, aqui em ${cidade}` : "";
  return `${oi}, ${aluno}! Sou ${agente}, agente da Novo Tempo${onde}. Fiquei responsável de entregar seu material. Qual o melhor dia e horário para fazer a entrega?`;
}

export function entregaPageUrl(label: VisitLabel) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const q = new URLSearchParams();
  q.set("n", label.name);
  q.set("p", label.phone.replace(/\D/g, ""));
  if (label.cidade) q.set("c", label.cidade);
  if (label.agentName) q.set("a", label.agentName);
  return `${origin}/e?${q.toString()}`;
}

export function waMeUrl(phone: string, text?: string) {
  const d = phone.replace(/\D/g, "");
  if (!d) return "";
  const base = `https://wa.me/${d}`;
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}

export async function qrDataUrl(text: string) {
  if (!text) return "";
  return qrWithNtLogo(text);
}

async function loadLogo(): Promise<HTMLImageElement | null> {
  const srcs = ["/nt-logo-qr.png", "/chatnt-logo.png", "/chatnt-mark.png"];
  for (const src of srcs) {
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.crossOrigin = "anonymous";
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("fail"));
        el.src = src;
      });
      return img;
    } catch {
      /* tenta o próximo */
    }
  }
  return null;
}

export async function qrWithNtLogo(text: string) {
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, text, {
    width: 280,
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: "#082b5e", light: "#ffffff" },
  });
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.toDataURL("image/png");
  const logo = await loadLogo();
  if (logo) {
    const size = canvas.width * 0.26;
    const pad = size * 0.12;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2 + pad, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(logo, cx - size / 2, cy - size / 2, size, size);
  }
  return canvas.toDataURL("image/png");
}

export function groupLabelsByDistrito(labels: VisitLabel[]) {
  const map = new Map<string, VisitLabel[]>();
  for (const l of labels) {
    const key = l.distrito || "Sem distrito";
    const arr = map.get(key) ?? [];
    arr.push(l);
    map.set(key, arr);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
}

/** 6 por folha A4 (2×3). Distrito não mistura com outro na mesma folha. */
export async function downloadLabelsPdf(labels: VisitLabel[], material: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const marginX = 7;
  const marginY = 8;
  const gapX = 4;
  const gapY = 4;
  const cols = 2;
  const rows = 3;
  const cardW = (pageW - marginX * 2 - gapX) / cols;
  const cardH = (pageH - marginY * 2 - gapY * 2) / rows;

  const qrs = new Map<string, string>();
  await Promise.all(
    labels.map(async (l) => {
      const url = waMeUrl(l.phone);
      if (url) qrs.set(l.contactId, await qrDataUrl(url));
    }),
  );

  const groups = groupLabelsByDistrito(labels);
  let firstPage = true;

  for (const [, group] of groups) {
    const pages = Math.max(1, Math.ceil(group.length / 6));
    for (let p = 0; p < pages; p++) {
      if (!firstPage) doc.addPage();
      firstPage = false;
      for (let slot = 0; slot < 6; slot++) {
        const label = group[p * 6 + slot];
        const col = slot % cols;
        const row = Math.floor(slot / cols);
        const x = marginX + col * (cardW + gapX);
        const y = marginY + row * (cardH + gapY);
        if (label) drawLabel(doc, x, y, cardW, cardH, label, material, qrs.get(label.contactId) ?? "");
        else drawEmpty(doc, x, y, cardW, cardH);
      }
    }
  }

  doc.save("etiquetas-visita.pdf");
}

function drawEmpty(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setDrawColor(210, 218, 228);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([1.2, 1.2], 0);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, "S");
  doc.setLineDashPattern([], 0);
}

function drawLabel(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  l: VisitLabel,
  material: string,
  qr: string,
) {
  doc.setDrawColor(8, 43, 94);
  doc.setLineWidth(0.45);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, "S");
  doc.setFillColor(8, 43, 94);
  doc.rect(x, y, 1.6, h, "F");

  const pad = 4;
  const qrSize = 20;
  const textW = w - qrSize - 12;
  let cy = y + 7;

  const title = `${l.distrito} · ${l.name}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(8, 43, 94);
  const nameLines = doc.splitTextToSize(title, textW);
  doc.text(nameLines.slice(0, 2), x + pad + 1, cy);

  if (qr) {
    doc.addImage(qr, "PNG", x + w - qrSize - 3.5, y + 4, qrSize, qrSize);
  }

  cy += nameLines.length > 1 ? 11 : 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(90, 110, 130);
  doc.text("ENDEREÇO", x + pad + 1, cy);
  cy += 4.4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(8, 43, 94);
  const addr = doc.splitTextToSize(l.endereco, textW);
  doc.text(addr.slice(0, 2), x + pad + 1, cy);
  cy += Math.min(addr.length, 2) * 4.4 + 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(90, 110, 130);
  doc.text("WHATSAPP", x + pad + 1, cy);
  cy += 4.4;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(8, 43, 94);
  doc.text(l.phone, x + pad + 1, cy);
  cy += 6;

  const footerReserve =
    (material.trim() ? 16 : 0) +
    (l.dataAgendamento && l.dataAgendamento !== "—" ? 6 : 0) +
    6;
  const materialsBottom = y + h - 2 - footerReserve;

  if (cy + 8 < materialsBottom) {
    const boxTop = cy - 3.5;
    const maxBoxH = materialsBottom - boxTop;
    const innerW = w - 12;
    const headerH = 5;
    let size = 11;
    let lines: string[] = [];
    let lineH = 4.4;
    while (size >= 6) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(size);
      lines = doc.splitTextToSize(l.materiais, innerW);
      lineH = size * 0.4;
      const need = headerH + lines.length * lineH + 3;
      if (need <= maxBoxH) break;
      size -= 0.5;
    }
    const boxH = Math.min(maxBoxH, headerH + lines.length * lineH + 3);
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(x + 3, boxTop, w - 6, boxH, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 64, 175);
    doc.text("Materiais já solicitados pelo aluno", x + 5, cy);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(30, 40, 70);
    doc.text(lines, x + 5, cy + headerH);
    cy = boxTop + boxH + 4;
  }

  if (material.trim()) {
    const title = "Material a entregar ou solicitações nessa visita:";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 60, 40);
    const titleLines = doc.splitTextToSize(title, w - 12);
    doc.setFont("helvetica", "normal");
    const bodyLines = doc.splitTextToSize(material, w - 12);
    const boxH = 4 + (titleLines.length + Math.min(bodyLines.length, 3)) * 4.6;
    doc.setFillColor(232, 245, 233);
    doc.roundedRect(x + 3, cy - 3.5, w - 6, boxH, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.text(titleLines, x + 5, cy);
    doc.setFont("helvetica", "normal");
    doc.text(bodyLines.slice(0, 3), x + 5, cy + titleLines.length * 4.6);
    cy += boxH + 2;
  }

  if (l.dataAgendamento && l.dataAgendamento !== "—") {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(8, 43, 94);
    doc.text(`Agendado em ${l.dataAgendamento}`, x + pad + 1, cy);
    cy += 5;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(140, 155, 170);
  doc.text(`Solicitado em ${l.dataSolicitacao}`, x + pad + 1, y + h - 3.5);
}
