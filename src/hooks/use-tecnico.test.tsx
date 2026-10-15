import React from "react";
import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/tecnico-api", () => ({
  fetchMinhasOS: vi.fn(),
}));

import { fetchMinhasOS } from "@/lib/tecnico-api";
import { tecnicoQueryKeys, useMinhasOS } from "@/hooks/use-tecnico";

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
}

function page(page: number, totalPages: number, id: string) {
  return {
    success: true,
    colaborador: {
      id_colaborador: "COL-TESTE",
      nome: "TECNICO TESTE",
    },
    total: 2,
    page,
    page_size: 50,
    total_pages: totalPages,
    filtros: {
      equipamento: "MTF001",
      tipo: "",
      status: "",
    },
    os: [
      {
        id_os: id,
        equipamento: "MTF001",
        setor: "SETOR",
        area: "AREA",
        responsavel: "TECNICO TESTE",
        tipo: "CORRETIVA",
        data_inicio: "15/10/2026",
        hora_inicio: "08:00",
        data_conclusao: "",
        hora_conclusao: "",
        horimetro: "",
        observacoes: "Teste",
        status: "ABERTA",
      },
    ],
    versao: "test",
  };
}

describe("use-tecnico", () => {
  it("inclui filtros na chave de Minhas OS", () => {
    expect(
      tecnicoQueryKeys.minhasOS({ equipamento: "MTF001" })
    ).toEqual([
      "tecnico",
      "minhas-os",
      { equipamento: "MTF001" },
    ]);
  });

  it("envia filtros e pagina a consulta no backend", async () => {
    vi.mocked(fetchMinhasOS)
      .mockResolvedValueOnce(page(1, 2, "OS-1"))
      .mockResolvedValueOnce(page(2, 2, "OS-2"));

    const filters = { equipamento: "MTF001" };

    const { result } = renderHook(() => useMinhasOS(filters), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMinhasOS).toHaveBeenNthCalledWith(1, {
      equipamento: "MTF001",
      page: 1,
      page_size: 50,
    });
    expect(result.current.allItems.map((os) => os.id_os)).toEqual(["OS-1"]);
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() =>
      expect(result.current.allItems.map((os) => os.id_os)).toEqual([
        "OS-1",
        "OS-2",
      ])
    );

    expect(fetchMinhasOS).toHaveBeenNthCalledWith(2, {
      equipamento: "MTF001",
      page: 2,
      page_size: 50,
    });
    expect(result.current.hasNextPage).toBe(false);
  });
});
