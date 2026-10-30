import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Simula o AUTH62, sem acessar Google Sheets nem usar credenciais reais.
vi.mock("../../api/_shared/gas-client.js", () => ({
  callGAS: vi.fn(),
  decryptSession: vi.fn(),
  getSessionFromCookies: vi.fn(),
  clearSessionCookie: vi.fn(() => "cmi_session=; HttpOnly; Max-Age=0; Path=/; SameSite=Lax"),
  validateOrigin: vi.fn(() => ({ valid: true })),
  ALLOWED_ACTIONS: new Set(["equipe_acessos"]),
}));

import proxyHandler from "../../api/proxy";
import meHandler from "../../api/auth/me";
import {
  callGAS,
  decryptSession,
  getSessionFromCookies,
} from "../../api/_shared/gas-client.js";

function mockResponse() {
  const headers = new Map<string, string>();
  const state: { status: number; body: unknown } = { status: 200, body: null };
  const res = {
    setHeader: vi.fn((key: string, value: string) => { headers.set(key, value); return res; }),
    status: vi.fn((status: number) => { state.status = status; return res; }),
    json: vi.fn((body: unknown) => { state.body = body; return res; }),
  } as unknown as VercelResponse;
  return { res, headers, state };
}

function request(method: "GET" | "POST", body?: Record<string, unknown>) {
  return {
    method,
    body,
    headers: { cookie: "cmi_session=cookie-ficticio", origin: "https://preview.teste" },
  } as unknown as VercelRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSessionFromCookies).mockReturnValue("cookie-ficticio");
  vi.mocked(decryptSession).mockResolvedValue({
    token: "token-sintetico",
    login: "tecnico.test",
    unidade: "TH30",
    perfil: "TECNICO",
    nome: "Técnico de teste",
    criado_em: Date.now(),
  });
});

describe("Integração Vercel ↔ AUTH62 — revogação simulada", () => {
  it("bloqueia uma requisição protegida após USER_INACTIVE e limpa cookie", async () => {
    vi.mocked(callGAS).mockResolvedValue({ success: false, message: "USER_INACTIVE" });
    const { res, state, headers } = mockResponse();

    await proxyHandler(request("POST", { action: "equipe_acessos" }), res);

    expect(state.status).toBe(401);
    expect(state.body).toEqual({ success: false, message: "Sessão expirada" });
    expect(headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect(JSON.stringify(state.body)).not.toContain("token-sintetico");
  });

  it("não confunde ACCESS_DENIED com conta revogada", async () => {
    vi.mocked(callGAS).mockResolvedValue({ success: false, code: 403, message: "ACCESS_DENIED" });
    const { res, state, headers } = mockResponse();

    await proxyHandler(request("POST", { action: "equipe_acessos" }), res);

    expect(state.status).toBe(400);
    expect(headers.has("Set-Cookie")).toBe(false);
  });

  it("bloqueia actions não autorizadas antes de encaminhar ao GAS", async () => {
    const { res, state } = mockResponse();
    await proxyHandler(request("POST", { action: "alterar_permissoes" }), res);
    expect(state.status).toBe(403);
    expect(callGAS).not.toHaveBeenCalled();
  });

  it("não confia apenas no cookie quando a sessão não pode ser verificada", async () => {
    vi.mocked(callGAS).mockResolvedValue({ success: false, message: "Timeout ao conectar com o backend" });
    const { res, state, headers } = mockResponse();

    await meHandler(request("GET"), res);

    expect(state.status).toBe(503);
    expect(state.body).toMatchObject({ authenticated: false });
    expect(headers.has("Set-Cookie")).toBe(false);
    expect(headers.get("Cache-Control")).toContain("no-store");
  });

  it("trata conta inativa como logout também na verificação de sessão", async () => {
    vi.mocked(callGAS).mockResolvedValue({ success: false, message: "Sessão inativa ou revogada" });
    const { res, state, headers } = mockResponse();

    await meHandler(request("GET"), res);

    expect(state.status).toBe(401);
    expect(state.body).toEqual({ authenticated: false });
    expect(headers.get("Set-Cookie")).toContain("Max-Age=0");
  });

  it("não restaura permissões antigas do cookie em sessão autorizada", async () => {
    vi.mocked(callGAS).mockResolvedValue({
      success: true,
      usuario: { perfil: "TECNICO", nome: "Teste", login: "tecnico.test", unidade: "TH30" },
      permissoes: [{ modulo: "MINHAS_OS", visualizar: true }],
    });
    const { res, state } = mockResponse();

    await meHandler(request("GET"), res);

    expect(state.status).toBe(200);
    expect(state.body).toMatchObject({
      authenticated: true,
      login: "tecnico.test",
      permissoes: [{ modulo: "MINHAS_OS", visualizar: true }],
    });
    expect(callGAS).toHaveBeenCalledWith({ action: "auth_me", token: "token-sintetico" });
  });
});
