// Helpers seguros para datas/horas vindas da planilha.
// REGRA: campos de HORA são texto puro; nunca aplicar timezone/UTC neles.

export function formatHoraOS(valor: any): string {
  if (valor === null || valor === undefined || valor === "") return "—";

  const texto = String(valor).trim();
  if (!texto) return "—";

  const matchHora = texto.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (matchHora) {
    const h = matchHora[1].padStart(2, "0");
    const m = matchHora[2];
    return `${h}:${m}`;
  }

  const matchTexto = texto.match(/T?(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (matchTexto) {
    const h = matchTexto[1].padStart(2, "0");
    const m = matchTexto[2];
    return `${h}:${m}`;
  }

  return "—";
}

export function normalizarHoraSheets(valor: any): string {
  if (valor === null || valor === undefined || valor === "") return "—";

  if (typeof valor === "number") {
    const totalMinutos = Math.round(valor * 24 * 60);
    const horas = Math.floor(totalMinutos / 60) % 24;
    const minutos = totalMinutos % 60;
    return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
  }

  return formatHoraOS(valor);
}

export const formatHoraBr = normalizarHoraSheets;

export function formatDataBr(valor: any): string {
  if (valor == null || valor === "") return "—";
  const s = String(valor).trim();
  if (!s) return "—";
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return `${br[1].padStart(2, "0")}/${br[2].padStart(2, "0")}/${br[3]}`;
  return s;
}

export function extrairAnoDataBr(dataBr: any): string {
  if (!dataBr) return "";
  const texto = String(dataBr).trim();
  const br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return br[3];
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1];
  return "";
}

export function parseDataHoraLocal(dataBr: any, horaBr: any): Date | null {
  if (!dataBr || !horaBr) return null;

  const dataTexto = formatDataBr(dataBr);
  const horaTexto = normalizarHoraSheets(horaBr);

  if (dataTexto === "—" || horaTexto === "—") return null;

  const dataMatch = dataTexto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const horaMatch = horaTexto.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);

  if (!dataMatch || !horaMatch) return null;

  const dia = Number(dataMatch[1]);
  const mes = Number(dataMatch[2]);
  const ano = Number(dataMatch[3]);
  const hora = Number(horaMatch[1]);
  const minuto = Number(horaMatch[2]);
  const segundo = Number(horaMatch[3] || 0);

  return new Date(ano, mes - 1, dia, hora, minuto, segundo);
}

export function calcularHorasOS(dataInicio: any, horaInicio: any, dataFim: any, horaFim: any): number | null {
  try {
    const inicio = parseDataHoraLocal(dataInicio, horaInicio);
    const fim = parseDataHoraLocal(dataFim, horaFim);
    if (!inicio || !fim) return null;
    const diffMs = fim.getTime() - inicio.getTime();
    if (diffMs < 0 || !Number.isFinite(diffMs)) return null;
    const horas = diffMs / 3_600_000;
    if (!Number.isFinite(horas) || horas > 1000) return null;
    return horas;
  } catch (err) {
    console.error("Erro ao calcular horas da OS:", err);
    return null;
  }
}

export function calcularTempoOS(dataInicio: any, horaInicio: any, dataFim: any, horaFim: any): string {
  try {
    const inicio = parseDataHoraLocal(dataInicio, horaInicio);
    const fim = parseDataHoraLocal(dataFim, horaFim);

    if (!inicio || !fim) return "—";

    const diffMs = fim.getTime() - inicio.getTime();
    if (diffMs < 0 || !Number.isFinite(diffMs)) return "—";

    const totalMin = Math.floor(diffMs / 60000);
    const dias = Math.floor(totalMin / 1440);
    const horas = Math.floor((totalMin % 1440) / 60);
    const minutos = totalMin % 60;

    if (dias > 0) return `${dias}d ${horas}h ${minutos}min`;
    return `${horas}h ${minutos}min`;
  } catch (err) {
    console.error("Erro ao calcular tempo da OS:", err);
    return "—";
  }
}
