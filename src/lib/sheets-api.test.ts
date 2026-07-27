import { describe, expect, it } from "vitest";
import { buildCreateOSPayload, parseSheetResponse } from "@/lib/sheets-api";

describe("integração da planilha de OS", () => {
  it("lê todos os campos devolvidos pela API com nomes normalizados", () => {
    const rows = parseSheetResponse({
      success: true,
      headers: [
        "id_os",
        "equipamento",
        "data_conclusao",
        "hora_conclusao",
        "horimetro",
      ],
      data: [{
        id_os: "OS-20260722-130816-C7D241DA",
        equipamento: "MTF001",
        setor: "SERRARIA",
        area: "LUBRIFICAÇÃO",
        responsavel: "FLAVIO",
        tipo: "PREVENTIVA",
        data_inicio: "22/07/2026",
        hora_inicio: "07:30",
        data_conclusao: "22/07/2026",
        hora_conclusao: "09:30",
        horimetro: "6189",
        observacoes: "Lubrificação concluída",
      }],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id_os: "OS-20260722-130816-C7D241DA",
      data_inicio: "2026-07-22",
      hora_inicio: "07:30",
      data_fim: "2026-07-22",
      hora_fim: "09:30",
      horimetro: 6189,
      observacoes: "Lubrificação concluída",
    });
  });

  it("preserva o horímetro digitado no campo principal e no campo de auditoria", () => {
    const payload = buildCreateOSPayload({
      equipamento: "MTF001",
      setor: "SERRARIA",
      area: "LUBRIFICAÇÃO",
      responsavel: "FLAVIO",
      tipo: "PREVENTIVA",
      data_inicio: "2026-07-22",
      hora_inicio: "07:30",
      dataConclusao: "2026-07-22",
      horaConclusao: "09:30",
      horimetro: "6469",
      observacoes: "Teste de comunicação",
      client_submission_id: "teste-id",
    });

    expect(payload.horimetro).toBe("6469");
    expect(payload.horimetro_informado).toBe("6469");
    expect(payload.client_submission_id).toBe("teste-id");
    expect(payload.cliente_versao).toBe("web-os-v2");
  });

  it("aceita decimal com vírgula sem transformar o valor em zero", () => {
    const payload = buildCreateOSPayload({
      equipamento: "CTD001",
      setor: "MARMORARIA",
      area: "MAN. MECANICA",
      responsavel: "GABRIEL",
      tipo: "CORRETIVA",
      data_inicio: "2026-07-27",
      hora_inicio: "08:00",
      dataConclusao: "2026-07-27",
      horaConclusao: "09:00",
      horimetro: "1234,5",
      observacoes: "Teste",
      client_submission_id: "teste-decimal",
    });

    expect(payload.horimetro).toBe("1234.5");
    expect(payload.horimetro_informado).toBe("1234.5");
  });
});
