// Cliente de planilhas legadas por API autenticada da Vercel.
// Nenhum endpoint direto do Apps Script é exposto aqui.

export type SheetRow = Record<string, string | number | null | undefined>;

export async function fetchSheet(sheet: string): Promise<SheetRow[]> {
  const res = await fetch(`/api/legacy-sheets?sheet=${encodeURIComponent(sheet)}`, {
    method: "GET", credentials: "include", cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json?.success !== true) throw new Error(json?.message || "Falha na consulta da planilha");
  if (!Array.isArray(json.data)) throw new Error("Resposta inválida");
  return json.data as SheetRow[];
}

export async function createSheetRow(sheet: string, data: SheetRow): Promise<void> {
  const res = await fetch("/api/legacy-sheets", {
    method: "POST", headers: { "Content-Type": "application/json" },
    credentials: "include", body: JSON.stringify({ sheet, action: "create", data }),
  });
  const json = await res.json();
  if (!res.ok || json?.success !== true) throw new Error(json?.message || "Falha ao cadastrar");
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
