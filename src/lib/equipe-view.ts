import type { EquipeAcessoResumo, EquipeColaborador } from "@/lib/equipe-contract";

export type FiltroSituacao = "todos" | "ativos" | "inativos";
export type FiltroAcesso = "todos" | "com" | "sem";

/** Um colaborador pode ter vários usuários no AUTH62: nunca perder acessos no Map. */
export function agruparAcessosPorColaborador(acessos: EquipeAcessoResumo[]) {
  const agrupados = new Map<string, EquipeAcessoResumo[]>();
  for (const acesso of acessos) {
    const id = String(acesso.id_colaborador || "").trim();
    if (!id) continue;
    const grupo = agrupados.get(id) ?? [];
    grupo.push(acesso);
    agrupados.set(id, grupo);
  }
  for (const grupo of agrupados.values()) {
    grupo.sort((a, b) => {
      const ativoA = String(a.ativo).trim().toUpperCase() === "SIM";
      const ativoB = String(b.ativo).trim().toUpperCase() === "SIM";
      if (ativoA !== ativoB) return ativoA ? -1 : 1;
      return String(a.login).localeCompare(String(b.login), "pt-BR");
    });
  }
  return agrupados;
}

function normalizarBusca(valor: unknown): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

export function filtrarEquipe(
  colaboradores: EquipeColaborador[],
  acessosPorColaborador: Map<string, EquipeAcessoResumo[]>,
  filtros: {
    busca: string;
    situacao: FiltroSituacao;
    acesso: FiltroAcesso;
    acessoConfirmado: boolean;
  }
): EquipeColaborador[] {
  const termo = normalizarBusca(filtros.busca);

  return colaboradores.filter((colaborador) => {
    const ativo = String(colaborador.ativo).trim().toUpperCase() === "SIM";
    if (filtros.situacao === "ativos" && !ativo) return false;
    if (filtros.situacao === "inativos" && ativo) return false;

    const acessos = acessosPorColaborador.get(colaborador.id_colaborador) ?? [];
    if (filtros.acessoConfirmado) {
      if (filtros.acesso === "com" && acessos.length === 0) return false;
      if (filtros.acesso === "sem" && acessos.length !== 0) return false;
    }

    if (!termo) return true;
    return [
      colaborador.nome, colaborador.nome_bd, colaborador.funcao,
      colaborador.especialidade, colaborador.id_colaborador,
      ...acessos.map((acesso) => acesso.login),
    ].some((campo) => normalizarBusca(campo).includes(termo));
  });
}
