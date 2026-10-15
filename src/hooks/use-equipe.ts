import { useQuery } from "@tanstack/react-query";
import { fetchEquipeColaboradores } from "@/lib/equipe-api";

const EQUIPE_STALE_TIME = 60_000;
const EQUIPE_GC_TIME = 10 * 60_000;

export const equipeQueryKeys = {
  colaboradores: ["equipe", "colaboradores"] as const,
};

export function useEquipeColaboradores(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: equipeQueryKeys.colaboradores,
    queryFn: fetchEquipeColaboradores,
    enabled: options?.enabled ?? true,
    staleTime: EQUIPE_STALE_TIME,
    gcTime: EQUIPE_GC_TIME,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
