import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSaveSheetOS, useSheetOS, OS_QUERY_KEY } from "./use-sheet-os";
import * as sheetsApi from "@/lib/sheets-api";
import React from "react";

// Mock da API
vi.mock("@/lib/sheets-api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createOSInSheet: vi.fn(),
    fetchOSFromSheet: vi.fn().mockResolvedValue([]),
  };
});

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useSaveSheetOS - Atualização Otimista e Debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("A. Registro com id_os real atualiza cache corretamente", async () => {
    const qc = createTestQueryClient();
    qc.setQueryData(OS_QUERY_KEY, [{ id_os: "OS-EXISTENTE", equipamento: "EQ-1" }]);

    const payload = { equipamento: "TESTE", data_inicio: "2026-09-30" };
    vi.mocked(sheetsApi.createOSInSheet).mockResolvedValueOnce({
      success: true,
      id_os: "OS-NOVA-OFICIAL",
      payloadEnviado: payload,
    });

    const { result } = renderHook(() => useSaveSheetOS(), {
      wrapper: createWrapper(qc),
    });

    await act(async () => {
      result.current.mutate(payload as any);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cache = qc.getQueryData<any[]>(OS_QUERY_KEY);
    expect(cache).toHaveLength(2);
    expect(cache?.[0].id_os).toBe("OS-NOVA-OFICIAL");
    expect(cache?.[1].id_os).toBe("OS-EXISTENTE");
  });

  it("B. Registro sem id_os NÃO cria OS artificial no cache", async () => {
    const qc = createTestQueryClient();
    qc.setQueryData(OS_QUERY_KEY, [{ id_os: "OS-EXISTENTE" }]);

    const payload = { equipamento: "TESTE" };
    vi.mocked(sheetsApi.createOSInSheet).mockResolvedValueOnce({
      success: true,
      id_os: "",
      payloadEnviado: payload,
    });

    const { result } = renderHook(() => useSaveSheetOS(), {
      wrapper: createWrapper(qc),
    });

    await act(async () => {
      result.current.mutate(payload as any);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cache = qc.getQueryData<any[]>(OS_QUERY_KEY);
    expect(cache).toHaveLength(1);
    expect(cache?.[0].id_os).toBe("OS-EXISTENTE");
  });

  it("B2. Registro sem campo id_os na resposta NÃO cria OS artificial", async () => {
    const qc = createTestQueryClient();
    qc.setQueryData(OS_QUERY_KEY, [{ id_os: "OS-EXISTENTE" }]);

    vi.mocked(sheetsApi.createOSInSheet).mockResolvedValueOnce({
      success: true,
      // sem id_os na resposta
      payloadEnviado: { equipamento: "TESTE" },
    });

    const { result } = renderHook(() => useSaveSheetOS(), {
      wrapper: createWrapper(qc),
    });

    await act(async () => {
      result.current.mutate({} as any);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cache = qc.getQueryData<any[]>(OS_QUERY_KEY);
    expect(cache).toHaveLength(1);
  });

  it("C. Cinco cadastros rápidos geram apenas UMA revalidação (debounce)", async () => {
    const qc = createTestQueryClient();
    qc.setQueryData(OS_QUERY_KEY, []);
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    // Cada chamada retorna um id_os diferente para evitar deduplicação
    for (let i = 0; i < 5; i++) {
      vi.mocked(sheetsApi.createOSInSheet).mockResolvedValueOnce({
        success: true,
        id_os: `OS-SEQ-${i}`,
        payloadEnviado: { equipamento: `EQ-${i}` },
      });
    }

    const { result } = renderHook(() => useSaveSheetOS(), {
      wrapper: createWrapper(qc),
    });

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        result.current.mutate({} as any);
      });
    }

    await waitFor(() =>
      expect(vi.mocked(sheetsApi.createOSInSheet)).toHaveBeenCalledTimes(5)
    );

    // Nenhuma invalidação ainda (menos de 30s)
    expect(invalidateSpy).not.toHaveBeenCalled();

    // Avança 30s — apenas UMA invalidação
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });

  it("D. Debounce reinicia corretamente ao registrar nova OS", async () => {
    const qc = createTestQueryClient();
    qc.setQueryData(OS_QUERY_KEY, []);
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    vi.mocked(sheetsApi.createOSInSheet).mockResolvedValue({
      success: true,
      id_os: "OS-D1",
      payloadEnviado: { equipamento: "EQ" },
    });

    const { result } = renderHook(() => useSaveSheetOS(), {
      wrapper: createWrapper(qc),
    });

    // Primeiro registro
    await act(async () => {
      result.current.mutate({} as any);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Avança 20s
    await act(async () => {
      vi.advanceTimersByTime(20_000);
    });
    expect(invalidateSpy).not.toHaveBeenCalled();

    // Segundo registro (reinicia o debounce)
    vi.mocked(sheetsApi.createOSInSheet).mockResolvedValueOnce({
      success: true,
      id_os: "OS-D2",
      payloadEnviado: { equipamento: "EQ2" },
    });
    await act(async () => {
      result.current.mutate({} as any);
    });

    // Avança mais 20s (40s total, mas 20s desde o último)
    await act(async () => {
      vi.advanceTimersByTime(20_000);
    });
    expect(invalidateSpy).not.toHaveBeenCalled();

    // Avança mais 10s (30s desde o último registro)
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });

  it("E. Timer é limpo corretamente após disparar", async () => {
    const qc = createTestQueryClient();
    qc.setQueryData(OS_QUERY_KEY, []);
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    vi.mocked(sheetsApi.createOSInSheet).mockResolvedValueOnce({
      success: true,
      id_os: "OS-E",
      payloadEnviado: { equipamento: "EQ" },
    });

    const { result } = renderHook(() => useSaveSheetOS(), {
      wrapper: createWrapper(qc),
    });

    await act(async () => {
      result.current.mutate({} as any);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Dispara o timer
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(invalidateSpy).toHaveBeenCalledTimes(1);

    // Avança muito mais — não deve disparar novamente
    await act(async () => {
      vi.advanceTimersByTime(120_000);
    });
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });

  it("F. Erro no POST preserva consistência do cache (rollback)", async () => {
    const qc = createTestQueryClient();
    qc.setQueryData(OS_QUERY_KEY, [
      { id_os: "OS-EXISTENTE", equipamento: "ORIGINAL" },
    ]);

    vi.mocked(sheetsApi.createOSInSheet).mockRejectedValueOnce(
      new Error("Falha na rede")
    );

    const { result } = renderHook(() => useSaveSheetOS(), {
      wrapper: createWrapper(qc),
    });

    await act(async () => {
      result.current.mutate({ equipamento: "VAI-FALHAR" } as any);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cache = qc.getQueryData<any[]>(OS_QUERY_KEY);
    expect(cache).toHaveLength(1);
    expect(cache?.[0].id_os).toBe("OS-EXISTENTE");
  });

  it("G. id_os já presente no cache NÃO gera duplicação", async () => {
    const qc = createTestQueryClient();
    qc.setQueryData(OS_QUERY_KEY, [
      { id_os: "OS-DUPLICADA", equipamento: "ANTIGA" },
    ]);

    vi.mocked(sheetsApi.createOSInSheet).mockResolvedValueOnce({
      success: true,
      id_os: "OS-DUPLICADA",
      payloadEnviado: { equipamento: "NOVA" },
    });

    const { result } = renderHook(() => useSaveSheetOS(), {
      wrapper: createWrapper(qc),
    });

    await act(async () => {
      result.current.mutate({} as any);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cache = qc.getQueryData<any[]>(OS_QUERY_KEY);
    expect(cache).toHaveLength(1);
    expect(cache?.[0].equipamento).toBe("ANTIGA");
  });

  it("H. Navegação entre lançamento e histórico reutiliza cache", async () => {
    const qc = createTestQueryClient();
    const initialData = [{ id_os: "OS-1", equipamento: "EQ-1" }];
    qc.setQueryData(OS_QUERY_KEY, initialData);

    // Hook de leitura (simula NovaOS)
    const { result: readResult, unmount: unmountRead } = renderHook(
      () => useSheetOS(),
      { wrapper: createWrapper(qc) }
    );

    // Cache está disponível imediatamente
    expect(readResult.current.data).toEqual(initialData);

    // Desmonta (simula sair da tela)
    unmountRead();

    // Remonta (simula entrar no histórico)
    const { result: readResult2 } = renderHook(() => useSheetOS(), {
      wrapper: createWrapper(qc),
    });

    // Dados ainda estão no cache, sem nova requisição
    expect(readResult2.current.data).toEqual(initialData);
    expect(vi.mocked(sheetsApi.fetchOSFromSheet)).not.toHaveBeenCalled();
  });
});
