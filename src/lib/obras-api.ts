import { fetchSheet, formatSheetDate, getField, type SheetRow } from "@/lib/sheets-external";
import { normalizeText, safeArray, safeString } from "@/lib/data-helpers";

export const OBRAS_SHEET = "obras";
export const OBRAS_API_URL =
  "https://script.google.com/macros/s/AKfycbzz1dTU7HVTScVtb37rxAqSR7X0OQmUiZcfvePwGkWM2LaKx1JRSwcEDKnRPMJBPxS7mw/exec";

export type ObraStatus = "PROGRAMADA" | "EM ANDAMENTO" | "CONCLUIDA" | "CANCELADA";
export type ObraPrioridade = "BAIXA" | "NORMAL" | "ALTA" | "URGENTE";
export type TipoContagemDias = "UTEIS" | "CORRIDOS" | "INFORMADO";

export interface Obra {
  idObra: string;
  tituloObra: string;
  localizacao: string;
  responsavel: string;
  envolvidos: string;
  qtdEnvolvidos: number;
  prioridade: ObraPrioridade | string;
  statusObra: ObraStatus | string;
  dataProgramadaInicio: string;
  dataProgramadaFim: string;
  dataInicio: string;
  dataFim: string;
  tipoContagemDias: TipoContagemDias | string;
  diasInformados: number | "";
  diasTrabalhados: number;
  materialPrevisto: string;
  materialUtilizado: string;
  observacao: string;
  cadastradoPor: string;
  dataCadastro: string;
  alteradoPor: string;
  dataAlteracao: string;
  ativo: string;
  raw: SheetRow;
}

export type ObraActionPayload = Record<string, string | number | undefined>;

const STATUS_VALUES: ObraStatus[] = ["PROGRAMADA", "EM ANDAMENTO", "CONCLUIDA", "CANCELADA"];

function normalizeEnumText(value: unknown): string {
  return normalizeText(value).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeStatus(value: unknown): ObraStatus | string {
  const normalized = normalizeEnumText(value);
  if (!normalized) return "";
  if (normalized.includes("andamento")) return "EM ANDAMENTO";
  if (normalized.includes("conclu")) return "CONCLUIDA";
  if (normalized.includes("cancel")) return "CANCELADA";
  if (normalized.includes("program")) return "PROGRAMADA";
  const upper = safeString(value).trim().toUpperCase();
  return STATUS_VALUES.includes(upper as ObraStatus) ? (upper as ObraStatus) : upper;
}

export function normalizePrioridade(value: unknown): ObraPrioridade | string {
  const normalized = normalizeEnumText(value);
  if (!normalized) return "";
  if (normalized.includes("urgent")) return "URGENTE";
  if (normalized.includes("alta")) return "ALTA";
  if (normalized.includes("baixa")) return "BAIXA";
  if (normalized.includes("media") || normalized.includes("medio") || normalized.includes("normal")) return "NORMAL";
  return safeString(value).trim().toUpperCase();
}

export function prioridadeLabel(value: unknown): string {
  const prioridade = normalizePrioridade(value);
  if (prioridade === "BAIXA") return "Baixa";
  if (prioridade === "ALTA") return "Alta";
  if (prioridade === "URGENTE") return "Urgente";
  if (prioridade === "NORMAL") return "Normal/Média";
  return safeString(value, "-");
}

export function statusLabel(value: unknown): string {
  const status = normalizeStatus(value);
  if (status === "PROGRAMADA") return "Programada";
  if (status === "EM ANDAMENTO") return "Em andamento";
  if (status === "CONCLUIDA") return "Concluída";
  if (status === "CANCELADA") return "Cancelada";
  return safeString(value, "-");
}

export function parseNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = String(value).replace(/\./g, "").replace(",", ".").trim();
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function countEnvolvidos(value: unknown): number {
  const text = safeString(value);
  if (!text) return 0;
  return text
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean).length;
}

export function formatObraDate(value: unknown): string {
  const text = safeString(value);
  if (!text) return "-";
  return formatSheetDate(text) || text;
}

export function dateInputToBR(value: string): string {
  const text = safeString(value);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return formatSheetDate(text) || text;
}

export function todayInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function sortableDate(value: unknown): number {
  const text = safeString(value);
  if (!text) return 0;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return Number(`${iso[1]}${iso[2]}${iso[3]}`);
  const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return Number(`${br[3]}${br[2].padStart(2, "0")}${br[1].padStart(2, "0")}`);
  return 0;
}

export function monthFromDate(value: unknown): string {
  const text = safeString(value);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[2];
  const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return br[2].padStart(2, "0");
  return "";
}

export function yearFromDate(value: unknown): string {
  const text = safeString(value);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1];
  const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return br[3];
  return "";
}

export function primaryObraDate(obra: Obra): string {
  return obra.dataInicio || obra.dataProgramadaInicio || obra.dataCadastro || obra.dataFim;
}

function rowToObra(row: SheetRow): Obra {
  const envolvidos = getField(row, "ENVOLVIDOS", "envolvidos");
  const qtd = parseNumber(getField(row, "QTD_ENVOLVIDOS", "qtd_envolvidos")) || countEnvolvidos(envolvidos);

  return {
    idObra: getField(row, "ID_OBRA", "id_obra", "ID", "id"),
    tituloObra: getField(row, "TITULO_OBRA", "titulo_obra", "TITULO", "titulo"),
    localizacao: getField(row, "LOCALIZACAO", "localizacao", "LOCALIZAÇÃO"),
    responsavel: getField(row, "RESPONSAVEL", "responsavel", "RESPONSÁVEL"),
    envolvidos,
    qtdEnvolvidos: qtd,
    prioridade: normalizePrioridade(getField(row, "PRIORIDADE", "prioridade")),
    statusObra: normalizeStatus(getField(row, "STATUS_OBRA", "status_obra", "STATUS", "status")),
    dataProgramadaInicio: getField(row, "DATA_PROGRAMADA_INICIO", "data_programada_inicio"),
    dataProgramadaFim: getField(row, "DATA_PROGRAMADA_FIM", "data_programada_fim"),
    dataInicio: getField(row, "DATA_INICIO", "data_inicio"),
    dataFim: getField(row, "DATA_FIM", "data_fim"),
    tipoContagemDias: getField(row, "TIPO_CONTAGEM_DIAS", "tipo_contagem_dias"),
    diasInformados: getField(row, "DIAS_INFORMADOS", "dias_informados")
      ? parseNumber(getField(row, "DIAS_INFORMADOS", "dias_informados"))
      : "",
    diasTrabalhados: parseNumber(getField(row, "DIAS_TRABALHADOS", "dias_trabalhados")),
    materialPrevisto: getField(row, "MATERIAL_PREVISTO", "material_previsto"),
    materialUtilizado: getField(row, "MATERIAL_UTILIZADO", "material_utilizado"),
    observacao: getField(row, "OBSERVACAO", "observacao", "OBSERVAÇÃO"),
    cadastradoPor: getField(row, "CADASTRADO_POR", "cadastrado_por"),
    dataCadastro: getField(row, "DATA_CADASTRO", "data_cadastro"),
    alteradoPor: getField(row, "ALTERADO_POR", "alterado_por"),
    dataAlteracao: getField(row, "DATA_ALTERACAO", "data_alteracao"),
    ativo: getField(row, "ATIVO", "ativo"),
    raw: row,
  };
}

export async function fetchObras(): Promise<Obra[]> {
  const rows = await fetchSheet(OBRAS_SHEET);
  return safeArray<SheetRow>(rows).map(rowToObra);
}

export async function postObraAction(payload: ObraActionPayload): Promise<void> {
  const res = await fetch(OBRAS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let json: Record<string, unknown> | null = null;

  if (text) {
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      json = null;
    }
  }

  if (!res.ok) {
    const message = safeString(json?.error || json?.message, `HTTP ${res.status}`);
    throw new Error(message);
  }

  if (json?.success === false || json?.ok === false || json?.error) {
    throw new Error(safeString(json.error || json.message, "Falha na operação de obra."));
  }
}
