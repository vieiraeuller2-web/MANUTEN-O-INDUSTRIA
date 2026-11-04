import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/api-client", () => ({ apiProxy: vi.fn() }));
import { apiProxy } from "@/lib/api-client";
import { createOSInSheet, type SaveOSFormData } from "@/lib/sheets-api";

const form: SaveOSFormData = {
  equipamento: "TAG001",
  setor: "SERRARIA",
  area: "MAN MECANICA",
  responsavel: "TECNICO TESTE",
  tipo: "CORRETIVA",
  data_inicio: "2026-11-04",
  hora_inicio: "08:00",
  dataConclusao: "2026-11-04",
  horaConclusao: "09:00",
  horimetro: "1234,5",
  observacoes: "Manutencao preventiva de teste",
  client_submission_id: "os-idempotencia-teste",
};

beforeEach(() => vi.clearAllMocks());

describe("KRON — gravacao de OS pelo proxy AUTH62", () => {
  it("mantem o contrato historico e envia somente para o proxy Vercel", async () => {
    vi.mocked(apiProxy).mockResolvedValue({
      success: true, id_os: "OS-TESTE", numero_os: "0001",
      valores_confirmados: { horimetro: "1234,5" },
    });
    const result = await createOSInSheet(form);
    expect(apiProxy).toHaveBeenCalledTimes(1);
    expect(apiProxy).toHaveBeenCalledWith("registrar_os", expect.objectContaining({
      action: "registrar_os",
      client_submission_id: "os-idempotencia-teste",
      horimetro: "1234.5",
      horimetro_informado: "1234.5",
      data_conclusao: "2026-11-04",
      hora_conclusao: "09:00",
    }));
    expect(result.id_os).toBe("OS-TESTE");
    expect(result.payloadEnviado?.equipamento).toBe("TAG001");
  });
  it("preserva a checagem do horimetro retornado pelo backend", async () => {
    vi.mocked(apiProxy).mockResolvedValue({
      success: true, id_os: "OS-TESTE", valores_confirmados: { horimetro: "999" },
    });
    await expect(createOSInSheet(form)).rejects.toThrow("O servidor não confirmou o horímetro");
  });
  it("rejeita campos incompletos antes da chamada remota", async () => {
    await expect(createOSInSheet({ ...form, equipamento: "" })).rejects.toThrow("Campos obrigatórios");
    expect(apiProxy).not.toHaveBeenCalled();
  });
  it("propaga bloqueio de sessao e nao cria resultado otimista", async () => {
    vi.mocked(apiProxy).mockRejectedValue(new Error("Sessão expirada"));
    await expect(createOSInSheet(form)).rejects.toThrow("Sessão expirada");
  });
});
