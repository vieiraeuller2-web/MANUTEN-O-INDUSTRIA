// Gera um pacote de texto pronto para colar em um agente GPT externo.
// Inclui prompt + dados agregados + amostra de OS, todos derivados dos filtros atuais.

import { type SheetOS } from "@/lib/sheets-api";
import { calcularTempoOS, formatDataBr, normalizarHoraSheets } from "@/lib/time-helpers";

export interface PacoteIAInput {
  filtros: Record<string, string>;
  total: number;
  concluidas: number;
  abertas: number;
  mttr: number | null;
  tempoTotal: number;
  disponibilidade: number | null;
  osPorMes: { name: string; value: number }[];
  osPorTipo: { name: string; value: number }[];
  osPorEquip: { name: string; value: number }[];
  osPorResp: { name: string; value: number }[];
  tempoPorEquip: { name: string; value: number }[];
  corrPrev: { name: string; value: number }[];
  filtered: SheetOS[];
  // Opcionais
  lubrificacaoResumo?: string;
  servicosExternosResumo?: string;
  notasFiscaisResumo?: string;
}

const AMOSTRA_MAX = 60;

const fmtH = (h: number) =>
  Number.isFinite(h) ? `${h.toFixed(1).replace(".", ",")} h` : "—";

const PROMPT = `Você é um analista avançado de dados e relatórios de manutenção industrial.
Gere um relatório gerencial com base nos dados abaixo.
Não invente dados. Use linguagem profissional para diretoria.
Destaque indicadores, problemas críticos, riscos operacionais, oportunidades de melhoria e recomendações práticas.
Estruture em: Resumo Executivo, Indicadores, Análise por Equipamento, Análise por Responsável, Análise Temporal, Riscos e Recomendações.`;

function bloco(titulo: string, linhas: string[]) {
  if (!linhas.length) return `${titulo}:\n  (sem dados)\n`;
  return `${titulo}:\n${linhas.map((l) => `  - ${l}`).join("\n")}\n`;
}

export function gerarPacoteIA(input: PacoteIAInput): string {
  const filtrosTxt =
    Object.entries(input.filtros)
      .filter(([_, v]) => v && v !== "todos")
      .map(([k, v]) => `  - ${k}: ${v}`)
      .join("\n") || "  - nenhum filtro aplicado (dataset completo)";

  const ind = [
    `Total de OS: ${input.total}`,
    `Com tempo calculado: ${input.concluidas}`,
    `Sem data/hora final: ${input.abertas}`,
    `MTTR: ${input.mttr != null ? fmtH(input.mttr) : "—"}`,
    `Tempo total de manutenção: ${fmtH(input.tempoTotal)}`,
    `Disponibilidade estimada: ${input.disponibilidade != null ? input.disponibilidade.toFixed(1).replace(".", ",") + "%" : "—"}`,
  ];

  const amostra = (Array.isArray(input.filtered) ? input.filtered : [])
    .slice(0, AMOSTRA_MAX)
    .map((o, i) =>
      `${i + 1}. [${o.tipo || "—"}] ${o.equipamento || "—"} | ${o.setor || "—"} | ${o.responsavel || "—"} | ` +
      `${formatDataBr(o.data_inicio)} ${normalizarHoraSheets(o.hora_inicio)} → ` +
      `${formatDataBr(o.data_fim)} ${normalizarHoraSheets(o.hora_fim)} | ` +
      `tempo: ${calcularTempoOS(o.data_inicio, o.hora_inicio, o.data_fim, o.hora_fim)} | ` +
      `${String(o.observacoes || "").slice(0, 90).replace(/\s+/g, " ")}`
    );

  const totalFiltrado = Array.isArray(input.filtered) ? input.filtered.length : 0;
  const amostraAviso =
    totalFiltrado > AMOSTRA_MAX
      ? `\n(amostra dos primeiros ${AMOSTRA_MAX} de ${totalFiltrado} registros filtrados)`
      : "";

  return `${PROMPT}

============================================
DADOS PARA RELATÓRIO DE MANUTENÇÃO
============================================

PERÍODO / FILTROS:
${filtrosTxt}

${bloco("INDICADORES", ind)}
${bloco("OS POR TIPO", input.osPorTipo.map((d) => `${d.name}: ${d.value}`))}
${bloco("OS POR MÊS", input.osPorMes.map((d) => `${d.name}: ${d.value}`))}
${bloco("TOP EQUIPAMENTOS", input.osPorEquip.map((d) => `${d.name}: ${d.value} OS`))}
${bloco("TOP RESPONSÁVEIS", input.osPorResp.map((d) => `${d.name}: ${d.value} OS`))}
${bloco("TEMPO TOTAL POR EQUIPAMENTO", input.tempoPorEquip.map((d) => `${d.name}: ${d.value} h`))}
${bloco("CORRETIVA × PREVENTIVA", input.corrPrev.map((d) => `${d.name}: ${d.value}`))}
${input.lubrificacaoResumo ? `LUBRIFICAÇÕES:\n${input.lubrificacaoResumo}\n\n` : ""}${input.servicosExternosResumo ? `SERVIÇOS EXTERNOS:\n${input.servicosExternosResumo}\n\n` : ""}${input.notasFiscaisResumo ? `NOTAS FISCAIS:\n${input.notasFiscaisResumo}\n\n` : ""}AMOSTRA DE ORDENS DE SERVIÇO:${amostraAviso}
${amostra.join("\n") || "  (sem registros)"}
`;
}
