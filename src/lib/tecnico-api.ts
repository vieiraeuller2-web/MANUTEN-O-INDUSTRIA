import { apiProxy } from "@/lib/api-client";
import type {
  TecnicoMinhasOSParams,
  TecnicoMinhasOSResponse,
} from "@/lib/tecnico-contract";

export async function fetchMinhasOS(
  params: TecnicoMinhasOSParams = {}
): Promise<TecnicoMinhasOSResponse> {
  return apiProxy<TecnicoMinhasOSResponse>("minhas_os", params);
}
