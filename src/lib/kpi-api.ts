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
 * input[type=date] entrega AAAA-MM-DD, mas os endpoints GAS de KPI
 * recebem datas DD/MM/AAAA. Não modifica horários ou outros campos.
 */
export function normalizeKpiDateFilters<F extends KpiFilters>(filters: F): F {
  const normalized = { ...filters };
  for (const key of ["data_inicio", "data_fim"] as const) {
    const value = normalized[key];
    if (typeof value !== "string") continue;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) continue;
    (normalized as Record<string, unknown>)[key] = `${match[3]}/${match[2]}/${match[1]}`;
  }
  return normalized;
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
  return apiProxy<KpiResponseFor<A>>(action, normalizeKpiDateFilters(filters));
}
