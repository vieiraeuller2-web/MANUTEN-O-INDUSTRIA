import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-client", () => ({
  apiProxy: vi.fn(),
}));

import { apiProxy } from "@/lib/api-client";
import { registrarOSManualTecnico } from "@/lib/tecnico-api";

describe("registrarOSManualTecnico", () => {
  it("envia a action dedicada com o payload tecnico", async () => {
    vi.mocked(apiProxy).mockResolvedValueOnce({
      success: true,
      id_os: "OS-TESTE",
    });

    const payload = {
      equipamento: "MTF001",
      area: "MAN. MECÂNICA",
      tipo: "CORRETIVA",
      data_inicio: "2026-10-16",
      hora_inicio: "08:00",
      data_conclusao: "2026-10-16",
      hora_conclusao: "09:00",
      horimetro: "100",
      observacoes: "Teste",
    };

    const result = await registrarOSManualTecnico(payload);

    expect(apiProxy).toHaveBeenCalledWith("os_manual_tecnico", payload);
    expect(result.id_os).toBe("OS-TESTE");
  });
});
