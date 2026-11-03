import { describe, expect, it } from "vitest";
import { allNavItems } from "@/components/BottomNav";
import { modulosPermitidos, pesquisarModulos } from "@/lib/kron-navigation";
import type { AuthUser } from "@/lib/api-client";

const criarUsuario = (perfil: AuthUser["perfil"], permissoes: AuthUser["permissoes"]): AuthUser => ({
  authenticated: true,
  login: "teste",
  nome: "Teste",
  unidade: "TH30",
  perfil,
  permissoes,
});

describe("KRON — navegação rápida segura", () => {
  it("não lista módulos quando não existe sessão", () => {
    expect(modulosPermitidos(null, allNavItems)).toEqual([]);
  });
  it("não concede módulos por perfil se não há permissões", () => {
    const user = criarUsuario("ADM", []);
    expect(modulosPermitidos(user, allNavItems)).toEqual([]);
  });
  it("lista somente módulos autorizados ao PCM", () => {
    const user = criarUsuario("PCM", [{ modulo: "EQUIPE_COLABORADORES", visualizar: true }]);
    const paths = modulosPermitidos(user, allNavItems).map((item) => item.path);
    expect(paths).toContain("/equipe");
    expect(paths).not.toContain("/tecnico");
    expect(paths).not.toContain("/os/nova");
    expect(paths).not.toContain("/nf");
  });
  it("respeita rotas exclusivas do TECNICO", () => {
    const user = criarUsuario("TECNICO", [{ modulo: "MINHAS_OS", visualizar: true }]);
    const paths = modulosPermitidos(user, allNavItems).map((item) => item.path);
    expect(paths).toContain("/tecnico");
    expect(paths).not.toContain("/equipe");
  });
  it("pesquisa por titulo, nome e caminho sem acentos", () => {
    const user = criarUsuario("PCM", [
      { modulo: "EQUIPE_COLABORADORES", visualizar: true },
      { modulo: "HISTORICO", visualizar: true },
    ]);
    const permitidos = modulosPermitidos(user, allNavItems);
    expect(pesquisarModulos(permitidos, "histórico").map((item) => item.path)).toEqual(["/os"]);
    expect(pesquisarModulos(permitidos, "colaboradores").map((item) => item.path)).toEqual(["/equipe"]);
    expect(pesquisarModulos(permitidos, "relatórios")).toEqual([]);
  });
});
