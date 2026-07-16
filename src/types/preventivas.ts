export type ValorContadorPreventiva = number | string | null;

export interface SetorPreventiva {
  id_setor: string;
  nome_setor: string;
  descricao?: string;
  ordem?: string | number;
  ativo?: string;
  observacao?: string;
  quantidade_ativos?: ValorContadorPreventiva;
  total_ativos?: ValorContadorPreventiva;
}

export interface AtivoPreventiva {
  id_ativo: string;
  id_setor: string;
  setor?: string;
  tag_ativo?: string;
  nome_ativo: string;
  tipo_ativo?: string;
  fabricante?: string;
  modelo?: string;
  localizacao?: string;
  criticidade?: string;
  ativo?: string;
  ordem?: string | number;
  observacao?: string;
  quantidade_planos?: ValorContadorPreventiva;
  total_planos?: ValorContadorPreventiva;
}

export interface PlanoPreventiva {
  id_plano: string;
  id_setor: string;
  setor?: string;
  id_ativo: string;
  tag_ativo?: string;
  nome_ativo?: string;
  titulo_plano: string;
  tipo_plano?: string;
  modalidade?: string;
  periodicidade?: string;
  periodicidade_tipo?: string;
  periodicidade_descricao?: string;
  periodicidade_origem?: string;
  periodicidade_dias_uteis?: string | number;
  contagem_dias?: string | number;
  especialidade_principal?: string;
  responsavel_padrao?: string;
  data_base?: string;
  ultima_execucao?: string;
  proxima_execucao?: string;
  dias_restantes?: string | number;
  status_plano?: string;
  gera_alerta_telegram?: string;
  gera_pdf?: string;
  ativo?: string;
  ordem?: string | number;
  observacao?: string;
  quantidade_itens?: ValorContadorPreventiva;
  total_itens?: ValorContadorPreventiva;
}

export interface NoPreventiva {
  id_no: string;
  id_plano: string;
  id_ativo?: string;
  tag_ativo?: string;
  id_no_pai?: string;
  nivel?: string | number;
  tipo_no?: string;
  nome_no?: string;
  especialidade?: string;
  item_verificacao?: string;
  criterio_aceite?: string;
  metodo_verificacao?: string;
  ferramenta?: string;
  risco_se_nao_executar?: string;
  obrigatorio?: string;
  periodicidade_propria_dias_uteis?: string | number;
  ordem?: string | number;
  exibir_no_pdf?: string;
  ativo?: string;
  observacao?: string;
  filhos?: NoPreventiva[];
}

export interface ResumoPreventivas {
  indicadores: Record<string, unknown>;
  por_modalidade?: Record<string, unknown>;
  por_periodicidade?: Record<string, unknown>;
  por_status?: Record<string, unknown>;
}

export interface ArvorePreventivaResposta {
  id_plano: string;
  total?: number;
  data: NoPreventiva[];
  arvore: NoPreventiva[];
}

export interface PlanoCompletoPreventiva {
  setor?: SetorPreventiva;
  ativo?: AtivoPreventiva;
  plano: PlanoPreventiva;
  total_itens?: number;
  itens: NoPreventiva[];
  arvore: NoPreventiva[];
}

export interface FiltrosPreventivas {
  busca: string;
  setor: string;
  ativo: string;
  modalidade: string;
  periodicidade: string;
  status: string;
}

export type ResultadoPreventiva = "OK" | "NOK" | "NA";

export interface ResultadoItemPreventiva {
  id_no: string;
  resultado: ResultadoPreventiva;
  observacao: string;
}

export interface ConcluirPreventivaPayload {
  action: "preventiva_concluir";
  id_execucao: string;
  id_plano: string;
  data_realizada: string;
  responsavel: string;
  apontado_por: string;
  observacao: string;
  itens: ResultadoItemPreventiva[];
}

export interface ResumoConclusaoPreventiva {
  qtd_itens?: number;
  qtd_ok?: number;
  qtd_nok?: number;
  qtd_na?: number;
  qtd_pendente?: number;
}

export interface CicloConclusaoPreventiva {
  ultima_execucao?: string;
  proxima_execucao?: string;
  dias_restantes?: number | string;
  status_plano?: string;
  periodicidade?: string;
}

export interface ConcluirPreventivaResponse {
  success: true;
  message?: string;
  id_execucao?: string;
  duplicado?: boolean;
  resumo?: ResumoConclusaoPreventiva;
  ciclo?: CicloConclusaoPreventiva;
}

export interface PdfPreventivaResponse {
  success: true;
  message?: string;
  url: string;
}
