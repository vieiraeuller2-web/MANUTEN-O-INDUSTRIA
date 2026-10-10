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

    // Retorna dados atualizados (backend é a fonte de verdade)
    return res.status(200).json({
      authenticated: true,
      perfil: gasResponse.perfil || session.perfil,
      nome: gasResponse.nome || session.nome,
      login: gasResponse.login || session.login,
      unidade: gasResponse.unidade || session.unidade,
      permissoes: gasResponse.permissoes || session.permissoes || [],
    });
  } catch (err) {
    console.error("[auth/me] Erro:", err);
    // Em caso de falha de comunicação, usa dados do cookie
    // (mas não cria nova sessão)
    return res.status(200).json({
      authenticated: true,
      perfil: session.perfil,
      nome: session.nome,
      login: session.login,
      unidade: session.unidade,
      permissoes: session.permissoes || [],
    });
  }
}
