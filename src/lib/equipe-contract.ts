export const EQUIPE_ACTIONS = [
  "equipe_colaboradores",
  "equipe_colaborador_historico",
  "equipe_colaborador_criar",
  "equipe_acessos",
  "equipe_acesso_criar",
  "equipe_tecnicos",
  "equipe_tecnico_criar",
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


export interface EquipeTecnicoResumo {
  id_usuario: string;
  nome: string;
  login: string;
  perfil: "TECNICO";
  id_colaborador: string;
  unidade: string;
  ativo: string;
  primeiro_acesso: string;
  ultimo_login?: string;
  credencial_tipo?: string;
  colaborador: {
    nome: string;
    funcao: string;
    especialidade: string;
    ativo: string;
    status_cadastro: string;
    tipo_vinculo: string;
    contabilizar_hh_custo: string;
  };
}

export interface EquipeTecnicosResponse {
  success: boolean;
  total: number;
  tecnicos: EquipeTecnicoResumo[];
  versao: string;
}

export interface CriarColaboradorPayload {
  nome: string;
  nome_bd?: string;
  funcao: string;
  especialidade?: string;
  tipo_vinculo?: string;
  contabilizar_hh_custo: "SIM" | "NAO";
}

export interface CriarTecnicoPayload extends CriarColaboradorPayload {
  login: string;
  senha: string;
  id_colaborador?: string;
}


export type PerfilAcessoEquipe = "TECNICO" | "PCM" | "GESTAO" | "ADM";

export interface EquipeAcessoResumo {
  id_usuario: string;
  nome: string;
  login: string;
  perfil: PerfilAcessoEquipe;
  id_colaborador: string;
  unidade: string;
  ativo: string;
  primeiro_acesso: string;
  ultimo_login?: string;
  credencial_tipo?: string;
}

export interface EquipeAcessosResponse {
  success: boolean;
  total: number;
  acessos: EquipeAcessoResumo[];
  versao: string;
}

export interface CriarAcessoPayload {
  id_colaborador: string;
  perfil: PerfilAcessoEquipe;
  login: string;
  senha: string;
  unidade: string;
}
