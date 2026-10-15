import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/equipe-api", () => ({
  fetchEquipeColaboradores: vi.fn(),
}));

import { fetchEquipeColaboradores } from "@/lib/equipe-api";
import { equipeQueryKeys, useEquipeColaboradores } from "@/hooks/use-equipe";

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

describe("use-equipe", () => {
  it("usa chave estável para a listagem de colaboradores", () => {
    expect(equipeQueryKeys.colaboradores).toEqual(["equipe", "colaboradores"]);
  });

  it("consulta a listagem real de colaboradores", async () => {
    vi.mocked(fetchEquipeColaboradores).mockResolvedValueOnce({
      success: true,
      total: 1,
      colaboradores: [
        {
          id_colaborador: "COL-TESTE",
          nome: "TESTE",
          nome_bd: "TESTE",
          funcao: "MECANICO",
          especialidade: "MECANICA",
          ativo: "SIM",
          status_cadastro: "ATIVO",
          tipo_vinculo: "CLT",
          contabilizar_hh_custo: "SIM",
          custo_atual: null,
        },
      ],
      versao: "test",
    });

    const { result } = renderHook(() => useEquipeColaboradores(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchEquipeColaboradores).toHaveBeenCalledTimes(1);
    expect(result.current.data?.total).toBe(1);
  });
});
