/**
 * Cliente HTTP para a API intermediária da Vercel.
 * 
 * Substitui as chamadas diretas ao GAS pelo frontend.
 * Todas as requisições passam pelo proxy autenticado.
 */

const API_BASE = "/api";

export type Perfil = "ADM" | "PCM" | "GESTAO" | "TECNICO";

export interface Permissao {
  modulo: string;
  visualizar?: boolean;
  criar?: boolean;
  editar?: boolean;
  excluir?: boolean;
  executar?: boolean;
}

export interface AuthUser {
  authenticated: boolean;
  perfil: Perfil;
  nome: string;
  login: string;
  unidade: string;
  permissoes?: Permissao[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: unknown;
}

// ── Auth ────────────────────────────────────────────────────────

export async function apiLogin(
  login: string,
  senha: string
): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, senha }),
    credentials: "include", // envia/recebe cookies
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || "Credenciais inválidas");
  }

  return {
    authenticated: true,
    perfil: data.perfil,
    nome: data.nome,
    login: data.login,
    unidade: data.unidade,
    permissoes: data.permissoes || [],
  };
}

/**
 * 401 significa sessão ausente/inválida. Erros 403/429/5xx, indisponibilidade
 * de rede ou resposta malformada NÃO significam logout: a verificação falhou.
 * O estado da interface permanece fechado até o AUTH62 confirmar.
 */
export class SessionVerificationError extends Error {
  constructor(
    message = "Não foi possível validar a sessão agora. Verifique a conexão e tente novamente.",
    readonly httpStatus?: number,
  ) {
    super(message);
    this.name = "SessionVerificationError";
  }
}

export async function apiGetMe(): Promise<AuthUser | null> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/me`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new SessionVerificationError();
  }

  if (res.status === 401) return null;
  if (!res.ok) throw new SessionVerificationError(undefined, res.status);

  let data: Record<string, unknown>;
  try {
    data = await res.json() as Record<string, unknown>;
  } catch {
    throw new SessionVerificationError("Resposta inválida ao verificar a sessão.", res.status);
  }

  if (!data || typeof data !== "object" || data.authenticated !== true) {
    throw new SessionVerificationError("AUTH62 não confirmou a sessão.", res.status);
  }

  if (
    !["ADM", "PCM", "GESTAO", "TECNICO"].includes(String(data.perfil)) ||
    typeof data.login !== "string" ||
    !data.login.trim()
  ) {
    throw new SessionVerificationError("Resposta de usuário incompleta do AUTH62.", res.status);
  }

  return {
    authenticated: true,
    perfil: data.perfil as Perfil,
    nome: typeof data.nome === "string" ? data.nome : "",
    login: data.login,
    unidade: typeof data.unidade === "string" ? data.unidade : "",
    permissoes: Array.isArray(data.permissoes) ? data.permissoes as Permissao[] : [],
  };
}

export async function apiLogout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).catch(() => {
    // Logout local mesmo se o servidor falhar
  });
}

// ── Proxy ───────────────────────────────────────────────────────

export async function apiProxy<T = Record<string, unknown>>(
  action: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}/proxy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...params, action }),
    credentials: "include",
  });

  const data = await res.json();

  if (res.status === 401) {
    // Sessão expirada — dispara evento para o AuthContext
    window.dispatchEvent(new CustomEvent("cmi:session-expired"));
    throw new Error("Sessão expirada");
  }

  if (!res.ok || data.success === false) {
    throw new Error(
      data.message ||
        data.error ||
        data.erro ||
        "Erro na requisição"
    );
  }

  return data as T;
}

// ── Tipos paginados ────────────────────────────────────────────

export interface PaginatedOSItem {
  row_ref?: number;
  id_os: string | null;
  numero_os?: string;
  equipamento?: string;
  setor?: string;
  area?: string;
  responsavel?: string;
  tipo?: string;
  data_inicio?: string;
  hora_inicio?: string;
  data_fim?: string;
  data_conclusao?: string;
  hora_fim?: string;
  hora_conclusao?: string;
  horimetro?: string | number;
  observacoes?: string;
  [key: string]: unknown;
}

export interface PaginatedOS {
  success: boolean;
  action: string;
  items: PaginatedOSItem[];
  page_size: number;
  has_more: boolean;
  next_cursor: string | null;
  total_estimate: number;
  filters_applied: Record<string, string | null>;
}

export interface FormOptions {
  success: boolean;
  action: string;
  equipamentos: string[];
  setores: string[];
  areas: string[];
  responsaveis: string[];
  tipos: string[];
}
