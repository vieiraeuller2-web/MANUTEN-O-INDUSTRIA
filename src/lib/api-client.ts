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

export async function apiGetMe(): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.authenticated) return null;

    return {
      authenticated: true,
      perfil: data.perfil,
      nome: data.nome,
      login: data.login,
      unidade: data.unidade,
      permissoes: data.permissoes || [],
    };
  } catch {
    return null;
  }
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
