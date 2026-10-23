import { afterEach, describe, expect, it, vi } from "vitest";
import { apiGetMe, SessionVerificationError } from "@/lib/api-client";

afterEach(() => vi.unstubAllGlobals());

describe("Verificação de sessão AUTH62 após F5", () => {
  it("restaura o usuário apenas quando o servidor confirma a sessão", async () => {
    const mock = vi.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({ authenticated: true, perfil: "PCM", nome: "Teste", login: "teste", unidade: "THOR", permissoes: [{ modulo: "HISTORICO", visualizar: true }] }),
    }));
    vi.stubGlobal("fetch", mock);
    expect((await apiGetMe())?.login).toBe("teste");
    expect(mock).toHaveBeenCalledWith("/api/auth/me", expect.objectContaining({ credentials: "include", cache: "no-store" }));
  });

  it("retorna sessão não autenticada somente com HTTP 401", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 401 })));
    expect(await apiGetMe()).toBeNull();
  });

  it.each([403, 429, 500, 503])("não trata erro HTTP %s como logout", async (status) => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status })));
    await expect(apiGetMe()).rejects.toBeInstanceOf(SessionVerificationError);
  });

  it("não trata falha de rede como logout", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    await expect(apiGetMe()).rejects.toBeInstanceOf(SessionVerificationError);
  });

  it("não aceita respostas sem confirmação positiva", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ authenticated: false }) })));
    await expect(apiGetMe()).rejects.toBeInstanceOf(SessionVerificationError);
  });
});
