import { apiProxy } from "@/lib/api-client";
import type {
  EquipeColaboradorHistoricoResponse,
  EquipeColaboradoresResponse,
  EquipeTecnicosResponse,
  CriarColaboradorPayload,
  CriarTecnicoPayload,
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


export async function fetchEquipeTecnicos(): Promise<EquipeTecnicosResponse> {
  return apiProxy<EquipeTecnicosResponse>("equipe_tecnicos");
}

export async function criarEquipeColaborador(
  payload: CriarColaboradorPayload
): Promise<Record<string, unknown>> {
  return apiProxy("equipe_colaborador_criar", payload);
}

export async function criarEquipeTecnico(
  payload: CriarTecnicoPayload
): Promise<Record<string, unknown>> {
  return apiProxy("equipe_tecnico_criar", payload);
}
