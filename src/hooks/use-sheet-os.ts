import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createOSInSheet, fetchOSFromSheet } from "@/lib/sheets-api";

/**
 * Hook centralizado para a lista de OS vinda da planilha.
 * - GET inicial com cache compartilhado entre telas
 * - Dedup automático (React Query usa o mesmo queryKey em todas as telas)
 * - Atualização manual pelo botão "Atualizar dados"
 * - Cancelamento de requisições antigas é nativo do React Query
 */
export function useSheetOS() {
  const query = useQuery({
    queryKey: ["sheet-os"],
    queryFn: fetchOSFromSheet,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    retry: 1,
  });

  return query;
}

export function useRefreshSheetOS() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["sheet-os"] });
}

export function useSaveSheetOS() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOSInSheet,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sheet-os"] }),
  });
}
