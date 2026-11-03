import { afterEach, describe, expect, it, vi } from "vitest";
import { apiProxy } from "@/lib/api-client";

afterEach(() => vi.unstubAllGlobals());

describe("Histórico de OS — cancelamento de consultas", () => {
  it("encaminha AbortSignal ao fetch sem alterar o contrato POST", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, items: [], pages: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await apiProxy("listar_os_paginado", { busca: "TAG123", page_size: 50 }, { signal: controller.signal });

    expect(fetchMock).toHaveBeenCalledWith("/api/proxy", expect.objectContaining({
      method: "POST",
      credentials: "include",
      signal: controller.signal,
      body: JSON.stringify({ busca: "TAG123", page_size: 50, action: "listar_os_paginado" }),
    }));
  });

  it("continua permitindo outras chamadas sem signal", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await apiProxy("opcoes_formulario_os");
    expect(fetchMock).toHaveBeenCalledWith("/api/proxy", expect.objectContaining({
      signal: undefined,
      body: JSON.stringify({ action: "opcoes_formulario_os" }),
    }));
  });
});
