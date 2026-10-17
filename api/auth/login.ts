import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  callGAS,
  encryptSession,
  setSessionCookie,
  validateOrigin,
  type SessionPayload,
} from "../_shared/gas-client.js";

/**
 * POST /api/auth/login
 * 
 * Recebe { login, senha }, autentica via GAS auth_login,
 * cria sessão HttpOnly cookie com token criptografado.
 * 
 * A senha existe apenas durante a requisição.
 * O token real do GAS NÃO é enviado ao navegador.
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

  const { login, senha } = req.body ?? {};

  if (!login || !senha) {
    return res.status(400).json({
      success: false,
      message: "Login e senha são obrigatórios",
    });
  }

  try {
    const gasResponse = await callGAS({
      action: "auth_login",
      login: String(login).trim(),
      senha: String(senha),
    });

    if (!gasResponse.success) {
      return res.status(401).json({
        success: false,
        message: gasResponse.message || "Credenciais inválidas",
      });
    }

    // Extrai dados da resposta oficial do AUTH62.
    // auth62Login_ retorna os dados do usuário dentro de `usuario`,
    // mas mantemos fallback para formato plano por compatibilidade.
    const gasUsuario =
      gasResponse.usuario && typeof gasResponse.usuario === "object"
        ? (gasResponse.usuario as Record<string, unknown>)
        : {};

    const token = String(gasResponse.token || gasResponse.session_token || "");
    const perfilRaw = String(
      gasUsuario.perfil || gasResponse.perfil || ""
    ).trim().toUpperCase();
    const nome = String(
      gasUsuario.nome || gasResponse.nome || gasResponse.name || ""
    );
    const userLogin = String(
      gasUsuario.login || gasResponse.login || login
    );
    const unidade = String(
      gasUsuario.unidade || gasResponse.unidade || gasResponse.unit || ""
    );
    const permissoes = (gasResponse.permissoes || []) as SessionPayload["permissoes"];

    if (!["ADM", "PCM", "GESTAO", "TECNICO"].includes(perfilRaw)) {
      console.error("[auth/login] Perfil AUTH62 ausente ou inválido");
      return res.status(500).json({
        success: false,
        message: "Perfil de autenticação inválido",
      });
    }

    const perfil = perfilRaw as SessionPayload["perfil"];

    if (!token) {
      console.error("[auth/login] GAS não retornou token");
      return res.status(500).json({
        success: false,
        message: "Erro interno de autenticação",
      });
    }

    // Cria sessão criptografada
    const sessionPayload: SessionPayload = {
      token,
      perfil,
      nome,
      login: userLogin,
      unidade,
      criado_em: Date.now(),
      permissoes,
    };

    const encrypted = await encryptSession(sessionPayload);
    res.setHeader("Set-Cookie", setSessionCookie(encrypted));

    // Retorna dados do usuário SEM o token
    return res.status(200).json({
      success: true,
      authenticated: true,
      perfil,
      nome,
      login: userLogin,
      unidade,
      permissoes,
    });
  } catch (err) {
    console.error("[auth/login] Erro:", err);
    return res.status(500).json({
      success: false,
      message: "Erro interno ao autenticar",
    });
  }
}
