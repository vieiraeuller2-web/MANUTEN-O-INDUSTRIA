import type { SheetRow } from "@/lib/sheets-external";
import { getField } from "@/lib/sheets-external";

export type DocumentoNF = {
  url: string;
  visualizacao: string | null;
  origem: "drive" | "pdf" | "externo";
};

const LINK_FIELDS = [
  "LINK_NF", "URL_NF", "LINK_PDF", "URL_PDF", "PDF_URL", "PDF",
  "LINK_DOCUMENTO", "URL_DOCUMENTO", "DOCUMENTO_URL",
  "LINK_ARQUIVO", "URL_ARQUIVO", "ARQUIVO_URL",
  "ANEXO_URL", "LINK_ANEXO", "DRIVE_URL", "DRIVE_LINK",
  "LINK_DRIVE", "LINK", "URL", "ANEXO", "ARQUIVO",
] as const;

// A interface nunca converte um número/chave fiscal em um documento inexistente.
// Somente URLs HTTPS de documento realmente retornadas pela origem são aceitas.
export function documentoDaNota(nota: SheetRow): DocumentoNF | null {
  const candidato = getField(nota, ...LINK_FIELDS).trim();
  if (!candidato) return null;
  let url: URL;
  try {
    url = new URL(candidato);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;

  const dominio = url.hostname.toLowerCase();
  if (dominio === "drive.google.com" || dominio === "docs.google.com") {
    const id =
      url.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]{10,})\b/)?.[1] ??
      (url.pathname === "/open" || url.pathname === "/uc" ? url.searchParams.get("id") : null);
    if (id && /^[A-Za-z0-9_-]{10,}$/.test(id)) {
      return {
        url: url.toString(),
        visualizacao: `https://drive.google.com/file/d/${id}/preview`,
        origem: "drive",
      };
    }
    // Links do Google Docs/Sheets não se tornam automaticamente uma NF PDF.
    return { url: url.toString(), visualizacao: null, origem: "externo" };
  }

  const arquivoPdf = /\.pdf$/i.test(url.pathname);
  const isSupabasePublic =
    /^([a-z0-9-]+)\.supabase\.co$/.test(dominio) &&
    url.pathname.startsWith("/storage/v1/object/public/");
  const isGoogleStorage = dominio === "storage.googleapis.com";

  return {
    url: url.toString(),
    visualizacao: (isSupabasePublic || isGoogleStorage) ? url.toString() : null,
    origem: (arquivoPdf || isSupabasePublic || isGoogleStorage) ? "pdf" : "externo",
  };
}
