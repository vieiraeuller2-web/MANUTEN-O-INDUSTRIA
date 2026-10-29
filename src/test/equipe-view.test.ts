import { describe, expect, it } from "vitest";
import { agruparAcessosPorColaborador, filtrarEquipe } from "@/lib/equipe-view";
import type { EquipeAcessoResumo, EquipeColaborador } from "@/lib/equipe-contract";

const colaborador = (id: string, ativo = "SIM"): EquipeColaborador => ({
  id_colaborador: id, nome: "José Silva", nome_bd: "José Silva",
  funcao: "Mecânico", especialidade: "Mecânica", ativo,
  status_cadastro: "ATIVO", tipo_vinculo: "CLT",
  contabilizar_hh_custo: "SIM", custo_atual: null,
});
const acesso = (id: string, login: string, ativo = "SIM"): EquipeAcessoResumo => ({
  id_usuario: login, id_colaborador: id, login, ativo,
  nome: "Usuário", perfil: "TECNICO", unidade: "TH30", primeiro_acesso: "NAO",
});

describe("Equipe — consulta e filtros seguros", () => {
  it("preserva todos os acessos de um mesmo colaborador e prioriza ativos", () => {
    const agrupados = agruparAcessosPorColaborador([
      acesso("C1", "joao.antigo", "NAO"), acesso("C1", "joao.atual", "SIM"), acesso("C2", "outro"),
    ]);
    expect(agrupados.get("C1")?.map((x) => x.login)).toEqual(["joao.atual", "joao.antigo"]);
    expect(agrupados.get("C2")).toHaveLength(1);
  });
  it("ignora vínculo vazio, sem atribuir acesso ao colaborador errado", () => {
    expect(agruparAcessosPorColaborador([acesso("", "sem-vinculo")]).size).toBe(0);
  });
  it("filtra pesquisa sem diferenciação de acentos e inclui login", () => {
    const lista = [colaborador("C1"), {...colaborador("C2"), nome: "Maria", nome_bd: "Maria"}];
    const m = agruparAcessosPorColaborador([acesso("C1", "jsilva")]);
    expect(filtrarEquipe(lista, m, {busca: "jose",situacao:"todos",acesso:"todos",acessoConfirmado:true})).toHaveLength(1);
    expect(filtrarEquipe(lista, m, {busca: "jsilva",situacao:"todos",acesso:"todos",acessoConfirmado:true})).toHaveLength(1);
  });
  it("separa ativos e inativos", () => {
    const lista = [colaborador("C1"),colaborador("C2","NAO")];
    const m = agruparAcessosPorColaborador([]);
    expect(filtrarEquipe(lista,m,{busca:"",situacao:"ativos",acesso:"todos",acessoConfirmado:true})).toHaveLength(1);
    expect(filtrarEquipe(lista,m,{busca:"",situacao:"inativos",acesso:"todos",acessoConfirmado:true})).toHaveLength(1);
  });
  it("não classifica pessoas como sem acesso quando endpoint de acessos falha", () => {
    const lista = [colaborador("C1"), colaborador("C2")];
    const m = agruparAcessosPorColaborador([]);
    expect(filtrarEquipe(lista,m,{busca:"",situacao:"todos",acesso:"sem",acessoConfirmado:false})).toHaveLength(2);
    expect(filtrarEquipe(lista,m,{busca:"",situacao:"todos",acesso:"sem",acessoConfirmado:true})).toHaveLength(2);
  });
});
