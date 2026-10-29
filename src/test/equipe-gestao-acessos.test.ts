import { describe, expect, it, vi } from "vitest";
import { ALLOWED_ACTIONS, resolveGASMethodForAction } from "../../api/_shared/gas-client";

vi.mock("@/lib/api-client", () => ({ apiProxy: vi.fn() }));
import { apiProxy } from "@/lib/api-client";
import { alterarStatusEquipeAcesso, redefinirSenhaEquipeAcesso } from "@/lib/equipe-api";

describe("Gestão de acesso da Equipe", () => {
  it("expõe ações administrativas na whitelist, sem usar GET", () => {
    expect(ALLOWED_ACTIONS.has("equipe_acesso_status")).toBe(true);
    expect(ALLOWED_ACTIONS.has("equipe_acesso_redefinir_senha")).toBe(true);
    expect(resolveGASMethodForAction("equipe_acesso_status")).toBe("POST");
    expect(resolveGASMethodForAction("equipe_acesso_redefinir_senha")).toBe("POST");
  });
  it("encaminha id de usuário e status ao backend", async () => {
    vi.mocked(apiProxy).mockResolvedValueOnce({ success: true });
    await alterarStatusEquipeAcesso({ id_usuario: "USR-1", ativo: "NAO" });
    expect(apiProxy).toHaveBeenCalledWith("equipe_acesso_status", { id_usuario: "USR-1", ativo: "NAO" });
  });
  it("encaminha redefinição de senha somente ao endpoint autorizado", async () => {
    vi.mocked(apiProxy).mockResolvedValueOnce({ success: true });
    await redefinirSenhaEquipeAcesso({ id_usuario: "USR-2", nova_senha: "NovaSenhaDeTeste123" });
    expect(apiProxy).toHaveBeenCalledWith("equipe_acesso_redefinir_senha", { id_usuario: "USR-2", nova_senha: "NovaSenhaDeTeste123" });
  });
});
