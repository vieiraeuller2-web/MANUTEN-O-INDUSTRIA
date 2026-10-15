export const EQUIPE_ACTIONS = [
  "equipe_colaboradores",
  "equipe_colaborador_historico",
] as const;

export type EquipeAction = (typeof EQUIPE_ACTIONS)[number];

/**
 * Estrutura observada em Preview em 2026-10-15.
 * Não expõe SENHA_HASH, SENHA_SALT ou credenciais de USUARIOS.
 */
export interface EquipeColaborador {
  id_colaborador: string;
  nome: string;
  nome_bd: string;
  funcao: string;
  especialidade: string;
  ativo: string;
  status_cadastro: string;
  tipo_vinculo: string;
  contabilizar_hh_custo: string;

  /**
   * O primeiro item observado retornou null.
   * O tipo definitivo será refinado somente após captura de mais valores
   * ou do contrato canônico do endpoint.
   */
  custo_atual: unknown;
}

export interface EquipeColaboradoresResponse {
  success: boolean;
  total: number;
  colaboradores: EquipeColaborador[];
  versao: string;
}


export interface EquipeColaboradorResumo {
  id_colaborador: string;
  nome: string;
  funcao: string;
  ativo: string;
  tipo_vinculo: string;
  contabilizar_hh_custo: string;
}

/**
 * O array historico foi observado vazio na primeira captura.
 * Não tipar os itens até existir evidência real de pelo menos um registro.
 */
export interface EquipeColaboradorHistoricoResponse {
  success: boolean;
  colaborador: EquipeColaboradorResumo;
  historico: unknown[];
  versao: string;
}
