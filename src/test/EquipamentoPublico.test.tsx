import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import EquipamentoPublico from "@/pages/EquipamentoPublico";

const versao = "CONTROLE_MANUTENCAO_QR_API_PUBLICA_20260806_V1";

function respostaJson(data: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  } as Response);
}

function renderizar(codigo: string) {
  return render(
    <MemoryRouter initialEntries={[`/equipamento/${codigo}`]}>
      <Routes>
        <Route path="/equipamento/:codigo" element={<EquipamentoPublico />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("EquipamentoPublico", () => {
  it("rejeita um código inválido sem consultar a API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderizar("x");

    expect(await screen.findByRole("heading", { name: "Código inválido" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("mostra o prontuário e preserva os horários retornados", async () => {
    const fetchMock = vi.fn().mockImplementationOnce(() => respostaJson({
      success: true,
      versao,
      atualizado_em: "07/08/2026 10:38:16",
      data: {
        ativo: {
          id_ativo: "ATV-FOR-FOR001",
          tag_ativo: "FOR001",
          nome_ativo: "FORNO 01",
          setor: "SERRARIA",
          localizacao: "SERRARIA",
          criticidade: "MEDIA",
          mecanico_responsavel: "",
        },
        situacao: {
          ultima_preventiva_data: "01/08/2026",
          proxima_preventiva_data: "01/02/2027",
          proxima_preventiva_status: "EM DIA",
          os_ultimos_30_dias: 6,
          ultimo_executor: "RICARDO",
        },
        ultima_lubrificacao: {
          subtipo_lubrificacao: "LUB GERAL",
          data_conclusao: "26/06/2026",
          hora_inicio: "11:30",
          hora_conclusao: "12:40",
          responsavel: "FLAVIO",
          horimetro: "1682",
          observacoes: "Lubrificação geral",
        },
        ultima_preventiva: {
          id_execucao: "EXE-001",
          titulo_plano: "PREVENTIVA ELÉTRICA",
          periodicidade: "SEMESTRAL",
          data_realizada: "01/08/2026",
          responsavel: "MATEUS DUARTE",
          qtd_ok: 13,
          qtd_nok: 0,
          qtd_na: 0,
          proxima_execucao: "01/02/2027",
          status_plano: "EM DIA",
        },
        proxima_preventiva: null,
        ultima_corretiva: {
          data_inicio: "04/08/2026",
          hora_inicio: "16:00",
          hora_conclusao: "20:40",
          responsavel: "RICARDO",
          horimetro: "0",
          observacoes: "Alinhamento do carrinho",
        },
        ultima_corretiva_programada: {
          data_inicio: "18/05/2026",
          hora_inicio: "07:40:00",
          hora_conclusao: "09:20:00",
          responsavel: "MATEUS",
          horimetro: "-",
          observacoes: "Troca de resistências",
        },
        historico_mensal: [{ chave: "2026-08", mes: "08/2026", total: 4, corretivas: 3, corretivas_programadas: 0, lubrificacoes: 0, outros: 1 }],
        linha_do_tempo: [{ tipo: "corretiva", data: "04/08/2026", hora: "16:00", titulo: "Manutenção corretiva", responsavel: "RICARDO", descricao: "Alinhamento" }],
      },
    }));
    vi.stubGlobal("fetch", fetchMock);

    renderizar("3B43AA6905");

    expect(await screen.findByRole("heading", { name: "FORNO 01" })).toBeInTheDocument();
    expect(screen.getByText("12:40")).toBeInTheDocument();
    expect(screen.getByText("07:40:00")).toBeInTheDocument();
    expect(screen.getByText("09:20:00")).toBeInTheDocument();
    expect(screen.queryByText(/login/i)).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ searchParams: expect.any(URLSearchParams) }),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("carrega o checklist completo somente para leitura", async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => respostaJson({
        success: true,
        versao,
        data: {
          ativo: { nome_ativo: "FORNO 01" },
          situacao: {},
          ultima_lubrificacao: null,
          ultima_preventiva: { id_execucao: "EXE-001", titulo_plano: "PLANO SEMESTRAL" },
          proxima_preventiva: null,
          ultima_corretiva: null,
          ultima_corretiva_programada: null,
          historico_mensal: [],
          linha_do_tempo: [],
        },
      }))
      .mockImplementationOnce(() => respostaJson({
        success: true,
        versao,
        data: {
          execucao: { titulo_plano: "PLANO SEMESTRAL" },
          itens: [{
            id_no: "NO-001",
            item_verificacao: "VERIFICAR SENSORES",
            resultado: "OK",
            observacao: "Sem anomalias",
            responsavel: "MATEUS DUARTE",
            data_apontamento: "03/08/2026 15:20:17",
          }],
        },
      }));
    vi.stubGlobal("fetch", fetchMock);

    renderizar("3B43AA6905");
    fireEvent.click(await screen.findByRole("button", { name: /ver checklist completo/i }));

    expect(await screen.findByText("VERIFICAR SENSORES")).toBeInTheDocument();
    expect(screen.getByText("03/08/2026 15:20:17")).toBeInTheDocument();
    expect(screen.getByText(/somente para leitura/i)).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect((fetchMock.mock.calls[1][0] as URL).searchParams.get("action")).toBe("qr_detalhe_preventiva");
    expect((fetchMock.mock.calls[1][0] as URL).searchParams.get("codigo")).toBe("3B43AA6905");
  });
});
