import { useCallback, useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, CartesianGrid, LabelList,
  LineChart, Line,
} from "recharts";
import {
  BarChart3, ClipboardList, Wrench, Timer, Activity,
  AlertCircle, Loader2, FilterX, ChevronLeft, ChevronRight, Table as TableIcon,
  Download, CheckCircle2, CircleDot, TrendingUp, Cog, Sparkles, Copy, FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type SheetOS } from "@/lib/sheets-api";
import { useSheetOS, useRefreshSheetOS } from "@/hooks/use-sheet-os";
import RefreshButton from "@/components/RefreshButton";
import { calcularHorasOS, calcularTempoOS, extrairAnoDataBr, formatDataBr, normalizarHoraSheets, parseDataHoraLocal } from "@/lib/time-helpers";
import { safeArray } from "@/lib/data-helpers";

const CHART_COLORS = [
  "hsl(0, 55%, 45%)",
  "hsl(38, 80%, 55%)",
  "hsl(142, 50%, 42%)",
  "hsl(0, 65%, 55%)",
  "hsl(40, 15%, 55%)",
  "hsl(190, 55%, 48%)",
];

const NA = "Não informado";
const safe = (v: any): string => {
  if (v == null) return NA;
  const s = String(v).trim();
  if (!s || s === "undefined" || s === "null" || s === "NaN") return NA;
  return s;
};

const norm = (v: any): string => String(v || "").trim().toLowerCase();

const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-");
  if (!y || !m) return ym;
  const nomes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${nomes[Number(m) - 1] || m}/${String(y).slice(-2)}`;
};

function monthKey(data: any): string {
  const s = String(data || "").trim();
  const iso = s.match(/^(\d{4})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const br = formatDataBr(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}`;
  return "";
}

function osField(o: SheetOS, key: keyof SheetOS, ...rawKeys: string[]) {
  const direct = (o as any)?.[key];
  if (direct != null && direct !== "") return direct;
  for (const k of rawKeys) {
    const exact = (o as any)?.[k];
    if (exact != null && exact !== "") return exact;
  }
  const lower: Record<string, any> = {};
  Object.keys(o || {}).forEach((k) => { lower[k.toLowerCase()] = (o as any)[k]; });
  for (const k of [String(key), ...rawKeys]) {
    const v = lower[k.toLowerCase()];
    if (v != null && v !== "") return v;
  }
  return "";
}

// Calcula duração em horas entre início e fim de uma OS. Retorna null se inválido.
function durationHours(o: SheetOS): number | null {
  return calcularHorasOS(o.data_inicio, o.hora_inicio, o.data_fim, o.hora_fim);
}

const fmtH = (h: number) => `${h.toFixed(1).replace(".", ",")} h`;

function ChartCard({ title, empty, children }: { title: string; empty?: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-card border border-border p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.4)]">
      <h3 className="text-sm font-semibold text-foreground mb-3 tracking-tight">{title}</h3>
      {empty ? (
        <div className="h-[240px] flex items-center justify-center text-xs text-muted-foreground">
          Sem dados
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export default function Relatorios() {
  const { data: ordens = [], isLoading, isError, error, refetch, isFetching } = useSheetOS();
  const refresh = useRefreshSheetOS();

  const { toast } = useToast();
  const [fMes, setFMes] = useState("todos");
  const [fAno, setFAno] = useState("todos");
  const [fResp, setFResp] = useState("todos");
  const [fTipo, setFTipo] = useState("todos");
  const [fEquip, setFEquip] = useState("todos");
  const [fSetor, setFSetor] = useState("todos");
  const [fDataDe, setFDataDe] = useState("");
  const [fDataAte, setFDataAte] = useState("");
  const [page, setPage] = useState(1);
  const [iaOpen, setIaOpen] = useState(false);
  const [iaTexto, setIaTexto] = useState("");
  const PAGE_SIZE = 15;
  const listaSegura = useMemo(() => safeArray<SheetOS>(ordens), [ordens]);

  const limparFiltros = () => {
    setFMes("todos"); setFAno("todos"); setFResp("todos"); setFTipo("todos");
    setFEquip("todos"); setFSetor("todos"); setFDataDe(""); setFDataAte("");
  };

  // converte dd/MM/yyyy -> yyyy-MM-dd para comparação simples
  const dataBrParaIso = (v: any): string => {
    const s = formatDataBr(v);
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
  };

  const uniq = useCallback((key: keyof SheetOS) => {
    const s = new Set<string>();
    listaSegura.forEach((o) => {
      const v = (o as any)[key];
      if (v != null && String(v).trim()) s.add(String(v).trim());
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [listaSegura]);

  const meses = useMemo(() => {
    const s = new Set<string>();
    listaSegura.forEach((o) => {
      const di = monthKey(osField(o, "data_inicio", "Data Início", "Data inicial"));
      if (/^\d{4}-\d{2}$/.test(di)) s.add(di);
    });
    return Array.from(s).sort().reverse();
  }, [listaSegura]);

  const anos = useMemo(() => {
    const s = new Set<string>();
    listaSegura.forEach((o) => {
      const ano = extrairAnoDataBr(formatDataBr(osField(o, "data_inicio", "Data Início", "Data inicial")));
      if (ano) s.add(ano);
    });
    return Array.from(s).sort((a, b) => b.localeCompare(a));
  }, [listaSegura]);

  const responsaveis = useMemo(() => uniq("responsavel"), [uniq]);
  const tipos = useMemo(() => uniq("tipo"), [uniq]);
  const equipamentos = useMemo(() => uniq("equipamento"), [uniq]);
  const setores = useMemo(() => uniq("setor"), [uniq]);

  const filtered = useMemo(() => {
    try {
      return listaSegura.filter((o) => {
        const dataRaw = osField(o, "data_inicio", "Data Início", "Data inicial");
        const data = formatDataBr(dataRaw);
        const mes = monthKey(data);
        const ano = extrairAnoDataBr(data);
        if (fMes !== "todos" && mes !== fMes) return false;
        if (fAno !== "todos" && ano !== fAno) return false;
        if (fResp !== "todos" && norm(osField(o, "responsavel", "Responsável", "RESPONSAVEL")) !== norm(fResp)) return false;
        if (fTipo !== "todos" && norm(osField(o, "tipo", "Tipo", "TIPO")) !== norm(fTipo)) return false;
        if (fEquip !== "todos" && norm(osField(o, "equipamento", "Equipamento", "EQUIPAMENTO")) !== norm(fEquip)) return false;
        if (fSetor !== "todos" && norm(osField(o, "setor", "Setor", "SETOR", "Área", "AREA")) !== norm(fSetor)) return false;
        if (fDataDe || fDataAte) {
          const iso = dataBrParaIso(dataRaw);
          if (!iso) return false;
          if (fDataDe && iso < fDataDe) return false;
          if (fDataAte && iso > fDataAte) return false;
        }
        return true;
      });
    } catch (err) {
      console.error("Erro ao filtrar dados:", err);
      return [];
    }
  }, [listaSegura, fMes, fAno, fResp, fTipo, fEquip, fSetor, fDataDe, fDataAte]);

  const groupCount = useCallback((key: keyof SheetOS, limit?: number) => {
    const map: Record<string, number> = {};
    filtered.forEach((o) => {
      const k = safe((o as any)[key]);
      map[k] = (map[k] || 0) + 1;
    });
    const arr = Object.entries(map).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    return limit ? arr.slice(0, limit) : arr;
  }, [filtered]);

  const osPorTipo = useMemo(() => groupCount("tipo"), [groupCount]);
  const osPorResp = useMemo(() => groupCount("responsavel", 5), [groupCount]);
  const osPorEquip = useMemo(() => groupCount("equipamento", 5), [groupCount]);

  const osPorMes = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((o) => {
      const di = monthKey(osField(o, "data_inicio", "Data Início", "Data inicial"));
      if (!/^\d{4}-\d{2}$/.test(di)) return;
      map[di] = (map[di] || 0) + 1;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, value]) => ({ name: monthLabel(ym), value }));
  }, [filtered]);

  // --- Métricas avançadas ---
  const concluidas = useMemo(
    () => filtered.filter((o) => o.data_fim && o.hora_fim),
    [filtered]
  );
  const abertas = filtered.length - concluidas.length;

  const corretivas = filtered.filter((o) => /CORR/i.test(o.tipo || "")).length;
  const preventivas = filtered.filter((o) => /PREV/i.test(o.tipo || "")).length;

  const corrPrevData = useMemo(() => [
    { name: "Corretiva", value: corretivas },
    { name: "Preventiva", value: preventivas },
  ].filter((d) => d.value > 0), [corretivas, preventivas]);

  // Tempo total + tempo por equipamento
  const { tempoTotal, tempoPorEquip } = useMemo(() => {
    let total = 0;
    const map: Record<string, number> = {};
    concluidas.forEach((o) => {
      const h = durationHours(o);
      if (h == null) return;
      total += h;
      const k = safe(o.equipamento);
      map[k] = (map[k] || 0) + h;
    });
    const arr = Object.entries(map)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(1)) }))
      .sort((a, b) => b.value - a.value).slice(0, 5);
    return { tempoTotal: total, tempoPorEquip: arr };
  }, [concluidas]);

  // MTTR: média das durações de OS corretivas com tempo calculado (fallback: todos os registros com tempo)
  const mttr = useMemo(() => {
    const corr = concluidas.filter((o) => /CORR/i.test(o.tipo || ""));
    const base = corr.length ? corr : concluidas;
    const dur = base.map(durationHours).filter((x): x is number => x != null);
    if (!dur.length) return null;
    return dur.reduce((a, b) => a + b, 0) / dur.length;
  }, [concluidas]);

  // Disponibilidade estimada: usa o range do período filtrado
  const disponibilidade = useMemo(() => {
    const datas = filtered
      .map((o) => parseDataHoraLocal(o.data_inicio, "00:00"))
      .filter((d): d is Date => !!d)
      .sort((a, b) => a.getTime() - b.getTime());
    if (datas.length === 0) return null;
    const ini = datas[0];
    const fimDatas = filtered
      .map((o) => parseDataHoraLocal(o.data_fim || o.data_inicio, "23:59"))
      .filter((d): d is Date => !!d)
      .sort((a, b) => a.getTime() - b.getTime());
    const fim = fimDatas[fimDatas.length - 1];
    if (!fim) return null;
    const horasPeriodo = (fim.getTime() - ini.getTime()) / 3_600_000;
    if (horasPeriodo <= 0) return null;
    const disp = ((horasPeriodo - tempoTotal) / horasPeriodo) * 100;
    return Math.max(0, Math.min(100, disp));
  }, [filtered, tempoTotal]);

  const topTipo = osPorTipo[0]?.name ?? "—";
  const topEquip = osPorEquip[0]?.name ?? "—";
  const topResp = osPorResp[0]?.name ?? "—";

  const chartConfig = { value: { label: "OS", color: CHART_COLORS[0] } };

  const algumFiltroAtivo =
    fMes !== "todos" || fAno !== "todos" || fResp !== "todos" || fTipo !== "todos" ||
    fEquip !== "todos" || fSetor !== "todos" || !!fDataDe || !!fDataAte;

  const filtrosLabel: Record<string, string> = {
    Mês: fMes !== "todos" ? monthLabel(fMes) : "todos",
    Ano: fAno,
    Equipamento: fEquip,
    Setor: fSetor,
    Responsável: fResp,
    Tipo: fTipo,
    "De": fDataDe,
    "Até": fDataAte,
  };

  const baixarPDF = async () => {
    try {
      const { gerarPdfRelatorio } = await import("@/lib/pdf-report");
      gerarPdfRelatorio({
        filtros: filtrosLabel,
        filtered, total: filtered.length, concluidas: concluidas.length, abertas,
        mttr, tempoTotal, disponibilidade,
        topTipo, topEquip, topResp,
        osPorMes, osPorTipo, osPorEquip, osPorResp, tempoPorEquip,
        corrPrev: corrPrevData,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao gerar PDF",
        description: "Tente reduzir os filtros ou atualizar os dados.",
        variant: "destructive",
      });
    }
  };

  const abrirPacoteIA = async () => {
    try {
      const { gerarPacoteIA } = await import("@/lib/ia-package");
      const txt = gerarPacoteIA({
        filtros: filtrosLabel,
        filtered, total: filtered.length, concluidas: concluidas.length, abertas,
        mttr, tempoTotal, disponibilidade,
        osPorMes, osPorTipo, osPorEquip, osPorResp, tempoPorEquip,
        corrPrev: corrPrevData,
      });
      setIaTexto(txt);
      setIaOpen(true);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao gerar pacote", variant: "destructive" });
    }
  };

  const copiarPacote = async () => {
    try {
      await navigator.clipboard.writeText(iaTexto);
      toast({ title: "Pacote copiado", description: "Cole no seu agente GPT." });
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  const baixarPacoteTxt = () => {
    const blob = new Blob([iaTexto], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "pacote-ia-manutencao.txt";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Dashboard Executivo
              </h1>
            </div>
            <p className="text-sm text-muted-foreground ml-[52px]">
              Indicadores de manutenção em tempo real
              {isFetching && !isLoading && " · atualizando..."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm" onClick={baixarPDF}
              disabled={isLoading || filtered.length === 0}
              className="gap-2"
            >
              <FileText className="w-4 h-4" /> Baixar relatório PDF
            </Button>
            <Button
              size="sm" variant="outline" onClick={abrirPacoteIA}
              disabled={isLoading || filtered.length === 0}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" /> Gerar pacote para IA
            </Button>
            <RefreshButton onClick={refresh} isFetching={isFetching} />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p className="text-sm">Carregando dados...</p>
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-sm font-medium text-destructive mb-3">
              {error instanceof Error ? error.message : "Não foi possível carregar os dados."}
            </p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            {/* Filtros */}
            <div className="rounded-xl bg-card border border-border p-4 mb-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.4)]">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <Select value={fMes} onValueChange={setFMes}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Mês" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os meses</SelectItem>
                    {meses.map((m) => <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={fAno} onValueChange={setFAno}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Ano" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os anos</SelectItem>
                    {anos.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={fEquip} onValueChange={setFEquip}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Equipamento" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos equipamentos</SelectItem>
                    {equipamentos.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={fSetor} onValueChange={setFSetor}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Setor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos setores</SelectItem>
                    {setores.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={fResp} onValueChange={setFResp}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Responsável" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos responsáveis</SelectItem>
                    {responsaveis.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={fTipo} onValueChange={setFTipo}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    {tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-muted-foreground">Período de</label>
                  <Input type="date" value={fDataDe} onChange={(e) => setFDataDe(e.target.value)} className="h-9 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-muted-foreground">Período até</label>
                  <Input type="date" value={fDataAte} onChange={(e) => setFDataAte(e.target.value)} className="h-9 text-xs" />
                </div>
              </div>
              {algumFiltroAtivo && (
                <div className="flex justify-end mt-3">
                  <Button size="sm" variant="ghost" onClick={limparFiltros} className="text-xs">
                    <FilterX className="w-3.5 h-3.5 mr-1" /> Limpar filtros
                  </Button>
                </div>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-xl border border-border bg-card/50 p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhuma informação encontrada para os filtros selecionados.
                </p>
              </div>
            ) : (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <KpiCard icon={ClipboardList} label="Total de OS" value={filtered.length} />
                  <KpiCard icon={CheckCircle2} label="Com tempo" value={concluidas.length} tone="success" />
                  <KpiCard icon={CircleDot} label="Sem tempo" value={abertas} tone="warning" />
                  <KpiCard icon={Timer} label="MTTR" value={mttr != null ? fmtH(mttr) : "—"} sub="Registros corretivos com tempo" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <KpiCard icon={Activity} label="Tempo total manut." value={fmtH(tempoTotal)} />
                  <KpiCard icon={TrendingUp} label="Disponibilidade" value={disponibilidade != null ? `${disponibilidade.toFixed(1).replace(".", ",")}%` : "—"} sub="estimada" />
                  <KpiCard icon={Wrench} label="Tipo recorrente" value={topTipo} sub={`${osPorTipo[0]?.value ?? 0} OS`} />
                  <KpiCard icon={Cog} label="Equip. recorrente" value={topEquip} sub={`${osPorEquip[0]?.value ?? 0} OS`} />
                </div>

                {/* Gráficos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ChartCard title="OS por mês" empty={osPorMes.length === 0}>
                    <ChartContainer config={chartConfig} className="h-[240px] w-full">
                      <LineChart data={osPorMes} margin={{ left: 0, right: 16, top: 16, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 18%)" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(40, 5%, 55%)" }} />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(40, 5%, 55%)" }} width={30} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={2.5} dot={{ r: 4, fill: CHART_COLORS[0] }}>
                          <LabelList dataKey="value" position="top" fill="hsl(40, 5%, 75%)" fontSize={10} fontWeight={600} />
                        </Line>
                      </LineChart>
                    </ChartContainer>
                  </ChartCard>

                  <ChartCard title="OS por tipo de serviço" empty={osPorTipo.length === 0}>
                    <ChartContainer config={chartConfig} className="h-[240px] w-full">
                      <PieChart>
                        <Pie data={osPorTipo} dataKey="value" nameKey="name" cx="50%" cy="50%"
                          outerRadius={80} innerRadius={45} paddingAngle={3} strokeWidth={0}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={{ stroke: "hsl(40, 5%, 55%)" }}>
                          {osPorTipo.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ChartContainer>
                  </ChartCard>

                  <ChartCard title="Top 5 equipamentos com mais OS" empty={osPorEquip.length === 0}>
                    <ChartContainer config={chartConfig} className="h-[240px] w-full">
                      <BarChart data={osPorEquip} layout="vertical" margin={{ left: 8, right: 32, top: 8, bottom: 8 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "hsl(40, 5%, 65%)" }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" fill={CHART_COLORS[1]} radius={[0, 6, 6, 0]} barSize={18}>
                          <LabelList dataKey="value" position="right" fill="hsl(40, 5%, 75%)" fontSize={11} fontWeight={600} />
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </ChartCard>

                  <ChartCard title="Top 5 responsáveis" empty={osPorResp.length === 0}>
                    <ChartContainer config={chartConfig} className="h-[240px] w-full">
                      <BarChart data={osPorResp} margin={{ left: 0, right: 16, top: 16, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 18%)" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(40, 5%, 55%)" }} interval={0} angle={-15} textAnchor="end" height={50} />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(40, 5%, 55%)" }} width={30} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" fill={CHART_COLORS[2]} radius={[6, 6, 0, 0]} barSize={28}>
                          <LabelList dataKey="value" position="top" fill="hsl(40, 5%, 75%)" fontSize={10} fontWeight={600} />
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </ChartCard>

                  <ChartCard title="Tempo total por equipamento (h)" empty={tempoPorEquip.length === 0}>
                    <ChartContainer config={chartConfig} className="h-[240px] w-full">
                      <BarChart data={tempoPorEquip} layout="vertical" margin={{ left: 8, right: 40, top: 8, bottom: 8 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "hsl(40, 5%, 65%)" }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" fill={CHART_COLORS[5]} radius={[0, 6, 6, 0]} barSize={18}>
                          <LabelList dataKey="value" position="right" fill="hsl(40, 5%, 75%)" fontSize={11} fontWeight={600}
                            formatter={(v: number) => `${v}h`} />
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </ChartCard>

                  <ChartCard title="Corretiva × Preventiva" empty={corrPrevData.length === 0}>
                    <ChartContainer config={chartConfig} className="h-[240px] w-full">
                      <BarChart data={corrPrevData} margin={{ left: 0, right: 16, top: 16, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 18%)" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(40, 5%, 65%)" }} />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(40, 5%, 55%)" }} width={30} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={60}>
                          {corrPrevData.map((d, i) => (
                            <Cell key={i} fill={d.name === "Corretiva" ? CHART_COLORS[0] : CHART_COLORS[2]} />
                          ))}
                          <LabelList dataKey="value" position="top" fill="hsl(40, 5%, 75%)" fontSize={11} fontWeight={700} />
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </ChartCard>
                </div>

                <RelatorioTabela filtered={filtered} page={page} setPage={setPage} pageSize={PAGE_SIZE} />
              </>
            )}
          </>
        )}
      </div>

      <Dialog open={iaOpen} onOpenChange={setIaOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Pacote para agente GPT
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Copie ou baixe o pacote abaixo e cole no seu agente GPT analista de dados.
            Inclui prompt + indicadores + amostra de OS conforme os filtros aplicados.
          </p>
          <Textarea
            value={iaTexto}
            readOnly
            className="font-mono text-[11px] h-[420px] resize-none"
          />
          <div className="flex flex-wrap gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={baixarPacoteTxt} className="gap-2">
              <Download className="w-4 h-4" /> Baixar TXT
            </Button>
            <Button size="sm" onClick={copiarPacote} className="gap-2">
              <Copy className="w-4 h-4" /> Copiar pacote
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, sub, tone,
}: { icon: any; label: string; value: string | number; sub?: string; tone?: "success" | "warning" }) {
  const toneCls = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-primary";
  const bgCls = tone === "success" ? "bg-success/15 border-success/30" : tone === "warning" ? "bg-warning/15 border-warning/30" : "bg-primary/15 border-primary/30";
  return (
    <div className="rounded-xl bg-card border border-border p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.4)] hover:border-primary/40 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-md border flex items-center justify-center ${bgCls}`}>
          <Icon className={`w-3.5 h-3.5 ${toneCls}`} />
        </div>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-2xl font-extrabold tabular-nums tracking-tight text-foreground truncate" title={String(value)}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

function formatBR(d?: string) {
  return formatDataBr(d);
}

function RelatorioTabela({
  filtered, page, setPage, pageSize,
}: {
  filtered: SheetOS[]; page: number; setPage: (n: number) => void; pageSize: number;
}) {
  const safeRows = Array.isArray(filtered) ? filtered : [];
  const total = safeRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const rows = safeRows.slice(start, start + pageSize);

  return (
    <div className="mt-6 rounded-xl bg-card border border-border shadow-[0_2px_12px_-4px_rgba(0,0,0,0.4)] overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <TableIcon className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Registros detalhados</h3>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {total} registro{total === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-muted-foreground uppercase tracking-wider text-[10px]">
            <tr>
              <th className="text-left px-3 py-2.5 font-semibold">Equipamento</th>
              <th className="text-left px-3 py-2.5 font-semibold">Tipo</th>
              <th className="text-left px-3 py-2.5 font-semibold">Setor</th>
              <th className="text-left px-3 py-2.5 font-semibold">Responsável</th>
              <th className="text-left px-3 py-2.5 font-semibold">Início</th>
              <th className="text-left px-3 py-2.5 font-semibold">Fim</th>
              <th className="text-right px-3 py-2.5 font-semibold">Tempo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o, i) => {
              const isPrev = /PREV/i.test(o.tipo || "");
              const tempo = calcularTempoOS(o.data_inicio, o.hora_inicio, o.data_fim, o.hora_fim);
              return (
                <tr key={`${o.equipamento}-${o.data_inicio}-${i}`}
                  className="border-t border-border/60 hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2 font-medium text-foreground">{safe(o.equipamento)}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                      isPrev ? "bg-success/15 text-success" : "bg-primary/15 text-primary"
                    }`}>{safe(o.tipo)}</span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{safe(o.setor)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{safe(o.responsavel)}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {formatBR(o.data_inicio)} {normalizarHoraSheets(o.hora_inicio)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {formatBR(o.data_fim)} {normalizarHoraSheets(o.hora_fim)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{tempo}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between p-3 border-t border-border">
          <button onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage === 1}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border border-border disabled:opacity-40 hover:bg-muted/40">
            <ChevronLeft className="w-3.5 h-3.5" /> Anterior
          </button>
          <span className="text-xs text-muted-foreground">Página {safePage} de {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border border-border disabled:opacity-40 hover:bg-muted/40">
            Próxima <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ====================== Geração do HTML offline ======================
interface RelData {
  filtered: SheetOS[];
  total: number; concluidas: number; abertas: number;
  mttr: number | null; tempoTotal: number; disponibilidade: number | null;
  topTipo: string; topEquip: string;
  osPorMes: { name: string; value: number }[];
  osPorTipo: { name: string; value: number }[];
  osPorEquip: { name: string; value: number }[];
  osPorResp: { name: string; value: number }[];
  tempoPorEquip: { name: string; value: number }[];
  corrPrevData: { name: string; value: number }[];
}

function gerarRelatorioHTML(d: RelData): string {
  const now = new Date();
  const dataGer = now.toLocaleString("pt-BR");
  const fmt = (h: number) => `${h.toFixed(1).replace(".", ",")} h`;
  const mttrTxt = d.mttr != null ? fmt(d.mttr) : "—";
  const dispTxt = d.disponibilidade != null ? `${d.disponibilidade.toFixed(1).replace(".", ",")}%` : "—";

  const resumo = `No período analisado, foram registradas ${d.total} OS, das quais ${d.concluidas} possuem tempo calculado e ${d.abertas} estão sem data/hora final. ` +
    (d.mttr != null ? `O MTTR médio foi de ${mttrTxt}, indicando o tempo médio necessário para restauração dos equipamentos após falhas. ` : "") +
    (d.topEquip !== "—" && d.topEquip !== "Não informado"
      ? `O equipamento com maior recorrência foi ${d.topEquip}, representando um ponto de atenção para a manutenção. ` : "") +
    (d.disponibilidade != null ? `A disponibilidade estimada do período foi de ${dispTxt}.` : "");

  const rows = d.filtered.map((o) => {
    const tempo = calcularTempoOS(o.data_inicio, o.hora_inicio, o.data_fim, o.hora_fim);
    return `<tr>
      <td>${esc(o.equipamento)}</td><td>${esc(o.setor)}</td><td>${esc(o.responsavel)}</td>
      <td>${esc(o.tipo)}</td><td>${esc(formatBR(o.data_inicio))}</td><td>${esc(normalizarHoraSheets(o.hora_inicio))}</td>
      <td>${esc(formatBR(o.data_fim))}</td><td>${esc(normalizarHoraSheets(o.hora_fim))}</td>
      <td>${esc(tempo)}</td><td>${esc(o.descricao)}</td>
    </tr>`;
  }).join("");

  const data = {
    osPorMes: d.osPorMes, osPorTipo: d.osPorTipo, osPorEquip: d.osPorEquip,
    osPorResp: d.osPorResp, tempoPorEquip: d.tempoPorEquip, corrPrev: d.corrPrevData,
  };

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Relatório Executivo de Manutenção</title>
<script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
<style>
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#141414;color:#e8e6e0;line-height:1.5}
.wrap{max-width:1200px;margin:0 auto;padding:32px 20px}
header{border-bottom:2px solid #8b2a2a;padding-bottom:20px;margin-bottom:28px}
h1{margin:0 0 6px;font-size:28px;letter-spacing:-.02em;color:#fff}
.sub{color:#a8a59c;font-size:14px}
.meta{font-size:12px;color:#8a8780;margin-top:8px}
section{margin:32px 0}
h2{font-size:18px;color:#fff;border-left:3px solid #8b2a2a;padding-left:10px;margin:0 0 16px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}
.kpi{background:#1f1f1f;border:1px solid #2a2a2a;border-radius:12px;padding:16px}
.kpi .l{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#a8a59c;font-weight:600}
.kpi .v{font-size:24px;font-weight:800;color:#fff;margin-top:6px;letter-spacing:-.02em}
.kpi .s{font-size:11px;color:#8a8780;margin-top:2px}
.charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:18px}
.chart{background:#1f1f1f;border:1px solid #2a2a2a;border-radius:12px;padding:14px;min-height:340px}
.chart h3{margin:0 0 10px;font-size:13px;color:#fff;font-weight:600}
table{width:100%;border-collapse:collapse;background:#1f1f1f;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;font-size:12px}
th{background:#262626;text-align:left;padding:10px;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#a8a59c}
td{padding:9px 10px;border-top:1px solid #2a2a2a;color:#cfccc4}
.notes{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:18px;font-size:13px;color:#bbb8b0}
.notes ul{margin:8px 0 0;padding-left:20px}.notes li{margin:4px 0}
p{color:#cfccc4}
@media(max-width:640px){.charts{grid-template-columns:1fr}.chart{min-height:300px}}
</style></head><body><div class="wrap">
<header>
  <h1>Relatório Executivo de Manutenção</h1>
  <div class="sub">Dashboard interativo gerado a partir das ordens de serviço</div>
  <div class="meta">Gerado em ${dataGer}</div>
</header>

<section>
  <h2>Resumo executivo</h2>
  <p>${esc(resumo)}</p>
</section>

<section>
  <h2>Indicadores</h2>
  <div class="kpis">
    ${kpi("Total de OS", d.total)}
    ${kpi("Com tempo calculado", d.concluidas)}
    ${kpi("Sem data/hora final", d.abertas)}
    ${kpi("MTTR", mttrTxt)}
    ${kpi("Tempo total manut.", fmt(d.tempoTotal))}
    ${kpi("Disponibilidade estimada", dispTxt)}
    ${kpi("Equip. mais recorrente", esc(d.topEquip))}
    ${kpi("Tipo mais recorrente", esc(d.topTipo))}
  </div>
</section>

<section>
  <h2>Gráficos</h2>
  <div class="charts">
    <div class="chart"><h3>OS por mês</h3><div id="g1"></div></div>
    <div class="chart"><h3>OS por tipo de serviço</h3><div id="g2"></div></div>
    <div class="chart"><h3>Top 5 equipamentos</h3><div id="g3"></div></div>
    <div class="chart"><h3>Top 5 responsáveis</h3><div id="g4"></div></div>
    <div class="chart"><h3>Tempo total por equipamento (h)</h3><div id="g5"></div></div>
    <div class="chart"><h3>Corretiva × Preventiva</h3><div id="g6"></div></div>
  </div>
</section>

<section>
  <h2>Registros detalhados</h2>
  <div style="overflow-x:auto"><table>
    <thead><tr>
      <th>Equipamento</th><th>Setor</th><th>Responsável</th><th>Tipo</th>
      <th>Data início</th><th>Hora início</th><th>Data fim</th><th>Hora fim</th>
      <th>Tempo</th><th>Descrição</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="10" style="text-align:center;padding:20px;color:#8a8780">Sem registros</td></tr>'}</tbody>
  </table></div>
</section>

<section>
  <h2>Observações técnicas</h2>
  <div class="notes"><ul>
    <li>O MTTR foi calculado com base nas OS com data/hora final (preferencialmente corretivas).</li>
    <li>Registros sem data/hora final foram desconsiderados do cálculo de tempo.</li>
    <li>Durações inválidas ou acima de 1000 horas foram ignoradas para evitar distorção.</li>
    <li>A disponibilidade é uma estimativa baseada no tempo total de manutenção do período.</li>
  </ul></div>
</section>

</div>
<script>
const DATA = ${JSON.stringify(data)};
const layout = {paper_bgcolor:'#1f1f1f',plot_bgcolor:'#1f1f1f',font:{color:'#cfccc4',family:'-apple-system,Segoe UI,Roboto'},margin:{t:10,r:20,b:50,l:50},xaxis:{gridcolor:'#2a2a2a'},yaxis:{gridcolor:'#2a2a2a'}};
const COL=['#b34141','#d99b3d','#3da86b','#c75050','#8a8780','#3d97ad'];
function ready(){
  if(!window.Plotly){setTimeout(ready,200);return;}
  Plotly.newPlot('g1',[{x:DATA.osPorMes.map(d=>d.name),y:DATA.osPorMes.map(d=>d.value),type:'scatter',mode:'lines+markers+text',line:{color:COL[0],width:3},marker:{size:8,color:COL[0]},text:DATA.osPorMes.map(d=>d.value),textposition:'top center'}],layout,{responsive:true,displaylogo:false});
  Plotly.newPlot('g2',[{labels:DATA.osPorTipo.map(d=>d.name),values:DATA.osPorTipo.map(d=>d.value),type:'pie',hole:.45,marker:{colors:COL},textinfo:'label+percent'}],{...layout,margin:{t:20,r:20,b:20,l:20}},{responsive:true,displaylogo:false});
  Plotly.newPlot('g3',[{x:DATA.osPorEquip.map(d=>d.value),y:DATA.osPorEquip.map(d=>d.name),type:'bar',orientation:'h',marker:{color:COL[1]},text:DATA.osPorEquip.map(d=>d.value),textposition:'outside'}],{...layout,margin:{t:10,r:40,b:30,l:120}},{responsive:true,displaylogo:false});
  Plotly.newPlot('g4',[{x:DATA.osPorResp.map(d=>d.name),y:DATA.osPorResp.map(d=>d.value),type:'bar',marker:{color:COL[2]},text:DATA.osPorResp.map(d=>d.value),textposition:'outside'}],layout,{responsive:true,displaylogo:false});
  Plotly.newPlot('g5',[{x:DATA.tempoPorEquip.map(d=>d.value),y:DATA.tempoPorEquip.map(d=>d.name),type:'bar',orientation:'h',marker:{color:COL[5]},text:DATA.tempoPorEquip.map(d=>d.value+'h'),textposition:'outside'}],{...layout,margin:{t:10,r:50,b:30,l:120}},{responsive:true,displaylogo:false});
  Plotly.newPlot('g6',[{x:DATA.corrPrev.map(d=>d.name),y:DATA.corrPrev.map(d=>d.value),type:'bar',marker:{color:DATA.corrPrev.map(d=>d.name==='Corretiva'?COL[0]:COL[2])},text:DATA.corrPrev.map(d=>d.value),textposition:'outside'}],layout,{responsive:true,displaylogo:false});
}
ready();
</script>
</body></html>`;
}

function kpi(label: string, value: string | number, sub?: string) {
  return `<div class="kpi"><div class="l">${esc(label)}</div><div class="v">${esc(String(value))}</div>${sub ? `<div class="s">${esc(sub)}</div>` : ""}</div>`;
}

function esc(s: any): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
