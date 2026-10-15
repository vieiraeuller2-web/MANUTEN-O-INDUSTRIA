import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
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

describe("use-tecnico", () => {
  it("usa chave propria para Minhas OS", () => {
    expect(tecnicoQueryKeys.minhasOS).toEqual(["tecnico", "minhas-os"]);
  });

  it("consulta somente o endpoint Minhas OS", async () => {
    vi.mocked(fetchMinhasOS).mockResolvedValueOnce({
      success: true,
      colaborador: {
        id_colaborador: "COL-TESTE",
        nome: "TECNICO TESTE",
      },
      total: 1,
      page: 1,
      page_size: 50,
      total_pages: 1,
      filtros: {
        equipamento: "",
        tipo: "",
        status: "",
      },
      os: [
        {
          id_os: "OS-TESTE",
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
    });

    const { result } = renderHook(() => useMinhasOS(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMinhasOS).toHaveBeenCalledTimes(1);
    expect(result.current.data?.os[0].id_os).toBe("OS-TESTE");
  });
});
