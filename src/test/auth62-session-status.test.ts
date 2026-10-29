import { describe, expect, it } from "vitest";
import { sessaoRejeitadaPeloAUTH62 as rejeitada } from "../../api/_shared/auth62-session-status";

describe("AUTH62 — sinalizacao segura de sessao", () => {
  it("reconhece inativacao e revogacao explicitas", () => {
    expect(rejeitada({ success: false, message: "USER_INACTIVE" })).toBe(true);
    expect(rejeitada({ success: false, message: "Sessão inativa ou revogada" })).toBe(true);
    expect(rejeitada({ success: false, code: "SESSION_REVOKED" })).toBe(true);
    expect(rejeitada({ success: false, code: 401 })).toBe(true);
  });
  it("não encerra a sessao por falta de permissao", () => {
    expect(rejeitada({ success: false, code: 403, message: "ACCESS_DENIED" })).toBe(false);
  });
  it("não confunde indisponibilidade e erros de contrato com revogacao", () => {
    expect(rejeitada({ success: false, message: "Timeout ao conectar com o backend" })).toBe(false);
    expect(rejeitada({ success: false, message: "Resposta inválida do servidor" })).toBe(false);
  });
  it("não derruba sessao confirmada pelo backend", () => {
    expect(rejeitada({ success: true, code: 401 })).toBe(false);
  });
});
