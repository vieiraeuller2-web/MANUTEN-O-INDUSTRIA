import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

vi.mock("@/lib/kpi-api", () => ({
  fetchKpi: vi.fn(),
}));

import { fetchKpi } from "@/lib/kpi-api";
import {
  kpiQueryKey,
  useKpiOperacionalResumo,
  useKpiHHCustoEventos,
} from "@/hooks/use-kpi";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe("use-kpi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gera query key determinística por action e filtros", () => {
    expect(
      kpiQueryKey("kpi_operacional_resumo", {
        equipamento: "MTF001",
        data_inicio: "2026-10-01",
      })
    ).toEqual([
      "kpi",
      "kpi_operacional_resumo",
      {
        equipamento: "MTF001",
        data_inicio: "2026-10-01",
      },
    ]);
  });

  it("encaminha filtros ao resumo operacional", async () => {
    vi.mocked(fetchKpi).mockResolvedValueOnce({
      success: true,
      api_version: "test",
      filtros: {
        data_inicio: "2026-10-01",
        data_fim: null,
        equipamento: "MTF001",
        area: null,
        setor: null,
        responsavel: null,
        tipo: null,
      },
      kpis: {
        os_total_periodo: 1,
        eventos_falha_confirmados: 1,
        eventos_pendentes_excluidos: 0,
        ativos_com_falha: 1,
        mttr_h: 1,
        mtbf_calendario_h: null,
        mtbf_intervalos_validos: 0,
        parada_fisica_h: 1,
        tempo_mecanico_h: 1,
        tempo_eletrico_h: 0,
        paradas_fisicas_unicas: 1,
      },
      metodologia: {
        mttr: null,
        mtbf: null,
        parada: null,
        pendentes: null,
      },
      top_equipamentos: [],
      versao: "test",
    });

    const filters = {
      data_inicio: "2026-10-01",
      equipamento: "MTF001",
    };

    const { result } = renderHook(
      () => useKpiOperacionalResumo(filters),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchKpi).toHaveBeenCalledWith(
      "kpi_operacional_resumo",
      filters
    );
  });

  it("respeita enabled=false e não chama a API", () => {
    const { result } = renderHook(
      () =>
        useKpiHHCustoEventos(
          { equipamento: "MTF001", limit: 20 },
          { enabled: false }
        ),
      { wrapper }
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchKpi).not.toHaveBeenCalled();
  });
});
