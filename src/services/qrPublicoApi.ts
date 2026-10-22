const URL_API_OFICIAL =
  "https://script.google.com/macros/s/AKfycbzz1dTU7HVTScVtb37rxAqSR7X0OQmUiZcfvePwGkWM2LaKx1JRSwcEDKnRPMJBPxS7mw/exec";

const API_URL = (import.meta.env.VITE_APPS_SCRIPT_URL || URL_API_OFICIAL).trim();
const VERSAO_API = "CONTROLE_MANUTENCAO_QR_API_PUBLICA_20260806_V1";
const TEMPO_LIMITE_MS = 30_000;

export type RegistroManutencao = {
  id_os?: string;
  classificacao?: string;
  subtipo_lubrificacao?: string;
  lub_300?: string;
  lub_160?: string;
  lub_geral?: string;
  facoes_e_rodas?: string;
  data_inicio?: string;
  hora_inicio?: string;
  data_conclusao?: string;
  hora_conclusao?: string;
  responsavel?: string;
  horimetro?: string | number;
  tipo?: string;
  observacoes?: string;
};

export type PreventivaPublica = {
  id_execucao: string;
  id_plano?: string;
  titulo_plano?: string;
  modalidade?: string;
  periodicidade?: string;
  data_realizada?: string;
  responsavel?: string;
  observacao?: string;
  qtd_itens?: number | string;
  qtd_ok?: number | string;
  qtd_nok?: number | string;
  qtd_na?: number | string;
  qtd_pendente?: number | string;
  proxima_execucao?: string;
  status_plano?: string;
};

export type MesHistorico = {
  chave?: string;
  mes?: string;
  total?: number;
  corretivas?: number;
  corretivas_programadas?: number;
  lubrificacoes?: number;
  outros?: number;
};

export type EventoLinhaDoTempo = {
  tipo?: string;
  data?: string;
  hora?: string;
  titulo?: string;
  responsavel?: string;
  descricao?: string;
  id_execucao?: string;
};

export type ResumoEquipamento = {
  // Métricas publicadas opcionalmente pela API pública oficial do QR.
  // O frontend não acessa endpoints AUTH62 protegidos através do QR.
  indicadores_confiabilidade?: {
    mttr_h?: number | null;
    mtbf_calendario_h?: number | null;
    mtbf_intervalos_validos?: number | null;
    falhas_confirmadas?: number | null;
    periodo_referencia?: string;
  } | null;
  ativo: {
    id_ativo?: string;
    tag_ativo?: string;
    nome_ativo?: string;
    tipo_ativo?: string;
    setor?: string;
    localizacao?: string;
    criticidade?: string;
    fabricante?: string;
    modelo?: string;
    mecanico_responsavel?: string;
  };
  situacao: {
    total_planos_ativos?: number;
    ultima_preventiva_data?: string;
    proxima_preventiva_data?: string;
    proxima_preventiva_status?: string;
    os_ultimos_30_dias?: number;
    ultimo_executor?: string;
  };
  ultima_lubrificacao: RegistroManutencao | null;
  ultima_preventiva: PreventivaPublica | null;
  proxima_preventiva?: {
    titulo_plano?: string;
    modalidade?: string;
    periodicidade?: string;
    proxima_execucao?: string;
    dias_restantes?: string | number;
    status_plano?: string;
    responsavel_padrao?: string;
  } | null;
  ultima_corretiva: RegistroManutencao | null;
  ultima_corretiva_programada: RegistroManutencao | null;
  historico_mensal: MesHistorico[];
  linha_do_tempo: EventoLinhaDoTempo[];
};

export type ItemChecklist = {
  id_no?: string;
  nome_no?: string;
  item_verificacao?: string;
  especialidade?: string;
  resultado?: string;
  observacao?: string;
  responsavel?: string;
  data_apontamento?: string;
};

export type DetalhePreventiva = {
  execucao?: {
    titulo_plano?: string;
    data_realizada?: string;
    responsavel?: string;
    observacao?: string;
  };
  itens: ItemChecklist[];
};

type RespostaApi<T> = {
  success?: boolean;
  message?: unknown;
  versao?: unknown;
  atualizado_em?: string;
  data?: T;
};

export type TipoErroQr = "nao_encontrado" | "api" | "rede";

export class ErroQrPublico extends Error {
  tipo: TipoErroQr;

  constructor(tipo: TipoErroQr, message: string) {
    super(message);
    this.name = "ErroQrPublico";
    this.tipo = tipo;
  }
}

export function codigoQrValido(codigo: string): boolean {
  return /^[A-Za-z0-9_-]{6,64}$/.test(codigo);
}

function mensagemDaApi(data: RespostaApi<unknown>): string {
  return typeof data.message === "string" && data.message.trim()
    ? data.message.trim()
    : "A API não conseguiu concluir a consulta.";
}

async function consultar<T>(parametros: Record<string, string>, signal?: AbortSignal): Promise<RespostaApi<T>> {
  const url = new URL(API_URL);
  Object.entries(parametros).forEach(([chave, valor]) => url.searchParams.set(chave, valor));

  const controller = new AbortController();
  let expirou = false;
  const cancelar = () => controller.abort();
  signal?.addEventListener("abort", cancelar, { once: true });
  const timeout = window.setTimeout(() => {
    expirou = true;
    controller.abort();
  }, TEMPO_LIMITE_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ErroQrPublico("api", `A API está indisponível no momento (HTTP ${response.status}).`);
    }

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new ErroQrPublico("api", "A API retornou dados em um formato inesperado.");
    }

    const data = payload as RespostaApi<T>;
    if (data.success !== true) {
      const mensagem = mensagemDaApi(data);
      const naoEncontrado = /não encontrado|inválido|inativo/i.test(mensagem);
      throw new ErroQrPublico(naoEncontrado ? "nao_encontrado" : "api", mensagem);
    }

    if (data.versao !== VERSAO_API) {
      throw new ErroQrPublico("api", "A API pública respondeu com uma versão incompatível.");
    }

    return data;
  } catch (error) {
    if (error instanceof ErroQrPublico) throw error;
    if (expirou) {
      throw new ErroQrPublico("rede", "A consulta demorou mais que o esperado.");
    }
    if (signal?.aborted) throw error;
    throw new ErroQrPublico("rede", "Não foi possível conectar à API de manutenção.");
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", cancelar);
  }
}

export async function buscarResumoEquipamento(
  codigo: string,
  signal?: AbortSignal,
): Promise<{ atualizadoEm?: string; data: ResumoEquipamento }> {
  const resposta = await consultar<ResumoEquipamento>(
    { action: "qr_resumo_ativo", codigo },
    signal,
  );

  if (!resposta.data || typeof resposta.data !== "object") {
    throw new ErroQrPublico("api", "A API não retornou o prontuário do equipamento.");
  }

  return { atualizadoEm: resposta.atualizado_em, data: resposta.data };
}

export async function buscarChecklistPreventiva(
  codigo: string,
  idExecucao: string,
  signal?: AbortSignal,
): Promise<DetalhePreventiva> {
  const resposta = await consultar<DetalhePreventiva>(
    {
      action: "qr_detalhe_preventiva",
      codigo,
      id_execucao: idExecucao,
    },
    signal,
  );

  if (!resposta.data || typeof resposta.data !== "object") {
    throw new ErroQrPublico("api", "O checklist não foi retornado pela API.");
  }

  return {
    ...resposta.data,
    itens: Array.isArray(resposta.data.itens) ? resposta.data.itens : [],
  };
}

// ---------------------------------------------------------
// NOVA API - FLUXO DE ORDEM DE SERVIÇO PELO QR CODE
// ---------------------------------------------------------

async function enviarPost<T>(payload: Record<string, unknown>, signal?: AbortSignal): Promise<RespostaApi<T>> {
  const controller = new AbortController();
  let expirou = false;
  const cancelar = () => controller.abort();
  signal?.addEventListener("abort", cancelar, { once: true });
  
  const timeout = window.setTimeout(() => {
    expirou = true;
    controller.abort();
  }, TEMPO_LIMITE_MS);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ErroQrPublico("api", `A API está indisponível no momento (HTTP ${response.status}).`);
    }

    const dataOriginal = await response.text();
    let data: RespostaApi<T>;
    try {
      data = JSON.parse(dataOriginal) as RespostaApi<T>;
    } catch (e) {
      throw new ErroQrPublico("api", "A API retornou dados em um formato inesperado.");
    }

    if (data.success !== true) {
      const mensagem = typeof data.message === "string" && data.message.trim() 
        ? data.message.trim() 
        : "Ação não autorizada ou falhou no servidor.";
      throw new ErroQrPublico("api", mensagem);
    }

    return data;
  } catch (error) {
    if (error instanceof ErroQrPublico) throw error;
    if (expirou) {
      throw new ErroQrPublico("rede", "A comunicação demorou mais que o esperado.");
    }
    if (signal?.aborted) throw error;
    throw new ErroQrPublico("rede", "Não foi possível conectar à API.");
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", cancelar);
  }
}

export type TecnicoLoginResponse = {
  nome: string;
  login: string;
};

export type EquipamentoContextoResponse = {
  tag_ativo: string;
  nome_ativo: string;
  setor: string;
  equipamento_bd: string;
};

export type QrOsContextoResponse = {
  tecnico: TecnicoLoginResponse;
  equipamento: EquipamentoContextoResponse;
  id_os_sugerido: string;
};

export type QrOsLoginResult = {
  success: boolean;
  token: string;
  expira_em: string;
  tecnico: TecnicoLoginResponse;
  equipamento: EquipamentoContextoResponse;
};

export async function qrOsLogin(login: string, senha: string, codigo: string): Promise<QrOsLoginResult> {
  const res = await enviarPost<QrOsLoginResult>({
    action: "qr_os_login",
    login,
    senha,
    codigo
  });
  return res as unknown as QrOsLoginResult;
}

export async function qrOsValidarSessao(token: string): Promise<boolean> {
  try {
    await enviarPost({ action: "qr_os_validar_sessao", token });
    return true;
  } catch (error) {
    return false;
  }
}

export async function qrOsContexto(token: string, codigo: string): Promise<QrOsContextoResponse> {
  const res = await enviarPost<QrOsContextoResponse>({
    action: "qr_os_contexto",
    token,
    codigo
  });
  // a resposta JSON tem "success: true", mas os dados estão misturados no topo, ou talvez em data. 
  // O formato esperado do Apps script baseado na doc do user: { success: true, tecnico: {...}, equipamento: {...}, id_os_sugerido: "..." }
  return res as unknown as QrOsContextoResponse; 
}

export async function qrOsRegistrar(payload: Record<string, unknown>): Promise<{ id_os: string; duplicado: boolean; message: string }> {
  const res = await enviarPost<{ id_os: string; duplicado: boolean; message: string }>({
    action: "qr_os_registrar",
    ...payload
  });
  return res as unknown as { id_os: string; duplicado: boolean; message: string };
}

export async function qrOsLogout(token: string): Promise<void> {
  try {
    await enviarPost({ action: "qr_os_logout", token });
  } catch (error) {
    // Ignorar erros de logout silenciosamente
  }
}
