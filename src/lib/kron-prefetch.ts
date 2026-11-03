/**
 * Antecipação pontual do código da tela (sem executar queries de dados).
 * Chamar apenas a partir de item já autorizado e visível ao usuário.
 * Erros de rede são ignorados; a navegação mantém seu fallback normal.
 */
const carregadores: Record<string, () => Promise<unknown>> = {
  "/": () => import("@/pages/Lubrificacao"),
  "/lubrificacao": () => import("@/pages/Lubrificacao"),
  "/os": () => import("@/pages/ListaOS"),
  "/os/nova": () => import("@/pages/NovaOS"),
  "/equipe": () => import("@/pages/Equipe"),
  "/tecnico": () => import("@/pages/TecnicoMinhasOS"),
  "/tecnico/nova": () => import("@/pages/TecnicoNovaOS"),
  "/preventivas": () => import("@/pages/Estoque"),
  "/planos-manutencao": () => import("@/pages/PlanosManutencao"),
  "/nf": () => import("@/pages/NotasFiscais"),
  "/lancamentos": () => import("@/pages/ServicosExternos"),
  "/obras": () => import("@/pages/Obras"),
  "/relatorios": () => import("@/pages/RelatoriosHub"),
};

const iniciados = new Set<string>();

export function anteciparModuloAutorizado(path: string): void {
  const carregar = carregadores[path];
  if (!carregar || iniciados.has(path)) return;
  iniciados.add(path);
  void carregar().catch(() => {
    // Permitir nova tentativa depois de uma falha de download.
    iniciados.delete(path);
  });
}
