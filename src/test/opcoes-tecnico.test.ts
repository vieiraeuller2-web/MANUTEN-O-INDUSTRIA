import { describe, expect, it } from "vitest";
import { encontrarOpcaoOficial } from "@/lib/opcoes-tecnico";

describe("Nova OS Técnico — equipamento digitável", () => {
  const equipamentos = ["CTD001", "BAN004", "CPS005 (AGF)"];
  it("aceita TAG oficial digitada sem diferenciar letras", () => {
    expect(encontrarOpcaoOficial("ctd001", equipamentos)).toBe("CTD001");
  });
  it("aceita valor selecionado da lista", () => {
    expect(encontrarOpcaoOficial("BAN004", equipamentos)).toBe("BAN004");
  });
  it("nega equipamento não cadastrado", () => {
    expect(encontrarOpcaoOficial("TAG-NAO-EXISTENTE", equipamentos)).toBeNull();
  });
  it("nega entrada vazia e normaliza espaços", () => {
    expect(encontrarOpcaoOficial("", equipamentos)).toBeNull();
    expect(encontrarOpcaoOficial(" cps005 (agf) ", equipamentos)).toBe("CPS005 (AGF)");
  });
});
