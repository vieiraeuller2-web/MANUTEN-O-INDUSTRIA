import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchEquipeColaboradorHistorico,
  fetchEquipeColaboradores,
  fetchEquipeTecnicos,
  criarEquipeColaborador,
  criarEquipeTecnico,
  fetchEquipeAcessos,
  criarEquipeAcesso,
} from "@/lib/equipe-api";

const EQUIPE_STALE_TIME = 60_000;
const EQUIPE_GC_TIME = 10 * 60_000;

export const equipeQueryKeys = {
  colaboradores: ["equipe", "colaboradores"] as const,
  tecnicos: ["equipe", "tecnicos"] as const,
  acessos: ["equipe", "acessos"] as const,
  historico: (idColaborador: string) =>
    ["equipe", "historico", idColaborador] as const,
};

export function useEquipeColaboradores(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: equipeQueryKeys.colaboradores,
    queryFn: fetchEquipeColaboradores,
    enabled: options?.enabled ?? true,
    staleTime: EQUIPE_STALE_TIME,
    gcTime: EQUIPE_GC_TIME,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}


export function useEquipeColaboradorHistorico(
  idColaborador: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: equipeQueryKeys.historico(idColaborador),
    queryFn: () => fetchEquipeColaboradorHistorico(idColaborador),
    enabled: (options?.enabled ?? true) && Boolean(idColaborador),
    staleTime: EQUIPE_STALE_TIME,
    gcTime: EQUIPE_GC_TIME,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}


export function useEquipeTecnicos(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: equipeQueryKeys.tecnicos,
    queryFn: fetchEquipeTecnicos,
    enabled: options?.enabled ?? true,
    staleTime: EQUIPE_STALE_TIME,
    gcTime: EQUIPE_GC_TIME,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useCriarEquipeColaborador() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: criarEquipeColaborador,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: equipeQueryKeys.colaboradores });
    },
  });
}

export function useCriarEquipeTecnico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: criarEquipeTecnico,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: equipeQueryKeys.colaboradores }),
        queryClient.invalidateQueries({ queryKey: equipeQueryKeys.tecnicos }),
        queryClient.invalidateQueries({ queryKey: equipeQueryKeys.acessos }),
      ]);
    },
  });
}


export function useEquipeAcessos(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: equipeQueryKeys.acessos,
    queryFn: fetchEquipeAcessos,
    enabled: options?.enabled ?? true,
    staleTime: EQUIPE_STALE_TIME,
    gcTime: EQUIPE_GC_TIME,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useCriarEquipeAcesso() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: criarEquipeAcesso,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: equipeQueryKeys.acessos }),
        queryClient.invalidateQueries({ queryKey: equipeQueryKeys.tecnicos }),
        queryClient.invalidateQueries({ queryKey: equipeQueryKeys.colaboradores }),
      ]);
    },
  });
}
