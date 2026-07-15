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
  descricao: string;
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
  descricao_servico: string;
  causa_provavel: string;
  acao_realizada: string;
}

export interface SaveOSFormData {
  equipamento?: unknown;
  tag_equipamento?: unknown;
  tagEquipamento?: unknown;
  tag?: unknown;
  ativo?: unknown;
  setor?: unknown;
  setorEquipamento?: unknown;
  area?: unknown;
  área?: unknown;
  modalidade?: unknown;
  especialidade?: unknown;
  responsavel?: unknown;
  responsavelTecnico?: unknown;
  tecnico?: unknown;
  colaborador?: unknown;
  tipo?: unknown;
  tipo_os?: unknown;
  tipoOs?: unknown;
  tipoServico?: unknown;
  data_inicio?: unknown;
  dataInicio?: unknown;
  data_servico?: unknown;
  dataServico?: unknown;
  data?: unknown;
  hora_inicio?: unknown;
  horaInicio?: unknown;
  hora_servico?: unknown;
  horaServico?: unknown;
  hora?: unknown;
  data_conclusao?: unknown;
  dataConclusao?: unknown;
  data_fim?: unknown;
  dataFim?: unknown;
  data_final?: unknown;
  dataFinal?: unknown;
  hora_conclusao?: unknown;
  horaConclusao?: unknown;
  hora_fim?: unknown;
  horaFim?: unknown;
  hora_final?: unknown;
  horaFinal?: unknown;
  horimetro?: unknown;
  horímetro?: unknown;
  horimetroFinal?: unknown;
  horimetro_fechamento?: unknown;
  observacoes?: unknown;
  observações?: unknown;
  observacao?: unknown;
  obs?: unknown;
  descricao_servico?: unknown;
  descricaoServico?: unknown;
  descricao?: unknown;
  causa_provavel?: unknown;
  causaProvavel?: unknown;
  causa?: unknown;
  acao_realizada?: unknown;
  acaoRealizada?: unknown;
  acao?: unknown;
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
  descricao: "descricao",
  "descrição": "descricao",
  "observações": "descricao",
  observacoes: "descricao",
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
    horimetro: "", descricao: "",
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
        descricao: String(getRawValue(safeRow, "Observações", "descricao") ?? getRawValue(safeRow, "Descrição", "descricao") ?? ""),
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
      formData.tag_equipamento ||
      formData.tagEquipamento ||
      formData.tag ||
      formData.ativo ||
      ""
    ).trim(),

    setor: String(
      formData.setor ||
      formData.setorEquipamento ||
      ""
    ).trim(),

    area: String(
      formData.area ||
      formData.área ||
      formData.modalidade ||
      formData.especialidade ||
      ""
    ).trim(),

    responsavel: String(
      formData.responsavel ||
      formData.responsavelTecnico ||
      formData.tecnico ||
      formData.colaborador ||
      ""
    ).trim(),

    tipo: String(
      formData.tipo ||
      formData.tipo_os ||
      formData.tipoOs ||
      formData.tipoServico ||
      ""
    ).trim(),

    data_inicio: String(
      formData.data_inicio ||
      formData.dataInicio ||
      formData.data_servico ||
      formData.dataServico ||
      formData.data ||
      ""
    ).trim(),

    hora_inicio: String(
      formData.hora_inicio ||
      formData.horaInicio ||
      formData.hora_servico ||
      formData.horaServico ||
      formData.hora ||
      ""
    ).trim(),

    data_conclusao: String(
      formData.data_conclusao ||
      formData.dataConclusao ||
      formData.data_fim ||
      formData.dataFim ||
      formData.data_final ||
      formData.dataFinal ||
      formData.data_inicio ||
      formData.dataInicio ||
      formData.data_servico ||
      formData.dataServico ||
      formData.data ||
      ""
    ).trim(),

    hora_conclusao: String(
      formData.hora_conclusao ||
      formData.horaConclusao ||
      formData.hora_fim ||
      formData.horaFim ||
      formData.hora_final ||
      formData.horaFinal ||
      ""
    ).trim(),

    horimetro: String(
      formData.horimetro ||
      formData.horímetro ||
      formData.horimetroFinal ||
      formData.horimetro_fechamento ||
      ""
    ).trim(),

    observacoes: String(
      formData.observacoes ||
      formData.observações ||
      formData.observacao ||
      formData.obs ||
      formData.descricao_servico ||
      formData.descricaoServico ||
      formData.descricao ||
      formData.causa_provavel ||
      formData.causaProvavel ||
      formData.acao_realizada ||
      formData.acaoRealizada ||
      ""
    ).trim(),

    descricao_servico: String(
      formData.descricao_servico ||
      formData.descricaoServico ||
      formData.descricao ||
      ""
    ).trim(),

    causa_provavel: String(
      formData.causa_provavel ||
      formData.causaProvavel ||
      formData.causa ||
      ""
    ).trim(),

    acao_realizada: String(
      formData.acao_realizada ||
      formData.acaoRealizada ||
      formData.acao ||
      ""
    ).trim()
  };

  console.log("FORM DATA COMPLETO ANTES DE SALVAR OS:", formData);
  console.log("PAYLOAD COMPLETO ENVIADO PARA APPS SCRIPT:", payload);

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
    .filter(([_, value]) => !String(value || "").trim())
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
  console.log("RESPOSTA BRUTA APPS SCRIPT:", text);

  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    console.error("Resposta não JSON do Apps Script:", text);
    throw new Error("Resposta inválida do servidor.");
  }

  console.log("RESPOSTA JSON APPS SCRIPT:", data);

  if (data.success !== true) {
    throw new Error(data.message || "Erro ao salvar OS.");
  }

  return data;
}
