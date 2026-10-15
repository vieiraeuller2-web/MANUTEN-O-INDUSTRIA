import { apiProxy } from "@/lib/api-client";
import type {
  EquipeColaboradorHistoricoResponse,
  EquipeColaboradoresResponse,
} from "@/lib/equipe-contract";

export async function fetchEquipeColaboradores(): Promise<EquipeColaboradoresResponse> {
  return apiProxy<EquipeColaboradoresResponse>("equipe_colaboradores");
}


export async function fetchEquipeColaboradorHistorico(
  idColaborador: string
): Promise<EquipeColaboradorHistoricoResponse> {
  return apiProxy<EquipeColaboradorHistoricoResponse>(
    "equipe_colaborador_historico",
    { id_colaborador: idColaborador }
  );
}
