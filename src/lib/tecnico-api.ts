import { apiProxy } from "@/lib/api-client";
import type {
  TecnicoMinhasOSParams,
  TecnicoMinhasOSResponse,
  TecnicoNovaOSPayload,
  TecnicoNovaOSResponse,
} from "@/lib/tecnico-contract";

export async function fetchMinhasOS(
  params: TecnicoMinhasOSParams = {}
): Promise<TecnicoMinhasOSResponse> {
  return apiProxy<TecnicoMinhasOSResponse>("minhas_os", params);
}


export async function registrarOSManualTecnico(
  payload: TecnicoNovaOSPayload
): Promise<TecnicoNovaOSResponse> {
  return apiProxy<TecnicoNovaOSResponse>("os_manual_tecnico", payload);
}
