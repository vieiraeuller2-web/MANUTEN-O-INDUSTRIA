/**
 * Utilitários compartilhados para as serverless functions da API Vercel.
 * 
 * Responsabilidades:
 * - Comunicação com o Google Apps Script
 * - Criptografia/descriptografia de sessão (AES-GCM via Web Crypto)
 * - Gerenciamento de cookies de sessão
 * - Validação de CSRF (Origin/Referer)
 */

// ── Tipos ──────────────────────────────────────────────────────

export interface Permissao {
  modulo: string;
  visualizar?: boolean;
  criar?: boolean;
  editar?: boolean;
  excluir?: boolean;
  executar?: boolean;
}

export interface SessionPayload {
  token: string;
  perfil: "ADM" | "PCM" | "GESTAO" | "TECNICO";
  nome: string;
  login: string;
  unidade: string;
  criado_em: number;
  permissoes?: Permissao[];
}

export interface GASResponse {
  success: boolean;
  message?: string;
  code?: number;
  [key: string]: unknown;
}

// ── Constantes ─────────────────────────────────────────────────

const SESSION_COOKIE_NAME = "cmi_session";
const SESSION_MAX_AGE = 12 * 60 * 60; // 12 horas — alinhado ao TTL oficial do AUTH62
const GAS_TIMEOUT_MS = 30_000;

// ── Whitelist de actions ───────────────────────────────────────

export const ALLOWED_ACTIONS = new Set([
  // OS
  "registrar_os",
  "listar_os_paginado",
  "opcoes_formulario_os",
  // Técnico / Equipe (contratos confirmados no AUTH62)
  "equipe_colaboradores",
  "equipe_colaborador_historico",
  "equipe_colaborador_criar",
  "equipe_acessos",
  "equipe_acesso_criar",
  "equipe_tecnicos",
  "equipe_tecnico_criar",
  "equipe_tecnico_status",
  "equipe_tecnico_redefinir_senha",
  "minhas_os",
  "os_manual_tecnico",
  // Preventivas
  "preventivas_resumo",
  "preventivas_setores",
  "preventivas_ativos",
  "preventivas_planos",
  "preventivas_arvore",
  "preventivas_plano_completo",
  "preventiva_gerar_pdf_execucao",
  "preventiva_gerar_pdf_ativo",
  "preventiva_gerar_pdf_setor",
  "preventiva_gerar_pdf_geral",
  "preventiva_gerar_pdf_diretoria",
  "concluir_preventiva",
  // Obras
  "obras_listar",
  "obras_criar",
  "obras_editar",
  // Lubrificação
  "lubrificacao_listar",
  "lubrificacao_registrar",
  // Serviços externos
  "servicos_externos_listar",
  "servicos_externos_criar",
  // KPI operacional (somente leitura)
  "kpi_operacional_health",
  "kpi_operacional_resumo",
  "kpi_operacional_equipamentos",
  "kpi_operacional_eventos",
  "kpi_operacional_paradas",
  // KPI HH/custo (somente leitura)
  "kpi_hh_custo_health",
  "kpi_hh_custo_resumo",
  "kpi_hh_custo_colaboradores",
  "kpi_hh_custo_equipamentos",
  "kpi_hh_custo_eventos",
  "kpi_hh_custo_os",
]);

// Actions de leitura que podem ser reenviadas com segurança
const READ_ACTIONS = new Set([
  // A leitura da própria sessão é feita por POST para não expor o token na URL.
  // Após o patch correspondente no doPost do GAS, redirects podem ser seguidos.
  "auth_me",
  "listar_os_paginado",
  "opcoes_formulario_os",
  "equipe_colaboradores",
  "equipe_colaborador_historico",
  "equipe_acessos",
  "equipe_tecnicos",
  "minhas_os",
  "preventivas_resumo",
  "preventivas_setores",
  "preventivas_ativos",
  "preventivas_planos",
  "preventivas_arvore",
  "preventivas_plano_completo",
  "obras_listar",
  "lubrificacao_listar",
  "servicos_externos_listar",
  "kpi_operacional_health",
  "kpi_operacional_resumo",
  "kpi_operacional_equipamentos",
  "kpi_operacional_eventos",
  "kpi_operacional_paradas",
  "kpi_hh_custo_health",
  "kpi_hh_custo_resumo",
  "kpi_hh_custo_colaboradores",
  "kpi_hh_custo_equipamentos",
  "kpi_hh_custo_eventos",
  "kpi_hh_custo_os",
]);

const GET_ACTIONS = new Set([
  // Leituras confirmadas de técnico/equipe
  "equipe_colaboradores",
  "equipe_colaborador_historico",
  "equipe_acessos",
  "equipe_tecnicos",
  "minhas_os",
  // KPIs publicados via GET
  "kpi_operacional_health",
  "kpi_operacional_resumo",
  "kpi_operacional_equipamentos",
  "kpi_operacional_eventos",
  "kpi_operacional_paradas",
  "kpi_hh_custo_health",
  "kpi_hh_custo_resumo",
  "kpi_hh_custo_colaboradores",
  "kpi_hh_custo_equipamentos",
  "kpi_hh_custo_eventos",
  "kpi_hh_custo_os",
]);

// ── GAS Communication ──────────────────────────────────────────

export function resolveGASMethodForAction(
  action: string,
  explicitMethod?: "GET" | "POST"
): "GET" | "POST" {
  return explicitMethod ?? (GET_ACTIONS.has(action) ? "GET" : "POST");
}

function getGASUrl(): string {
  const url = process.env.GAS_WEBAPP_URL;
  if (!url) throw new Error("GAS_WEBAPP_URL não configurada");
  return url;
}

/**
 * Chama o Google Apps Script.
 * Trata redirects (302/307) que o Web App do GAS produz.
 * Para actions de leitura, segue redirects automaticamente.
 * Para actions de escrita, NÃO reenvia automaticamente.
 */
export async function callGAS(
  body: Record<string, unknown>,
  options?: { method?: "GET" | "POST" }
): Promise<GASResponse> {
  const action = String(body.action || "");
  const method = resolveGASMethodForAction(action, options?.method);
  const gasUrl = getGASUrl();
  const isRead = READ_ACTIONS.has(action);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GAS_TIMEOUT_MS);

  try {
    let response: Response;

    if (method === "GET") {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(body)) {
        if (v !== null && v !== undefined) params.set(k, String(v));
      }
      response = await fetch(`${gasUrl}?${params}`, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
      });
    } else {
      // POST — redirect manual para evitar reenvio de escritas
      response = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(body),
        redirect: isRead ? "follow" : "manual",
        signal: controller.signal,
      });

      // Se GAS retornou redirect e é escrita, segue com GET (o redirect do GAS)
      if (!isRead && (response.status === 302 || response.status === 307)) {
        const redirectUrl = response.headers.get("Location");
        if (redirectUrl) {
          response = await fetch(redirectUrl, {
            method: "GET",
            redirect: "follow",
            signal: controller.signal,
          });
        }
      }
    }

    const text = await response.text();
    try {
      return JSON.parse(text) as GASResponse;
    } catch {
      // Não registrar corpo bruto: páginas de erro podem conter dados sensíveis.\n      console.error("[GAS] Resposta não-JSON recebida do backend");
      return { success: false, message: "Resposta inválida do servidor" };
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false, message: "Timeout ao conectar com o backend" };
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Criptografia de Sessão (AES-GCM via Web Crypto) ────────────

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_COOKIE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_COOKIE_SECRET ausente ou curta demais (min 32 chars)");
  }
  // Deriva uma chave de 256 bits a partir do segredo
  const encoder = new TextEncoder();
  const raw = encoder.encode(secret);
  return raw.slice(0, 32);
}

async function getKey(): Promise<CryptoKey> {
  const rawKey = getSessionSecret();
  return crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptSession(payload: SessionPayload): Promise<string> {
  const key = await getKey();
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  // Formato: base64(iv + ciphertext)
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return Buffer.from(combined).toString("base64url");
}

export async function decryptSession(
  cookieValue: string
): Promise<SessionPayload | null> {
  try {
    const key = await getKey();
    const combined = Buffer.from(cookieValue, "base64url");
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    const payload = JSON.parse(decoder.decode(decrypted)) as SessionPayload;

    // Verifica expiração
    const age = (Date.now() - payload.criado_em) / 1000;
    if (age > SESSION_MAX_AGE) return null;

    return payload;
  } catch {
    return null;
  }
}

// ── Cookies ────────────────────────────────────────────────────

export function setSessionCookie(value: string): string {
  const isProduction = process.env.NODE_ENV === "production";
  const parts = [
    `${SESSION_COOKIE_NAME}=${value}`,
    "HttpOnly",
    `Max-Age=${SESSION_MAX_AGE}`,
    "Path=/",
    `SameSite=Lax`,
  ];
  if (isProduction) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Max-Age=0; Path=/; SameSite=Lax`;
}

export function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  const cookies: Record<string, string> = {};
  header.split(";").forEach((part) => {
    const [key, ...rest] = part.trim().split("=");
    if (key) cookies[key.trim()] = rest.join("=").trim();
  });
  return cookies;
}

export function getSessionFromCookies(
  cookieHeader: string | null
): string | null {
  const cookies = parseCookies(cookieHeader);
  return cookies[SESSION_COOKIE_NAME] || null;
}

// ── CSRF ───────────────────────────────────────────────────────

const ALLOWED_ORIGINS = new Set([
  // Adicionar domínios reais quando configurados
]);

type NodeHeaderValue = string | string[] | undefined;
type NodeLikeHeaders = Record<string, NodeHeaderValue>;

/**
 * Lê um header tanto de Web `Headers` (headers.get) quanto de
 * headers Node/VercelRequest (objeto simples, chaves em minúsculas).
 * Retorna null se ausente — nunca inventa valor.
 */
function readHeader(
  headers: Headers | NodeLikeHeaders | undefined | null,
  name: string
): string | null {
  if (!headers) return null;
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name);
  }
  const raw = (headers as NodeLikeHeaders)[name.toLowerCase()];
  if (Array.isArray(raw)) {
    const first = raw.find((v) => typeof v === "string" && v.length > 0);
    return first ?? null;
  }
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

export function validateOrigin(
  req: Request | { headers: NodeLikeHeaders },
  method: string
): { valid: boolean; reason?: string } {
  // GET não requer validação (não é mutável)
  if (method === "GET") return { valid: true };

  const origin = readHeader(req.headers, "origin");
  const referer = readHeader(req.headers, "referer");

  // Em produção, validar origin ou referer
  if (process.env.VERCEL_URL) {
    const vercelUrl = `https://${process.env.VERCEL_URL}`;
    ALLOWED_ORIGINS.add(vercelUrl);
  }
  if (process.env.ALLOWED_ORIGIN) {
    ALLOWED_ORIGINS.add(process.env.ALLOWED_ORIGIN);
  }

  // localhost para dev
  if (process.env.NODE_ENV !== "production") {
    return { valid: true };
  }

  if (origin) {
    if (ALLOWED_ORIGINS.has(origin)) return { valid: true };
    return { valid: false, reason: `Origin não permitido: ${origin}` };
  }

  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (ALLOWED_ORIGINS.has(refOrigin)) return { valid: true };
    } catch { /* ignore */ }
  }

  return { valid: false, reason: "Origin/Referer ausente" };
}
