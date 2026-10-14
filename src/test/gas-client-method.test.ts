import { describe, expect, it } from "vitest";
import { resolveGASMethodForAction } from "../../api/_shared/gas-client";

describe("resolveGASMethodForAction", () => {
  it("usa GET para endpoints KPI homologados como leitura", () => {
    expect(resolveGASMethodForAction("kpi_operacional_resumo")).toBe("GET");
    expect(resolveGASMethodForAction("kpi_hh_custo_resumo")).toBe("GET");
  });

  it("preserva POST para actions existentes não-KPI", () => {
    expect(resolveGASMethodForAction("registrar_os")).toBe("POST");
  });

  it("respeita método explícito quando informado", () => {
    expect(
      resolveGASMethodForAction("kpi_operacional_resumo", "POST")
    ).toBe("POST");
  });
});
