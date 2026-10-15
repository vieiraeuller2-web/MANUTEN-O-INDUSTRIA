import { describe, expect, it } from "vitest";
import {
  ALLOWED_ACTIONS,
  resolveGASMethodForAction,
} from "../../api/_shared/gas-client";

describe("resolveGASMethodForAction", () => {
  it("usa GET para endpoints KPI homologados como leitura", () => {
    expect(resolveGASMethodForAction("kpi_operacional_resumo")).toBe("GET");
    expect(resolveGASMethodForAction("kpi_hh_custo_resumo")).toBe("GET");
  });

  it("usa GET para leituras confirmadas de técnico e equipe", () => {
    expect(resolveGASMethodForAction("equipe_colaboradores")).toBe("GET");
    expect(resolveGASMethodForAction("equipe_colaborador_historico")).toBe("GET");
    expect(resolveGASMethodForAction("minhas_os")).toBe("GET");
  });

  it("preserva POST para escritas confirmadas", () => {
    expect(resolveGASMethodForAction("registrar_os")).toBe("POST");
    expect(resolveGASMethodForAction("os_manual_tecnico")).toBe("POST");
  });

  it("respeita método explícito quando informado", () => {
    expect(
      resolveGASMethodForAction("kpi_operacional_resumo", "POST")
    ).toBe("POST");
  });
});

describe("ALLOWED_ACTIONS técnico/equipe", () => {
  it("libera apenas os contratos técnicos auditados nesta etapa", () => {
    expect(ALLOWED_ACTIONS.has("equipe_colaboradores")).toBe(true);
    expect(ALLOWED_ACTIONS.has("equipe_colaborador_historico")).toBe(true);
    expect(ALLOWED_ACTIONS.has("minhas_os")).toBe(true);
    expect(ALLOWED_ACTIONS.has("os_manual_tecnico")).toBe(true);
  });

  it("não inventa action administrativa de criação de técnico", () => {
    expect(ALLOWED_ACTIONS.has("criar_usuario_tecnico")).toBe(false);
    expect(ALLOWED_ACTIONS.has("equipe_criar_tecnico")).toBe(false);
  });
});
