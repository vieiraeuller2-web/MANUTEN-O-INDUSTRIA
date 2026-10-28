import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchMinhasOS } from "@/lib/tecnico-api";
import type { TecnicoMinhasOSParams } from "@/lib/tecnico-contract";

const TECNICO_STALE_TIME = 30_000;
const TECNICO_GC_TIME = 5 * 60_000;
const PAGE_SIZE = 50;

export const tecnicoQueryKeys = {
  raiz: ["tecnico", "minhas-os"] as const,
  minhasOS: (filters: Omit<TecnicoMinhasOSParams, "page" | "page_size"> = {}) =>
    ["tecnico", "minhas-os", filters] as const,
};

export function useMinhasOS(
  filters: Omit<TecnicoMinhasOSParams, "page" | "page_size"> = {},
  options?: { enabled?: boolean }
) {
  const queryKey = useMemo(
    () => tecnicoQueryKeys.minhasOS(filters),
    [filters]
  );

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      fetchMinhasOS({
        ...filters,
        page: pageParam,
        page_size: PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    enabled: options?.enabled ?? true,
    staleTime: TECNICO_STALE_TIME,
    gcTime: TECNICO_GC_TIME,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const allItems = useMemo(
    () => query.data?.pages.flatMap((page) => page.os) ?? [],
    [query.data]
  );

  const firstPage = query.data?.pages[0];

  return {
    ...query,
    allItems,
    total: firstPage?.total ?? 0,
    colaborador: firstPage?.colaborador ?? null,
    totalPages: firstPage?.total_pages ?? 0,
    queryKey,
  };
}
