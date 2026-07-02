// Cliente genérico para a API do Google Apps Script (multi-abas)
// Endpoint único; aba é definida pelo parâmetro `sheet`.

const BASE =
  "https://script.google.com/macros/s/AKfycbzz1dTU7HVTScVtb37rxAqSR7X0OQmUiZcfvePwGkWM2LaKx1JRSwcEDKnRPMJBPxS7mw/exec";

export type SheetRow = Record<string, string | number | null | undefined>;

export async function fetchSheet(sheet: string): Promise<SheetRow[]> {
  const res = await fetch(`${BASE}?sheet=${encodeURIComponent(sheet)}`, { method: "GET" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const json = await res.json();
  if (json?.success === false) throw new Error(json?.error || "Resposta inválida");
  const data = Array.isArray(json) ? json : (json?.data ?? []);
  if (!Array.isArray(data)) throw new Error("Resposta inválida");
  return data as SheetRow[];
}

export async function createSheetRow(sheet: string, data: SheetRow): Promise<void> {
  const body = JSON.stringify({ sheet, action: "create", data });
  // text/plain evita preflight CORS no Apps Script
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body,
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const json = await res.json().catch(() => ({}));
  if (json?.success === false) throw new Error(json?.error || "Falha ao cadastrar.");
}

export function getField(item: SheetRow, ...keys: string[]): string {
  if (!item || typeof item !== "object") return "";
  for (const k of keys) {
    if (k in item && item[k] != null && item[k] !== "") return String(item[k]);
  }
  // tentativa case-insensitive
  const lower: Record<string, any> = {};
  for (const k of Object.keys(item)) lower[k.toLowerCase()] = item[k];
  for (const k of keys) {
    const v = lower[k.toLowerCase()];
    if (v != null && v !== "") return String(v);
  }
  return "";
}

export function formatSheetDate(v: string): string {
  if (!v) return "";
  const s = String(v);
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return `${br[1].padStart(2, "0")}/${br[2].padStart(2, "0")}/${br[3]}`;
  return s;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowISO(): string {
  return new Date().toISOString();
}
