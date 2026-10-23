import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { nome: "Técnico Teste", login: "teste", perfil: "ADM" } }),
}));
vi.mock("@/services/preventivasApi", () => ({
  buscarResumoPreventivas: vi.fn(async () => ({ indicadores: { total_planos: 1, total_ativos: 1, total_setores: 1 } })),
  buscarSetoresPreventivas: vi.fn(async () => [{ id_setor: "S1", nome_setor: "Corte", total_ativos: 1 }]),
  buscarAtivosPreventivas: vi.fn(async () => [{ id_setor: "S1", id_ativo: "A1", nome_ativo: "Serra", tag_ativo: "SER-01" }]),
  buscarPlanosPreventivas: vi.fn(async () => [{
    id_setor: "S1", id_ativo: "A1", id_plano: "P1", titulo_plano: "Revisão",
    modalidade: "MECÂNICA", periodicidade: "MENSAL", status_plano: "EM DIA",
    proxima_execucao: "2026-10-01", ativo: "SIM",
  }]),
  buscarPlanoCompletoPreventiva: vi.fn(async () => ({ plano: { id_plano: "P1" }, itens: [], arvore: [] })),
  gerarPdfGeralPreventivas: vi.fn(),
  gerarPdfDiretoriaPreventivas: vi.fn(),
  gerarPdfSetorPreventiva: vi.fn(),
  gerarPdfAtivoPreventiva: vi.fn(),
  gerarPdfExecucaoPreventiva: vi.fn(),
  concluirPreventiva: vi.fn(),
}));

import PlanosManutencao from "@/pages/PlanosManutencao";

describe("Planos de manutenção — navegação real com consultas carregadas", () => {
  it("abre panorama e navega até lista de planos vencidos sem quebrar", async () => {
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={cliente}><PlanosManutencao /></QueryClientProvider>);
    expect(screen.getByText("Panorama dos planos")).toBeTruthy();
    fireEvent.click(await screen.findByRole("button", { name: /Explorar planos do setor Corte/i }));
    fireEvent.click(await screen.findByRole("button", { name: /SER-01/i }));
    await waitFor(() => expect(screen.getByText("Revisão")).toBeTruthy());
    expect(screen.getByText("VENCIDA")).toBeTruthy();
    cliente.clear();
  });
});
