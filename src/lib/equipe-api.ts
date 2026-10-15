import { apiProxy } from "@/lib/api-client";
import type { EquipeColaboradoresResponse } from "@/lib/equipe-contract";

export async function fetchEquipeColaboradores(): Promise<EquipeColaboradoresResponse> {
  return apiProxy<EquipeColaboradoresResponse>("equipe_colaboradores");
}
