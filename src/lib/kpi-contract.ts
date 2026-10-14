/**
 * Contratos KPI observados no Web App publicado.
 *
 * Regras:
 * - O frontend não recalcula a matemática dos KPIs.
 * - Horas operacionais permanecem strings.
 * - Tipos marcados como unknown ainda precisam de captura de tipo/forma em runtime.
 * - Métricas podem ser null quando não houver amostra suficiente no filtro.
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

export type KpiMetric = number | null;
export type KpiText = string | null;

export interface KpiOperacionalFilters {
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

export interface KpiHHCustoFilters {
  data_inicio?: string;
  data_fim?: string;
  equipamento?: string;
  responsavel?: string;
  area?: string;
  tipo?: string;
  id_evento?: string;
  id_os?: string;
  offset?: number;
  limit?: number;
}

export type KpiFilters = KpiOperacionalFilters & KpiHHCustoFilters;

export interface KpiOperacionalFilterEcho {
  data_inicio: KpiText;
  data_fim: KpiText;
  equipamento: KpiText;
  area: KpiText;
  setor: KpiText;
  responsavel: KpiText;
  tipo: KpiText;
}

export interface KpiHHCustoFilterEcho {
  data_inicio: KpiText;
  data_fim: KpiText;
  equipamento: KpiText;
  responsavel: KpiText;
  area: KpiText;
  tipo: KpiText;
  id_evento: KpiText;
  id_os: KpiText;
}

export interface KpiOperacionalEquipamento {
  equipamento: string;
  falhas_confirmadas: number;
  mttr_h: KpiMetric;
  mtbf_calendario_h: KpiMetric;
  mtbf_intervalos_validos: number;
  parada_fisica_h: KpiMetric;
  paradas_fisicas_unicas: number;
  tempo_mecanico_h: KpiMetric;
  tempo_eletrico_h: KpiMetric;
}

export interface KpiOperacionalResumoKpis {
  os_total_periodo: number;
  eventos_falha_confirmados: number;
  eventos_pendentes_excluidos: number;
  ativos_com_falha: number;
  mttr_h: KpiMetric;
  mtbf_calendario_h: KpiMetric;
  mtbf_intervalos_validos: number;
  parada_fisica_h: KpiMetric;
  tempo_mecanico_h: KpiMetric;
  tempo_eletrico_h: KpiMetric;
  paradas_fisicas_unicas: number;
}

export interface KpiOperacionalHealthResponse {
  success: boolean;
  api_version: string;
  status: string;
  fontes: {
    kpi_eventos: unknown;
    kpi_eventos_os: unknown;
    kpi_paradas: unknown;
    bd: unknown;
  };
  qualidade: {
    eventos_confirmados: number;
    eventos_pendentes: number;
    paradas_unicas_associadas_confirmados: number;
    eventos_confirmados_sem_id_parada: number;
  };
  metodologia: {
    falha: unknown;
    mttr: unknown;
    mtbf: unknown;
    parada: unknown;
    pendentes_entram_kpi_executivo: unknown;
    mtbf_horimetro_disponivel: unknown;
  };
  versao: string;
}

export interface KpiOperacionalResumoResponse {
  success: boolean;
  api_version: string;
  filtros: KpiOperacionalFilterEcho;
  kpis: KpiOperacionalResumoKpis;
  metodologia: {
    mttr: unknown;
    mtbf: unknown;
    parada: unknown;
    pendentes: unknown;
  };
  top_equipamentos: KpiOperacionalEquipamento[];
  versao: string;
}

export interface KpiOperacionalEquipamentosResponse {
  success: boolean;
  api_version: string;
  filtros: KpiOperacionalFilterEcho;
  total: number;
  equipamentos: KpiOperacionalEquipamento[];
  versao: string;
}

export interface KpiOperacionalEvento {
  id_evento: string;
  id_parada: KpiText;
  equipamento: string;
  area: KpiText;
  setores: unknown;
  responsaveis: unknown;
  data_inicio: KpiText;
  hora_inicio: KpiText;
  data_fim: KpiText;
  hora_fim: KpiText;
  duracao_evento_h: KpiMetric;
  status_evento: string;
  classificacao: KpiText;
  regra_confirmada: KpiText;
  qtd_os: number;
  ids_os: unknown;
  motivo: KpiText;
}

export interface KpiOperacionalEventosResponse {
  success: boolean;
  api_version: string;
  filtros: KpiOperacionalFilterEcho;
  status: KpiText;
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  eventos: KpiOperacionalEvento[];
  versao: string;
}

export interface KpiOperacionalParada {
  id_parada: string;
  equipamento: string;
  data_inicio: KpiText;
  hora_inicio: KpiText;
  data_fim: KpiText;
  hora_fim: KpiText;
  parada_real_h: KpiMetric;
  tempo_mecanico_h: KpiMetric;
  tempo_eletrico_h: KpiMetric;
  hh_colaboradores_h: KpiMetric;
  sobrecontagem_h: KpiMetric;
  qtd_os: number;
  parada_mista: unknown;
  ids_os: unknown;
  responsaveis: unknown;
}

export interface KpiOperacionalParadasResponse {
  success: boolean;
  api_version: string;
  filtros: KpiOperacionalFilterEcho;
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  parada_fisica_total_h: KpiMetric;
  paradas: KpiOperacionalParada[];
  versao: string;
}

export interface KpiHHCustoHealthResponse {
  success: boolean;
  api: string;
  status: string;
  materializacao: {
    data_geracao: KpiText;
    linhas_dia: number;
    linhas_os: number;
    linhas_resumo: number;
  };
  custo_individual_exposto: boolean;
  versao: string;
}

export interface KpiHHCustoResumoKpis {
  hh_total: KpiMetric;
  custo_confirmado: KpiMetric;
  cobertura_custo_pct: KpiMetric;
  linhas_dia_elegiveis: number;
  linhas_dia_com_custo: number;
  linhas_dia_sem_custo: number;
  os_distintas: number;
  colaboradores_distintos: number;
  equipamentos_distintos: number;
  eventos_distintos: number;
  linhas_pj_excluidas: number;
  hh_excluida_pj_global: KpiMetric;
}

export interface KpiHHCustoQualidade {
  politica_custo_nao_definida: number;
  sem_custo_vigente: number;
  duracao_invalida: number;
}

export interface KpiHHCustoResumoResponse {
  success: boolean;
  api: string;
  action: "kpi_hh_custo_resumo";
  filtros: KpiHHCustoFilterEcho;
  data_geracao: KpiText;
  kpis: KpiHHCustoResumoKpis;
  qualidade: KpiHHCustoQualidade;
  observacao: KpiText;
  versao: string;
}

export interface KpiHHCustoColaborador {
  id_colaborador: string;
  nome: string;
  hh_total: KpiMetric;
  custo_confirmado: KpiMetric;
  os_distintas: number;
  cobertura_custo_pct: KpiMetric;
}

export interface KpiHHCustoColaboradoresResponse {
  success: boolean;
  api: string;
  action: "kpi_hh_custo_colaboradores";
  filtros: KpiHHCustoFilterEcho;
  data_geracao: KpiText;
  total: number;
  dados: KpiHHCustoColaborador[];
  versao: string;
}

export interface KpiHHCustoEquipamento {
  equipamento: string;
  hh_total: KpiMetric;
  custo_confirmado: KpiMetric;
  os_distintas: number;
  eventos_distintos: number;
  cobertura_custo_pct: KpiMetric;
}

export interface KpiHHCustoEquipamentosResponse {
  success: boolean;
  api: string;
  action: "kpi_hh_custo_equipamentos";
  filtros: KpiHHCustoFilterEcho;
  data_geracao: KpiText;
  total: number;
  dados: KpiHHCustoEquipamento[];
  versao: string;
}

export interface KpiHHCustoEvento {
  id_evento: string;
  equipamento: string;
  hh_total: KpiMetric;
  custo_confirmado: KpiMetric;
  os_distintas: number;
  colaboradores_distintos: number;
  cobertura_custo_pct: KpiMetric;
}

export interface KpiHHCustoEventosResponse {
  success: boolean;
  api: string;
  action: "kpi_hh_custo_eventos";
  filtros: KpiHHCustoFilterEcho;
  data_geracao: KpiText;
  total: number;
  offset: number;
  limit: number;
  dados: KpiHHCustoEvento[];
  versao: string;
}

export interface KpiHHCustoOS {
  linha_bd: number;
  id_os: KpiText;
  id_evento: KpiText;
  equipamento: string;
  area: KpiText;
  tipo: KpiText;
  colaborador: KpiText;
  data_inicio: KpiText;
  data_conclusao: KpiText;
  hh: KpiMetric;
  custo_confirmado: KpiMetric;
  cobertura_custo_pct: KpiMetric;
  status: KpiText;
}

export interface KpiHHCustoOSResponse {
  success: boolean;
  api: string;
  action: "kpi_hh_custo_os";
  filtros: KpiHHCustoFilterEcho;
  data_geracao: KpiText;
  total: number;
  offset: number;
  limit: number;
  dados: KpiHHCustoOS[];
  versao: string;
}

export interface KpiResponseMap {
  kpi_operacional_health: KpiOperacionalHealthResponse;
  kpi_operacional_resumo: KpiOperacionalResumoResponse;
  kpi_operacional_equipamentos: KpiOperacionalEquipamentosResponse;
  kpi_operacional_eventos: KpiOperacionalEventosResponse;
  kpi_operacional_paradas: KpiOperacionalParadasResponse;
  kpi_hh_custo_health: KpiHHCustoHealthResponse;
  kpi_hh_custo_resumo: KpiHHCustoResumoResponse;
  kpi_hh_custo_colaboradores: KpiHHCustoColaboradoresResponse;
  kpi_hh_custo_equipamentos: KpiHHCustoEquipamentosResponse;
  kpi_hh_custo_eventos: KpiHHCustoEventosResponse;
  kpi_hh_custo_os: KpiHHCustoOSResponse;
}

export type KpiResponseFor<A extends KpiAction> = KpiResponseMap[A];

/**
 * Estruturas físicas confirmadas na planilha.
 * Não são contrato público da API e não devem ser usadas pelo React
 * para recalcular indicadores.
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
