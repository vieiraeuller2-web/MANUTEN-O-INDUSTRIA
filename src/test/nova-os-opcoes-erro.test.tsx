import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { authenticated: true, perfil: "PCM", login: "teste", unidade: "TH30",
      nome: "Teste", permissoes: [{ modulo: "LANCAMENTO", criar: true, visualizar: true }] },
  }),
}));
vi.mock("@/hooks/use-form-options-os", () => ({
  useFormOptionsOS: () => ({
    data: undefined, isLoading: false, isError: true, refetch: vi.fn(),
  }),
}));
vi.mock("@/hooks/use-equipe", () => ({
  useEquipeColaboradores: () => ({ data: undefined }),
}));
vi.mock("@/hooks/use-paginated-os", () => ({
  useSavePaginatedOS: () => ({ isPending: false, mutate: vi.fn() }),
}));

import NovaOS from "@/pages/NovaOS";

describe("Lançamento OS — falha de opções oficiais", () => {
  it("mostra tentativa de recuperação e não permite salvar sem dados oficiais", () => {
    render(<MemoryRouter><NovaOS /></MemoryRouter>);
    expect(screen.getByRole("alert").textContent).toContain("Não foi possível carregar as listas oficiais");
    expect(screen.getByRole("button", { name: "Recarregar opções" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Salvar registro" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("link", { name: "Histórico" })).toBeNull();
  });
});
