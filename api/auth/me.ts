import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  callGAS,
  decryptSession,
  getSessionFromCookies,
  clearSessionCookie,
} from "../_shared/gas-client.js";
import { diagnosticarFalhaAuthMe } from "../_shared/auth-me-diagnostics.js";

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
  // Resposta de sessão nunca deve ser armazenada por navegador ou CDN.
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Vary", "Cookie");
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const cookieValue = getSessionFromCookies(req.headers.cookie ?? null);
  if (!cookieValue) {
    console.info("[auth/me][diagnostico] etapa=cookie_ausente");
    return res.status(401).json({ authenticated: false });
  }

  const session = await decryptSession(cookieValue);
  if (!session) {
    console.warn("[auth/me][diagnostico] etapa=cookie_invalido_ou_expirado");
    res.setHeader("Set-Cookie", clearSessionCookie());
    return res.status(401).json({ authenticated: false });
  }

  console.info("[auth/me][diagnostico] etapa=cookie_descriptografado");

  try {
    // Valida contra o backend real
    const gasResponse = await callGAS({
      action: "auth_me",
      token: session.token,
    });

    if (!gasResponse.success) {
      // O AUTH62 pode recusar tokens com message sem enviar code=401.
      // Apenas os motivos explícitos de sessão revogada/expirada recebem 401.
      const message = typeof gasResponse.message === "string" ? gasResponse.message.trim() : "";
      const invalidSession = gasResponse.code === 401 ||
        /^(?:SESSION_INVALID|SESSION_EXPIRED|TOKEN_INVALID|TOKEN_EXPIRED|USER_INACTIVE)$/i.test(message) ||
        /^(?:sess[aã]o (?:inv[aá]lida|expirada|inativa|revogada)|token (?:inv[aá]lido|expirado))$/i.test(message);
      if (invalidSession) {
        console.warn("[auth/me][diagnostico] etapa=auth62_rejeitou");
        res.setHeader("Set-Cookie", clearSessionCookie());
        return res.status(401).json({ authenticated: false });
      }

      // Distingue falhas de comunicação de falhas no contrato auth_me.
      // Nenhuma mensagem bruta, token, cookie ou identidade aparece no log/resposta.
      const { motivo: reason, categoria, campos } = diagnosticarFalhaAuthMe(gasResponse);
      console.warn(`[auth/me][diagnostico] etapa=auth62_nao_confirmou motivo=${reason} categoria=${categoria} campos=${campos} codigo=${typeof gasResponse.code === "number" ? gasResponse.code : "indefinido"}`);
      return res.status(503).json({
        authenticated: false,
        message: "Não foi possível validar a sessão",
        reason,
      });
    }

    // Retorna dados atualizados (backend é a fonte de verdade).
    // Suporta o contrato AUTH62 com `usuario` aninhado e o formato plano legado.
    const gasUsuario =
      gasResponse.usuario && typeof gasResponse.usuario === "object"
        ? (gasResponse.usuario as Record<string, unknown>)
        : {};

    console.info("[auth/me][diagnostico] etapa=auth62_confirmou");
    return res.status(200).json({
      authenticated: true,
      perfil: gasUsuario.perfil || gasResponse.perfil || session.perfil,
      nome: gasUsuario.nome || gasResponse.nome || session.nome,
      login: gasUsuario.login || gasResponse.login || session.login,
      unidade: gasUsuario.unidade || gasResponse.unidade || session.unidade,
      // Permissões precisam vir da validação ATUAL do AUTH62. Nunca
      // restaurar privilégios antigos a partir do cookie de login.
      permissoes: Array.isArray(gasResponse.permissoes)
        ? gasResponse.permissoes
        : Array.isArray(gasUsuario.permissoes)
          ? gasUsuario.permissoes
          : [],
    });
  } catch {
    console.error("[auth/me][diagnostico] etapa=falha_comunicacao");
    // Fail-closed: o cookie local, isoladamente, não comprova autenticação.
    // Mantém o cookie para permitir recuperação após falha transitória do backend,
    // mas não declara o usuário autenticado sem confirmação do AUTH62.
    return res.status(503).json({
      authenticated: false,
      message: "Não foi possível validar a sessão",
      reason: "GAS_COMMUNICATION_ERROR",
    });
  }
}
