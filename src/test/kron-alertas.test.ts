import { describe, expect, it } from "vitest";
import { situacaoEfetivaPlano } from "@/components/preventivas/preventivas-utils";
import { rankingLubrificacoes } from "@/lib/lubrificacao-critica";
import type { PlanoPreventiva } from "@/types/preventivas";

const dia = new Date("2026-10-22T15:00:00.000Z");
const plano = (extra: Partial<PlanoPreventiva>): PlanoPreventiva => ({
  id_plano: "PLAN-001", id_ativo: "ATIVO-001", id_setor: "SETOR-001",
  titulo_plano: "Revisão mecânica", ativo: "SIM", status_plano: "EM DIA", ...extra,
});

describe("Situação real dos planos", () => {
  it("corrige em dia vencido por data ISO", () => {
    expect(situacaoEfetivaPlano(plano({ proxima_execucao: "2026-10-19" }), dia)).toEqual({ status: "VENCIDA", diasRestantes: -3 });
  });
  it("aceita formato brasileiro e marca o prazo de hoje", () => {
    expect(situacaoEfetivaPlano(plano({ proxima_execucao: "22/10/2026" }), dia).status).toBe("A VENCER");
  });
  it("reconcilia dia futuro com o status antigo", () => {
    expect(situacaoEfetivaPlano(plano({ proxima_execucao: "2026-11-15", status_plano: "VENCIDA" }), dia).status).toBe("EM DIA");
  });
  it("usa dias restantes quando a data não foi informada", () => {
    expect(situacaoEfetivaPlano(plano({ dias_restantes: -11 }), dia).status).toBe("VENCIDA");
  });
  it("não inventa 'em dia' sem informação temporal confiável", () => {
    expect(situacaoEfetivaPlano(plano({}), dia).status).toBe("SEM DATA-BASE");
  });
  it("prioriza plano inativo", () => {
    expect(situacaoEfetivaPlano(plano({ ativo: "NÃO", proxima_execucao: "2026-01-01" }), dia).status).toBe("INATIVO");
  });
  it("ignora datas inválidas", () => {
    expect(situacaoEfetivaPlano(plano({ proxima_execucao: "31/02/2026" }), dia).status).toBe("SEM DATA-BASE");
  });
});

describe("Atrasos de lubrificação por horímetro", () => {
  it("prioriza o maior atraso e utiliza os campos da planilha", () => {
    expect(rankingLubrificacoes([
      { EQUIPAMENTO: "Serra 1", SETOR: "Corte", HORAS_RESTANTES: "-25" },
      { EQUIPAMENTO: "Politriz", HORIMETRO_ATUAL: "650", HORIMETRO_ULTIMA_LUB: "100", INTERVALO_LUB: "300" },
      { EQUIPAMENTO: "Serra 2", HORAS_RESTANTES: "80" },
      { EQUIPAMENTO: "Sem leitura" },
    ]).map((item) => [item.equipamento, item.horasAtraso])).toEqual([["Politriz", 250], ["Serra 1", 25]]);
  });
  it("não apresenta atraso sem dado mensurável", () => {
    expect(rankingLubrificacoes([{ EQUIPAMENTO: "Equipamento 1", STATUS: "VENCIDA" }])).toEqual([]);
  });
});
