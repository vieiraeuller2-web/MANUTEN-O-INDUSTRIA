import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, render, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/lib/api-client", () => ({
  apiLogin: vi.fn(),
  apiGetMe: vi.fn().mockResolvedValue(null),
  apiLogout: vi.fn().mockResolvedValue(undefined),
}));

import * as apiClient from "@/lib/api-client";
import { AuthProvider, useAuth, canAccessRoute } from "@/contexts/AuthContext";
import RequireAuth from "@/components/RequireAuth";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Permissao, Perfil } from "@/lib/api-client";

function createWrapper(qc?: QueryClient) {
  const queryClient = qc ?? new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };
}

describe("AuthContext Base", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("auth_me restaura permissões atuais recebidas do GAS", async () => {
    const permissoesGAS = [{ modulo: "*", visualizar: true }];
    vi.mocked(apiClient.apiGetMe).mockResolvedValueOnce({
      authenticated: true,
      perfil: "ADM",
      nome: "Admin",
      login: "admin",
      unidade: "MATRIZ",
      permissoes: permissoesGAS,
    });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.user?.permissoes).toEqual(permissoesGAS);
  });
});

describe("canAccessRoute - Nova Lógica Baseada em Módulos (authz)", () => {
  const mockUser = (perfil: Perfil, permissoes?: Permissao[]): any => ({
    authenticated: true,
    perfil,
    nome: "Test",
    login: "test",
    unidade: "MATRIZ",
    permissoes,
  });

  it("A. ADM recebe somente modulo='*' visualizar=true e acessa /os", () => {
    const user = mockUser("ADM", [{ modulo: "*", visualizar: true }]);
    expect(canAccessRoute(user, "/os")).toBe(true);
  });

  it("B. ADM com wildcard completo acessa rota que exige criação", () => {
    const user = mockUser("ADM", [
      { modulo: "*", visualizar: true, criar: true },
    ]);
    expect(canAccessRoute(user, "/lubrificacao")).toBe(true);
    expect(canAccessRoute(user, "/os/nova")).toBe(true);
  });

  it("C. HISTORICO visualizar=true libera /os", () => {
    const user = mockUser("PCM", [{ modulo: "HISTORICO", visualizar: true }]);
    expect(canAccessRoute(user, "/os")).toBe(true);
  });

  it("D. LANCAMENTO exige criar=true para liberar /os/nova", () => {
    const apenasLeitura = mockUser("TECNICO", [
      { modulo: "LANCAMENTO", visualizar: true, criar: false },
    ]);
    const podeCriar = mockUser("PCM", [
      { modulo: "LANCAMENTO", visualizar: true, criar: true },
    ]);

    expect(canAccessRoute(apenasLeitura, "/os/nova")).toBe(false);
    expect(canAccessRoute(podeCriar, "/os/nova")).toBe(true);
  });

  it("E. usuário sem wildcard e sem módulo requerido é bloqueado", () => {
    const user = mockUser("TECNICO", [{ modulo: "LUBRIFICACAO", visualizar: true }]);
    // tenta acessar HISTORICO
    expect(canAccessRoute(user, "/os")).toBe(false);
  });

  it("F. PCM não ganha acesso a módulo que não recebeu", () => {
    const user = mockUser("PCM", [{ modulo: "HISTORICO", visualizar: true }]);
    expect(canAccessRoute(user, "/lubrificacao")).toBe(false);
  });

  it("G. GESTAO não ganha acesso a módulo que não recebeu", () => {
    const user = mockUser("GESTAO", [{ modulo: "LUBRIFICACAO", visualizar: true }]);
    expect(canAccessRoute(user, "/os/nova")).toBe(false); // Exige LANCAMENTO
  });

  it("H. TECNICO não ganha acesso a módulo que não recebeu", () => {
    const user = mockUser("TECNICO", [{ modulo: "LANCAMENTO", visualizar: true }]);
    expect(canAccessRoute(user, "/lubrificacao")).toBe(false);
  });

  it("I. permissões vazias ou ausentes = acesso negado às rotas protegidas (fail closed)", () => {
    expect(canAccessRoute(mockUser("ADM", []), "/os")).toBe(false);
    expect(canAccessRoute(mockUser("ADM", undefined), "/os")).toBe(false);
    expect(canAccessRoute(mockUser("PCM", []), "/os/nova")).toBe(false);
  });

  it("J. precedência idêntica ao auth62Autorizar_: wildcard atua e sobrepõe ausência ou false de específica", () => {
    // Mesmo se HISTORICO for false explícito (coisa q o auth62 nem suporta, mas p/ testar)
    // O wildcard deve dominar a verificação primeiro.
    const user = mockUser("PCM", [
      { modulo: "*", visualizar: true },
      { modulo: "HISTORICO", visualizar: false }, // especifico
    ]);
    expect(canAccessRoute(user, "/os")).toBe(true); // wildcard foi pego primeiro
  });
  
  it("Rotas públicas devem ser acessíveis sem permissão", () => {
    const user = mockUser("ADM", []);
    expect(canAccessRoute(user, "/login")).toBe(true);
    expect(canAccessRoute(user, "/equipamento/123")).toBe(true);
  });

  it("ADM wildcard vê rotas mapeadas (OBRAS, LANCAMENTO, etc)", () => {
    const user = mockUser("ADM", [{ modulo: "*", visualizar: true }]);
    expect(canAccessRoute(user, "/obras")).toBe(true);
    expect(canAccessRoute(user, "/preventivas")).toBe(true);
    expect(canAccessRoute(user, "/nf")).toBe(true);
    expect(canAccessRoute(user, "/servicos-externos")).toBe(true);
  });

  it("TECNICO com OS_MANUAL cria pela rota tecnica sem abrir lancamento administrativo", () => {
    const user = mockUser("TECNICO", [
      { modulo: "OS_MANUAL", visualizar: true, criar: true },
      { modulo: "LANCAMENTO", visualizar: true, criar: false },
    ]);

    expect(canAccessRoute(user, "/tecnico/nova")).toBe(true);
    expect(canAccessRoute(user, "/os/nova")).toBe(false);
  });

  it("TECNICO com MINHAS_OS acessa a area tecnica", () => {
    const user = mockUser("TECNICO", [
      { modulo: "MINHAS_OS", visualizar: true },
    ]);
    expect(canAccessRoute(user, "/tecnico")).toBe(true);
    expect(canAccessRoute(user, "/os")).toBe(false);
    expect(canAccessRoute(user, "/lubrificacao")).toBe(false);
  });

  it("rota / usa o módulo LUBRIFICACAO", () => {
    const user = mockUser("TECNICO", [{ modulo: "LUBRIFICACAO", visualizar: true }]);
    expect(canAccessRoute(user, "/")).toBe(true);
  });

  it("novas rotas mapeadas são acessíveis apenas com seus módulos", () => {
    const p1 = mockUser("PCM", [{ modulo: "PLANO_MANUTENCAO", visualizar: true }]);
    expect(canAccessRoute(p1, "/preventivas")).toBe(true);
    expect(canAccessRoute(p1, "/planos-manutencao")).toBe(true);

    const n1 = mockUser("FINANCEIRO", [{ modulo: "NOTAS_FISCAIS", visualizar: true }]);
    expect(canAccessRoute(n1, "/nf")).toBe(true);

    const s1 = mockUser("EXTERNO", [{ modulo: "SERVICOS_EXTERNOS", visualizar: true }]);
    expect(canAccessRoute(s1, "/servicos-externos")).toBe(true);
    expect(canAccessRoute(s1, "/lancamentos")).toBe(true);
    
    const o1 = mockUser("ENGENHARIA", [{ modulo: "OBRAS", visualizar: true }]);
    expect(canAccessRoute(o1, "/obras")).toBe(true);
  });

  describe("Perfil GESTAO Específico", () => {
    const gestaoUser = mockUser("GESTAO", [
      { modulo: "DASH_COMPLETO", visualizar: true },
      { modulo: "LUBRIFICACAO", visualizar: true },
    ]);

    it("1. GESTAO com DASH_COMPLETO visualizar=true vê Dashboard", () => {
      expect(canAccessRoute(gestaoUser, "/relatorios")).toBe(true);
    });
    
    it("2. GESTAO com LUBRIFICACAO visualizar=true vê Lubrificação", () => {
      expect(canAccessRoute(gestaoUser, "/lubrificacao")).toBe(true);
      expect(canAccessRoute(gestaoUser, "/")).toBe(true);
    });

    it("3. GESTAO não vê Histórico", () => {
      expect(canAccessRoute(gestaoUser, "/os")).toBe(false);
      expect(canAccessRoute(gestaoUser, "/os/123")).toBe(false);
    });

    it("4. GESTAO não vê Lançamento de OS", () => {
      expect(canAccessRoute(gestaoUser, "/os/nova")).toBe(false);
    });

    it("5. GESTAO não vê Obras", () => {
      expect(canAccessRoute(gestaoUser, "/obras")).toBe(false);
    });

    it("6. GESTAO não vê NF", () => {
      expect(canAccessRoute(gestaoUser, "/nf")).toBe(false);
    });

    it("7. GESTAO não vê Serviços Externos", () => {
      expect(canAccessRoute(gestaoUser, "/servicos-externos")).toBe(false);
      expect(canAccessRoute(gestaoUser, "/lancamentos")).toBe(false);
    });

    it("8. GESTAO não vê Preventivas / Plano de Manutenção", () => {
      expect(canAccessRoute(gestaoUser, "/preventivas")).toBe(false);
      expect(canAccessRoute(gestaoUser, "/planos-manutencao")).toBe(false);
    });

    it("9. GESTAO não consegue abrir diretamente uma rota sem permissão", () => {
      const userSemPermissao = mockUser("GESTAO", []);
      expect(canAccessRoute(userSemPermissao, "/relatorios")).toBe(false);
      expect(canAccessRoute(userSemPermissao, "/lubrificacao")).toBe(false);
    });

    it("10. ADM wildcard continua vendo tudo, independente dos testes de GESTAO", () => {
      const adm = mockUser("ADM", [{ modulo: "*", visualizar: true }]);
      expect(canAccessRoute(adm, "/relatorios")).toBe(true);
      expect(canAccessRoute(adm, "/lubrificacao")).toBe(true);
      expect(canAccessRoute(adm, "/os")).toBe(true);
    });
  });
});

describe("RequireAuth (Autorização Central)", () => {
  it("RequireAuth bloqueia rotas se não tiver permissão", async () => {
    vi.mocked(apiClient.apiGetMe).mockResolvedValue({
      authenticated: true,
      perfil: "PCM",
      nome: "Gabriel",
      login: "gabriel",
      unidade: "SERRARIA",
      permissoes: [], // Sem permissão - Fail closed
    });

    const TestApp = () => (
      <MemoryRouter initialEntries={["/os"]}>
        <QueryClientProvider client={new QueryClient()}>
          <AuthProvider>
            <Routes>
              <Route path="/os" element={<RequireAuth><div>Conteúdo de OS</div></RequireAuth>} />
            </Routes>
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );

    const { getByText } = render(<TestApp />);
    await waitFor(() => expect(getByText("Acesso não autorizado")).toBeTruthy());
  });

  it("RequireAuth libera a rota se tiver permissão do módulo", async () => {
    vi.mocked(apiClient.apiGetMe).mockResolvedValue({
      authenticated: true,
      perfil: "PCM",
      nome: "Gabriel",
      login: "gabriel",
      unidade: "SERRARIA",
      permissoes: [{ modulo: "HISTORICO", visualizar: true }],
    });

    const TestApp = () => (
      <MemoryRouter initialEntries={["/os"]}>
        <QueryClientProvider client={new QueryClient()}>
          <AuthProvider>
            <Routes>
              <Route path="/os" element={<RequireAuth><div>Conteúdo de OS</div></RequireAuth>} />
            </Routes>
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );

    const { getByText } = render(<TestApp />);
    await waitFor(() => expect(getByText("Conteúdo de OS")).toBeTruthy());
  });
});
