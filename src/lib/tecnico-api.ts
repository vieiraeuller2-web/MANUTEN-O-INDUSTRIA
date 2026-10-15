import { apiProxy } from "@/lib/api-client";
import type { TecnicoMinhasOSResponse } from "@/lib/tecnico-contract";

export async function fetchMinhasOS(): Promise<TecnicoMinhasOSResponse> {
  return apiProxy<TecnicoMinhasOSResponse>("minhas_os");
}
