import { useQuery } from "@tanstack/react-query";
import { apiProxy, type FormOptions } from "@/lib/api-client";

/**
 * Query key para opções do formulário de OS.
 * Separada do histórico — registrar uma OS NÃO invalida estas opções.
 */
export const FORM_OPTIONS_QUERY_KEY = ["os-form-options"] as const;

/** Opções mudam raramente — staleTime alto (30 min). */
const OPTIONS_STALE_TIME = 30 * 60_000;
const OPTIONS_GC_TIME = 60 * 60_000;

/**
 * Hook que carrega opções do formulário de OS via action dedicada.
 * Não depende do histórico completo de OS.
 * 
 * Dados retornados: equipamentos, setores, áreas, responsáveis, tipos.
 */
export function useFormOptionsOS() {
  return useQuery({
    queryKey: FORM_OPTIONS_QUERY_KEY,
    queryFn: () => apiProxy<FormOptions>("opcoes_formulario_os"),
    staleTime: OPTIONS_STALE_TIME,
    gcTime: OPTIONS_GC_TIME,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
