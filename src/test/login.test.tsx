import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    login: vi.fn(),
    status: "unauthenticated",
    user: null,
  }),
}));

import Login from "@/pages/Login";

describe("Login", () => {
  it("permite mostrar e ocultar a senha digitada", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const senha = screen.getByLabelText("Senha") as HTMLInputElement;
    const toggle = screen.getByRole("button", { name: "Mostrar senha" });

    expect(senha.type).toBe("password");

    fireEvent.click(toggle);

    expect(senha.type).toBe("text");
    expect(
      screen.getByRole("button", { name: "Ocultar senha" })
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Ocultar senha" }));

    expect(senha.type).toBe("password");
  });
});
