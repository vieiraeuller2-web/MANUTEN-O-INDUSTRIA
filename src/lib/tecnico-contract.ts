export interface TecnicoColaborador {
  id_colaborador: string;
  nome: string;
}

export interface TecnicoMinhasOSFiltros {
  equipamento: string;
  tipo: string;
  status: string;
}

export interface TecnicoMinhasOSParams {
  page?: number;
  page_size?: number;
  equipamento?: string;
  tipo?: string;
  status?: string;
}

export interface TecnicoMinhaOS {
  id_os: string;
  equipamento: string;
  setor: string;
  area: string;
  responsavel: string;
  tipo: string;
  data_inicio: string;
  hora_inicio: string;
  data_conclusao: string;
  hora_conclusao: string;
  horimetro: string;
  observacoes: string;
  status: string;
}

export interface TecnicoMinhasOSResponse {
  success: boolean;
  colaborador: TecnicoColaborador;
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  filtros: TecnicoMinhasOSFiltros;
  os: TecnicoMinhaOS[];
  versao: string;
}


/**
 * Payload da OS manual do técnico.
 *
 * Equipamento + campos operacionais seguem a experiência homologada do QR.
 * Setor e responsável não são escolhidos pelo técnico: devem ser resolvidos
 * pelo backend a partir do equipamento e da sessão autenticada.
 */
export interface TecnicoNovaOSPayload {
  equipamento: string;
  area: string;
  tipo: string;
  data_inicio: string;
  hora_inicio: string;
  data_conclusao: string;
  hora_conclusao: string;
  horimetro: string;
  observacoes: string;
}

export interface TecnicoNovaOSResponse {
  success: boolean;
  id_os?: string;
  numero_os?: string;
  message?: string;
  versao?: string;
}
