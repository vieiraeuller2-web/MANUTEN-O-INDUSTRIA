import { describe, expect, it } from "vitest";
import { periodoOSManualValido } from "@/lib/tecnico-os-validation";

describe("Validação cronológica da OS Manual", () => {
  it("aceita conclusão após início no mesmo dia", () => {
    expect(periodoOSManualValido("2026-10-28", "08:00", "2026-10-28", "09:30")).toBe(true);
  });
  it("rejeita conclusão anterior no mesmo dia", () => {
    expect(periodoOSManualValido("2026-10-28", "16:20", "2026-10-28", "15:30")).toBe(false);
  });
  it("aceita serviço que termina no dia seguinte", () => {
    expect(periodoOSManualValido("2026-10-28", "23:50", "2026-10-29", "00:10")).toBe(true);
  });
  it("rejeita data impossível e horário inválido", () => {
    expect(periodoOSManualValido("2026-02-30", "10:00", "2026-03-01", "11:00")).toBe(false);
    expect(periodoOSManualValido("2026-10-28", "24:00", "2026-10-29", "01:00")).toBe(false);
  });
  it("aceita intervalo igual conforme contrato operacional", () => {
    expect(periodoOSManualValido("2026-10-28", "08:00", "2026-10-28", "08:00")).toBe(true);
  });
});
