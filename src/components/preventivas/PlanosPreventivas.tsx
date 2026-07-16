import { CalendarDays, ChevronRight, Clock3, ListChecks, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PlanoPreventiva } from "@/types/preventivas";
import PreventivasEstado from "./PreventivasEstado";
import {
  compararOrdenados,
  formatarDataPreventiva,
  formatarModalidadePlano,
  formatarPeriodicidadePlano,
  formatarStatusPlano,
  valorEhNao,
} from "./preventivas-utils";

interface PlanosPreventivasProps {
  planos: PlanoPreventiva[];
  ativoSelecionado: boolean;
  selecionado: string;
  isLoading: boolean;
  error?: Error | null;
  onSelecionar: (idPlano: string) => void;
  onTentarNovamente: () => void;
}

function classeStatus(status: string) {
  if (status === "EM DIA") return "border-success/40 bg-success/10 text-success";
  if (status === "A VENCER") return "border-warning/50 bg-warning/10 text-foreground";
  if (status === "VENCIDA") return "border-destructive/40 bg-destructive/10 text-destructive";
  return "border-border bg-muted text-muted-foreground";
}

function agruparPlanos(planos: PlanoPreventiva[]) {
  const modalidades = new Map<string, Map<string, PlanoPreventiva[]>>();
  planos.forEach((plano) => {
    const modalidade = formatarModalidadePlano(plano);
    const periodicidade = formatarPeriodicidadePlano(plano);
    if (!modalidades.has(modalidade)) modalidades.set(modalidade, new Map());
    const grupoModalidade = modalidades.get(modalidade)!;
    if (!grupoModalidade.has(periodicidade)) grupoModalidade.set(periodicidade, []);
    grupoModalidade.get(periodicidade)!.push(plano);
  });
  return modalidades;
}

function PlanoCard({ plano, selecionado, onSelecionar }: { plano: PlanoPreventiva; selecionado: boolean; onSelecionar: () => void }) {
  const status = valorEhNao(plano.ativo) ? "INATIVO" : formatarStatusPlano(plano.status_plano);
  const quantidade = plano.quantidade_itens ?? plano.total_itens;
  return (
    <button
      type="button"
      onClick={onSelecionar}
      className={cn(
        "w-full min-w-0 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selecionado && "border-primary bg-primary/10 shadow-sm",
        status === "INATIVO" && "opacity-60",
      )}
      aria-pressed={selecionado}
    >
      <div className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Badge variant="outline" className={cn("text-[10px]", classeStatus(status))}>{status}</Badge>
            {quantidade !== undefined && quantidade !== null && (
              <Badge variant="secondary" className="gap-1 text-[10px]"><ListChecks className="h-3 w-3" />{String(quantidade)} itens</Badge>
            )}
          </div>
          <h4 className="break-words text-sm font-semibold leading-snug text-foreground">
            {plano.titulo_plano || "Plano sem título"}
          </h4>
          <div className="mt-2 grid gap-1.5 text-[11px] text-muted-foreground sm:grid-cols-2">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Última: {formatarDataPreventiva(plano.ultima_execucao)}</span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Próxima: {formatarDataPreventiva(plano.proxima_execucao)}</span>
            </span>
            {plano.dias_restantes !== "" && plano.dias_restantes !== undefined && plano.dias_restantes !== null && (
              <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{String(plano.dias_restantes)} dias restantes</span>
            )}
            {plano.responsavel_padrao && (
              <span className="inline-flex min-w-0 items-center gap-1.5"><UserRound className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{plano.responsavel_padrao}</span></span>
            )}
          </div>
        </div>
        <ChevronRight className={cn("mt-1 h-4 w-4 shrink-0 text-muted-foreground", selecionado && "text-primary")} />
      </div>
    </button>
  );
}

export default function PlanosPreventivas({
  planos,
  ativoSelecionado,
  selecionado,
  isLoading,
  error,
  onSelecionar,
  onTentarNovamente,
}: PlanosPreventivasProps) {
  const ordenados = [...planos].sort((a, b) => compararOrdenados(a, b, a.titulo_plano, b.titulo_plano));
  const grupos = agruparPlanos(ordenados);
  return (
    <section className="stat-card flex min-h-64 min-w-0 flex-col p-3" aria-labelledby="titulo-planos">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">Etapa 3</p>
          <h2 id="titulo-planos" className="text-base">Planos</h2>
        </div>
        {ativoSelecionado && !isLoading && !error && <Badge variant="secondary">{planos.length}</Badge>}
      </div>
      {!ativoSelecionado ? (
        <PreventivasEstado tipo="vazio" mensagem="Selecione um ativo para consultar seus planos." />
      ) : isLoading ? (
        <PreventivasEstado tipo="loading" mensagem="Carregando planos..." />
      ) : error ? (
        <PreventivasEstado tipo="erro" mensagem="Não foi possível carregar os planos deste ativo." detalhe={error.message} onTentarNovamente={onTentarNovamente} />
      ) : !ordenados.length ? (
        <PreventivasEstado tipo="vazio" mensagem="Nenhum plano encontrado para este ativo." />
      ) : (
        <div className="space-y-4">
          {Array.from(grupos.entries()).map(([modalidade, periodicidades]) => (
            <div key={modalidade} className="min-w-0 rounded-lg border bg-muted/15 p-2.5">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">{modalidade}</h3>
              <div className="space-y-3">
                {Array.from(periodicidades.entries()).map(([periodicidade, itens]) => (
                  <div key={periodicidade}>
                    <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <Clock3 className="h-3 w-3" /> {periodicidade}
                    </p>
                    <div className="space-y-2">
                      {itens.map((plano) => (
                        <PlanoCard key={plano.id_plano} plano={plano} selecionado={selecionado === plano.id_plano} onSelecionar={() => onSelecionar(plano.id_plano)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
