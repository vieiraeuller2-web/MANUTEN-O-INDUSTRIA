import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck, Factory, Layers3, ListChecks, Wrench } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ResumoPreventivas } from "@/types/preventivas";
import PreventivasEstado from "./PreventivasEstado";

interface PreventivasResumoProps {
  resumo?: ResumoPreventivas;
  isLoading: boolean;
  error?: Error | null;
  onTentarNovamente: () => void;
}

const definicoes = [
  { chaves: ["total_setores"], rotulo: "Setores", icon: Factory },
  { chaves: ["total_ativos"], rotulo: "Ativos", icon: Wrench },
  { chaves: ["total_planos"], rotulo: "Planos", icon: ClipboardCheck },
  { chaves: ["total_itens_verificacao", "total_nos_arvore"], rotulo: "Itens do checklist", icon: ListChecks },
  { chaves: ["planos_em_dia", "em_dia"], status: ["EM_DIA"], rotulo: "Em dia", icon: CheckCircle2 },
  { chaves: ["planos_a_vencer", "a_vencer"], status: ["A_VENCER"], rotulo: "A vencer", icon: CalendarClock },
  { chaves: ["planos_vencidos", "planos_vencidas", "vencidas", "vencida"], status: ["VENCIDA", "VENCIDAS", "VENCIDO"], rotulo: "Vencidas", icon: AlertTriangle },
  { chaves: ["planos_sem_data_base", "sem_data_base"], status: ["SEM_DATA_BASE"], rotulo: "Sem data-base", icon: Layers3 },
] as const;

function obterValor(resumo: ResumoPreventivas, chaves: readonly string[], status?: readonly string[]) {
  for (const chave of chaves) {
    const valor = resumo.indicadores[chave];
    if (typeof valor === "number" || typeof valor === "string") return valor;
  }
  for (const chave of status ?? []) {
    const valor = resumo.por_status?.[chave];
    if (typeof valor === "number" || typeof valor === "string") return valor;
  }
  return undefined;
}

export default function PreventivasResumo({ resumo, isLoading, error, onTentarNovamente }: PreventivasResumoProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8" aria-label="Carregando resumo">
        {Array.from({ length: 8 }, (_, indice) => (
          <div key={indice} className="stat-card space-y-3 p-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <PreventivasEstado
        tipo="erro"
        mensagem="Não foi possível carregar o resumo das preventivas."
        detalhe={error.message}
        onTentarNovamente={onTentarNovamente}
      />
    );
  }

  const cards = resumo
    ? definicoes.flatMap((definicao) => {
        const valor = obterValor(resumo, definicao.chaves, "status" in definicao ? definicao.status : undefined);
        return valor === undefined ? [] : [{ ...definicao, valor }];
      })
    : [];

  if (!cards.length) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
      {cards.map(({ rotulo, icon: Icone, valor }) => (
        <div key={rotulo} className="stat-card min-w-0 p-3">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <Icone className="h-4 w-4 shrink-0" />
            <span className="truncate text-[11px] font-medium uppercase tracking-wide">{rotulo}</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-foreground">{String(valor)}</p>
        </div>
      ))}
    </div>
  );
}
