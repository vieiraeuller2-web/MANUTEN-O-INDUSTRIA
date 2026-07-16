import type {
  ArvorePreventivaResposta,
  AtivoPreventiva,
  ConcluirPreventivaPayload,
  ConcluirPreventivaResponse,
  NoPreventiva,
  PlanoCompletoPreventiva,
  PlanoPreventiva,
  PdfPreventivaResponse,
  ResumoPreventivas,
  SetorPreventiva,
} from "@/types/preventivas";

export const PREVENTIVAS_API_URL =
  "https://script.google.com/macros/s/AKfycbzz1dTU7HVTScVtb37rxAqSR7X0OQmUiZcfvePwGkWM2LaKx1JRSwcEDKnRPMJBPxS7mw/exec";

const REQUEST_TIMEOUT_MS = 25_000;
const POST_TIMEOUT_MS = 90_000;

type RespostaApi = Record<string, unknown> & {
  success?: boolean;
  message?: unknown;
};

function mensagemErro(data: RespostaApi): string {
  return typeof data.message === "string" && data.message.trim()
    ? data.message
    : "A API de preventivas retornou uma resposta sem sucesso.";
}

async function consultarPreventivas(
  action: string,
  parametros: Record<string, string> = {},
  signal?: AbortSignal,
): Promise<RespostaApi> {
  const url = new URL(PREVENTIVAS_API_URL);
  url.searchParams.set("action", action);
  Object.entries(parametros).forEach(([chave, valor]) => url.searchParams.set(chave, valor));

  const controller = new AbortController();
  let expirou = false;
  const cancelar = () => controller.abort();
  signal?.addEventListener("abort", cancelar, { once: true });
  const timeout = window.setTimeout(() => {
    expirou = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Falha HTTP ${response.status} ao consultar as preventivas.`);
    }

    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("A API de preventivas retornou um formato inválido.");
    }

    const resposta = data as RespostaApi;
    if (resposta.success !== true) throw new Error(mensagemErro(resposta));
    return resposta;
  } catch (error) {
    if (expirou) throw new Error("A consulta de preventivas excedeu o tempo limite.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", cancelar);
  }
}

async function enviarPreventivas<T>(payload: object, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  let expirou = false;
  const cancelar = () => controller.abort();
  signal?.addEventListener("abort", cancelar, { once: true });
  const timeout = window.setTimeout(() => {
    expirou = true;
    controller.abort();
  }, POST_TIMEOUT_MS);

  try {
    const response = await fetch(PREVENTIVAS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Falha HTTP ${response.status} ao enviar dados das preventivas.`);
    }

    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("A API de preventivas retornou um formato inválido.");
    }

    const resposta = data as RespostaApi;
    if (resposta.success !== true) throw new Error(mensagemErro(resposta));
    return data as T;
  } catch (error) {
    if (expirou) throw new Error("A operação de preventivas excedeu o tempo limite.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", cancelar);
  }
}

async function gerarPdfPreventiva(
  payload: { action: string; id_plano?: string; id_ativo?: string; id_setor?: string },
): Promise<PdfPreventivaResponse> {
  const resposta = await enviarPreventivas<PdfPreventivaResponse>(payload);
  if (typeof resposta.url !== "string" || !resposta.url.trim()) {
    throw new Error("A API não retornou a URL do PDF gerado.");
  }

  let url: URL;
  try {
    url = new URL(resposta.url);
  } catch {
    throw new Error("A API retornou uma URL de PDF inválida.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("A API retornou uma URL de PDF não permitida.");
  }
  return { ...resposta, url: url.toString() };
}

function listaDaResposta<T>(resposta: RespostaApi): T[] {
  return Array.isArray(resposta.data) ? (resposta.data as T[]) : [];
}

export async function buscarResumoPreventivas(signal?: AbortSignal): Promise<ResumoPreventivas> {
  const resposta = await consultarPreventivas("preventivas_resumo", {}, signal);
  return {
    indicadores:
      resposta.indicadores && typeof resposta.indicadores === "object" && !Array.isArray(resposta.indicadores)
        ? (resposta.indicadores as Record<string, unknown>)
        : {},
    por_modalidade:
      resposta.por_modalidade && typeof resposta.por_modalidade === "object"
        ? (resposta.por_modalidade as Record<string, unknown>)
        : undefined,
    por_periodicidade:
      resposta.por_periodicidade && typeof resposta.por_periodicidade === "object"
        ? (resposta.por_periodicidade as Record<string, unknown>)
        : undefined,
    por_status:
      resposta.por_status && typeof resposta.por_status === "object"
        ? (resposta.por_status as Record<string, unknown>)
        : undefined,
  };
}

export async function buscarSetoresPreventivas(signal?: AbortSignal): Promise<SetorPreventiva[]> {
  return listaDaResposta<SetorPreventiva>(
    await consultarPreventivas("preventivas_setores", {}, signal),
  );
}

export async function buscarAtivosPreventivas(
  idSetor: string,
  signal?: AbortSignal,
): Promise<AtivoPreventiva[]> {
  return listaDaResposta<AtivoPreventiva>(
    await consultarPreventivas("preventivas_ativos", { id_setor: idSetor }, signal),
  );
}

export async function buscarPlanosPreventivas(
  idAtivo: string,
  signal?: AbortSignal,
): Promise<PlanoPreventiva[]> {
  return listaDaResposta<PlanoPreventiva>(
    await consultarPreventivas("preventivas_planos", { id_ativo: idAtivo }, signal),
  );
}

export async function buscarArvorePreventiva(
  idPlano: string,
  signal?: AbortSignal,
): Promise<ArvorePreventivaResposta> {
  const resposta = await consultarPreventivas(
    "preventivas_arvore",
    { id_plano: idPlano },
    signal,
  );
  return {
    id_plano: typeof resposta.id_plano === "string" ? resposta.id_plano : idPlano,
    total: typeof resposta.total === "number" ? resposta.total : undefined,
    data: listaDaResposta<NoPreventiva>(resposta),
    arvore: Array.isArray(resposta.arvore) ? (resposta.arvore as NoPreventiva[]) : [],
  };
}

export async function buscarPlanoCompletoPreventiva(
  idPlano: string,
  signal?: AbortSignal,
): Promise<PlanoCompletoPreventiva> {
  const resposta = await consultarPreventivas(
    "preventivas_plano_completo",
    { id_plano: idPlano },
    signal,
  );
  return {
    setor: resposta.setor as SetorPreventiva | undefined,
    ativo: resposta.ativo as AtivoPreventiva | undefined,
    plano: resposta.plano as PlanoPreventiva,
    total_itens: typeof resposta.total_itens === "number" ? resposta.total_itens : undefined,
    itens: Array.isArray(resposta.itens) ? (resposta.itens as NoPreventiva[]) : [],
    arvore: Array.isArray(resposta.arvore) ? (resposta.arvore as NoPreventiva[]) : [],
  };
}

export function gerarPdfExecucaoPreventiva(idPlano: string): Promise<PdfPreventivaResponse> {
  return gerarPdfPreventiva({ action: "preventiva_gerar_pdf_execucao", id_plano: idPlano });
}

export function gerarPdfAtivoPreventiva(idAtivo: string): Promise<PdfPreventivaResponse> {
  return gerarPdfPreventiva({ action: "preventiva_gerar_pdf_ativo", id_ativo: idAtivo });
}

export function gerarPdfSetorPreventiva(idSetor: string): Promise<PdfPreventivaResponse> {
  return gerarPdfPreventiva({ action: "preventiva_gerar_pdf_setor", id_setor: idSetor });
}

export function gerarPdfGeralPreventivas(): Promise<PdfPreventivaResponse> {
  return gerarPdfPreventiva({ action: "preventiva_gerar_pdf_geral" });
}

export function gerarPdfDiretoriaPreventivas(): Promise<PdfPreventivaResponse> {
  return gerarPdfPreventiva({ action: "preventiva_gerar_pdf_diretoria" });
}

export function concluirPreventiva(
  payload: ConcluirPreventivaPayload,
): Promise<ConcluirPreventivaResponse> {
  return enviarPreventivas<ConcluirPreventivaResponse>(payload);
}
