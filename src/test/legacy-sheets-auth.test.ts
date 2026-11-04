import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";

vi.mock("../../api/_shared/gas-client.js", () => ({
  callGAS: vi.fn(),
  decryptSession: vi.fn(),
  getSessionFromCookies: vi.fn(() => "cookie-teste"),
  clearSessionCookie: vi.fn(() => "cmi_session=; Max-Age=0"),
  validateOrigin: vi.fn(() => ({ valid: true })),
}));
import handler from "../../api/legacy-sheets";
import { callGAS, decryptSession } from "../../api/_shared/gas-client.js";

const LEGACY = "https://script.google.com/macros/s/AKfycbLEGACYTESTE/exec";
function makeRes() {
  const state: { status: number; body: any } = { status: 200, body: null };
  const headers: Record<string, string> = {};
  const res = {
    status: vi.fn((code: number) => { state.status = code; return res; }),
    json: vi.fn((value: unknown) => { state.body = value; return res; }),
    setHeader: vi.fn((k: string, v: string) => { headers[k] = v; return res; }),
  } as unknown as VercelResponse;
  return { res, state, headers };
}
function req(method: string, sheet: string, body?: Record<string, unknown>) {
  return {
    method, query: { sheet }, body: body ?? {},
    headers: { cookie: "cmi_session=cookie-teste", origin: "https://preview.teste" },
  } as unknown as VercelRequest;
}
function authWith(module: string, action: "visualizar" | "criar" | "editar" = "visualizar") {
  vi.mocked(callGAS).mockResolvedValue({
    success: true,
    usuario: { perfil: "PCM" },
    permissoes: [{ modulo: module, [action]: true }],
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  process.env.LEGACY_SHEETS_GAS_URL = LEGACY;
  vi.mocked(decryptSession).mockResolvedValue({
    token: "token-sintetico", perfil: "PCM", nome: "Teste",
    login: "teste", unidade: "TH30", criado_em: Date.now(),
  });
});
afterEach(() => {
  delete process.env.LEGACY_SHEETS_GAS_URL;
  vi.unstubAllGlobals();
});

describe("Ponte de planilhas legadas — AUTH62 obrigatório", () => {
  it("recusa leitura sem permissão antes de chamar o GAS legado", async () => {
    vi.mocked(callGAS).mockResolvedValue({ success: true, permissoes: [] });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { res, state } = makeRes();
    await handler(req("GET", "notas_fiscais"), res);
    expect(state.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("recusa sessão expirada e não toca no GAS legado", async () => {
    vi.mocked(callGAS).mockResolvedValue({ success: false, message: "SESSION_REVOKED" });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { res, state, headers } = makeRes();
    await handler(req("GET", "obras"), res);
    expect(state.status).toBe(401);
    expect(headers["Set-Cookie"]).toContain("Max-Age=0");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("bloqueia planilhas desconhecidas antes de validar sessão", async () => {
    const { res, state } = makeRes();
    await handler(req("GET", "USUARIOS"), res);
    expect(state.status).toBe(400);
    expect(callGAS).not.toHaveBeenCalled();
  });

  it("consulta a planilha autorizada sem token na URL", async () => {
    authWith("NOTAS_FISCAIS");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ data: [{ NUMERO_NF: "1" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { res, state } = makeRes();
    await handler(req("GET", "notas_fiscais"), res);
    expect(state.status).toBe(200);
    expect(state.body).toEqual({ success: true, data: [{ NUMERO_NF: "1" }] });
    const [url, opts] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.searchParams.get("sheet")).toBe("notas_fiscais");
    expect(url.toString()).not.toContain("token");
    expect(opts.method).toBe("GET");
  });

  it("exige permissão CRIAR para registrar serviço externo", async () => {
    authWith("SERVICOS_EXTERNOS", "visualizar");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { res, state } = makeRes();
    await handler(req("POST", "servicos_externos", {
      action: "create", sheet: "servicos_externos", data: { EMPRESA: "Teste" },
    }), res);
    expect(state.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("permite criar cadastro apenas após autenticação e confirmação legada", async () => {
    authWith("SERVICOS_EXTERNOS", "criar");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", fetchMock);
    const { res, state } = makeRes();
    await handler(req("POST", "servicos_externos", {
      action: "create", sheet: "servicos_externos", data: { EMPRESA: "Teste" },
    }), res);
    expect(state.status).toBe(200);
    expect(state.body).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledWith(LEGACY, expect.objectContaining({
      method: "POST", body: JSON.stringify({
        action: "create", sheet: "servicos_externos", data: { EMPRESA: "Teste" },
      }),
    }));
  });

  it("não permite ação arbitrária de obra", async () => {
    const { res, state } = makeRes();
    await handler(req("POST", "obras", {
      action: "excluir_obra", sheet: "obras", payload: { action: "excluir_obra" },
    }), res);
    expect(state.status).toBe(403);
    expect(callGAS).not.toHaveBeenCalled();
  });

  it("exige EDITAR para concluir obra e preserva ação contratada", async () => {
    authWith("OBRAS", "editar");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", fetchMock);
    const { res, state } = makeRes();
    const payload = { action: "concluir_obra", id_obra: "OBRA-1", data_fim: "04/11/2026" };
    await handler(req("POST", "obras", { sheet: "obras", action: "concluir_obra", payload }), res);
    expect(state.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(LEGACY, expect.objectContaining({
      body: JSON.stringify(payload),
    }));
  });
});
