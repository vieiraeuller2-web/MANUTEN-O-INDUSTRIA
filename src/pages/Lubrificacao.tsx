import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/PageHeader";
import RefreshButton from "@/components/RefreshButton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Droplets, AlertTriangle, CheckCircle2, Clock, Gauge,
  AlertCircle, Download, Search,
} from "lucide-react";
import { formatDataBr } from "@/lib/time-helpers";
import { safeArray } from "@/lib/data-helpers";

const ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzz1dTU7HVTScVtb37rxAqSR7X0OQmUiZcfvePwGkWM2LaKx1JRSwcEDKnRPMJBPxS7mw/exec?sheet=lubrificacao";

type Lub = Record<string, any>;

function g(it: Lub, ...keys: string[]): string {
  for (const k of keys) {
    if (it && k in it && it[k] != null && it[k] !== "") return String(it[k]);
  }
  // case-insensitive
  if (!it) return "";
  const lower: Record<string, any> = {};
  for (const k of Object.keys(it)) lower[k.toLowerCase()] = it[k];
  for (const k of keys) {
    const v = lower[k.toLowerCase()];
    if (v != null && v !== "") return String(v);
  }
  return "";
}

function num(v: any): number {
  if (v == null || v === "") return NaN;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return isFinite(n) ? n : NaN;
}

interface NormLub {
  id: string;
  equipamento: string;
  setor: string;
  tipo: string;
  horimetro_atual: number;
  horimetro_ultima: number;
  intervalo: number;
  horas_rodadas: number;
  horas_restantes: number;
  status: "VENCIDA" | "ATENCAO" | "EM DIA" | "—";
  data_ultima: string;
  data_atualizacao: string;
  observacao: string;
  raw: Lub;
}

function normalize(it: Lub): NormLub {
  const horimAtual = num(g(it, "HORIMETRO_ATUAL", "horimetro_atual"));
  const horimUlt = num(g(it, "HORIMETRO_ULTIMA_LUB", "horimetro_ultima_lub"));
  const intervalo = num(g(it, "INTERVALO_LUB", "intervalo_lub"));
  let rod = num(g(it, "HORAS_RODADAS", "horas_rodadas"));
  let rest = num(g(it, "HORAS_RESTANTES", "horas_restantes"));
  if (!isFinite(rod) && isFinite(horimAtual) && isFinite(horimUlt)) rod = horimAtual - horimUlt;
  if (!isFinite(rest) && isFinite(intervalo) && isFinite(rod)) rest = intervalo - rod;

  let status = (g(it, "STATUS", "status") || "").toUpperCase().trim() as NormLub["status"];
  if (status !== "VENCIDA" && status !== "ATENCAO" && status !== "EM DIA") {
    if (isFinite(rest)) {
      if (rest <= 0) status = "VENCIDA";
      else if (rest <= 100) status = "ATENCAO";
      else status = "EM DIA";
    } else status = "—";
  }

  return {
    id: g(it, "ID", "id") || g(it, "EQUIPAMENTO", "equipamento"),
    equipamento: g(it, "EQUIPAMENTO", "equipamento"),
    setor: g(it, "SETOR", "setor"),
    tipo: g(it, "TIPO", "tipo"),
    horimetro_atual: horimAtual,
    horimetro_ultima: horimUlt,
    intervalo,
    horas_rodadas: rod,
    horas_restantes: rest,
    status,
    data_ultima: g(it, "DATA_ULTIMA_LUB", "data_ultima_lub"),
    data_atualizacao: g(it, "DATA_ATUALIZACAO_HORIMETRO", "data_atualizacao_horimetro"),
    observacao: g(it, "OBSERVACAO", "observacao", "OBSERVAÇÃO"),
    raw: it,
  };
}

async function fetchLubrificacao(): Promise<NormLub[]> {
  const res = await fetch(ENDPOINT, { method: "GET" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const json = await res.json();
  const data = Array.isArray(json) ? json : (json?.data ?? []);
  if (!Array.isArray(data)) throw new Error("Resposta inválida");
  return (data as Lub[]).map(normalize);
}

function fmtNum(n: number): string {
  if (!isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

const STATUS_ORDER: Record<string, number> = { "VENCIDA": 0, "ATENCAO": 1, "EM DIA": 2, "—": 3 };

function statusClass(s: string) {
  if (s === "VENCIDA") return "bg-overdue/15 text-overdue border-overdue/30";
  if (s === "ATENCAO") return "bg-warning/15 text-warning border-warning/30";
  if (s === "EM DIA") return "bg-success/15 text-success border-success/30";
  return "bg-muted text-muted-foreground border-border";
}

function statusLabel(s: string) {
  if (s === "ATENCAO") return "ATENÇÃO";
  return s;
}

export default function Lubrificacao() {
  const [busca, setBusca] = useState("");
  const [fSetor, setFSetor] = useState("todos");
  const [fTipo, setFTipo] = useState("todos");
  const [fStatus, setFStatus] = useState("todos");

  const { data, isLoading, isError, isFetching, refetch, error } = useQuery({
    queryKey: ["lubrificacao"],
    queryFn: fetchLubrificacao,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const items = useMemo(() => safeArray<NormLub>(data), [data]);

  const setores = useMemo(
    () => Array.from(new Set(items.map((i) => i.setor).filter(Boolean))).sort(),
    [items],
  );
  const tipos = useMemo(
    () => Array.from(new Set(items.map((i) => i.tipo).filter(Boolean))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    try {
      const q = busca.trim().toLowerCase();
      return items
        .filter((i) => {
          const equip = String(i.equipamento || "").toLowerCase();
          const setor = String(i.setor || "").toLowerCase();
          const tipo = String(i.tipo || "").toLowerCase();
          const status = String(i.status || "");
          if (q && !equip.includes(q)) return false;
          if (fSetor !== "todos" && setor !== fSetor.toLowerCase()) return false;
          if (fTipo !== "todos" && tipo !== fTipo.toLowerCase()) return false;
          if (fStatus !== "todos" && status !== fStatus) return false;
          return true;
        })
        .sort((a, b) => {
          const sa = STATUS_ORDER[a.status] ?? 9;
          const sb = STATUS_ORDER[b.status] ?? 9;
          if (sa !== sb) return sa - sb;
          const ra = isFinite(a.horas_restantes) ? a.horas_restantes : Infinity;
          const rb = isFinite(b.horas_restantes) ? b.horas_restantes : Infinity;
          return ra - rb;
        });
    } catch (err) {
      console.error("Erro ao filtrar lubrificações:", err);
      return [];
    }
  }, [items, busca, fSetor, fTipo, fStatus]);

  const stats = useMemo(() => {
    const total = items.length;
    const vencidas = items.filter((i) => i.status === "VENCIDA").length;
    const atencao = items.filter((i) => i.status === "ATENCAO").length;
    const emDia = items.filter((i) => i.status === "EM DIA").length;
    const ordCriticas = [...items]
      .filter((i) => isFinite(i.horas_restantes))
      .sort((a, b) => a.horas_restantes - b.horas_restantes);
    const proxima = ordCriticas[0];
    return { total, vencidas, atencao, emDia, proxima };
  }, [items]);

  function baixarPDF() {
    try {
      const vencidas = items.filter((i) => i.status === "VENCIDA")
        .sort((a, b) => (a.horas_restantes || 0) - (b.horas_restantes || 0));
      const atencao = items.filter((i) => i.status === "ATENCAO")
        .sort((a, b) => (a.horas_restantes || 0) - (b.horas_restantes || 0));

      const hoje = new Date().toLocaleDateString("pt-BR");
      const semPendentes = vencidas.length === 0 && atencao.length === 0;

      const renderList = (titulo: string, list: NormLub[], cor: string) => `
        <h2 style="color:${cor};border-bottom:2px solid ${cor};padding-bottom:6px;margin-top:24px">
          ${titulo} (${list.length})
        </h2>
        ${list.length === 0 ? "<p style='color:#666'>Nenhum item.</p>" : list.map((i) => `
          <div style="border:1px solid #ddd;border-left:4px solid ${cor};padding:12px;margin-bottom:10px;border-radius:6px">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
              <strong style="font-size:15px">${i.equipamento || "—"}</strong>
              <span style="background:${cor};color:#fff;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600">${statusLabel(i.status)}</span>
            </div>
            <table style="width:100%;font-size:12px;border-collapse:collapse">
              <tr><td style="padding:2px 6px;color:#666">Setor</td><td style="padding:2px 6px"><strong>${i.setor || "—"}</strong></td>
                  <td style="padding:2px 6px;color:#666">Tipo</td><td style="padding:2px 6px"><strong>${i.tipo || "—"}</strong></td></tr>
              <tr><td style="padding:2px 6px;color:#666">Horímetro atual</td><td style="padding:2px 6px"><strong>${fmtNum(i.horimetro_atual)}</strong></td>
                  <td style="padding:2px 6px;color:#666">Última lub.</td><td style="padding:2px 6px"><strong>${fmtNum(i.horimetro_ultima)}</strong></td></tr>
              <tr><td style="padding:2px 6px;color:#666">Intervalo</td><td style="padding:2px 6px"><strong>${fmtNum(i.intervalo)} h</strong></td>
                  <td style="padding:2px 6px;color:#666">Horas rodadas</td><td style="padding:2px 6px"><strong>${fmtNum(i.horas_rodadas)} h</strong></td></tr>
              <tr><td style="padding:2px 6px;color:#666">Horas restantes</td><td style="padding:2px 6px;color:${cor}"><strong>${fmtNum(i.horas_restantes)} h</strong></td>
                  <td style="padding:2px 6px;color:#666">Data última</td><td style="padding:2px 6px"><strong>${formatDataBr(i.data_ultima)}</strong></td></tr>
            </table>
            ${i.observacao ? `<p style="margin:8px 0 0;font-size:12px;color:#555"><em>Obs:</em> ${i.observacao}</p>` : ""}
          </div>
        `).join("")}
      `;

      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Relatório de Lubrificações</title>
<style>body{font-family:Arial,Helvetica,sans-serif;max-width:900px;margin:24px auto;padding:0 24px;color:#222}
h1{font-size:22px;margin:0 0 4px}.sub{color:#666;font-size:13px;margin-bottom:16px}
.resumo{display:flex;gap:12px;margin:16px 0;flex-wrap:wrap}
.kpi{flex:1;min-width:160px;border:1px solid #ddd;padding:10px;border-radius:8px;text-align:center}
.kpi b{display:block;font-size:22px}@media print{.noprint{display:none}}
</style></head><body>
<h1>RELATÓRIO DE LUBRIFICAÇÕES PENDENTES</h1>
<div class="sub">Emitido em ${hoje}</div>
<div class="resumo">
  <div class="kpi"><b style="color:#c0392b">${vencidas.length}</b>Vencidas</div>
  <div class="kpi"><b style="color:#e67e22">${atencao.length}</b>Em atenção</div>
  <div class="kpi"><b>${items.length}</b>Total monitorado</div>
</div>
${semPendentes
  ? `<p style="text-align:center;padding:32px;background:#f0f9f0;border-radius:8px;color:#1e7e34;font-weight:600">Nenhuma lubrificação pendente no momento.</p>`
  : `${renderList("LUBRIFICAÇÕES VENCIDAS", vencidas, "#c0392b")}
     ${renderList("LUBRIFICAÇÕES EM ATENÇÃO", atencao, "#e67e22")}`}
<div class="noprint" style="margin-top:24px;text-align:center">
  <button onclick="window.print()" style="padding:10px 24px;background:#222;color:#fff;border:0;border-radius:6px;cursor:pointer">Imprimir / Salvar PDF</button>
</div>
<script>setTimeout(()=>window.print(),400)</script>
</body></html>`;

      const w = window.open("", "_blank");
      if (!w) {
        alert("Permita janelas pop-up para baixar o PDF.");
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Erro ao gerar PDF.");
    }
  }

  return (
    <div className="page-container">
      <div className="flex items-start justify-between gap-2 mb-3">
        <PageHeader title="Lubrificação" subtitle="Controle de lubrificações por horímetro" />
        <div className="flex items-center gap-2">
          <RefreshButton onClick={() => refetch()} isFetching={isFetching} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        As lubrificações são controladas pela diferença entre o horímetro atual e o horímetro da última lubrificação.
        O status é calculado conforme o intervalo definido para cada equipamento.
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        <KpiCard icon={<Gauge className="w-5 h-5" />} label="Total" value={stats.total} tone="primary" />
        <KpiCard icon={<AlertCircle className="w-5 h-5" />} label="Vencidas" value={stats.vencidas} tone="overdue" />
        <KpiCard icon={<AlertTriangle className="w-5 h-5" />} label="Em atenção" value={stats.atencao} tone="warning" />
        <KpiCard icon={<CheckCircle2 className="w-5 h-5" />} label="Em dia" value={stats.emDia} tone="success" />
        <div className="rounded-xl p-3 border border-border bg-card flex flex-col col-span-2 md:col-span-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
            <Clock className="w-3.5 h-3.5" /> Mais crítica
          </div>
          <div className="text-sm font-semibold truncate">{stats.proxima?.equipamento || "—"}</div>
          <div className="text-[11px] text-muted-foreground">
            {stats.proxima ? `${fmtNum(stats.proxima.horas_restantes)} h restantes` : "—"}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
        <div className="relative md:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar equipamento..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={fSetor} onValueChange={setFSetor}>
          <SelectTrigger><SelectValue placeholder="Setor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos setores</SelectItem>
            {setores.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fTipo} onValueChange={setFTipo}>
          <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos tipos</SelectItem>
            {tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            <SelectItem value="VENCIDA">Vencida</SelectItem>
            <SelectItem value="ATENCAO">Atenção</SelectItem>
            <SelectItem value="EM DIA">Em dia</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end mb-3">
        <Button onClick={baixarPDF} variant="default" size="sm" className="gap-2">
          <Download className="w-4 h-4" /> Baixar PDF
        </Button>
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : isError ? (
        <div className="stat-card border border-destructive/40 bg-destructive/5 text-center py-8">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-destructive mb-3">
            Erro ao carregar lubrificações. Tente atualizar.
          </p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>Tentar novamente</Button>
          {error instanceof Error && (
            <p className="text-[11px] text-muted-foreground mt-2">{error.message}</p>
          )}
        </div>
      ) : items.length === 0 ? (
        <div className="stat-card text-center py-10 text-muted-foreground">
          <Droplets className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum equipamento cadastrado para lubrificação.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">Nenhum resultado para os filtros.</p>
      ) : (
        <>
          {/* Desktop: tabela */}
          <div className="hidden md:block rounded-xl border border-border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Horím. atual</TableHead>
                  <TableHead className="text-right">Última lub.</TableHead>
                  <TableHead className="text-right">Intervalo</TableHead>
                  <TableHead className="text-right">Rodadas</TableHead>
                  <TableHead className="text-right">Restantes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data última</TableHead>
                  <TableHead>Atualiz.</TableHead>
                  <TableHead>Obs.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.equipamento || "—"}</TableCell>
                    <TableCell>{i.setor || "—"}</TableCell>
                    <TableCell>{i.tipo || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtNum(i.horimetro_atual)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtNum(i.horimetro_ultima)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtNum(i.intervalo)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtNum(i.horas_rodadas)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{fmtNum(i.horas_restantes)}</TableCell>
                    <TableCell>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusClass(i.status)}`}>
                        {statusLabel(i.status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{formatDataBr(i.data_ultima)}</TableCell>
                    <TableCell className="text-xs">{formatDataBr(i.data_atualizacao)}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate" title={i.observacao}>{i.observacao || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((i) => (
              <div key={i.id} className={`rounded-xl p-3 border bg-card ${statusClass(i.status).replace("text-", "border-l-4 border-l-")}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{i.equipamento || "—"}</p>
                    <p className="text-[11px] text-muted-foreground">{i.setor || "—"} · {i.tipo || "—"}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${statusClass(i.status)}`}>
                    {statusLabel(i.status)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[11px] mt-2">
                  <Field label="Horím." value={fmtNum(i.horimetro_atual)} />
                  <Field label="Última" value={fmtNum(i.horimetro_ultima)} />
                  <Field label="Interv." value={fmtNum(i.intervalo)} />
                  <Field label="Rodadas" value={`${fmtNum(i.horas_rodadas)} h`} />
                  <Field label="Restantes" value={`${fmtNum(i.horas_restantes)} h`} strong />
                  <Field label="Data" value={formatDataBr(i.data_ultima)} />
                </div>
                {i.observacao && (
                  <p className="text-[11px] text-muted-foreground mt-2 italic">{i.observacao}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "primary"|"overdue"|"warning"|"success" }) {
  const cls = {
    primary: "bg-primary/10 border-primary/20 text-primary",
    overdue: "bg-overdue/10 border-overdue/20 text-overdue",
    warning: "bg-warning/10 border-warning/20 text-warning",
    success: "bg-success/10 border-success/20 text-success",
  }[tone];
  return (
    <div className={`rounded-xl p-3 border ${cls}`}>
      <div className="flex items-center gap-1.5 text-[11px] opacity-80 mb-1">{icon}<span>{label}</span></div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function Field({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="bg-muted/30 rounded px-1.5 py-1">
      <div className="text-[9px] text-muted-foreground uppercase">{label}</div>
      <div className={strong ? "font-semibold" : ""}>{value}</div>
    </div>
  );
}
