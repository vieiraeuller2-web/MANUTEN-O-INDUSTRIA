import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Clock3,
  Factory,
  FileCheck2,
  History,
  Info,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buscarChecklistPreventiva,
  buscarResumoEquipamento,
  codigoQrValido,
  ErroQrPublico,
  type DetalhePreventiva,
  type EventoLinhaDoTempo,
  type MesHistorico,
  type RegistroManutencao,
  type ResumoEquipamento,
} from "@/services/qrPublicoApi";
import QrOsFlow from "@/components/qr-os/QrOsFlow";
import "./EquipamentoPublico.css";

type EstadoPagina =
  | { tipo: "carregando" }
  | { tipo: "invalido" }
  | { tipo: "erro"; titulo: string; mensagem: string; permiteTentar: boolean }
  | { tipo: "pronto"; atualizadoEm?: string; dados: ResumoEquipamento };

const vazio = "Não informado";

function texto(valor: unknown, fallback = vazio): string {
  if (valor === null || valor === undefined || String(valor).trim() === "") return fallback;
  return String(valor);
}

function numero(valor: unknown): number {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : 0;
}

function classeStatus(status?: string): string {
  const normalizado = (status || "").toUpperCase();
  if (/ATRAS|VENC|CRIT|NOK/.test(normalizado)) return "is-danger";
  if (/ATEN|PRÓX|PROX|PEND/.test(normalizado)) return "is-warning";
  if (/DIA|CONCLU|OK|PRONTO/.test(normalizado)) return "is-success";
  return "is-neutral";
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`qr-card ${className}`}>{children}</section>;
}

function RotuloValor({ rotulo, valor }: { rotulo: string; valor: unknown }) {
  return (
    <div className="qr-field">
      <dt>{rotulo}</dt>
      <dd>{texto(valor)}</dd>
    </div>
  );
}

function CabecalhoSecao({
  icone,
  titulo,
  subtitulo,
}: {
  icone: ReactNode;
  titulo: string;
  subtitulo?: string;
}) {
  return (
    <div className="qr-section-heading">
      <span className="qr-section-icon" aria-hidden="true">{icone}</span>
      <div>
        <h2>{titulo}</h2>
        {subtitulo ? <p>{subtitulo}</p> : null}
      </div>
    </div>
  );
}

function EstadoVazio({ children }: { children: ReactNode }) {
  return (
    <div className="qr-empty">
      <Info aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

function tiposLubrificacao(registro: RegistroManutencao): string[] {
  const tipos = new Set<string>();
  if (registro.subtipo_lubrificacao?.trim()) tipos.add(registro.subtipo_lubrificacao.trim());
  const campos: Array<[keyof RegistroManutencao, string]> = [
    ["lub_300", "LUB 300"],
    ["lub_160", "LUB 160"],
    ["lub_geral", "LUB GERAL"],
    ["facoes_e_rodas", "FACÕES E RODAS"],
  ];
  campos.forEach(([campo, rotulo]) => {
    if (/^(SIM|S|TRUE|1|X)$/i.test(String(registro[campo] ?? "").trim())) tipos.add(rotulo);
  });
  return Array.from(tipos);
}

function DetalheOrdem({
  registro,
  tipo,
  vazioMensagem,
}: {
  registro: RegistroManutencao | null;
  tipo: "lubrificacao" | "corretiva";
  vazioMensagem: string;
}) {
  if (!registro) return <EstadoVazio>{vazioMensagem}</EstadoVazio>;
  const tipos = tipo === "lubrificacao" ? tiposLubrificacao(registro) : [];

  return (
    <>
      {tipos.length ? (
        <div className="qr-chip-row" aria-label="Tipos de lubrificação">
          {tipos.map((item) => <span className="qr-chip is-cyan" key={item}>{item}</span>)}
        </div>
      ) : null}
      <dl className="qr-detail-grid">
        {tipo === "lubrificacao" ? <RotuloValor rotulo="Tipo da lubrificação" valor={tipos.join(", ")} /> : null}
        <RotuloValor rotulo="Responsável" valor={registro.responsavel} />
        <RotuloValor rotulo="Data" valor={registro.data_conclusao || registro.data_inicio} />
        <RotuloValor rotulo="Hora inicial" valor={registro.hora_inicio} />
        <RotuloValor rotulo="Hora final" valor={registro.hora_conclusao} />
        <RotuloValor rotulo="Horímetro" valor={registro.horimetro} />
      </dl>
      <div className="qr-description">
        <span>Descrição do serviço</span>
        <p>{texto(registro.observacoes, "Nenhuma descrição registrada.")}</p>
      </div>
    </>
  );
}

function GraficoMensal({ meses }: { meses: MesHistorico[] }) {
  const maximo = Math.max(1, ...meses.map((mes) => numero(mes.total)));

  if (!meses.length) {
    return <EstadoVazio>Nenhum histórico mensal disponível para este equipamento.</EstadoVazio>;
  }

  return (
    <>
      <div className="qr-chart-legend" aria-label="Legenda do gráfico">
        <span><i className="is-corrective" />Corretivas</span>
        <span><i className="is-scheduled" />Programadas</span>
        <span><i className="is-lubrication" />Lubrificações</span>
        <span><i className="is-other" />Outros</span>
      </div>
      <div className="qr-chart-scroll">
        <div className="qr-chart" role="img" aria-label="Ordens de serviço dos últimos 12 meses">
          {meses.map((mes, indice) => {
            const total = numero(mes.total);
            const altura = total ? Math.max(12, (total / maximo) * 100) : 3;
            const segmentos = [
              { classe: "is-corrective", valor: numero(mes.corretivas), nome: "corretivas" },
              { classe: "is-scheduled", valor: numero(mes.corretivas_programadas), nome: "programadas" },
              { classe: "is-lubrication", valor: numero(mes.lubrificacoes), nome: "lubrificações" },
              { classe: "is-other", valor: numero(mes.outros), nome: "outras" },
            ].filter((segmento) => segmento.valor > 0);
            const descricao = segmentos.map((item) => `${item.valor} ${item.nome}`).join(", ");

            return (
              <div className="qr-chart-column" key={mes.chave || `${mes.mes}-${indice}`}>
                <strong>{total}</strong>
                <div
                  className={`qr-chart-bar ${total === 0 ? "is-empty" : ""}`}
                  style={{ height: `${altura}%` }}
                  title={`${texto(mes.mes, "Mês")}: ${total} OS${descricao ? ` — ${descricao}` : ""}`}
                >
                  {segmentos.map((segmento) => (
                    <span
                      className={segmento.classe}
                      key={segmento.classe}
                      style={{ flexGrow: segmento.valor }}
                    />
                  ))}
                </div>
                <span>{texto(mes.mes, "—")}</span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="qr-chart-note">O número acima de cada coluna representa o total de OS no mês.</p>
    </>
  );
}

function iconeEvento(tipo?: string) {
  if (tipo === "preventiva") return <FileCheck2 />;
  if (tipo === "lubrificacao") return <CircleGauge />;
  return <Wrench />;
}

function LinhaDoTempo({ eventos }: { eventos: EventoLinhaDoTempo[] }) {
  if (!eventos.length) {
    return <EstadoVazio>Nenhuma intervenção encontrada para este equipamento.</EstadoVazio>;
  }

  return (
    <ol className="qr-timeline">
      {eventos.map((evento, indice) => (
        <li key={`${evento.tipo}-${evento.data}-${evento.hora}-${indice}`}>
          <span className={`qr-timeline-marker is-${evento.tipo || "outros"}`} aria-hidden="true">
            {iconeEvento(evento.tipo)}
          </span>
          <div className="qr-timeline-content">
            <div className="qr-timeline-topline">
              <h3>{texto(evento.titulo, "Intervenção")}</h3>
              <time>{texto(evento.data, "Data não informada")}{evento.hora ? ` · ${evento.hora}` : ""}</time>
            </div>
            <p>{texto(evento.descricao, "Sem descrição registrada.")}</p>
            <span className="qr-person"><UserRound aria-hidden="true" />{texto(evento.responsavel)}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ChecklistModal({
  aberto,
  aoAlterar,
  carregando,
  erro,
  detalhe,
  aoTentarNovamente,
}: {
  aberto: boolean;
  aoAlterar: (aberto: boolean) => void;
  carregando: boolean;
  erro: string;
  detalhe: DetalhePreventiva | null;
  aoTentarNovamente: () => void;
}) {
  return (
    <Dialog open={aberto} onOpenChange={aoAlterar}>
      <DialogContent className="qr-checklist-modal border-slate-700 bg-slate-950 text-slate-100 sm:max-w-4xl">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>Checklist completo</DialogTitle>
          <DialogDescription className="text-slate-400">
            {texto(detalhe?.execucao?.titulo_plano, "Detalhes da última preventiva")}
          </DialogDescription>
        </DialogHeader>

        <div className="qr-checklist-body">
          {carregando ? (
            <div className="qr-modal-state"><Loader2 className="animate-spin" /><p>Buscando os itens verificados...</p></div>
          ) : erro ? (
            <div className="qr-modal-state is-error">
              <AlertTriangle />
              <p>{erro}</p>
              <Button type="button" variant="outline" onClick={aoTentarNovamente}>Tentar novamente</Button>
            </div>
          ) : detalhe?.itens.length ? (
            <ol className="qr-checklist-list">
              {detalhe.itens.map((item, indice) => (
                <li key={item.id_no || indice}>
                  <div className="qr-checklist-index">{String(indice + 1).padStart(2, "0")}</div>
                  <div className="qr-checklist-main">
                    <div className="qr-checklist-titleline">
                      <h3>{texto(item.item_verificacao || item.nome_no, "Item sem identificação")}</h3>
                      <span className={`qr-result ${classeStatus(item.resultado)}`}>{texto(item.resultado, "N/A")}</span>
                    </div>
                    <p>{texto(item.observacao, "Sem observação.")}</p>
                    <div className="qr-checklist-meta">
                      <span><UserRound />{texto(item.responsavel)}</span>
                      <span><CalendarClock />{texto(item.data_apontamento)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EstadoVazio>Nenhum item foi retornado para este checklist.</EstadoVazio>
          )}
        </div>
        <div className="qr-modal-footer">
          <ShieldCheck /> Consulta pública somente para leitura
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TelaEstado({
  icone,
  titulo,
  mensagem,
  tentar,
}: {
  icone: ReactNode;
  titulo: string;
  mensagem: string;
  tentar?: () => void;
}) {
  return (
    <main className="qr-state-page">
      <div className="qr-state-panel">
        <span className="qr-state-icon">{icone}</span>
        <p className="qr-state-kicker">CONTROLE DE MANUTENÇÃO INDUSTRIAL</p>
        <h1>{titulo}</h1>
        <p>{mensagem}</p>
        {tentar ? (
          <Button type="button" onClick={tentar} className="qr-retry-button">
            <RefreshCw /> Tentar novamente
          </Button>
        ) : null}
      </div>
    </main>
  );
}

export default function EquipamentoPublico() {
  const { codigo: parametroCodigo = "" } = useParams();
  const codigo = useMemo(() => parametroCodigo.trim(), [parametroCodigo]);
  const [tentativa, setTentativa] = useState(0);
  const [estado, setEstado] = useState<EstadoPagina>({ tipo: "carregando" });
  const [modalAberto, setModalAberto] = useState(false);
  const [carregandoChecklist, setCarregandoChecklist] = useState(false);
  const [erroChecklist, setErroChecklist] = useState("");
  const [detalheChecklist, setDetalheChecklist] = useState<DetalhePreventiva | null>(null);
  const codigoAtual = useRef(codigo);

  useEffect(() => {
    codigoAtual.current = codigo;
    setModalAberto(false);
    setDetalheChecklist(null);
    setErroChecklist("");
  }, [codigo]);

  useEffect(() => {
    if (!codigoQrValido(codigo)) {
      setEstado({ tipo: "invalido" });
      return;
    }

    const controller = new AbortController();
    setEstado({ tipo: "carregando" });
    buscarResumoEquipamento(codigo, controller.signal)
      .then(({ data, atualizadoEm }) => setEstado({ tipo: "pronto", dados: data, atualizadoEm }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ErroQrPublico) {
          setEstado({
            tipo: "erro",
            titulo: error.tipo === "nao_encontrado" ? "Equipamento não encontrado" : "Consulta indisponível",
            mensagem: error.message,
            permiteTentar: error.tipo !== "nao_encontrado",
          });
          return;
        }
        setEstado({
          tipo: "erro",
          titulo: "Não foi possível carregar o prontuário",
          mensagem: "Ocorreu uma falha inesperada durante a consulta.",
          permiteTentar: true,
        });
      });

    return () => controller.abort();
  }, [codigo, tentativa]);

  const carregarChecklist = useCallback(async () => {
    if (estado.tipo !== "pronto" || !estado.dados.ultima_preventiva?.id_execucao) return;
    setCarregandoChecklist(true);
    setErroChecklist("");
    try {
      const detalhe = await buscarChecklistPreventiva(
        codigo,
        estado.dados.ultima_preventiva.id_execucao,
      );
      if (codigoAtual.current === codigo) setDetalheChecklist(detalhe);
    } catch (error) {
      setErroChecklist(error instanceof Error ? error.message : "Não foi possível carregar o checklist.");
    } finally {
      setCarregandoChecklist(false);
    }
  }, [codigo, estado]);

  const abrirChecklist = () => {
    setModalAberto(true);
    if (!detalheChecklist && !carregandoChecklist) void carregarChecklist();
  };

  if (estado.tipo === "carregando") {
    return <TelaEstado icone={<Loader2 className="animate-spin" />} titulo="Carregando prontuário" mensagem="Consultando os registros mais recentes deste equipamento." />;
  }

  if (estado.tipo === "invalido") {
    return <TelaEstado icone={<X />} titulo="Código inválido" mensagem="O endereço do QR Code não contém um código público válido." />;
  }

  if (estado.tipo === "erro") {
    return (
      <TelaEstado
        icone={<AlertTriangle />}
        titulo={estado.titulo}
        mensagem={estado.mensagem}
        tentar={estado.permiteTentar ? () => setTentativa((valor) => valor + 1) : undefined}
      />
    );
  }

  const { dados, atualizadoEm } = estado;
  const { ativo, situacao } = dados;
  const statusPreventiva = situacao.proxima_preventiva_status || dados.proxima_preventiva?.status_plano;
  const confiabilidade = dados.indicadores_confiabilidade;
  const formatarIndicador = (valor: number | null | undefined) =>
    typeof valor === "number" && Number.isFinite(valor) && valor >= 0
      ? `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`
      : "—";

  return (
    <div className="qr-public-page">
      <header className="qr-public-header">
        <div className="qr-shell qr-header-inner">
          <div className="qr-brand">
            <span className="qr-brand-mark"><Factory aria-hidden="true" /></span>
            <div>
              <span>KRON · CENTRO DE CONTROLE</span>
              <strong>PRONTUÁRIO INDUSTRIAL</strong>
            </div>
          </div>
          <span className="qr-readonly"><ShieldCheck aria-hidden="true" /> Somente leitura</span>
        </div>
      </header>

      <main className="qr-shell qr-main">
        <QrOsFlow codigo={codigo} onSuccess={() => setTentativa((valor) => valor + 1)} />
        
        <section className="qr-machine-hero">
          <div className="qr-hazard-line" />
          <div className="qr-machine-content">
            <div className="qr-machine-title">
              <div className="qr-tag-block">
                <span>TAG DO EQUIPAMENTO</span>
                <strong>{texto(ativo.tag_ativo, "SEM TAG")}</strong>
              </div>
              <div>
                <p className="qr-eyebrow">PRONTUÁRIO DO EQUIPAMENTO</p>
                <h1>{texto(ativo.nome_ativo, "Equipamento sem nome")}</h1>
                <span className="qr-code">Código público: {codigo}</span>
              </div>
            </div>
            <dl className="qr-machine-meta">
              <div><MapPin /><dt>Setor</dt><dd>{texto(ativo.setor)}</dd></div>
              <div><Factory /><dt>Localização</dt><dd>{texto(ativo.localizacao)}</dd></div>
              <div><AlertTriangle /><dt>Criticidade</dt><dd>{texto(ativo.criticidade)}</dd></div>
              <div><Wrench /><dt>Mecânico responsável</dt><dd>{texto(ativo.mecanico_responsavel)}</dd></div>
              <div><UserRound /><dt>Último executor</dt><dd>{texto(situacao.ultimo_executor)}</dd></div>
            </dl>
          </div>
        </section>

        <section className="qr-summary-grid" aria-label="Resumo da manutenção">
          <Card className="qr-summary-card is-blue">
            <span className="qr-summary-icon"><CalendarClock /></span>
            <div><p>Próxima preventiva</p><strong>{texto(situacao.proxima_preventiva_data, "Não programada")}</strong></div>
          </Card>
          <Card className="qr-summary-card">
            <span className={`qr-status-dot ${classeStatus(statusPreventiva)}`} />
            <div><p>Status da preventiva</p><strong>{texto(statusPreventiva, "Sem programação")}</strong></div>
          </Card>
          <Card className="qr-summary-card is-green">
            <span className="qr-summary-icon"><CheckCircle2 /></span>
            <div><p>Última preventiva</p><strong>{texto(situacao.ultima_preventiva_data, "Sem registro")}</strong></div>
          </Card>
          <Card className="qr-summary-card is-amber">
            <span className="qr-os-number">{numero(situacao.os_ultimos_30_dias)}</span>
            <div><p>OS nos últimos 30 dias</p><strong>Ordens registradas</strong></div>
          </Card>
        </section>

        <section className="qr-reliability" aria-label="Indicadores de confiabilidade">
          <div className="qr-reliability__heading">
            <div><span>INDICADORES DE CONFIABILIDADE</span><h2>MTTR e MTBF do equipamento</h2>
              <p>Indicadores oficiais — quando publicados na API pública deste prontuário.</p></div>
            <CircleGauge aria-hidden="true"/>
          </div>
          <div className="qr-reliability__grid">
            <div><span>MTTR · Tempo médio de reparo</span><strong>{formatarIndicador(confiabilidade?.mttr_h)}</strong>
              <small>Falhas confirmadas: {confiabilidade?.falhas_confirmadas ?? "—"}</small></div>
            <div><span>MTBF · Entre falhas (calendário)</span>
              <strong>{confiabilidade?.mtbf_intervalos_validos && confiabilidade.mtbf_intervalos_validos > 0 ? formatarIndicador(confiabilidade.mtbf_calendario_h) : "—"}</strong>
              <small>Intervalos válidos: {confiabilidade?.mtbf_intervalos_validos ?? "—"}</small></div>
          </div>
          {!confiabilidade && <p className="qr-reliability__notice">O serviço público ainda não fornece estes KPIs. Valores não são estimados a partir das OS; a publicação pelo backend oficial é necessária.</p>}
          {confiabilidade?.periodo_referencia && <p className="qr-reliability__notice">Período: {confiabilidade.periodo_referencia}</p>}
        </section>

        <div className="qr-content-grid">
          <Card>
            <CabecalhoSecao icone={<CircleGauge />} titulo="Última lubrificação" subtitulo="Registro mais recente vinculado ao equipamento" />
            <DetalheOrdem
              registro={dados.ultima_lubrificacao}
              tipo="lubrificacao"
              vazioMensagem="Nenhuma lubrificação vinculada a este equipamento."
            />
          </Card>

          <Card className="qr-preventive-card">
            <CabecalhoSecao icone={<FileCheck2 />} titulo="Última preventiva" subtitulo="Execução e resultados do plano" />
            {dados.ultima_preventiva ? (
              <>
                <div className="qr-plan-title">
                  <span>Plano</span>
                  <h3>{texto(dados.ultima_preventiva.titulo_plano)}</h3>
                </div>
                <dl className="qr-detail-grid">
                  <RotuloValor rotulo="Modalidade" valor={dados.ultima_preventiva.modalidade} />
                  <RotuloValor rotulo="Periodicidade" valor={dados.ultima_preventiva.periodicidade} />
                  <RotuloValor rotulo="Data realizada" valor={dados.ultima_preventiva.data_realizada} />
                  <RotuloValor rotulo="Responsável" valor={dados.ultima_preventiva.responsavel} />
                  <RotuloValor rotulo="Próxima realização" valor={dados.ultima_preventiva.proxima_execucao} />
                  <div className="qr-field"><dt>Status</dt><dd><span className={`qr-inline-status ${classeStatus(dados.ultima_preventiva.status_plano)}`}>{texto(dados.ultima_preventiva.status_plano)}</span></dd></div>
                </dl>
                <div className="qr-result-grid">
                  <div className="is-success"><Check /> <span>OK</span><strong>{numero(dados.ultima_preventiva.qtd_ok)}</strong></div>
                  <div className="is-danger"><X /> <span>NOK</span><strong>{numero(dados.ultima_preventiva.qtd_nok)}</strong></div>
                  <div className="is-neutral"><span className="qr-na">N/A</span><span>Não aplicável</span><strong>{numero(dados.ultima_preventiva.qtd_na)}</strong></div>
                </div>
                <div className="qr-description">
                  <span>Observação</span>
                  <p>{texto(dados.ultima_preventiva.observacao, "Nenhuma observação registrada.")}</p>
                </div>
                <Button type="button" onClick={abrirChecklist} className="qr-checklist-button">
                  Ver checklist completo <ChevronRight />
                </Button>
              </>
            ) : (
              <EstadoVazio>Nenhuma preventiva concluída para este equipamento.</EstadoVazio>
            )}
          </Card>

          <Card>
            <CabecalhoSecao icone={<Wrench />} titulo="Última corretiva" subtitulo="Intervenção corretiva mais recente" />
            <DetalheOrdem
              registro={dados.ultima_corretiva}
              tipo="corretiva"
              vazioMensagem="Nenhuma manutenção corretiva vinculada a este equipamento."
            />
          </Card>

          <Card>
            <CabecalhoSecao icone={<Clock3 />} titulo="Última corretiva programada" subtitulo="Serviço programado mais recente" />
            <DetalheOrdem
              registro={dados.ultima_corretiva_programada}
              tipo="corretiva"
              vazioMensagem="Nenhuma corretiva programada vinculada a este equipamento."
            />
          </Card>
        </div>

        <Card className="qr-wide-card">
          <CabecalhoSecao icone={<CircleGauge />} titulo="Histórico mensal de OS" subtitulo="Distribuição das ordens de serviço nos últimos 12 meses" />
          <GraficoMensal meses={Array.isArray(dados.historico_mensal) ? dados.historico_mensal : []} />
        </Card>

        <Card className="qr-wide-card">
          <CabecalhoSecao icone={<History />} titulo="Linha do tempo" subtitulo="Intervenções registradas em ordem cronológica" />
          <LinhaDoTempo eventos={Array.isArray(dados.linha_do_tempo) ? dados.linha_do_tempo : []} />
        </Card>

        <footer className="qr-public-footer">
          <div><ShieldCheck /> <span>Página pública para consulta. Nenhuma alteração é permitida.</span></div>
          {atualizadoEm ? <span>Dados atualizados em {atualizadoEm}</span> : null}
        </footer>
      </main>

      <ChecklistModal
        aberto={modalAberto}
        aoAlterar={setModalAberto}
        carregando={carregandoChecklist}
        erro={erroChecklist}
        detalhe={detalheChecklist}
        aoTentarNovamente={() => void carregarChecklist()}
      />
    </div>
  );
}
