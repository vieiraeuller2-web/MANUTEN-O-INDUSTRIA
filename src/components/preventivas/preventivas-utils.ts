import { normalizeText, safeString } from "@/lib/data-helpers";
import type { NoPreventiva, PlanoPreventiva } from "@/types/preventivas";

export const TODOS_FILTRO = "__TODOS__";

export function numeroOrdem(valor: unknown): number {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : Number.MAX_SAFE_INTEGER;
}

export function compararOrdenados(
  a: { ordem?: string | number },
  b: { ordem?: string | number },
  nomeA = "",
  nomeB = "",
): number {
  return numeroOrdem(a.ordem) - numeroOrdem(b.ordem) || nomeA.localeCompare(nomeB, "pt-BR");
}

export function valorEhNao(valor: unknown): boolean {
  return normalizeText(valor) === "nao";
}

export function valorEhSim(valor: unknown): boolean {
  return normalizeText(valor) === "sim";
}

const MODALIDADES: Array<[RegExp, string]> = [
  [/(?:^|\W)(ELETRIC[OA]|ELE)(?:$|\W)/, "ELÉTRICO"],
  [/(?:^|\W)(MECANIC[OA]|MEC)(?:$|\W)/, "MECÂNICO"],
  [/(?:^|\W)(HIDRAULIC[OA]|HID)(?:$|\W)/, "HIDRÁULICO"],
  [/(?:^|\W)(LUBRIFICACAO|LUB)(?:$|\W)/, "LUBRIFICAÇÃO"],
  [/(?:^|\W)(PNEUMATIC[OA]|PNE)(?:$|\W)/, "PNEUMÁTICO"],
];

function textoNormalizadoMaiusculo(valor: unknown): string {
  return normalizeText(valor).toUpperCase();
}

export function formatarModalidadePlano(plano: PlanoPreventiva): string {
  const fontes = [
    plano.modalidade,
    plano.especialidade_principal,
    plano.tipo_plano,
    plano.titulo_plano,
    plano.id_plano,
  ];
  for (const fonte of fontes) {
    const texto = textoNormalizadoMaiusculo(fonte);
    if (!texto) continue;
    const modalidade = MODALIDADES.find(([padrao]) => padrao.test(texto));
    if (modalidade) return modalidade[1];
  }
  return safeString(plano.modalidade || plano.especialidade_principal, "SEM MODALIDADE").toUpperCase();
}

const PERIODICIDADES: Array<[RegExp, string]> = [
  [/(?:^|\W)DIARIA(?:$|\W)/, "DIÁRIA"],
  [/(?:^|\W)SEMANAL(?:$|\W)/, "SEMANAL"],
  [/(?:^|\W)QUINZENAL(?:$|\W)/, "QUINZENAL"],
  [/(?:^|\W)BIMESTRAL(?:$|\W)/, "BIMESTRAL"],
  [/(?:^|\W)TRIMESTRAL(?:$|\W)/, "TRIMESTRAL"],
  [/(?:^|\W)QUADRIMESTRAL(?:$|\W)/, "QUADRIMESTRAL"],
  [/(?:^|\W)SEMESTRAL(?:$|\W)/, "SEMESTRAL"],
  [/(?:^|\W)MENSAL(?:$|\W)/, "MENSAL"],
  [/(?:^|\W)ANUAL(?:$|\W)/, "ANUAL"],
];

const PERIODICIDADES_ID: Array<[RegExp, string]> = [
  [/(?:^|-)DIA(?:-|$)/, "DIÁRIA"],
  [/(?:^|-)MEN(?:-|$)/, "MENSAL"],
  [/(?:^|-)BIM(?:-|$)/, "BIMESTRAL"],
  [/(?:^|-)TRI(?:-|$)/, "TRIMESTRAL"],
  [/(?:^|-)SES(?:-|$)/, "SEMESTRAL"],
  [/(?:^|-)ANU(?:-|$)/, "ANUAL"],
];

export function formatarPeriodicidadePlano(plano: PlanoPreventiva): string {
  const camposDescritivos = [
    plano.periodicidade,
    plano.periodicidade_tipo,
    plano.periodicidade_descricao,
    plano.periodicidade_origem,
    plano.titulo_plano,
  ];
  for (const campo of camposDescritivos) {
    const texto = textoNormalizadoMaiusculo(campo);
    if (!texto) continue;
    const periodicidade = PERIODICIDADES.find(([padrao]) => padrao.test(texto));
    if (periodicidade) return periodicidade[1];
    if (campo !== plano.titulo_plano) return safeString(campo).toUpperCase();
  }

  const id = textoNormalizadoMaiusculo(plano.id_plano);
  const peloId = PERIODICIDADES_ID.find(([padrao]) => padrao.test(id));
  if (peloId) return peloId[1];

  const dias = safeString(plano.periodicidade_dias_uteis);
  return dias ? `${dias} DIAS ÚTEIS` : "SEM PERIODICIDADE";
}

export function formatarStatusPlano(valor: unknown): string {
  const status = textoNormalizadoMaiusculo(valor).replace(/[\s-]+/g, "_");
  const rotulos: Record<string, string> = {
    EM_DIA: "EM DIA",
    A_VENCER: "A VENCER",
    VENCIDA: "VENCIDA",
    VENCIDO: "VENCIDA",
    SEM_DATA_BASE: "SEM DATA-BASE",
    SEM_DATA: "SEM DATA-BASE",
    INATIVO: "INATIVO",
  };
  return rotulos[status] ?? (status ? status.replace(/_/g, " ") : "SEM DATA-BASE");
}


/**
 * Prioridade da situação no card: plano inativo, data de próxima execução
 * válida (calendário local da unidade), dias restantes e, por último,
 * status devolvido pelo backend.
 *
 * A UI não redefine agendamento/periodicidade de dias úteis. Ela apenas
 * evita que um prazo já vencido apareça em verde quando o status da API
 * estiver desatualizado.
 */
function dataCalendario(valor: unknown): number | null {
  if (valor == null || valor === "") return null;
  const texto = String(valor).trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|[T\s])/.exec(texto);
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:$|\s)/.exec(texto);
  const ano = Number(iso?.[1] ?? br?.[3]);
  const mes = Number(iso?.[2] ?? br?.[2]);
  const dia = Number(iso?.[3] ?? br?.[1]);
  if (!ano || !mes || !dia) return null;
  const timestamp = Date.UTC(ano, mes - 1, dia);
  const data = new Date(timestamp);
  return data.getUTCFullYear() === ano &&
    data.getUTCMonth() + 1 === mes &&
    data.getUTCDate() === dia
    ? timestamp : null;
}

function hojeCalendario(agora: Date): number {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(agora);
  const campo = (chave: string) => Number(partes.find((parte) => parte.type === chave)?.value);
  return Date.UTC(campo("year"), campo("month") - 1, campo("day"));
}

export function situacaoEfetivaPlano(plano: PlanoPreventiva, agora: Date = new Date()): {
  status: string;
  diasRestantes: number | null;
} {
  if (valorEhNao(plano.ativo)) return { status: "INATIVO", diasRestantes: null };

  const proxima = dataCalendario(plano.proxima_execucao);
  const dias = proxima === null
    ? (() => {
        const texto = String(plano.dias_restantes ?? "").trim();
        if (!/^[-+]?\d+$/.test(texto)) return null;
        const valor = Number(texto);
        return Number.isSafeInteger(valor) ? valor : null;
      })()
    : Math.round((proxima - hojeCalendario(agora)) / 86400000);

  const informado = formatarStatusPlano(plano.status_plano);
  if (dias === null) {
    // Sem data ou contagem confiável, nunca afirmar falsamente "EM DIA".
    return { status: informado === "EM DIA" ? "SEM DATA-BASE" : informado, diasRestantes: null };
  }
  if (dias < 0) return { status: "VENCIDA", diasRestantes: dias };
  if (dias <= 7) return { status: "A VENCER", diasRestantes: dias };
  // Uma data confirmada no futuro corrige um status antigo de vencimento.
  const status = informado === "VENCIDA" || informado === "A VENCER" || informado === "SEM DATA-BASE"
    ? "EM DIA" : informado;
  return { status, diasRestantes: dias };
}

export function formatarDataPreventiva(valor: unknown): string {
  const texto = safeString(valor);
  if (!texto) return "Não informada";
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : texto;
}

export function construirArvorePreventiva(nos: NoPreventiva[]): NoPreventiva[] {
  const ativos = nos.filter((no) => !valorEhNao(no.ativo));
  const mapa = new Map<string, NoPreventiva>();
  const semId: NoPreventiva[] = [];

  ativos.forEach((no) => {
    const copia = { ...no, filhos: [] };
    const id = safeString(no.id_no);
    if (id && !mapa.has(id)) mapa.set(id, copia);
    else semId.push(copia);
  });

  const raizes: NoPreventiva[] = [...semId];
  mapa.forEach((no, id) => {
    const idPai = safeString(no.id_no_pai);
    const pai = idPai && idPai !== id ? mapa.get(idPai) : undefined;
    if (pai) pai.filhos?.push(no);
    else raizes.push(no);
  });

  const ordenar = (lista: NoPreventiva[]) => {
    lista.sort((a, b) => compararOrdenados(a, b, safeString(a.nome_no), safeString(b.nome_no)));
    lista.forEach((no) => ordenar(no.filhos ?? []));
  };
  ordenar(raizes);
  return raizes;
}

export function achatarArvorePreventiva(arvore: NoPreventiva[]): NoPreventiva[] {
  return arvore.flatMap((no) => [no, ...achatarArvorePreventiva(no.filhos ?? [])]);
}

export function obterItensFinaisPreventiva(nos: NoPreventiva[]): NoPreventiva[] {
  return nos
    .filter((no) => {
      if (valorEhNao(no.ativo)) return false;
      return normalizeText(no.tipo_no) === "item_verificacao" || Boolean(safeString(no.item_verificacao));
    })
    .sort((a, b) => compararOrdenados(a, b, safeString(a.nome_no), safeString(b.nome_no)));
}
