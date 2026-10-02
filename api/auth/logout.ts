import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  callGAS,
  decryptSession,
  getSessionFromCookies,
  clearSessionCookie,
  validateOrigin,
} from "../_shared/gas-client.js";

/**
 * POST /api/auth/logout
 * 
 * 1. Lê cookie e descriptografa
 * 2. Chama auth_logout do GAS para invalidar token
 * 3. Limpa cookie independentemente do resultado
 * 4. Retorna sucesso
 * 
 * Seguro mesmo se o backend reportar sessão já inválida.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const csrf = validateOrigin(req as unknown as Request, "POST");
  if (!csrf.valid) {
    return res.status(403).json({ success: false, message: csrf.reason });
  }

  const cookieValue = getSessionFromCookies(req.headers.cookie ?? null);

  if (cookieValue) {
    const session = await decryptSession(cookieValue);
    if (session?.token) {
      // Notifica o backend (best-effort, não bloqueia o logout)
      await callGAS({
        action: "auth_logout",
        token: session.token,
      }).catch(() => {
        // Ignora erro — o cookie será limpo de qualquer forma
      });
    }
  }

  // Limpa cookie independentemente
  res.setHeader("Set-Cookie", clearSessionCookie());
  return res.status(200).json({ success: true });
}
