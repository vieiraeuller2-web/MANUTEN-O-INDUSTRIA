/**
 * Contrato KPI conhecido e verificado.
 *
 * IMPORTANTE:
 * - Estes tipos representam somente campos comprovados por memória canônica,
 *   retorno homologado e estruturas vivas do backend.
 * - Não completar schemas por inferência.
 * - O frontend não recalcula a matemática dos KPIs.
 */

export const KPI_OPERACIONAL_ACTIONS = [
  "kpi_operacional_health",
  "kpi_operacional_resumo",
  "kpi_operacional_equipamentos",
  "kpi_operacional_eventos",
  "kpi_operacional_paradas",
] as const;

export const KPI_HH_CUSTO_ACTIONS = [
  "kpi_hh_custo_health",
  "kpi_hh_custo_resumo",
  "kpi_hh_custo_colaboradores",
  "kpi_hh_custo_equipamentos",
  "kpi_hh_custo_eventos",
  "kpi_hh_custo_os",
] as const;

export type KpiOperacionalAction = (typeof KPI_OPERACIONAL_ACTIONS)[number];
export type KpiHHCustoAction = (typeof KPI_HH_CUSTO_ACTIONS)[number];
export type KpiAction = KpiOperacionalAction | KpiHHCustoAction;

export interface KpiFilters {
  data_inicio?: string;
  data_fim?: string;
  equipamento?: string;
  area?: string;
  setor?: string;
  responsavel?: string;
  tipo?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

/**
 * Campos comprovados em retorno real homologado de kpi_operacional_resumo.
 * Não representa ainda o envelope completo da API.
 */
export interface KpiOperacionalResumoKnownFields {
  os_total_periodo: number;
  eventos_falha_confirmados: number;
  eventos_pendentes_excluidos: number;
  ativos_com_falha: number;
  mttr_h: number;
  mtbf_calendario_h: number;
  mtbf_intervalos_validos: number;
  parada_fisica_h: number;
  tempo_mecanico_h: number;
  tempo_eletrico_h: number;
  paradas_fisicas_unicas: number;
}

/**
 * Estrutura materializada confirmada em KPI_CUSTO_EVENTOS.
 * É fonte física do backend, não contrato público garantido da API.
 */
export interface KpiCustoEventoMaterializado {
  id_evento: string;
  equipamento: string;
  qtd_os_mao_obra: number;
  qtd_colaboradores: number;
  hh_total: number;
  custo_confirmado: number;
  linhas_dia_total: number;
  linhas_dia_com_custo: number;
  cobertura_custo_pct: number;
  status_cobertura: string;
}

export type KpiCustoResumoMetric =
  | "LINHAS_BD"
  | "HH_TOTAL_NAO_PJ"
  | "HH_EXCLUIDA_PJ"
  | "CUSTO_CONFIRMADO"
  | "COBERTURA_CUSTO_PCT"
  | "COLABORADORES_SEM_POLITICA"
  | "NOMES_SEM_CADASTRO";

export interface KpiCustoResumoMaterializado {
  metrica: KpiCustoResumoMetric | string;
  valor: string | number;
  observacao?: string;
}

/**
 * Schemas públicos ainda não capturados.
 *
 * Não substituir por any silenciosamente em código de produção.
 * Quando houver resposta real sanitizada, criar interfaces específicas.
 */
export type KpiUnverifiedResponse = unknown;
