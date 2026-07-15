// Cliente para a planilha de OS via edge function `sheets-proxy`.
// Faz a normalização entre o formato bruto da planilha
// (array de arrays com cabeçalhos PT-BR) e os campos usados no app.

import { supabase } from "@/integrations/supabase/client";
import { normalizarHoraSheets } from "@/lib/time-helpers";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const FN_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/sheets-proxy`;
const API_URL =
  "https://script.google.com/macros/s/AKfycbzz1dTU7HVTScVtb37rxAqSR7X0OQmUiZcfvePwGkWM2LaKx1JRSwcEDKnRPMJBPxS7mw/exec";
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function authHeaders() {
  if (!PROJECT_ID || !ANON_KEY) {
    throw new Error("Configuração do Supabase ausente. Verifique VITE_SUPABASE_PROJECT_ID e VITE_SUPABASE_PUBLISHABLE_KEY.");
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? ANON_KEY;
  return {
    "Content-Type": "application/json",
    apikey: ANON_KEY,
    Authorization: `Bearer ${token}`,
  };
}

export interface SheetOS {
  equipamento: string;
  setor: string;
  area: string;
  responsavel: string;
  tipo: string;
  data_inicio: string;
  hora_inicio: string;
  data_fim: string;
  hora_fim: string;
  horimetro: string | number;
  observacoes: string;
  [key: string]: any;
}

export interface CreateOSPayload {
  action: "registrar_os";
  equipamento: string;
  setor: string;
  area: string;
  responsavel: string;
  tipo: string;
  data_inicio: string;
  hora_inicio: string;
  data_conclusao: string;
  hora_conclusao: string;
  horimetro: string;
  observacoes: string;
}

export interface SaveOSFormData {
  equipamento?: unknown;
  tagEquipamento?: unknown;
  tag_equipamento?: unknown;
  tag?: unknown;
  setor?: unknown;
  area?: unknown;
  modalidade?: unknown;
  especialidade?: unknown;
  responsavel?: unknown;
  responsavelTecnico?: unknown;
  tecnico?: unknown;
  tipo?: unknown;
  tipoOs?: unknown;
  tipo_os?: unknown;
  dataInicio?: unknown;
  data_inicio?: unknown;
  horaInicio?: unknown;
  hora_inicio?: unknown;
  dataConclusao?: unknown;
  data_conclusao?: unknown;
  horaConclusao?: unknown;
  hora_conclusao?: unknown;
  horimetro?: unknown;
  observacoes?: unknown;
  observacao?: unknown;
  obs?: unknown;
}


// Mapeia nomes de coluna da planilha -> campos do app
const HEADER_MAP: Record<string, keyof SheetOS> = {
  equipamento: "equipamento",
  setor: "setor",
  area: "area",
  "área": "area",
  responsavel: "responsavel",
  "responsável": "responsavel",
  tipo: "tipo",
  data_inicio: "data_inicio",
  "data início": "data_inicio",
  "data inicio": "data_inicio",
  hora_inicio: "hora_inicio",
  "hora início": "hora_inicio",
  "hora inicio": "hora_inicio",
  data_fim: "data_fim",
  "data fim": "data_fim",
  "data conclusão": "data_fim",
  "data conclusao": "data_fim",
  hora_fim: "hora_fim",
  "hora fim": "hora_fim",
  "hora conclusão": "hora_fim",
  "hora conclusao": "hora_fim",
  horimetro: "horimetro",
  "horímetro": "horimetro",
  "observações": "observacoes",
  observacoes: "observacoes",
};

function normalizeKey(k: string): keyof SheetOS | null {
  if (!k) return null;
  const lower = String(k).trim().toLowerCase();
  return HEADER_MAP[lower] ?? null;
}

function normalizeDate(v: any): string {
  if (v == null || v === "") return "";
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // DD/MM/YYYY ou D/M/YYYY
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) {
    const d = br[1].padStart(2, "0");
    const m = br[2].padStart(2, "0");
    return `${br[3]}-${m}-${d}`;
  }
  return s;
}

function normalizeTime(v: any): string {
  if (v == null || v === "") return "";
  const hora = normalizarHoraSheets(v);
  return hora === "—" ? "" : hora;
}

function getRawValue(row: any, header: string, normalized?: keyof SheetOS) {
  if (!row || typeof row !== "object") return undefined;
  if (header in row) return row[header];
  if (normalized && normalized in row) return row[normalized];
  const lowerHeader = header.toLowerCase();
  const normalizedLower = normalized ? String(normalized).toLowerCase() : "";
  const found = Object.keys(row).find((k) => {
    const lk = k.toLowerCase();
    return lk === lowerHeader || (!!normalizedLower && lk === normalizedLower);
  });
  return found ? row[found] : undefined;
}

function rowToOS(row: any[], headerKeys: (keyof SheetOS | null)[]): SheetOS {
  const obj: SheetOS = {
    equipamento: "", setor: "", area: "", responsavel: "", tipo: "",
    data_inicio: "", hora_inicio: "", data_fim: "", hora_fim: "",
    horimetro: "", observacoes: "",
  };
  headerKeys.forEach((key, i) => {
    if (!key) return;
    const raw = row[i];
    if (raw == null || raw === "") return;
    if (key === "data_inicio" || key === "data_fim") {
      obj[key] = normalizeDate(raw);
    } else if (key === "hora_inicio" || key === "hora_fim") {
      obj[key] = normalizeTime(raw);
    } else if (key === "horimetro") {
      obj[key] = typeof raw === "number" ? raw : Number(raw) || raw;
    } else {
      (obj as any)[key] = String(raw);
    }
  });
  return obj;
}

function parseSheetResponse(data: any): SheetOS[] {
  // Erro controlado vindo do proxy (ex.: Apps Script sem doGet/doPost)
  if (data?.ok === false || (data?.error && !data?.rows && !data?.data && !data?.values)) {
    throw new Error(String(data.error || "Não foi possível carregar os dados."));
  }

  // Caso 1: array de arrays (o que sua planilha devolve)
  if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
    const headerKeys = (data[0] as string[]).map(normalizeKey);
    return (data.slice(1) as any[][]).map((r) => rowToOS(r, headerKeys));
  }
  // Caso 2: array de objetos
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
    return data.map((row: any) => {
      const safeRow = row && typeof row === "object" ? row : {};
      const os: SheetOS = {
        equipamento: String(getRawValue(safeRow, "Equipamento", "equipamento") ?? ""),
        setor: String(getRawValue(safeRow, "Setor", "setor") ?? ""),
        area: String(getRawValue(safeRow, "Área", "area") ?? ""),
        responsavel: String(getRawValue(safeRow, "Responsável", "responsavel") ?? ""),
        tipo: String(getRawValue(safeRow, "Tipo", "tipo") ?? ""),
        data_inicio: normalizeDate(getRawValue(safeRow, "Data Início", "data_inicio")),
        hora_inicio: normalizeTime(getRawValue(safeRow, "Hora Início", "hora_inicio")),
        data_fim: normalizeDate(getRawValue(safeRow, "Data Conclusão", "data_fim") ?? getRawValue(safeRow, "Data Fim", "data_fim")),
        hora_fim: normalizeTime(getRawValue(safeRow, "Hora Conclusão", "hora_fim") ?? getRawValue(safeRow, "Hora Fim", "hora_fim")),
        horimetro: getRawValue(safeRow, "Horímetro", "horimetro") ?? "",
        observacoes: String(getRawValue(safeRow, "Observações", "observacoes") ?? ""),
      };
      Object.entries(safeRow).forEach(([k, v]) => {
        if (!(k in os)) (os as any)[k] = v;
      });
      return os;
    });
  }
  // Caso 3: { rows: [...] } / { data: [...] }
  if (data?.rows) return parseSheetResponse(data.rows);
  if (data?.data) return parseSheetResponse(data.data);
  if (data?.values) return parseSheetResponse(data.values);
  return [];
}

export async function fetchOSFromSheet(): Promise<SheetOS[]> {
  const res = await fetch(FN_URL, { method: "GET", headers: await authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Não foi possível carregar os dados.");
  }
  const data = await res.json();
  return parseSheetResponse(data);
}

export async function createOSInSheet(formData: SaveOSFormData) {
  const payload: CreateOSPayload = {
    action: "registrar_os",
    equipamento: String(
      formData.equipamento ||
      formData.tagEquipamento ||
      formData.tag_equipamento ||
      formData.tag ||
      ""
    ).trim(),

    setor: String(formData.setor || "").trim(),

    area: String(
      formData.area ||
      formData.modalidade ||
      formData.especialidade ||
      ""
    ).trim(),

    responsavel: String(
      formData.responsavel ||
      formData.responsavelTecnico ||
      formData.tecnico ||
      ""
    ).trim(),

    tipo: String(
      formData.tipo ||
      formData.tipoOs ||
      formData.tipo_os ||
      ""
    ).trim(),

    data_inicio: String(
      formData.dataInicio ||
      formData.data_inicio ||
      ""
    ).trim(),

    hora_inicio: String(
      formData.horaInicio ||
      formData.hora_inicio ||
      ""
    ).trim(),

    data_conclusao: String(
      formData.dataConclusao ||
      formData.data_conclusao ||
      ""
    ).trim(),

    hora_conclusao: String(
      formData.horaConclusao ||
      formData.hora_conclusao ||
      ""
    ).trim(),

    horimetro: String(formData.horimetro ?? "").trim(),

    observacoes: String(
      formData.observacoes ||
      formData.observacao ||
      formData.obs ||
      ""
    ).trim()
  };

  console.log("FORMULÁRIO OS:", formData);
  console.log("PAYLOAD OS:", payload);

  const estaPreenchido = (valor: unknown) =>
    valor !== null &&
    valor !== undefined &&
    String(valor).trim() !== "";

  const camposObrigatorios = [
    ["Equipamento", payload.equipamento],
    ["Setor", payload.setor],
    ["Área", payload.area],
    ["Responsável", payload.responsavel],
    ["Tipo", payload.tipo],
    ["Data Início", payload.data_inicio],
    ["Hora Início", payload.hora_inicio],
    ["Data Conclusão", payload.data_conclusao],
    ["Hora Conclusão", payload.hora_conclusao],
    ["Horímetro", payload.horimetro],
    ["Observações", payload.observacoes]
  ];

  const faltando = camposObrigatorios
    .filter(([_, value]) => !estaPreenchido(value))
    .map(([label]) => label);

  if (faltando.length > 0) {
    throw new Error("Campos obrigatórios faltando no formulário: " + faltando.join(", "));
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    console.error("Resposta inválida do Apps Script:", text);
    throw new Error("Resposta inválida do servidor.");
  }

  if (data.success !== true) {
    throw new Error(data.message || "Erro ao salvar registro.");
  }

  return data;
}
