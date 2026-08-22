import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { LiveReport } from "./live-report";
import { fmtBR, REPORT_META } from "./report-seed";

/** Paleta ChatNT (logo azul + amarelo) */
const C = {
  navyDeep: [22, 58, 134] as [number, number, number],
  navy: [30, 72, 160] as [number, number, number],
  gold: [245, 196, 0] as [number, number, number],
  ink: [26, 39, 68] as [number, number, number],
  muted: [90, 103, 128] as [number, number, number],
  line: [213, 222, 232] as [number, number, number],
  soft: [232, 238, 248] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

function drawHeaderBar(doc: jsPDF, pageW: number, title: string, generatedAt: string) {
  doc.setFillColor(...C.navyDeep);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setFillColor(...C.gold);
  doc.rect(0, 28, pageW, 2.5, "F");
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("ChatNT  ·  Escola Bíblica Novo Tempo", 14, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 200, 220);
  doc.text(title, 14, 20);
  doc.text(`Gerado: ${generatedAt}`, pageW - 14, 12, {
    align: "right",
  });
  doc.text("Jornada de atendimento de ponta a ponta", pageW - 14, 20, {
    align: "right",
  });
}

function drawFooter(doc: jsPDF, pageW: number, pageH: number, page: number, total: number) {
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.3);
  doc.line(14, pageH - 12, pageW - 14, pageH - 12);
  doc.setFontSize(7);
  doc.setTextColor(...C.muted);
  doc.text(
    "Dashboard Central · ChatNT · Escola Bíblica Novo Tempo",
    14,
    pageH - 7,
  );
  doc.text(`Página ${page} de ${total}`, pageW - 14, pageH - 7, {
    align: "right",
  });
}

/**
 * Gera e baixa o PDF do relatório consolidado semanal (estilo ChatNT).
 */
export async function downloadConsolidadoPdf(opts?: {
  live?: LiveReport;
  title?: string;
}) {
  const live = opts?.live;
  const title = opts?.title ?? REPORT_META.title;
  const generatedAt = live?.generatedAt ?? new Date().toLocaleString("pt-BR");
  const header = live?.header ?? {
    baseTotal: 0,
    estudando: 0,
    visitas: 0,
    estudos: 0,
    leadsMkt: 0,
  };
  const distribution = live?.distribution ?? [];
  const metrics = live?.metrics ?? [];
  const campos = live?.campos ?? [];
  const niveis = live?.niveis ?? { bronze: 0, prata: 0, ouro: 0, diamante: 0 };

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  drawHeaderBar(doc, pageW, title, generatedAt);

  doc.setFillColor(...C.navy);
  doc.roundedRect(14, 38, pageW - 28, 32, 3, 3, "F");
  doc.setFillColor(...C.gold);
  doc.roundedRect(14, 38, 3, 32, 1.5, 1.5, "F");

  doc.setTextColor(...C.white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("BASE AO VIVO", 22, 48);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(fmtBR(header.baseTotal), 22, 58);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(180, 210, 255);
  doc.text(
    `${campos.length} campos · etiquetas dos contatos`,
    22,
    64,
  );

  const kpis = [
    { label: "ESTUDANDO", value: header.estudando },
    { label: "VISITAS ACEITAS", value: header.visitas },
    { label: "ESTUDOS ACEITOS", value: header.estudos },
    { label: "LEADS MKT", value: header.leadsMkt },
  ];
  kpis.forEach((k, i) => {
    const x = 95 + i * 48;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...C.gold);
    doc.text(fmtBR(k.value), x, 54);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(200, 220, 240);
    doc.text(k.label, x, 61);
  });

  doc.setTextColor(...C.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Distribuição da base", 14, 82);

  autoTable(doc, {
    startY: 86,
    margin: { left: 14, right: pageW / 2 + 4 },
    head: [["Status", "Alunos", "%"]],
    body: distribution.map((s) => [
      s.label,
      fmtBR(s.value),
      `${s.pct.toFixed(1)}%`,
    ]),
    theme: "plain",
    headStyles: {
      fillColor: C.navyDeep,
      textColor: C.white,
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: { fontSize: 8, textColor: C.ink },
    alternateRowStyles: { fillColor: C.soft },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
    },
  });

  const metricsStartY = 86;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...C.ink);
  doc.text("Métricas por etiqueta", pageW / 2 + 8, metricsStartY - 4);

  autoTable(doc, {
    startY: metricsStartY,
    margin: { left: pageW / 2 + 8, right: 14 },
    head: [["Métrica", "Valor", "Tag"]],
    body: metrics.map((m) => [m.label, fmtBR(m.value), m.tag]),
    theme: "plain",
    headStyles: {
      fillColor: C.navy,
      textColor: C.white,
      fontSize: 7.5,
      fontStyle: "bold",
    },
    bodyStyles: { fontSize: 7.5, textColor: C.ink },
    alternateRowStyles: { fillColor: C.soft },
    columnStyles: {
      1: { halign: "right", fontStyle: "bold" },
    },
  });

  // Níveis
  let y =
    Math.max(
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY,
      150,
    ) + 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...C.ink);
  doc.text("Níveis dos alunos — consolidado", 14, y);
  y += 6;

  const nivelCards = [
    { t: "Bronze", v: niveis.bronze, fill: [205, 127, 50] as [number, number, number] },
    { t: "Prata", v: niveis.prata, fill: [148, 163, 184] as [number, number, number] },
    { t: "Ouro", v: niveis.ouro, fill: [234, 179, 8] as [number, number, number] },
    { t: "Diamante", v: niveis.diamante, fill: [56, 189, 248] as [number, number, number] },
  ];
  const cardW = (pageW - 28 - 12) / 4;
  nivelCards.forEach((n, i) => {
    const x = 14 + i * (cardW + 4);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...n.fill);
    doc.setLineWidth(0.6);
    doc.roundedRect(x, y, cardW, 22, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text(n.t.toUpperCase(), x + cardW / 2, y + 8, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...C.navyDeep);
    doc.text(fmtBR(n.v), x + cardW / 2, y + 17, { align: "center" });
  });

  y += 30;
  const naoAtend = metrics.find((m) => m.id === "nao_enc" || m.tag === "Não Localizado")?.value ?? 0;
  doc.setFillColor(...C.soft);
  doc.setDrawColor(...C.gold);
  doc.roundedRect(14, y, pageW - 28, 12, 2, 2, "FD");
  doc.setFontSize(8);
  doc.setTextColor(...C.ink);
  doc.text(
    `${fmtBR(header.baseTotal)} alunos no escopo  ·  Gerado ${generatedAt}  ·  Fonte: etiquetas dos contatos`,
    18,
    y + 7.5,
  );

  doc.addPage();
  drawHeaderBar(doc, pageW, title, generatedAt);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...C.ink);
  doc.text("Acompanhamento por campo", 14, 40);

  autoTable(doc, {
    startY: 44,
    margin: { left: 10, right: 10 },
    head: [
      [
        "Campo",
        "União",
        "Base",
        "Quentes",
        "Frios",
        "Não loc.",
        "MKT",
        "Visitas",
        "Estudos",
        "Não atend.",
        "Br",
        "Pr",
        "Ou",
        "Di",
      ],
    ],
    body: [
      ...campos.map((c) => [
        c.campo,
        c.uniao,
        fmtBR(c.base),
        fmtBR(c.quentes),
        fmtBR(c.frios),
        fmtBR(c.naoLoc),
        fmtBR(c.trafPago),
        fmtBR(c.visitas),
        fmtBR(c.estudos),
        c.naoAtend ? fmtBR(c.naoAtend) : "—",
        c.bronze || "·",
        c.prata || "·",
        c.ouro || "·",
        c.diamante || "·",
      ]),
      [
        live?.total.campo ?? "TOTAL",
        live?.total.uniao ?? "—",
        fmtBR(live?.total.base ?? 0),
        fmtBR(live?.total.quentes ?? 0),
        fmtBR(live?.total.frios ?? 0),
        fmtBR(live?.total.naoLoc ?? 0),
        fmtBR(live?.total.trafPago ?? 0),
        fmtBR(live?.total.visitas ?? 0),
        fmtBR(live?.total.estudos ?? 0),
        "—",
        String(live?.total.bronze ?? 0),
        String(live?.total.prata ?? 0),
        String(live?.total.ouro ?? 0),
        String(live?.total.diamante ?? 0),
      ],
    ],
    theme: "striped",
    styles: { fontSize: 6.5, cellPadding: 1.4, textColor: C.ink },
    headStyles: {
      fillColor: C.navyDeep,
      textColor: C.white,
      fontSize: 6.5,
      fontStyle: "bold",
      halign: "center",
    },
    alternateRowStyles: { fillColor: C.soft },
    columnStyles: {
      0: { fontStyle: "bold", halign: "left" },
      2: { halign: "right" },
      3: { halign: "right", textColor: C.navy },
      4: { halign: "right" },
      5: {halign: "right" },
      6: {halign: "right" },
      7: {halign: "right" },
      8: {halign: "right" },
      9: {halign: "right" },
      10: {halign: "center" },
      11: {halign: "center" },
      12: {halign: "center" },
      13: {halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index === campos.length) {
        data.cell.styles.fillColor = C.navyDeep;
        data.cell.styles.textColor = C.white;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  doc.addPage();
  drawHeaderBar(doc, pageW, title, generatedAt);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...C.ink);
  doc.text("Etiquetas mais usadas", 14, 40);

  autoTable(doc, {
    startY: 44,
    margin: { left: 14, right: 14 },
    head: [["#", "Etiqueta", "Alunos"]],
    body: (live?.tagRank ?? []).map((m, i) => [
      String(i + 1),
      m.name,
      fmtBR(m.qty),
    ]),
    theme: "plain",
    headStyles: {
      fillColor: C.navy,
      textColor: C.white,
      fontSize: 9,
      fontStyle: "bold",
    },
    bodyStyles: { fontSize: 9, textColor: C.ink },
    alternateRowStyles: { fillColor: C.soft },
    columnStyles: {
      0: { cellWidth: 12, halign: "center", fontStyle: "bold" },
      2: { halign: "right", fontStyle: "bold", cellWidth: 35 },
    },
  });

  const finalY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 12;
  doc.setFillColor(...C.navyDeep);
  doc.roundedRect(14, finalY, pageW - 28, 22, 2, 2, "F");
  doc.setFillColor(...C.gold);
  doc.roundedRect(14, finalY, 3, 22, 1, 1, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Como ler este relatório no ChatNT", 22, finalY + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(200, 220, 240);
  doc.text(
    "Cada métrica vem das etiquetas aplicadas nos contatos (Estudando, Visita Aceita, Estudo Aceito…). A regional vê só o seu território; a Central consolida e pode filtrar por união.",
    22,
    finalY + 15,
    { maxWidth: pageW - 44 },
  );

  // Footers em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, pageW, pageH, i, totalPages);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`ChatNT-Relatorio-Consolidado-${stamp}.pdf`);
}
