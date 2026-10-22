import { getField, type SheetRow } from "@/lib/sheets-external";

const LUBRIFICACAO_URL = "https://script.google.com/macros/s/AKfycbzz1dTU7HVTScVtb37rxAqSR7X0OQmUiZcfvePwGkWM2LaKx1JRSwcEDKnRPMJBPxS7mw/exec?sheet=lubrificacao";

export interface LubrificacaoCritica {
  equipamento: string;
  setor: string;
  horasRestantes: number;
  horasAtraso: number;
}

function valorNumerico(valor: string): number | null {
  if (!valor.trim()) return null;
  const numero = Number(valor.trim().replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
}

export function rankingLubrificacoes(rows: SheetRow[], limite = 8): LubrificacaoCritica[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    const atual = valorNumerico(getField(row, "HORIMETRO_ATUAL"));
    const ultima = valorNumerico(getField(row, "HORIMETRO_ULTIMA_LUB"));
    const intervalo = valorNumerico(getField(row, "INTERVALO_LUB"));
    const horasRestantesInformadas = valorNumerico(getField(row, "HORAS_RESTANTES"));
    const horasRodadas = valorNumerico(getField(row, "HORAS_RODADAS"));
    const horasRestantes = horasRestantesInformadas ??
      (intervalo !== null && horasRodadas !== null ? intervalo - horasRodadas :
       intervalo !== null && atual !== null && ultima !== null ? intervalo - (atual - ultima) : null);
    if (horasRestantes === null || horasRestantes >= 0) return [];
    const equipamento = getField(row, "EQUIPAMENTO").trim();
    if (!equipamento) return [];
    return [{ equipamento, setor: getField(row, "SETOR"), horasRestantes, horasAtraso: Math.abs(horasRestantes) }];
  }).sort((a, b) => b.horasAtraso - a.horasAtraso).slice(0, limite);
}

export async function buscarLubrificacoesCriticas(signal?: AbortSignal): Promise<LubrificacaoCritica[]> {
  const res = await fetch(LUBRIFICACAO_URL, { signal, method: "GET", headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Não foi possível consultar lubrificações (HTTP ${res.status}).`);
  const payload: unknown = await res.json();
  if (payload && typeof payload === "object" && "success" in payload && payload.success === false) {
    throw new Error("A planilha de lubrificação retornou um erro.");
  }
  const rows = Array.isArray(payload)
    ? payload : payload && typeof payload === "object" && "data" in payload && Array.isArray(payload.data)
      ? payload.data : null;
  if (!rows) throw new Error("Formato inválido dos registros de lubrificação.");
  return rankingLubrificacoes(rows as SheetRow[]);
}
