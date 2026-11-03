import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { AuthUser } from "@/lib/api-client";

const state = vi.hoisted(() => ({
  usuario: null as AuthUser | null,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: state.usuario }),
}));
vi.mock("@/hooks/use-paginated-os", () => ({
  usePaginatedOS: () => ({
    data: undefined, isLoading: false, isError: false, error: null,
    refetch: vi.fn(), isFetching: false, fetchNextPage: vi.fn(),
    hasNextPage: false, isFetchingNextPage: false, allItems: [], totalEstimate: 0,
  }),
}));
vi.mock("@/hooks/use-debounce", () => ({ useDebounce: (valor: unknown) => valor }));

import ListaOS from "@/pages/ListaOS";

const criarUsuario = (permissoes: AuthUser["permissoes"]): AuthUser => ({
  authenticated: true, login: "usuario-teste", nome: "Teste",
  perfil: "PCM", unidade: "TH30", permissoes,
});

describe("Histórico de OS — UX e autorização", () => {
  it("não exibe cadastro quando o usuário pode apenas consultar histórico", () => {
    state.usuario = criarUsuario([{ modulo: "HISTORICO", visualizar: true }]);
    render(<MemoryRouter><ListaOS /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Consultar ordens de serviço" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Registrar OS/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Alternar filtros" }).getAttribute("aria-expanded")).toBe("false");
  });

  it("exibe cadastro quando a permissão de criar OS foi concedida", () => {
    state.usuario = criarUsuario([
      { modulo: "HISTORICO", visualizar: true },
      { modulo: "LANCAMENTO", visualizar: true, criar: true },
    ]);
    render(<MemoryRouter><ListaOS /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /Registrar OS/ }).getAttribute("href")).toBe("/os/nova");
  });
});
