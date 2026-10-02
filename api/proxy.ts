import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  callGAS,
  decryptSession,
  getSessionFromCookies,
  clearSessionCookie,
  validateOrigin,
  ALLOWED_ACTIONS,
} from "../_shared/gas-client.js";

/**
 * POST /api/proxy
 * 
 * Proxy com whitelist explícita de actions.
 * O navegador NÃO pode enviar uma URL arbitrária.
 * 
 * Fluxo:
 * 1. Valida CSRF (Origin)
 * 2. Lê cookie de sessão
 * 3. Descriptografa e valida sessão
 * 4. Verifica se a action está na whitelist
 * 5. Encaminha ao GAS com o token real da sessão
 * 6. Retorna resposta sem expor o token
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  // CSRF
  const csrf = validateOrigin(req as unknown as Request, "POST");
  if (!csrf.valid) {
    return res.status(403).json({ success: false, message: csrf.reason });
  }

  // Sessão
  const cookieValue = getSessionFromCookies(req.headers.cookie ?? null);
  if (!cookieValue) {
    return res.status(401).json({ success: false, message: "Sessão ausente" });
  }

  const session = await decryptSession(cookieValue);
  if (!session) {
    res.setHeader("Set-Cookie", clearSessionCookie());
    return res.status(401).json({ success: false, message: "Sessão inválida ou expirada" });
  }

  // Extrai action do body
  const body = req.body ?? {};
  const action = String(body.action || "").trim();

  if (!action) {
    return res.status(400).json({ success: false, message: "Action ausente" });
  }

  // Whitelist
  if (!ALLOWED_ACTIONS.has(action)) {
    return res.status(403).json({
      success: false,
      message: `Action não permitida: ${action}`,
    });
  }

  try {
    // Encaminha ao GAS com o token real (que o frontend nunca vê)
    const gasResponse = await callGAS({
      ...body,
      action,
      token: session.token,
      usuario: session.login,
      unidade: session.unidade,
    });

    // Se GAS indicar sessão inválida, limpa cookie
    if (gasResponse.code === 401 || gasResponse.message?.includes("Sessão inválida")) {
      res.setHeader("Set-Cookie", clearSessionCookie());
      return res.status(401).json({ success: false, message: "Sessão expirada" });
    }

    // Remove token da resposta (se presente) antes de enviar ao frontend
    const { token: _token, session_token: _st, ...safeResponse } = gasResponse as Record<string, unknown>;

    return res.status(gasResponse.success ? 200 : 400).json(safeResponse);
  } catch (err) {
    console.error("[proxy] Erro:", err);
    return res.status(500).json({
      success: false,
      message: "Erro ao comunicar com o backend",
    });
  }
}
