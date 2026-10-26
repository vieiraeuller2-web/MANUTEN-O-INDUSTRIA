import { describe, it, expect } from "vitest";
import { diagnosticarFalhaAuthMe } from "../../api/_shared/auth-me-diagnostics";

describe("Diagnóstico seguro da resposta AUTH62", () => {
  it("detecta ação não reconhecida sem expor mensagem original", () => {
    const info = diagnosticarFalhaAuthMe({ success: false, message: "Ação auth_me desconhecida, token=EXEMPLO" });
    expect(info.categoria).toBe("ACAO_NAO_RECONHECIDA");
    expect(JSON.stringify(info)).not.toContain("EXEMPLO");
  });
  it("detecta recusa de sessão no contrato", () => {
    expect(diagnosticarFalhaAuthMe({ success: false, message: "Sessão inválida" }).categoria).toBe("SESSAO_OU_TOKEN");
  });
  it("identifica resposta sem mensagem", () => {
    expect(diagnosticarFalhaAuthMe({ success: false }).categoria).toBe("SEM_MENSAGEM");
  });
  it("detecta timeout", () => {
    expect(diagnosticarFalhaAuthMe({ success: false, message: "Timeout ao conectar com o backend" }).motivo).toBe("GAS_TIMEOUT");
  });
});
