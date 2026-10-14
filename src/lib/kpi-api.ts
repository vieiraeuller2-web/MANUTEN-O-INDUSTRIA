import { apiProxy } from "@/lib/api-client";
import {
  KPI_HH_CUSTO_ACTIONS,
  KPI_OPERACIONAL_ACTIONS,
  type KpiAction,
  type KpiFilters,
  type KpiResponseFor,
} from "@/lib/kpi-contract";

const KPI_ACTIONS = new Set<KpiAction>([
  ...KPI_OPERACIONAL_ACTIONS,
  ...KPI_HH_CUSTO_ACTIONS,
]);

export function isKpiAction(action: string): action is KpiAction {
  return KPI_ACTIONS.has(action as KpiAction);
}

/**
 * Leitura tipada dos endpoints KPI oficiais.
 *
 * O tipo de retorno é inferido pela action. Os campos cuja forma interna
 * ainda não foi observada continuam como unknown no contrato específico,
 * evitando casting silencioso ou inferência não comprovada.
 */
export async function fetchKpi<A extends KpiAction>(
  action: A,
  filters: KpiFilters = {}
): Promise<KpiResponseFor<A>> {
  return apiProxy<KpiResponseFor<A>>(action, filters);
}
