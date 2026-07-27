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
  id_os?: string;
  numero_os?: string;
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
  client_submission_id: string;
  cliente_versao: "web-os-v2";
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
  horimetro_informado: string;
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
  dataFim?: unknown;
  data_fim?: unknown;
  dataFinal?: unknown;
  data_final?: unknown;
  horaConclusao?: unknown;
  hora_conclusao?: unknown;
  horaFim?: unknown;
  hora_fim?: unknown;
  horaFinal?: unknown;
  hora_final?: unknown;
  horimetro?: unknown;
  client_submission_id?: unknown;
  observacoes?: unknown;
  observacao?: unknown;
  obs?: unknown;
}


type CanonicalSheetKey =
  | "id_os"
  | "numero_os"
  | "equipamento"
  | "setor"
  | "area"
  | "responsavel"
  | "tipo"
  | "data_inicio"
  | "hora_inicio"
  | "data_fim"
  | "hora_fim"
  | "horimetro"
  | "observacoes";

function normalizeColumnName(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// Mapeia nomes de coluna da planilha -> campos do app.
// As chaves estão sem acento para aceitar tanto os títulos visíveis
// quanto os nomes normalizados devolvidos pela API.
const HEADER_MAP: Record<string, CanonicalSheetKey> = {
  id: "id_os",
  id_os: "id_os",
  os: "id_os",
  numero_os: "numero_os",
  equipamento: "equipamento",
  setor: "setor",
  area: "area",
  responsavel: "responsavel",
  tipo: "tipo",
  data_inicio: "data_inicio",
  hora_inicio: "hora_inicio",
  data_fim: "data_fim",
  data_conclusao: "data_fim",
  hora_fim: "hora_fim",
  hora_conclusao: "hora_fim",
  horimetro: "horimetro",
  observacao: "observacoes",
  observacoes: "observacoes",
};

function normalizeKey(k: string): CanonicalSheetKey | null {
  if (!k) return null;
  return HEADER_MAP[normalizeColumnName(k)] ?? null;
}

function normalizeDate(v: unknown): string {
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

function normalizeTime(v: unknown): string {
  if (v == null || v === "") return "";
  const hora = normalizarHoraSheets(v);
  return hora === "—" ? "" : hora;
}

function getRawValue(row: Record<string, unknown>, ...aliases: string[]) {
  if (!row || typeof row !== "object") return undefined;
  const normalizedEntries = new Map(
    Object.entries(row).map(([key, value]) => [normalizeColumnName(key), value]),
  );

  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(row, alias)) return row[alias];
    const normalizedAlias = normalizeColumnName(alias);
    if (normalizedEntries.has(normalizedAlias)) return normalizedEntries.get(normalizedAlias);
  }

  return undefined;
}

function emptySheetOS(): SheetOS {
  return {
    equipamento: "",
    setor: "",
    area: "",
    responsavel: "",
    tipo: "",
    data_inicio: "",
    hora_inicio: "",
    data_fim: "",
    hora_fim: "",
    horimetro: "",
    observacoes: "",
  };
}

function normalizeHorimeterValue(raw: unknown): string | number {
  if (raw == null || raw === "") return "";
  if (typeof raw === "number") return raw;
  const text = String(raw).trim();
  const parsed = Number(text.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : text;
}

function rowToOS(row: unknown[], headerKeys: (CanonicalSheetKey | null)[]): SheetOS {
  const obj = emptySheetOS();
  headerKeys.forEach((key, i) => {
    if (!key) return;
    const raw = row[i];
    if (raw == null || raw === "") return;
    if (key === "data_inicio" || key === "data_fim") {
      obj[key] = normalizeDate(raw);
    } else if (key === "hora_inicio" || key === "hora_fim") {
      obj[key] = normalizeTime(raw);
    } else if (key === "horimetro") {
      obj[key] = normalizeHorimeterValue(raw);
    } else {
      obj[key] = String(raw);
    }
  });
  return obj;
}

export function parseSheetResponse(data: unknown): SheetOS[] {
  const response = data as Record<string, any> | null;

  // Erro controlado vindo do proxy (ex.: Apps Script sem doGet/doPost)
  if (
    response?.ok === false ||
    response?.success === false ||
    (response?.error && !response?.rows && !response?.data && !response?.values)
  ) {
    throw new Error(String(response.error || "Não foi possível carregar os dados."));
  }

  // Caso 1: array de arrays (o que sua planilha devolve)
  if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
    const headerKeys = (data[0] as string[]).map(normalizeKey);
    return (data.slice(1) as any[][]).map((r) => rowToOS(r, headerKeys));
  }
  // Caso 2: array de objetos
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
    return data.map((row: unknown) => {
      const safeRow = row && typeof row === "object"
        ? row as Record<string, unknown>
        : {};
      const os: SheetOS = {
        id_os: String(getRawValue(safeRow, "id_os", "id os", "OS", "ID") ?? ""),
        numero_os: String(getRawValue(safeRow, "numero_os", "numero os", "número os") ?? ""),
        equipamento: String(getRawValue(safeRow, "equipamento", "Equipamento") ?? ""),
        setor: String(getRawValue(safeRow, "setor", "Setor") ?? ""),
        area: String(getRawValue(safeRow, "area", "Área") ?? ""),
        responsavel: String(getRawValue(safeRow, "responsavel", "Responsável") ?? ""),
        tipo: String(getRawValue(safeRow, "tipo", "Tipo") ?? ""),
        data_inicio: normalizeDate(getRawValue(safeRow, "data_inicio", "Data Início")),
        hora_inicio: normalizeTime(getRawValue(safeRow, "hora_inicio", "Hora Início")),
        data_fim: normalizeDate(getRawValue(
          safeRow,
          "data_fim",
          "data_conclusao",
          "Data Fim",
          "Data Conclusão",
        )),
        hora_fim: normalizeTime(getRawValue(
          safeRow,
          "hora_fim",
          "hora_conclusao",
          "Hora Fim",
          "Hora Conclusão",
        )),
        horimetro: normalizeHorimeterValue(getRawValue(safeRow, "horimetro", "Horímetro")),
        observacoes: String(getRawValue(
          safeRow,
          "observacoes",
          "observacao",
          "Observações",
        ) ?? ""),
      };
      Object.entries(safeRow).forEach(([k, v]) => {
        if (!(k in os)) (os as any)[k] = v;
      });
      return os;
    });
  }
  // Caso 3: { rows: [...] } / { data: [...] }
  if (response?.rows) return parseSheetResponse(response.rows);
  if (response?.data) return parseSheetResponse(response.data);
  if (response?.values) return parseSheetResponse(response.values);
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

function createSubmissionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeHorimeterForPayload(value: unknown): string {
  const text = String(value ?? "").trim().replace(",", ".");
  if (!text) return "";
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Horímetro inválido. Informe um número maior ou igual a zero.");
  }
  return text;
}

export function buildCreateOSPayload(formData: SaveOSFormData): CreateOSPayload {
  const dataConclusao = String(
    formData.dataConclusao ??
    formData.data_conclusao ??
    formData.dataFim ??
    formData.data_fim ??
    formData.dataFinal ??
    formData.data_final ??
    ""
  ).trim();

  const horaConclusao = String(
    formData.horaConclusao ??
    formData.hora_conclusao ??
    formData.horaFim ??
    formData.hora_fim ??
    formData.horaFinal ??
    formData.hora_final ??
    ""
  ).trim();

  const horimetro = normalizeHorimeterForPayload(formData.horimetro);
  return {
    action: "registrar_os",
    client_submission_id: String(formData.client_submission_id || createSubmissionId()),
    cliente_versao: "web-os-v2",
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
      formData.dataInicio ??
      formData.data_inicio ??
      ""
    ).trim(),

    hora_inicio: String(
      formData.horaInicio ??
      formData.hora_inicio ??
      ""
    ).trim(),

    data_conclusao: dataConclusao,

    hora_conclusao: horaConclusao,

    horimetro,

    // Campo redundante para auditoria: permite recuperar exatamente o valor
    // visto no formulário mesmo que o mapeamento do backend volte a mudar.
    horimetro_informado: horimetro,

    observacoes: String(
      formData.observacoes ||
      formData.observacao ||
      formData.obs ||
      ""
    ).trim(),
  };
}

function getConfirmedHorimeter(data: Record<string, any>): unknown {
  const candidates = [
    data.valores_confirmados,
    data.resultado?.valores_confirmados,
    data.registro,
    data.data?.valores_confirmados,
    data.data?.registro,
  ];
  return candidates.find((candidate) =>
    candidate && Object.prototype.hasOwnProperty.call(candidate, "horimetro")
  )?.horimetro;
}

export async function createOSInSheet(formData: SaveOSFormData) {
  const payload = buildCreateOSPayload(formData);

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
  ] as const;

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

  let data: Record<string, any>;
  try {
    data = JSON.parse(text);
  } catch (error) {
    console.error("Resposta inválida do Apps Script:", text);
    throw new Error("Resposta inválida do servidor.");
  }

  if (data.success !== true) {
    throw new Error(data.message || "Erro ao salvar registro.");
  }

  const confirmedHorimeter = getConfirmedHorimeter(data);
  if (confirmedHorimeter !== undefined) {
    const expected = Number(payload.horimetro);
    const confirmed = Number(String(confirmedHorimeter).replace(",", "."));
    if (!Number.isFinite(confirmed) || confirmed !== expected) {
      throw new Error(
        `O servidor não confirmou o horímetro informado (${payload.horimetro}). O formulário foi preservado para nova tentativa.`,
      );
    }
  }

  return { ...data, payloadEnviado: payload };
}
