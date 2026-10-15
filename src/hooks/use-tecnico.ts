import { useQuery } from "@tanstack/react-query";
import { fetchMinhasOS } from "@/lib/tecnico-api";

const TECNICO_STALE_TIME = 30_000;
const TECNICO_GC_TIME = 5 * 60_000;

export const tecnicoQueryKeys = {
  minhasOS: ["tecnico", "minhas-os"] as const,
};

export function useMinhasOS(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: tecnicoQueryKeys.minhasOS,
    queryFn: fetchMinhasOS,
    enabled: options?.enabled ?? true,
    staleTime: TECNICO_STALE_TIME,
    gcTime: TECNICO_GC_TIME,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
