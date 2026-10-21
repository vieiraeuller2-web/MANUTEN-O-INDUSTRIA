import { describe, expect, it } from "vitest";
import { ALLOWED_ACTIONS } from "../../api/_shared/gas-client";
import {
  KPI_HH_CUSTO_ACTIONS,
  KPI_OPERACIONAL_ACTIONS,
} from "@/lib/kpi-contract";
import { isKpiAction, normalizeKpiDateFilters } from "@/lib/kpi-api";

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

  it("converte somente datas ISO para o formato esperado pelo GAS", () => {
    const source = { data_inicio: "2026-09-01", data_fim: "2026-10-01", equipamento: "MTF005" };
    expect(normalizeKpiDateFilters(source)).toEqual({
      data_inicio: "01/09/2026",
      data_fim: "01/10/2026",
      equipamento: "MTF005",
    });
    expect(source.data_inicio).toBe("2026-09-01");
    expect(normalizeKpiDateFilters({data_inicio: "01/09/2026"})).toEqual({data_inicio: "01/09/2026"});
    expect(normalizeKpiDateFilters({})).toEqual({});
  });

  it("reconhece somente actions KPI conhecidas", () => {
    expect(isKpiAction("kpi_operacional_resumo")).toBe(true);
    expect(isKpiAction("kpi_hh_custo_resumo")).toBe(true);
    expect(isKpiAction("registrar_os")).toBe(false);
    expect(isKpiAction("kpi_inventado")).toBe(false);
  });
});
