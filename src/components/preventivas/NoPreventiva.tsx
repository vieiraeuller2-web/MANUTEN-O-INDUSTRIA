import { useState } from "react";
import { ChevronDown, ChevronRight, EyeOff, FolderTree, ListChecks, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { safeString } from "@/lib/data-helpers";
import { cn } from "@/lib/utils";
import type { NoPreventiva as NoPreventivaTipo } from "@/types/preventivas";
import { valorEhNao, valorEhSim } from "./preventivas-utils";

interface NoPreventivaProps {
  no: NoPreventivaTipo;
  profundidade?: number;
  onDetalhar: (no: NoPreventivaTipo) => void;
}

export default function NoPreventiva({ no, profundidade = 0, onDetalhar }: NoPreventivaProps) {
  const [aberto, setAberto] = useState(profundidade < 2);
  const filhos = no.filhos ?? [];
  const temFilhos = filhos.length > 0;
  const nome = safeString(no.item_verificacao || no.nome_no, "Item sem descrição");
  const tipo = safeString(no.tipo_no, temFilhos ? "CONJUNTO" : "ITEM_VERIFICACAO").replace(/_/g, " ");

  if (temFilhos) {
    return (
      <div className="min-w-0 rounded-lg border bg-card">
        <button
          type="button"
          onClick={() => setAberto((atual) => !atual)}
          className="flex w-full min-w-0 items-start gap-2 rounded-lg p-3 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={aberto}
        >
          {aberto ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
          <FolderTree className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1">
            <span className="block break-words text-sm font-semibold text-foreground">{nome}</span>
            <span className="mt-1 flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-[10px]">{tipo}</Badge>
              {no.especialidade && <Badge variant="outline" className="text-[10px]">{no.especialidade}</Badge>}
              <Badge variant="outline" className="text-[10px]">{filhos.length} {filhos.length === 1 ? "item" : "itens"}</Badge>
            </span>
          </span>
        </button>
        {aberto && (
          <div className="space-y-2 border-t bg-muted/10 p-2 sm:p-3">
            {filhos.map((filho) => (
              <NoPreventiva key={filho.id_no} no={filho} profundidade={profundidade + 1} onDetalhar={onDetalhar} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onDetalhar(no)}
      className="flex w-full min-w-0 items-start gap-2 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span className="min-w-0 flex-1">
        <span className="block break-words text-sm font-medium leading-snug text-foreground">{nome}</span>
        {no.criterio_aceite && <span className="mt-1 block break-words text-xs text-muted-foreground">Critério: {no.criterio_aceite}</span>}
        <span className="mt-2 flex flex-wrap gap-1.5">
          {valorEhSim(no.obrigatorio) && <Badge className="gap-1 text-[10px]"><ShieldCheck className="h-3 w-3" />Obrigatório</Badge>}
          {no.especialidade && <Badge variant="outline" className="text-[10px]">{no.especialidade}</Badge>}
          {valorEhNao(no.exibir_no_pdf) && <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground"><EyeOff className="h-3 w-3" />Fora do PDF</Badge>}
        </span>
      </span>
      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
