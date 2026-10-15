/**
 * Autorização central do frontend.
 *
 * FONTE OFICIAL: backend AUTH62 (permissoes retornadas por auth_me).
 * Este módulo apenas REPRODUZ a decisão do auth62Autorizar_ para fins de UX
 * (esconder menus / bloquear telas). A autorização real continua no backend.
 *
 * Regras:
 *  - Sem usuário ou sem permissões carregadas → NEGA (fail closed).
 *  - Precedência idêntica ao auth62Autorizar_ homologado:
 *      1. se existir regra wildcard (modulo "*"), ela é usada;
 *      2. somente se NÃO existir wildcard, usa a regra específica do módulo.
 *  - Rota/tela exige a ação definida no mapa (padrão: visualizar).
 *  - Perfil (ADM/PCM/...) NÃO é usado para decidir acesso.
 */
import { matchPath } from "react-router-dom";
import type { AuthUser, Permissao } from "@/lib/api-client";

export type AcaoAuth62 = "visualizar" | "criar" | "editar" | "excluir" | "executar";

export const WILDCARD_MODULO = "*";

export interface RoutePermission {
  /** Pattern no formato react-router (ex: "/os/:id") */
  pattern: string;
  /** Módulo AUTH62 (coluna MODULO de PERFIS_ACESSO) */
  modulo: string;
  /** Ação exigida para abrir a tela */
  acao: AcaoAuth62;
}

/**
 * Mapa ROTA FRONTEND -> MÓDULO AUTH62.
 *
 * Ordem importa: patterns mais específicos primeiro.
 * Somente módulos reais:
 *  - HISTORICO  → exigido por listar_os_paginado (backend-patches/listar_os_paginado_v1.gs)
 *  - LANCAMENTO → exigido por opcoes_formulario_os (backend-patches/opcoes_formulario_os_v1.gs)
 *  - LUBRIFICACAO → módulo informado como existente no AUTH62
 *
 * Rotas protegidas SEM módulo confirmado NÃO estão aqui (ver UNMAPPED_PROTECTED_ROUTES):
 * para elas, apenas o wildcard "*" concede acesso (fail closed para os demais).
 */
export const ROUTE_PERMISSION_MAP: RoutePermission[] = [
  { pattern: "/tecnico", modulo: "MINHAS_OS", acao: "visualizar" },
  { pattern: "/preventivas", modulo: "PLANO_MANUTENCAO", acao: "visualizar" },
  { pattern: "/planos-manutencao", modulo: "PLANO_MANUTENCAO", acao: "visualizar" },
  { pattern: "/nf", modulo: "NOTAS_FISCAIS", acao: "visualizar" },
  { pattern: "/lancamentos", modulo: "SERVICOS_EXTERNOS", acao: "visualizar" },
  { pattern: "/servicos-externos", modulo: "SERVICOS_EXTERNOS", acao: "visualizar" },
  { pattern: "/obras", modulo: "OBRAS", acao: "visualizar" },
  { pattern: "/relatorios", modulo: "DASH_COMPLETO", acao: "visualizar" },
  { pattern: "/os/nova", modulo: "LANCAMENTO", acao: "visualizar" },
  { pattern: "/os/:id/editar", modulo: "HISTORICO", acao: "editar" },
  { pattern: "/os/:id", modulo: "HISTORICO", acao: "visualizar" },
  { pattern: "/os", modulo: "HISTORICO", acao: "visualizar" },
  { pattern: "/lubrificacao", modulo: "LUBRIFICACAO", acao: "visualizar" },
  { pattern: "/", modulo: "LUBRIFICACAO", acao: "visualizar" },
];

/**
 * Rotas protegidas existentes no App.tsx cujo módulo AUTH62 ainda não foi
 * confirmado. Documentado para auditoria; acesso somente via wildcard.
 */
export const UNMAPPED_PROTECTED_ROUTES = [] as const;

/** Rotas públicas: nunca exigem módulo. */
export const PUBLIC_ROUTES = ["/login", "/auth", "/equipamento/:codigo"] as const;

export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some((p) => matchPath({ path: p, end: true }, path) !== null);
}

export function resolveRoutePermission(path: string): RoutePermission | null {
  for (const rp of ROUTE_PERMISSION_MAP) {
    if (matchPath({ path: rp.pattern, end: true }, path)) return rp;
  }
  return null;
}

function normModulo(m: unknown): string {
  return String(m ?? "").trim().toUpperCase();
}

function isTrue(v: unknown): boolean {
  if (v === true) return true;
  if (typeof v === "string") {
    const s = v.trim().toUpperCase();
    return s === "SIM" || s === "TRUE";
  }
  return false;
}

/**
 * Localiza a regra aplicável com a MESMA precedência do auth62Autorizar_:
 * wildcard primeiro; regra específica somente se não houver wildcard.
 */
export function findRegra(
  permissoes: Permissao[] | null | undefined,
  modulo: string | null
): Permissao | null {
  if (!Array.isArray(permissoes) || permissoes.length === 0) return null;
  const wildcard = permissoes.find((p) => normModulo(p?.modulo) === WILDCARD_MODULO);
  if (wildcard) return wildcard;
  if (!modulo) return null;
  const alvo = normModulo(modulo);
  return permissoes.find((p) => normModulo(p?.modulo) === alvo) ?? null;
}

export function canAccessModule(
  permissoes: Permissao[] | null | undefined,
  modulo: string | null,
  acao: AcaoAuth62 = "visualizar"
): boolean {
  const regra = findRegra(permissoes, modulo);
  if (!regra) return false;
  return isTrue(regra[acao]);
}

/**
 * Decide se o usuário pode abrir a rota.
 *  - rota pública → true
 *  - sem usuário / sem permissões → false
 *  - rota mapeada → regra do módulo (wildcard > específica) + ação exigida
 *  - rota protegida não mapeada → somente wildcard com visualizar
 */
export function canAccessRoute(user: AuthUser | null | undefined, path: string): boolean {
  if (isPublicRoute(path)) return true;
  if (!user) return false;
  const rp = resolveRoutePermission(path);
  if (rp) return canAccessModule(user.permissoes, rp.modulo, rp.acao);
  return canAccessModule(user.permissoes, null, "visualizar");
}
