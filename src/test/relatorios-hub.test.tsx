import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/pages/Relatorios", () => ({
  default: () => <div>CONTEUDO_TRADICIONAL</div>,
}));

vi.mock("@/pages/DashboardExecutivo", () => ({
  default: () => <div>CONTEUDO_OFICIAL</div>,
}));

import RelatoriosHub from "@/pages/RelatoriosHub";

describe("RelatoriosHub", () => {
  it("abre a visão tradicional por padrão e permite acessar indicadores oficiais", () => {
    render(<RelatoriosHub />);

    expect(screen.getByText("CONTEUDO_TRADICIONAL")).toBeTruthy();
    expect(screen.queryByText("CONTEUDO_OFICIAL")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: /Indicadores oficiais/i }));

    expect(screen.getByText("CONTEUDO_OFICIAL")).toBeTruthy();
  });
});
