/**
 * Ponte de planilhas legadas. Verifica AUTH62 NO SERVIDOR antes de acessar o GAS
 * antigo, que usa ?sheet e {action:"create",sheet,data}.
 *
 * Protege a chamada feita pelo KRON, NÃO substitui a proteção no GAS de origem:
 * o Web App legado deve ter autorização própria contra acessos diretos.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  callGAS, decryptSession, getSessionFromCookies, clearSessionCookie, validateOrigin,
  type Permissao,
} from "./_shared/gas-client.js";
import { sessaoRejeitadaPeloAUTH62 } from "./_shared/auth62-session-status.js";

type Recurso = "obras" | "notas_fiscais" | "servicos_externos" | "lubrificacao";
const RECURSOS: Record<Recurso, string> = {
  obras: "OBRAS",
  notas_fiscais: "NOTAS_FISCAIS",
  servicos_externos: "SERVICOS_EXTERNOS",
  lubrificacao: "LUBRIFICACAO",
};
const PODE_CRIAR = new Set<Recurso>(["notas_fiscais", "servicos_externos"]);
const ORIGEM_GAS = "https://script.google.com";

function recursoValido(valor: unknown): valor is Recurso {
  return typeof valor === "string" && Object.prototype.hasOwnProperty.call(RECURSOS, valor);
}
function permitido(permissoes: Permissao[], modulo: string, acao: "visualizar" | "criar"): boolean {
  const wildcard = permissoes.find(p => String(p.modulo).toUpperCase() === "*");
  const regra = wildcard ?? permissoes.find(p => String(p.modulo).toUpperCase() === modulo);
  const valor = regra?.[acao];
  return valor === true || (typeof valor === "string" && ["SIM", "TRUE"].includes(valor.toUpperCase()));
}
function urlLegacy(): string {
  const raw = process.env.LEGACY_SHEETS_GAS_URL;
  if (!raw) throw new Error("LEGACY_SHEETS_GAS_URL não configurada");
  const parsed = new URL(raw);
  if (parsed.origin !== ORIGEM_GAS || !/^\/macros\/s\/[^/]+\/exec$/.test(parsed.pathname) || parsed.search || parsed.hash) {
    throw new Error("LEGACY_SHEETS_GAS_URL inválida");
  }
  return parsed.toString();
}
function respostaSemCache(res: VercelResponse) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Vary", "Cookie");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  respostaSemCache(res);
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Método não permitido" });
  }
  if (req.method === "POST" && !validateOrigin(req as unknown as Request, "POST").valid) {
    return res.status(403).json({ success: false, message: "Origem não autorizada" });
  }
  const sheet = req.method === "GET" ? req.query?.sheet : req.body?.sheet;
  if (!recursoValido(sheet)) {
    return res.status(400).json({ success: false, message: "Planilha não permitida" });
  }
  const creating = req.method === "POST";
  if (creating && (!PODE_CRIAR.has(sheet) || req.body?.action !== "create" ||
      !req.body?.data || typeof req.body.data !== "object" || Array.isArray(req.body.data))) {
    return res.status(403).json({ success: false, message: "Operação não permitida" });
  }

  const cookieValue = getSessionFromCookies(req.headers.cookie ?? null);
  if (!cookieValue) return res.status(401).json({ success: false, message: "Sessão ausente" });
  const session = await decryptSession(cookieValue);
  if (!session) {
    res.setHeader("Set-Cookie", clearSessionCookie());
    return res.status(401).json({ success: false, message: "Sessão inválida" });
  }

  try {
    const auth = await callGAS({ action: "auth_me", token: session.token });
    if (!auth.success) {
      if (sessaoRejeitadaPeloAUTH62(auth)) {
        res.setHeader("Set-Cookie", clearSessionCookie());
        return res.status(401).json({ success: false, message: "Sessão expirada" });
      }
      return res.status(503).json({ success: false, message: "Não foi possível validar a sessão" });
    }
    const usuario = auth.usuario && typeof auth.usuario === "object"
      ? auth.usuario as Record<string, unknown> : {};
    const permissoes = Array.isArray(auth.permissoes)
      ? auth.permissoes as Permissao[]
      : Array.isArray(usuario.permissoes) ? usuario.permissoes as Permissao[] : [];
    if (!permitido(permissoes, RECURSOS[sheet], creating ? "criar" : "visualizar")) {
      return res.status(403).json({ success: false, message: "Sem permissão" });
    }
    const destino = urlLegacy();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      let upstream: Response;
      if (creating) {
        upstream = await fetch(destino, {
          method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "create", sheet, data: req.body.data }),
          redirect: "follow", signal: controller.signal,
        });
      } else {
        const url = new URL(destino);
        url.searchParams.set("sheet", sheet);
        upstream = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal });
      }
      if (!upstream.ok) return res.status(502).json({ success: false, message: "Falha no serviço legado" });
      const payload: unknown = await upstream.json();
      if (creating) {
        if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
            ((payload as Record<string, unknown>).success !== true && (payload as Record<string, unknown>).ok !== true)) {
          return res.status(502).json({ success: false, message: "Serviço legado não confirmou a gravação" });
        }
        return res.status(200).json({ success: true });
      }
      if (Array.isArray(payload)) return res.status(200).json({ success: true, data: payload });
      if (!payload || typeof payload !== "object") {
        return res.status(502).json({ success: false, message: "Resposta inválida do serviço legado" });
      }
      const obj = payload as Record<string, unknown>;
      if (obj.success === false) return res.status(502).json({ success: false, message: "Consulta legada recusada" });
      const data = Array.isArray(obj.data) ? obj.data : Array.isArray(obj.rows) ? obj.rows : null;
      if (!data) return res.status(502).json({ success: false, message: "Formato de dados legado inválido" });
      return res.status(200).json({ success: true, data });
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return res.status(503).json({ success: false, message: "Serviço indisponível ou não configurado" });
  }
}
