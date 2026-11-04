import { describe, expect, it } from "vitest";
import { filtrarEquipe, limitarEquipeVisivel, agruparAcessosPorColaborador } from "@/lib/equipe-view";
import type { EquipeColaborador } from "@/lib/equipe-contract";

const colaborador = (n: number): EquipeColaborador => ({
  id_colaborador: "C-" + n,
  nome: "Colaborador " + n,
  nome_bd: "Colaborador " + n,
  funcao: "Mecanico", especialidade: "Mecanica",
  ativo: "SIM", status_cadastro: "ATIVO",
  tipo_vinculo: "CLT", contabilizar_hh_custo: "SIM", custo_atual: null,
});

describe("Equipe modernizada — renderização incremental", () => {
  const lista = Array.from({ length: 65 }, (_, i) => colaborador(i + 1));
  const map = agruparAcessosPorColaborador([]);
  it("renderiza apenas 24 resultados inicialmente sem perder o total", () => {
    const filtrados = filtrarEquipe(lista, map, { busca: "", situacao: "todos", acesso: "todos", acessoConfirmado: true });
    expect(filtrados).toHaveLength(65);
    expect(limitarEquipeVisivel(filtrados, 24)).toHaveLength(24);
    expect(limitarEquipeVisivel(filtrados, 48)).toHaveLength(48);
    expect(limitarEquipeVisivel(filtrados, 72)).toHaveLength(65);
  });
  it("aplica filtros na lista completa antes de limitar o DOM", () => {
    const filtrados = filtrarEquipe(lista, map, { busca: "colaborador 65", situacao: "todos", acesso: "todos", acessoConfirmado: true });
    expect(limitarEquipeVisivel(filtrados, 24).map((c) => c.id_colaborador)).toEqual(["C-65"]);
  });
  it("recusa limites vazios ou inválidos", () => {
    expect(limitarEquipeVisivel(lista, 0)).toEqual([]);
    expect(limitarEquipeVisivel(lista, Number.NaN)).toEqual([]);
  });
});
