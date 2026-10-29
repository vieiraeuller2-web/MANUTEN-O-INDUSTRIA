import { describe, expect, it } from "vitest";
import { combinarResponsaveis, responsavelForaDaLista } from "@/lib/responsaveis-os";
describe("Responsáveis da OS", () => {
  it("mescla cadastrados com nomes históricos sem duplicar por acentos ou letras", () => {
    expect(combinarResponsaveis(["Jose Silva", "Maria"], ["José Silva", "Ana"])).toEqual(["Ana", "José Silva", "Maria"]);
  });
  it("preserva responsável digitado fora da lista sem considerá-lo cadastro", () => {
    expect(responsavelForaDaLista("Nome Avulso", ["Maria"])).toBe(true);
    expect(responsavelForaDaLista("  maria ", ["Maria"])).toBe(false);
    expect(responsavelForaDaLista(" ", ["Maria"])).toBe(false);
  });
  it("descarta nomes vazios", () => {
    expect(combinarResponsaveis(["", "  "], ["Carlos"])).toEqual(["Carlos"]);
  });
});
