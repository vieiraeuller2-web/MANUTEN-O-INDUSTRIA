/**
 * Sinais explícitos de sessão inválida devolvidos pelo AUTH62.
 * Não confundir falta de permissão (ACCESS_DENIED/403) nem falhas de GAS
 * com sessão revogada: nesses casos não apagamos o cookie.
 */
export function sessaoRejeitadaPeloAUTH62(
  response: { success?: unknown; code?: unknown; message?: unknown },
): boolean {
  if (response?.success === true) return false;
  const normalizar = (valor: unknown): string =>
    typeof valor === "string" || typeof valor === "number"
      ? String(valor).trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
      : "";
  const codigo = normalizar(response?.code);
  const motivo = normalizar(response?.message);

  if ([
    "401", "SESSION_INVALID", "SESSION_EXPIRED", "SESSION_REVOKED",
    "TOKEN_INVALID", "TOKEN_EXPIRED", "TOKEN_REVOKED", "USER_INACTIVE",
  ].includes(codigo)) return true;

  if ([
    "SESSION_INVALID", "SESSION_EXPIRED", "SESSION_REVOKED",
    "TOKEN_INVALID", "TOKEN_EXPIRED", "TOKEN_REVOKED", "USER_INACTIVE",
    "SESSAO INVALIDA", "SESSAO EXPIRADA", "SESSAO INATIVA",
    "SESSAO REVOGADA", "SESSAO INATIVA OU REVOGADA",
    "TOKEN INVALIDO", "TOKEN EXPIRADO", "TOKEN REVOGADO",
    "USUARIO INATIVO",
  ].includes(motivo)) return true;

  return false;
}
