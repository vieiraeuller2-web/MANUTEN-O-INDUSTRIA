import { apiProxy } from "@/lib/api-client";
import {
  KPI_HH_CUSTO_ACTIONS,
  KPI_OPERACIONAL_ACTIONS,
  type KpiAction,
  type KpiFilters,
  type KpiUnverifiedResponse,
} from "@/lib/kpi-contract";

const KPI_ACTIONS = new Set<KpiAction>([
  ...KPI_OPERACIONAL_ACTIONS,
  ...KPI_HH_CUSTO_ACTIONS,
]);

export function isKpiAction(action: string): action is KpiAction {
  return KPI_ACTIONS.has(action as KpiAction);
}

/**
 * Leitura genérica dos endpoints KPI enquanto os envelopes completos
 * de resposta ainda estão sendo capturados/homologados.
 *
 * O retorno permanece unknown de propósito: não usar casting silencioso
 * em componentes de produção. Cada endpoint deve ganhar um tipo específico
 * quando seu JSON real for comprovado.
 */
export async function fetchKpi(
  action: KpiAction,
  filters: KpiFilters = {}
): Promise<KpiUnverifiedResponse> {
  return apiProxy<KpiUnverifiedResponse>(action, filters);
}
