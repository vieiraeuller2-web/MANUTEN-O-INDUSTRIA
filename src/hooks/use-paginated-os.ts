import { useInfiniteQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { apiProxy, type PaginatedOS } from "@/lib/api-client";
import { createOSInSheet, type SheetOS } from "@/lib/sheets-api";

/**
 * Filtros disponíveis para a listagem paginada.
 */
export interface OSFilters {
  filtro_equipamento?: string;
  filtro_responsavel?: string;
  filtro_setor?: string;
  filtro_area?: string;
  filtro_tipo?: string;
  data_de?: string;
  data_ate?: string;
  busca?: string;
}

/**
 * Query key que incorpora filtros e contexto do usuário.
 * - Não compartilha cache entre usuários
 * - Não compartilha cache entre unidades
 * - Preserva filtros
 */
function paginatedQueryKey(
  userId: string,
  unidade: string,
  filters: OSFilters
) {
  return ["ordens-servico", userId, unidade, filters] as const;
}

const PAGE_SIZE = 50;
const STALE_TIME = 5 * 60_000;
const GC_TIME = 15 * 60_000;

// Debounce centralizado para revalidação pós-cadastro
let paginatedRevalidationTimer: ReturnType<typeof setTimeout> | null = null;
const REVALIDATION_DELAY = 30_000;

/**
 * Hook para listagem paginada de OS via backend.
 * 
 * Usa TanStack Query infinite queries com cursor.
 * - keepPreviousData evita tela piscando ao trocar página
 * - Cache separado por usuário/unidade/filtros
 */
export function usePaginatedOS(
  userId: string,
  unidade: string,
  filters: OSFilters = {}
) {
  const queryKey = useMemo(
    () => paginatedQueryKey(userId, unidade, filters),
    [userId, unidade, filters]
  );

  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const params: Record<string, unknown> = {
        page_size: PAGE_SIZE,
        ...filters,
      };
      if (pageParam) {
        params.cursor = pageParam;
      }
      return apiProxy<PaginatedOS>("listar_os_paginado", params);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor : undefined,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 1,
    placeholderData: (prev) => prev, // keepPreviousData
  });

  // Lista achatada de todas as OS carregadas
  const allItems = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data]
  );

  const totalEstimate = query.data?.pages[0]?.total_estimate ?? 0;

  return {
    ...query,
    allItems,
    totalEstimate,
    queryKey,
  };
}

/**
 * Hook para salvar OS com integração ao cache paginado.
 * 
 * Após cadastro:
 * - Se id_os oficial: insere na primeira página do cache compatível
 * - Se sem id_os: agenda sincronização controlada
 * - Debounce centralizado para evitar múltiplas revalidações
 */
export function useSavePaginatedOS(
  userId: string,
  unidade: string,
  filters: OSFilters = {}
) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => paginatedQueryKey(userId, unidade, filters),
    [userId, unidade, filters]
  );

  return useMutation({
    mutationFn: createOSInSheet,
    onSuccess: (result) => {
      const payload = result.payloadEnviado;
      if (!payload) {
        queryClient.invalidateQueries({ queryKey });
        return;
      }

      const idOsOficial =
        typeof result.id_os === "string" && result.id_os.trim().length > 0
          ? result.id_os.trim()
          : null;

      if (idOsOficial) {
        // Verifica se a OS corresponde aos filtros ativos
        const matchesFilters = checkFilters(payload, filters, idOsOficial);

        if (matchesFilters) {
          // Insere na primeira página do cache
          queryClient.setQueryData(queryKey, (old: any) => {
            if (!old?.pages?.length) return old;

            const firstPage = old.pages[0];
            // Verifica duplicação
            if (firstPage.items.some((item: any) => item.id_os === idOsOficial)) {
              return old;
            }

            const novaOS = {
              id_os: idOsOficial,
              numero_os: result.numero_os || idOsOficial,
              equipamento: payload.equipamento,
              setor: payload.setor,
              area: payload.area,
              responsavel: payload.responsavel,
              tipo: payload.tipo,
              data_inicio: payload.data_inicio,
              hora_inicio: payload.hora_inicio,
              data_conclusao: payload.data_conclusao,
              hora_conclusao: payload.hora_conclusao,
              horimetro: payload.horimetro,
              observacoes: payload.observacoes,
            };

            return {
              ...old,
              pages: [
                {
                  ...firstPage,
                  items: [novaOS, ...firstPage.items],
                  total_estimate: (firstPage.total_estimate || 0) + 1,
                },
                ...old.pages.slice(1),
              ],
            };
          });
        }
      }

      // Debounce centralizado
      if (paginatedRevalidationTimer) {
        clearTimeout(paginatedRevalidationTimer);
      }
      paginatedRevalidationTimer = setTimeout(() => {
        paginatedRevalidationTimer = null;
        // Invalida apenas a primeira página
        queryClient.invalidateQueries({
          queryKey,
          refetchPage: (_page: unknown, index: number) => index === 0,
        });
      }, REVALIDATION_DELAY);
    },
    onError: () => {
      // Não precisa de rollback específico aqui pois não fazemos
      // atualização otimista antes do POST
    },
  });
}

/**
 * Normaliza uma data em string para yyyy-MM-dd sem usar Date.
 * Aceita yyyy-MM-dd (com ou sem sufixo de hora) e dd/MM/yyyy.
 * Retorna "" se não reconhecer o formato.
 */
function toIsoDateString(value: unknown): string {
  const text = String(value ?? "").trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return "";
}

/**
 * Verifica se um payload corresponde aos filtros ativos.
 * Se não corresponder, não deve ser inserido no cache filtrado.
 */
function checkFilters(
  payload: Record<string, unknown>,
  filters: OSFilters,
  idOs?: string | null
): boolean {
  if (
    filters.filtro_equipamento &&
    String(payload.equipamento || "").toUpperCase() !==
      filters.filtro_equipamento.toUpperCase()
  )
    return false;
  if (
    filters.filtro_setor &&
    String(payload.setor || "").toUpperCase() !==
      filters.filtro_setor.toUpperCase()
  )
    return false;
  if (
    filters.filtro_area &&
    String(payload.area || "").toUpperCase() !==
      filters.filtro_area.toUpperCase()
  )
    return false;
  if (
    filters.filtro_tipo &&
    String(payload.tipo || "").toUpperCase() !==
      filters.filtro_tipo.toUpperCase()
  )
    return false;
  if (
    filters.filtro_responsavel &&
    String(payload.responsavel || "").toUpperCase() !==
      filters.filtro_responsavel.toUpperCase()
  )
    return false;

  // Período: comparação lexicográfica de strings yyyy-MM-dd (sem Date)
  if (filters.data_de || filters.data_ate) {
    const dataInicio = toIsoDateString(payload.data_inicio);
    if (!dataInicio) return false;
    if (filters.data_de && dataInicio < filters.data_de) return false;
    if (filters.data_ate && dataInicio > filters.data_ate) return false;
  }

  // Busca textual: id_os, equipamento, observações (case-insensitive)
  const busca = (filters.busca || "").trim().toUpperCase();
  if (busca) {
    const searchable = [
      String(idOs || payload.id_os || ""),
      String(payload.equipamento || ""),
      String(payload.observacoes || ""),
    ]
      .join(" ")
      .toUpperCase();
    if (!searchable.includes(busca)) return false;
  }

  return true;
}
