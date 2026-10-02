import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createOSInSheet, fetchOSFromSheet, type SheetOS } from "@/lib/sheets-api";

/** Query key padronizada para OS — reutilizada em todos os módulos. */
export const OS_QUERY_KEY = ["sheet-os"] as const;

/** Tempo em que os dados de OS são considerados frescos (5 min). */
const OS_STALE_TIME = 5 * 60_000;

/** Tempo em que o cache é mantido mesmo sem observadores (15 min). */
const OS_GC_TIME = 15 * 60_000;

/** Delay para revalidação em background após inserção otimista (30s). */
const BACKGROUND_REVALIDATION_DELAY = 30_000;

/**
 * Hook centralizado para a lista de OS vinda da planilha.
 * - GET inicial com cache compartilhado entre telas
 * - Dedup automático (React Query usa o mesmo queryKey em todas as telas)
 * - Atualização manual pelo botão "Atualizar dados"
 * - Cancelamento de requisições antigas é nativo do React Query
 */
export function useSheetOS() {
  const query = useQuery({
    queryKey: OS_QUERY_KEY,
    queryFn: fetchOSFromSheet,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    staleTime: OS_STALE_TIME,
    gcTime: OS_GC_TIME,
    retry: 1,
  });

  return query;
}

export function useRefreshSheetOS() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: OS_QUERY_KEY });
}

// Timer centralizado para debounce da revalidação
let revalidationTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Hook otimizado para salvar OS com atualização otimista do cache.
 *
 * Fluxo:
 * 1. Envia POST ao backend (Apps Script)
 * 2. Se sucesso, avalia rigorosamente a presença de id_os oficial
 * 3. Se houver id_os, insere a nova OS no INÍCIO do cache (evitando duplicações)
 * 4. Agenda/renova uma revalidação silenciosa em 30s (debounce centralizado)
 * 5. Se erro, faz rollback do cache ao estado anterior
 */
export function useSaveSheetOS() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOSInSheet,
    onMutate: async () => {
      // Cancela qualquer refetch em andamento para evitar sobrescrever nossa atualização otimista
      await queryClient.cancelQueries({ queryKey: OS_QUERY_KEY });

      // Snapshot do cache atual para rollback
      const previousData = queryClient.getQueryData<SheetOS[]>(OS_QUERY_KEY);
      return { previousData };
    },

    onSuccess: (result, _variables, context) => {
      const payload = result.payloadEnviado;
      if (!payload) {
        // Fallback total se não há confirmação de payload
        queryClient.invalidateQueries({ queryKey: OS_QUERY_KEY });
        return;
      }

      // Validação RIGOROSA do id_os oficial (não aceita fallback para numero_os ou timestamps soltos)
      const idOsOficial = typeof result.id_os === "string" && result.id_os.trim().length > 0 
        ? result.id_os.trim() 
        : null;

      if (idOsOficial) {
        // Constrói a nova OS apenas se possuirmos o ID oficial
        const novaOS: SheetOS = {
          id_os: idOsOficial,
          numero_os: result.numero_os || idOsOficial, // Usa numero_os se existir, ou repete id_os
          equipamento: payload.equipamento,
          setor: payload.setor,
          area: payload.area,
          responsavel: payload.responsavel,
          tipo: payload.tipo,
          data_inicio: payload.data_inicio,
          hora_inicio: payload.hora_inicio,
          data_fim: payload.data_conclusao,
          hora_fim: payload.hora_conclusao,
          horimetro: payload.horimetro,
          observacoes: payload.observacoes,
        };

        // Insere no INÍCIO do cache apenas se ainda não existir
        queryClient.setQueryData<SheetOS[]>(OS_QUERY_KEY, (old) => {
          const current = old ?? [];
          
          // Prevenção contra duplicação visual
          if (current.some((os) => os.id_os === idOsOficial)) {
            return current;
          }

          return [novaOS, ...current];
        });
      }

      // Debounce centralizado da revalidação silenciosa
      // Reseta o timer se já existir, garantindo apenas UMA revalidação após N cadastros sequenciais
      if (revalidationTimer) {
        clearTimeout(revalidationTimer);
      }

      revalidationTimer = setTimeout(() => {
        revalidationTimer = null;
        queryClient.invalidateQueries({ queryKey: OS_QUERY_KEY });
      }, BACKGROUND_REVALIDATION_DELAY);
    },

    onError: (_error, _variables, context) => {
      // Rollback: restaura o cache ao estado anterior ao registro
      if (context?.previousData) {
        queryClient.setQueryData(OS_QUERY_KEY, context.previousData);
      }
    },
  });
}
