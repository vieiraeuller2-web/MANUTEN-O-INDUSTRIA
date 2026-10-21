import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  callGAS,
  decryptSession,
  getSessionFromCookies,
  clearSessionCookie,
} from "../_shared/gas-client.js";

/**
 * GET /api/auth/me
 * 
 * Lê cookie de sessão, descriptografa, valida contra auth_me do GAS.
 * Retorna dados do usuário se a sessão é válida.
 * 
 * O backend continua sendo a fonte oficial de verdade.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const cookieValue = getSessionFromCookies(req.headers.cookie ?? null);
  if (!cookieValue) {
    return res.status(401).json({ authenticated: false });
  }

  const session = await decryptSession(cookieValue);
  if (!session) {
    res.setHeader("Set-Cookie", clearSessionCookie());
    return res.status(401).json({ authenticated: false });
  }

  try {
    // Valida contra o backend real
    const gasResponse = await callGAS({
      action: "auth_me",
      token: session.token,
    });

    if (!gasResponse.success) {
      // Sessão expirou no backend
      res.setHeader("Set-Cookie", clearSessionCookie());
      return res.status(401).json({ authenticated: false });
    }

    // Retorna dados atualizados (backend é a fonte de verdade).
    // Suporta o contrato AUTH62 com `usuario` aninhado e o formato plano legado.
    const gasUsuario =
      gasResponse.usuario && typeof gasResponse.usuario === "object"
        ? (gasResponse.usuario as Record<string, unknown>)
        : {};

    return res.status(200).json({
      authenticated: true,
      perfil: gasUsuario.perfil || gasResponse.perfil || session.perfil,
      nome: gasUsuario.nome || gasResponse.nome || session.nome,
      login: gasUsuario.login || gasResponse.login || session.login,
      unidade: gasUsuario.unidade || gasResponse.unidade || session.unidade,
      permissoes: gasResponse.permissoes || session.permissoes || [],
    });
  } catch (err) {
    console.error("[auth/me] Erro ao validar sessão no backend:", err);
    // Fail-closed: o cookie local, isoladamente, não comprova autenticação.
    // Mantém o cookie para permitir recuperação após falha transitória do backend,
    // mas não declara o usuário autenticado sem confirmação do AUTH62.
    return res.status(503).json({
      authenticated: false,
      message: "Não foi possível validar a sessão",
    });
  }
}
