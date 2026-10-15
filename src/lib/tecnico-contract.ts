export interface TecnicoColaborador {
  id_colaborador: string;
  nome: string;
}

export interface TecnicoMinhasOSFiltros {
  equipamento: string;
  tipo: string;
  status: string;
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
