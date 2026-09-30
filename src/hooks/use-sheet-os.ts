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

/**
 * Hook otimizado para salvar OS com atualização otimista do cache.
 *
 * Fluxo:
 * 1. Envia POST ao backend (Apps Script)
 * 2. Se sucesso, constrói um SheetOS a partir do payload confirmado
 * 3. Insere a nova OS no INÍCIO do cache existente (sem recarregar TUDO)
 * 4. Agenda uma revalidação silenciosa em 30s para sincronizar com a planilha
 * 5. Se erro, faz rollback do cache ao estado anterior
 *
 * Benefício: o usuário pode registrar OS consecutivas sem esperar
 * o carregamento completo do histórico entre cada registro.
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
        // Fallback: se não temos o payload confirmado, invalida tudo
        queryClient.invalidateQueries({ queryKey: OS_QUERY_KEY });
        return;
      }

      // Constrói a nova OS a partir do payload confirmado pelo backend
      const novaOS: SheetOS = {
        id_os: result.id_os || result.numero_os || "",
        numero_os: result.numero_os || result.id_os || "",
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

      // Insere no INÍCIO do cache — a OS mais recente aparece primeiro
      queryClient.setQueryData<SheetOS[]>(OS_QUERY_KEY, (old) => {
        const current = old ?? [];
        return [novaOS, ...current];
      });

      // Revalidação silenciosa em background (30s)
      // Sincroniza com a planilha real sem bloquear o usuário
      setTimeout(() => {
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
