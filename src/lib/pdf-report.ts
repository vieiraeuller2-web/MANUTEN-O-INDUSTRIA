// Gera relatório PDF profissional com KPIs, gráficos simples e tabela resumida.
// Usa jsPDF + jspdf-autotable. Sem dependência de canvas/screenshot.

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { type SheetOS } from "@/lib/sheets-api";
import { calcularTempoOS, formatDataBr, normalizarHoraSheets } from "@/lib/time-helpers";

export interface RelatorioInput {
  filtros: Record<string, string>;
  total: number;
  concluidas: number;
  abertas: number;
  mttr: number | null;
  tempoTotal: number;
  disponibilidade: number | null;
  topTipo: string;
  topEquip: string;
  topResp: string;
  osPorMes: { name: string; value: number }[];
  osPorTipo: { name: string; value: number }[];
  osPorEquip: { name: string; value: number }[];
  osPorResp: { name: string; value: number }[];
  tempoPorEquip: { name: string; value: number }[];
  corrPrev: { name: string; value: number }[];
  filtered: SheetOS[];
}

const COLORS = {
  primary: [139, 42, 42] as [number, number, number],
  text: [30, 30, 30] as [number, number, number],
  muted: [120, 120, 120] as [number, number, number],
  bgCard: [245, 243, 238] as [number, number, number],
  border: [220, 215, 205] as [number, number, number],
  bar: [
    [179, 65, 65],
    [217, 155, 61],
    [61, 168, 107],
    [199, 80, 80],
    [138, 135, 128],
    [61, 151, 173],
  ] as [number, number, number][],
};

const MAX_TABLE_ROWS = 200;

function fmtH(h: number) {
  if (!Number.isFinite(h)) return "—";
  return `${h.toFixed(1).replace(".", ",")} h`;
}

function drawHeader(doc: jsPDF, input: RelatorioInput) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageW, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Relatório de Manutenção", 14, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Indicadores e análise operacional", 14, 20);

  doc.setFontSize(8);
  const dataGer = new Date().toLocaleString("pt-BR");
  doc.text(`Gerado em ${dataGer}`, pageW - 14, 13, { align: "right" });

  const filtrosTxt = Object.entries(input.filtros)
    .filter(([_, v]) => v && v !== "todos")
    .map(([k, v]) => `${k}: ${v}`)
    .join("  |  ") || "Nenhum filtro aplicado";
  doc.setFontSize(8);
  doc.text(filtrosTxt.substring(0, 110), pageW - 14, 20, { align: "right" });
}

function drawKpis(doc: jsPDF, input: RelatorioInput, startY: number): number {
  const items: { label: string; value: string }[] = [
    { label: "Total de OS", value: String(input.total) },
    { label: "Com tempo", value: String(input.concluidas) },
    { label: "Sem tempo", value: String(input.abertas) },
    { label: "MTTR", value: input.mttr != null ? fmtH(input.mttr) : "—" },
    { label: "Tempo total manut.", value: fmtH(input.tempoTotal) },
    { label: "Disponibilidade", value: input.disponibilidade != null ? `${input.disponibilidade.toFixed(1).replace(".", ",")}%` : "—" },
    { label: "Tipo recorrente", value: input.topTipo || "—" },
    { label: "Equip. recorrente", value: input.topEquip || "—" },
    { label: "Resp. mais ativo", value: input.topResp || "—" },
  ];

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const cols = 3;
  const gap = 4;
  const cardW = (pageW - margin * 2 - gap * (cols - 1)) / cols;
  const cardH = 22;

  items.forEach((it, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = margin + col * (cardW + gap);
    const y = startY + row * (cardH + gap);
    doc.setFillColor(...COLORS.bgCard);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD");
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(it.label.toUpperCase(), x + 4, y + 6);
    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const val = String(it.value);
    doc.text(val.length > 24 ? val.slice(0, 23) + "…" : val, x + 4, y + 16);
  });

  const rows = Math.ceil(items.length / cols);
  return startY + rows * (cardH + gap) + 4;
}

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setDrawColor(...COLORS.primary);
  doc.setFillColor(...COLORS.primary);
  doc.rect(14, y, 2.5, 6, "F");
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, 19, y + 5);
  return y + 10;
}

function drawHBarChart(
  doc: jsPDF,
  title: string,
  data: { name: string; value: number }[],
  x: number,
  y: number,
  w: number,
  h: number,
  colorIdx = 0,
  valueSuffix = ""
) {
  doc.setFillColor(...COLORS.bgCard);
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(title, x + 4, y + 6);

  if (!data.length) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text("Sem dados", x + w / 2, y + h / 2, { align: "center" });
    return;
  }

  const items = data.slice(0, 6);
  const max = Math.max(...items.map((d) => d.value), 1);
  const labelW = 38;
  const innerX = x + 4 + labelW;
  const innerW = w - 8 - labelW - 18;
  const startY = y + 10;
  const rowH = (h - 14) / items.length;
  const barH = Math.min(rowH - 2, 7);
  const color = COLORS.bar[colorIdx % COLORS.bar.length];

  items.forEach((it, i) => {
    const rowY = startY + i * rowH + rowH / 2;
    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    const name = String(it.name);
    doc.text(name.length > 18 ? name.slice(0, 17) + "…" : name, x + 4, rowY + 1.5);
    const bw = Math.max(2, (it.value / max) * innerW);
    doc.setFillColor(...color);
    doc.roundedRect(innerX, rowY - barH / 2, bw, barH, 1, 1, "F");
    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(`${it.value}${valueSuffix}`, innerX + bw + 2, rowY + 1.5);
  });
}

function drawVBarChart(
  doc: jsPDF,
  title: string,
  data: { name: string; value: number }[],
  x: number,
  y: number,
  w: number,
  h: number,
  colorIdx = 0
) {
  doc.setFillColor(...COLORS.bgCard);
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(title, x + 4, y + 6);

  if (!data.length) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text("Sem dados", x + w / 2, y + h / 2, { align: "center" });
    return;
  }

  const items = data.slice(0, 12);
  const max = Math.max(...items.map((d) => d.value), 1);
  const padL = 4;
  const padR = 4;
  const innerW = w - padL - padR;
  const top = y + 12;
  const bottom = y + h - 12;
  const innerH = bottom - top;
  const slot = innerW / items.length;
  const barW = Math.min(slot - 4, 14);
  const color = COLORS.bar[colorIdx % COLORS.bar.length];

  items.forEach((it, i) => {
    const bh = (it.value / max) * innerH;
    const cx = x + padL + slot * i + slot / 2;
    const by = bottom - bh;
    doc.setFillColor(...color);
    doc.roundedRect(cx - barW / 2, by, barW, bh, 1, 1, "F");
    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(String(it.value), cx, by - 1.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.muted);
    const lbl = String(it.name);
    doc.text(lbl.length > 8 ? lbl.slice(0, 7) + "…" : lbl, cx, bottom + 4, { align: "center" });
  });
}

export function gerarPdfRelatorio(input: RelatorioInput, fileName = "relatorio-manutencao.pdf") {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();

  drawHeader(doc, input);
  let y = 36;

  y = drawSectionTitle(doc, "Indicadores", y);
  y = drawKpis(doc, input, y);

  y = drawSectionTitle(doc, "Gráficos", y);
  const margin = 14;
  const colW = (pageW - margin * 2 - 4) / 2;
  const chartH = 48;

  drawVBarChart(doc, "OS por mês", input.osPorMes, margin, y, colW, chartH, 0);
  drawHBarChart(doc, "OS por tipo", input.osPorTipo, margin + colW + 4, y, colW, chartH, 1);
  y += chartH + 4;

  drawHBarChart(doc, "Top 5 equipamentos", input.osPorEquip, margin, y, colW, chartH, 2);
  drawHBarChart(doc, "Top 5 responsáveis", input.osPorResp, margin + colW + 4, y, colW, chartH, 3);
  y += chartH + 4;

  drawHBarChart(doc, "Tempo total por equip. (h)", input.tempoPorEquip, margin, y, colW, chartH, 5, "h");
  drawHBarChart(doc, "Corretiva × Preventiva", input.corrPrev, margin + colW + 4, y, colW, chartH, 0);
  y += chartH + 6;

  if (y > 250) {
    doc.addPage();
    y = 16;
  }
  y = drawSectionTitle(doc, "Registros detalhados", y);

  const allRows = Array.isArray(input.filtered) ? input.filtered : [];
  const limited = allRows.slice(0, MAX_TABLE_ROWS);
  if (allRows.length > MAX_TABLE_ROWS) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      `Relatório filtrado possui ${allRows.length} registros. A tabela exibe os primeiros ${MAX_TABLE_ROWS}.`,
      margin,
      y,
    );
    y += 5;
  }

  autoTable(doc, {
    startY: y,
    head: [["Equipamento", "Setor", "Resp.", "Tipo", "Início", "Fim", "Tempo", "Descrição"]],
    body: limited.map((o) => [
      String(o.equipamento ?? ""),
      String(o.setor ?? ""),
      String(o.responsavel ?? ""),
      String(o.tipo ?? ""),
      `${formatDataBr(o.data_inicio)} ${normalizarHoraSheets(o.hora_inicio)}`,
      `${formatDataBr(o.data_fim)} ${normalizarHoraSheets(o.hora_fim)}`,
      calcularTempoOS(o.data_inicio, o.hora_inicio, o.data_fim, o.hora_fim),
      String(o.descricao ?? "").slice(0, 60),
    ]),
    styles: { fontSize: 7, cellPadding: 1.5, textColor: COLORS.text, lineColor: COLORS.border },
    headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
    alternateRowStyles: { fillColor: [250, 248, 244] },
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 18 },
      2: { cellWidth: 20 },
      3: { cellWidth: 18 },
      4: { cellWidth: 22 },
      5: { cellWidth: 22 },
      6: { cellWidth: 16 },
      7: { cellWidth: "auto" },
    },
    didDrawPage: () => {
      const pageNum = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.muted);
      doc.text(`Página ${pageNum}`, pageW - 14, doc.internal.pageSize.getHeight() - 6, { align: "right" });
    },
  });

  doc.save(fileName);
}
