import { useQuery } from "@tanstack/react-query";
import { fetchKpi } from "@/lib/kpi-api";
import type {
  KpiAction,
  KpiFilters,
  KpiHHCustoFilters,
  KpiOperacionalFilters,
  KpiResponseFor,
} from "@/lib/kpi-contract";

const KPI_STALE_TIME = 60_000;
const KPI_GC_TIME = 10 * 60_000;

export interface KpiQueryOptions {
  enabled?: boolean;
}

export function kpiQueryKey<A extends KpiAction>(
  action: A,
  filters: KpiFilters = {}
) {
  return ["kpi", action, filters] as const;
}

export function useKpiQuery<A extends KpiAction>(
  action: A,
  filters: KpiFilters = {},
  options: KpiQueryOptions = {}
) {
  return useQuery<KpiResponseFor<A>, Error>({
    queryKey: kpiQueryKey(action, filters),
    queryFn: () => fetchKpi(action, filters),
    enabled: options.enabled ?? true,
    staleTime: KPI_STALE_TIME,
    gcTime: KPI_GC_TIME,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

// KPI operacional
export function useKpiOperacionalHealth(options?: KpiQueryOptions) {
  return useKpiQuery("kpi_operacional_health", {}, options);
}

export function useKpiOperacionalResumo(
  filters: KpiOperacionalFilters = {},
  options?: KpiQueryOptions
) {
  return useKpiQuery("kpi_operacional_resumo", filters, options);
}

export function useKpiOperacionalEquipamentos(
  filters: KpiOperacionalFilters = {},
  options?: KpiQueryOptions
) {
  return useKpiQuery("kpi_operacional_equipamentos", filters, options);
}

export function useKpiOperacionalEventos(
  filters: KpiOperacionalFilters = {},
  options?: KpiQueryOptions
) {
  return useKpiQuery("kpi_operacional_eventos", filters, options);
}

export function useKpiOperacionalParadas(
  filters: KpiOperacionalFilters = {},
  options?: KpiQueryOptions
) {
  return useKpiQuery("kpi_operacional_paradas", filters, options);
}

// KPI HH/custo
export function useKpiHHCustoHealth(options?: KpiQueryOptions) {
  return useKpiQuery("kpi_hh_custo_health", {}, options);
}

export function useKpiHHCustoResumo(
  filters: KpiHHCustoFilters = {},
  options?: KpiQueryOptions
) {
  return useKpiQuery("kpi_hh_custo_resumo", filters, options);
}

export function useKpiHHCustoColaboradores(
  filters: KpiHHCustoFilters = {},
  options?: KpiQueryOptions
) {
  return useKpiQuery("kpi_hh_custo_colaboradores", filters, options);
}

export function useKpiHHCustoEquipamentos(
  filters: KpiHHCustoFilters = {},
  options?: KpiQueryOptions
) {
  return useKpiQuery("kpi_hh_custo_equipamentos", filters, options);
}

export function useKpiHHCustoEventos(
  filters: KpiHHCustoFilters = {},
  options?: KpiQueryOptions
) {
  return useKpiQuery("kpi_hh_custo_eventos", filters, options);
}

export function useKpiHHCustoOS(
  filters: KpiHHCustoFilters = {},
  options?: KpiQueryOptions
) {
  return useKpiQuery("kpi_hh_custo_os", filters, options);
}
