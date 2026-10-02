import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ── Testes do AuthContext ────────────────────────────────────────

// Mock do api-client
vi.mock("@/lib/api-client", () => ({
  apiLogin: vi.fn(),
  apiGetMe: vi.fn().mockResolvedValue(null),
  apiLogout: vi.fn().mockResolvedValue(undefined),
}));

import * as apiClient from "@/lib/api-client";
import { AuthProvider, useAuth, canAccessRoute } from "@/contexts/AuthContext";

function createWrapper(qc?: QueryClient) {
  const queryClient = qc ?? new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inicia como loading e depois unauthenticated quando não há sessão", async () => {
    vi.mocked(apiClient.apiGetMe).mockResolvedValueOnce(null);

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    // Inicialmente loading
    expect(result.current.status).toBe("loading");

    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));
    expect(result.current.user).toBeNull();
  });

  it("login válido atualiza estado para authenticated", async () => {
    vi.mocked(apiClient.apiGetMe).mockResolvedValueOnce(null);
    vi.mocked(apiClient.apiLogin).mockResolvedValueOnce({
      authenticated: true,
      perfil: "PCM",
      nome: "Gabriel",
      login: "gabriel",
      unidade: "SERRARIA",
    });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));

    await act(async () => {
      await result.current.login("gabriel", "senha123");
    });

    expect(result.current.status).toBe("authenticated");
    expect(result.current.user?.perfil).toBe("PCM");
    expect(result.current.user?.nome).toBe("Gabriel");
  });

  it("login inválido lança erro e mantém unauthenticated", async () => {
    vi.mocked(apiClient.apiGetMe).mockResolvedValueOnce(null);
    vi.mocked(apiClient.apiLogin).mockRejectedValueOnce(new Error("Credenciais inválidas"));

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));

    await expect(
      act(async () => {
        await result.current.login("errado", "errado");
      })
    ).rejects.toThrow("Credenciais inválidas");

    expect(result.current.status).toBe("unauthenticated");
  });

  it("auth_me válido restaura sessão existente", async () => {
    vi.mocked(apiClient.apiGetMe).mockResolvedValueOnce({
      authenticated: true,
      perfil: "ADM",
      nome: "Admin",
      login: "admin",
      unidade: "MATRIZ",
    });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.user?.perfil).toBe("ADM");
  });

  it("logout limpa estado e cache", async () => {
    vi.mocked(apiClient.apiGetMe).mockResolvedValueOnce({
      authenticated: true,
      perfil: "PCM",
      nome: "Gabriel",
      login: "gabriel",
      unidade: "SERRARIA",
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(["some-data"], [1, 2, 3]);
    const clearSpy = vi.spyOn(qc, "clear");

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper(qc) });

    await waitFor(() => expect(result.current.status).toBe("authenticated"));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.status).toBe("unauthenticated");
    expect(result.current.user).toBeNull();
    expect(clearSpy).toHaveBeenCalled();
  });
});

// ── Testes de permissões por perfil ──────────────────────────────

describe("canAccessRoute", () => {
  it("ADM acessa qualquer rota", () => {
    expect(canAccessRoute("ADM", "/")).toBe(true);
    expect(canAccessRoute("ADM", "/os/nova")).toBe(true);
    expect(canAccessRoute("ADM", "/relatorios")).toBe(true);
    expect(canAccessRoute("ADM", "/qualquer-rota")).toBe(true);
  });

  it("PCM acessa módulos permitidos", () => {
    expect(canAccessRoute("PCM", "/lubrificacao")).toBe(true);
    expect(canAccessRoute("PCM", "/os/nova")).toBe(true);
    expect(canAccessRoute("PCM", "/os")).toBe(true);
    expect(canAccessRoute("PCM", "/servicos-externos")).toBe(true);
    expect(canAccessRoute("PCM", "/obras")).toBe(true);
    expect(canAccessRoute("PCM", "/planos-manutencao")).toBe(true);
  });

  it("PCM não acessa relatórios", () => {
    expect(canAccessRoute("PCM", "/relatorios")).toBe(false);
  });

  it("GESTAO acessa relatórios e lubrificação", () => {
    expect(canAccessRoute("GESTAO", "/relatorios")).toBe(true);
    expect(canAccessRoute("GESTAO", "/lubrificacao")).toBe(true);
  });

  it("GESTAO não acessa lançamento de OS", () => {
    expect(canAccessRoute("GESTAO", "/os/nova")).toBe(false);
  });

  it("TECNICO acessa lançamento e histórico de OS", () => {
    expect(canAccessRoute("TECNICO", "/os/nova")).toBe(true);
    expect(canAccessRoute("TECNICO", "/os")).toBe(true);
  });

  it("TECNICO não acessa lubrificação ou obras", () => {
    expect(canAccessRoute("TECNICO", "/lubrificacao")).toBe(false);
    expect(canAccessRoute("TECNICO", "/obras")).toBe(false);
  });

  it("perfil undefined retorna false", () => {
    expect(canAccessRoute(undefined, "/os")).toBe(false);
  });
});
