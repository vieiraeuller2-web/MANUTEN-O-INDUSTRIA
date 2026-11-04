import { describe, expect, it } from "vitest";
import { validate } from "@/pages/NovaOS";

const opcoes = {
  equipamentos: ["TAG-001"], setores: ["MECANICA"], areas: ["TH30"],
  responsaveis: ["JOAO"], tipos: ["CORRETIVA"],
};
const base = {
  equipamento: "TAG-001", setor: "MECANICA", area: "TH30",
  responsavel: "JOAO", tipo: "CORRETIVA",
  data_inicio: "2026-11-04", hora_inicio: "08:00",
  dataConclusao: "2026-11-04", horaConclusao: "09:00",
  horimetro: "100", observacoes: "Serviço de manutenção",
};

describe("Lançamento de OS — validação operacional", () => {
  it("aceita datas e horários válidos e opções oficiais", () => {
    expect(validate(base, opcoes)).toEqual({});
  });
  it("impede conclusão anterior ao início mesmo no mesmo dia", () => {
    const errors = validate({ ...base, horaConclusao: "07:59" }, opcoes);
    expect(errors.horaConclusao).toBeTruthy();
    expect(errors.dataConclusao).toBeTruthy();
  });
  it("impede datas inexistentes e intervalos incorretos", () => {
    expect(validate({ ...base, data_inicio: "2026-02-30" }, opcoes).dataConclusao).toBeTruthy();
    expect(validate({ ...base, dataConclusao: "2026-11-03" }, opcoes).dataConclusao).toBeTruthy();
  });
  it("preserva responsabilidade digitada manualmente e bloqueia TAG desconhecida", () => {
    expect(validate({ ...base, responsavel: "Técnico avulso" }, opcoes).responsavel).toBeUndefined();
    expect(validate({ ...base, equipamento: "TAG-INEXISTENTE" }, opcoes).equipamento).toBeTruthy();
  });
});
