import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/lubrificacao-critica", () => ({
  buscarLubrificacoesCriticas: vi.fn(async () => []),
}));

vi.mock("@/hooks/use-kpi", () => ({
  useKpiOperacionalResumo: vi.fn(() => ({
    data: {
      kpis: {
        os_total_periodo: 120,
        eventos_falha_confirmados: 8,
        eventos_pendentes_excluidos: 2,
        ativos_com_falha: 4,
        mttr_h: 1.5,
        mtbf_calendario_h: 72,
        mtbf_intervalos_validos: 7,
        parada_fisica_h: 12.25,
        tempo_mecanico_h: 8,
        tempo_eletrico_h: 4,
        paradas_fisicas_unicas: 6,
      },
      top_equipamentos: [
        {
          equipamento: "MTF001",
          falhas_confirmadas: 3,
          mttr_h: 1.2,
          mtbf_calendario_h: 100,
          mtbf_intervalos_validos: 2,
          parada_fisica_h: 4,
          paradas_fisicas_unicas: 2,
          tempo_mecanico_h: 3,
          tempo_eletrico_h: 1,
        },
      ],
    },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  })),
  useKpiHHCustoResumo: vi.fn(() => ({
    data: {
      kpis: {
        hh_total: 35.5,
        custo_confirmado: 1800,
        cobertura_custo_pct: 82.4,
        linhas_dia_elegiveis: 10,
        linhas_dia_com_custo: 8,
        linhas_dia_sem_custo: 2,
        os_distintas: 9,
        colaboradores_distintos: 4,
        equipamentos_distintos: 3,
        eventos_distintos: 5,
        linhas_pj_excluidas: 1,
        hh_excluida_pj_global: 6,
      },
    },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  })),
  useKpiHHCustoColaboradores: vi.fn(() => ({
    data: {
      dados: [
        {
          id_colaborador: "C1",
          nome: "COLABORADOR TESTE",
          hh_total: 12.5,
          custo_confirmado: 650,
          os_distintas: 4,
          cobertura_custo_pct: 100,
        },
      ],
    },
    isFetching: false,
    refetch: vi.fn(),
  })),
  useKpiHHCustoEquipamentos: vi.fn(() => ({
    data: {
      dados: [
        {
          equipamento: "MTF001",
          hh_total: 20,
          custo_confirmado: 1200,
          os_distintas: 5,
          eventos_distintos: 3,
          cobertura_custo_pct: 100,
        },
      ],
    },
    isFetching: false,
    refetch: vi.fn(),
  })),
  useKpiOperacionalEquipamentos: vi.fn(() => ({
    data: {
      equipamentos: [
        {
          equipamento: "MTF001",
          falhas_confirmadas: 3,
          mttr_h: 1.2,
          mtbf_calendario_h: 100,
          mtbf_intervalos_validos: 2,
          parada_fisica_h: 4,
          paradas_fisicas_unicas: 2,
          tempo_mecanico_h: 3,
          tempo_eletrico_h: 1,
        },
      ],
    },
    isFetching: false,
    refetch: vi.fn(),
  })),
}));

import DashboardExecutivo from "@/pages/DashboardExecutivo";

describe("DashboardExecutivo", () => {
  it("exibe KPIs oficiais e não mostra disponibilidade calculada", () => {
    render(
      <MemoryRouter initialEntries={["/relatorios"]}>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <DashboardExecutivo />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("120")).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.getByText("1,5 h")).toBeTruthy();
    expect(screen.getByText("35,5 h")).toBeTruthy();
    expect(screen.getByText("82,4%")).toBeTruthy();
    expect(screen.getAllByText("MTF001").length).toBeGreaterThan(0);
    expect(screen.getByText("Custo de manutenção por equipamento")).toBeTruthy();
    expect(screen.getByText("Custo por colaborador")).toBeTruthy();
    expect(screen.getByText("HH por colaborador")).toBeTruthy();
    expect(screen.getByText("MTTR por equipamento")).toBeTruthy();
    expect(screen.getByText("MTBF calendário por equipamento")).toBeTruthy();
    expect(screen.getByText(/Próxima camada: evolução temporal/i)).toBeTruthy();

    expect(
      screen.getByText(/Disponibilidade não é exibida/i)
    ).toBeTruthy();
  });
});
