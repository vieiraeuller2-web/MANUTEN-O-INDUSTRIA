import { describe, expect, it } from "vitest";
import { ALLOWED_ACTIONS } from "../../api/_shared/gas-client";
import {
  KPI_HH_CUSTO_ACTIONS,
  KPI_OPERACIONAL_ACTIONS,
} from "@/lib/kpi-contract";
import { isKpiAction } from "@/lib/kpi-api";

describe("KPI contract", () => {
  const allKpiActions = [
    ...KPI_OPERACIONAL_ACTIONS,
    ...KPI_HH_CUSTO_ACTIONS,
  ];

  it("mantém todas as actions KPI na whitelist do proxy", () => {
    for (const action of allKpiActions) {
      expect(ALLOWED_ACTIONS.has(action)).toBe(true);
    }
  });

  it("reconhece somente actions KPI conhecidas", () => {
    expect(isKpiAction("kpi_operacional_resumo")).toBe(true);
    expect(isKpiAction("kpi_hh_custo_resumo")).toBe(true);
    expect(isKpiAction("registrar_os")).toBe(false);
    expect(isKpiAction("kpi_inventado")).toBe(false);
  });
});
