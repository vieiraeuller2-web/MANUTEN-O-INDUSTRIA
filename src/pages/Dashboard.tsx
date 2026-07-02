import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getDaysUntil, getDaysSince, formatDate } from "@/lib/supabase-helpers";
import PageHeader from "@/components/PageHeader";
import {
  ClipboardList, ShieldAlert, FileWarning, Wrench, ChevronRight,
  Loader2, AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { type SheetOS } from "@/lib/sheets-api";
import { useSheetOS, useRefreshSheetOS } from "@/hooks/use-sheet-os";
import RefreshButton from "@/components/RefreshButton";
import { safeArray } from "@/lib/data-helpers";

function formatBR(d?: string) {
  if (!d) return "—";
  const onlyDate = d.length >= 10 ? d.slice(0, 10) : d;
  const [y, m, day] = onlyDate.split("-");
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

export default function Dashboard() {
  const navigate = useNavigate();

  // OS via planilha
  const {
    data: ordens = [],
    isLoading: loadingOS,
    isError: errorOS,
    error: errOS,
    refetch: refetchOS,
    isFetching: fetchingOS,
  } = useSheetOS();
  const refresh = useRefreshSheetOS();

  // Preventivas e NFs continuam no backend (não fazem parte da planilha)
  const { data: preventivas = [] } = useQuery({
    queryKey: ["preventivas"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("preventivas")
          .select("*")
          .order("data_prevista", { ascending: true });
        if (error) throw error;
        return data ?? [];
      } catch {
        return [];
      }
    },
  });

  const { data: nfs = [] } = useQuery({
    queryKey: ["notas_fiscais"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("notas_fiscais")
          .select("*")
          .order("data_nf", { ascending: false });
        if (error) throw error;
        return data ?? [];
      } catch {
        return [];
      }
    },
  });

  const listaPreventivas = safeArray<any>(preventivas);
  const listaNfs = safeArray<any>(nfs);

  const prevProxVenc = listaPreventivas.filter((p: any) => {
    const days = getDaysUntil(p.data_prevista);
    return days <= 7;
  });

  const nfsProxVenc = listaNfs.filter((nf: any) => getDaysSince(nf.data_nf) >= 180);

  // Últimas OS: ordena por data_inicio desc (com fallback)
  const ultimas = useMemo(() => {
    return [...ordens]
      .sort((a, b) => (b.data_inicio || "").localeCompare(a.data_inicio || ""))
      .slice(0, 5);
  }, [ordens]);

  return (
    <div className="page-container">
      <div className="flex items-start justify-between gap-2 mb-2">
        <PageHeader title="Manutenção Industrial" subtitle="Painel de controle" />
        <RefreshButton onClick={refresh} isFetching={fetchingOS} />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl p-4 flex flex-col items-center text-center animate-fade-in bg-primary/10 border border-primary/20">
          <ClipboardList className="w-6 h-6 text-primary mb-1" />
          <span className="text-2xl font-bold tabular-nums text-primary">
            {loadingOS ? "…" : ordens.length}
          </span>
          <span className="text-[11px] text-primary/70 leading-tight font-medium">Total de OS</span>
        </div>
        <div className="rounded-xl p-4 flex flex-col items-center text-center animate-fade-in bg-warning/10 border border-warning/20" style={{ animationDelay: "60ms" }}>
          <ShieldAlert className="w-6 h-6 text-warning mb-1" />
          <span className="text-2xl font-bold tabular-nums text-warning">{prevProxVenc.length}</span>
          <span className="text-[11px] text-warning/70 leading-tight font-medium">Prev. próximas</span>
        </div>
        <div className="rounded-xl p-4 flex flex-col items-center text-center animate-fade-in bg-overdue/10 border border-overdue/20" style={{ animationDelay: "120ms" }}>
          <FileWarning className="w-6 h-6 text-overdue mb-1" />
          <span className="text-2xl font-bold tabular-nums text-overdue">{nfsProxVenc.length}</span>
          <span className="text-[11px] text-overdue/70 leading-tight font-medium">NFs vencendo</span>
        </div>
      </div>

      {/* Preventivas próximas */}
      {prevProxVenc.length > 0 && (
        <section className="mb-6 animate-fade-in" style={{ animationDelay: "160ms" }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">Preventivas Próximas</h2>
            <button onClick={() => navigate("/preventivas")} className="text-xs text-primary font-medium active:scale-95">Ver todas</button>
          </div>
          <div className="space-y-2">
            {prevProxVenc.slice(0, 4).map((p: any) => {
              const days = getDaysUntil(p.data_prevista);
              const isOverdue = days < 0;
              return (
                <div key={p.id} className={`rounded-lg p-3 border ${isOverdue ? "bg-overdue/5 border-overdue/20" : "bg-warning/5 border-warning/20"}`}>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.equipamento}</p>
                      <p className="text-xs text-muted-foreground">{p.setor} · {p.responsavel}</p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      isOverdue ? "bg-overdue/15 text-overdue" : "bg-warning/15 text-warning"
                    }`}>
                      {isOverdue ? "Vencida" : `${days}d`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* NFs próximas */}
      {nfsProxVenc.length > 0 && (
        <section className="mb-6 animate-fade-in" style={{ animationDelay: "220ms" }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">NFs Vencendo</h2>
            <button onClick={() => navigate("/nf")} className="text-xs text-primary font-medium active:scale-95">Ver todas</button>
          </div>
          <div className="space-y-2">
            {nfsProxVenc.slice(0, 4).map((nf: any) => {
              const days = getDaysSince(nf.data_nf);
              return (
                <div key={nf.id} className="rounded-lg p-3 border bg-overdue/5 border-overdue/20">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">NF {nf.numero_nf}</p>
                      <p className="text-xs text-muted-foreground">{nf.referente_a} · {formatDate(nf.data_nf)}</p>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-overdue/15 text-overdue shrink-0">
                      {days}d
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Últimas OS */}
      <section className="animate-fade-in" style={{ animationDelay: "280ms" }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Últimas OS</h2>
          <button onClick={() => navigate("/os")} className="text-xs text-primary font-medium active:scale-95">Ver todas</button>
        </div>

        {loadingOS ? (
          <div className="stat-card flex flex-col items-center py-8 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-sm">Carregando da planilha...</p>
          </div>
        ) : errorOS ? (
          <div className="stat-card border border-destructive/40 bg-destructive/5 text-center py-6">
            <AlertCircle className="w-6 h-6 text-destructive mx-auto mb-2" />
            <p className="text-xs text-destructive mb-2">
              {errOS instanceof Error ? errOS.message : "Erro ao carregar."}
            </p>
            <button onClick={() => refetchOS()} className="text-xs text-primary font-medium">
              Tentar novamente
            </button>
          </div>
        ) : ultimas.length === 0 ? (
          <div className="stat-card flex flex-col items-center py-8 text-muted-foreground">
            <Wrench className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">Nenhuma OS cadastrada</p>
            <button onClick={() => navigate("/os/nova")} className="mt-2 text-sm text-primary font-medium active:scale-95">
              Registrar primeira OS
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {ultimas.map((os: SheetOS, i) => {
              const isPrev = /PREV/i.test(os.tipo || "");
              return (
                <button
                  key={`${os.equipamento}-${os.data_inicio}-${i}`}
                  onClick={() => navigate("/os")}
                  className="stat-card w-full text-left flex items-center gap-3 active:scale-[0.98] transition-transform"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{os.equipamento || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatBR(os.data_inicio)} · {os.setor || "—"}
                    </p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 uppercase ${
                    isPrev ? "bg-primary/10 text-primary" : "bg-accent/15 text-accent-foreground"
                  }`}>
                    {isPrev ? "Prev." : "Corr."}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
