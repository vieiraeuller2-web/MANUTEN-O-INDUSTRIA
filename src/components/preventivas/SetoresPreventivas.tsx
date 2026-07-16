import { Building2, Check, CircleOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SetorPreventiva } from "@/types/preventivas";
import PreventivasEstado from "./PreventivasEstado";
import { compararOrdenados, valorEhNao } from "./preventivas-utils";

interface SetoresPreventivasProps {
  setores: SetorPreventiva[];
  selecionado: string;
  isLoading: boolean;
  error?: Error | null;
  onSelecionar: (idSetor: string) => void;
  onTentarNovamente: () => void;
}

function contador(setor: SetorPreventiva) {
  return setor.quantidade_ativos ?? setor.total_ativos;
}

export default function SetoresPreventivas({
  setores,
  selecionado,
  isLoading,
  error,
  onSelecionar,
  onTentarNovamente,
}: SetoresPreventivasProps) {
  const ordenados = [...setores].sort((a, b) => compararOrdenados(a, b, a.nome_setor, b.nome_setor));
  return (
    <section className="stat-card flex min-h-64 min-w-0 flex-col p-3" aria-labelledby="titulo-setores">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">Etapa 1</p>
          <h2 id="titulo-setores" className="text-base">Setores</h2>
        </div>
        {!isLoading && !error && <Badge variant="secondary">{setores.length}</Badge>}
      </div>
      {isLoading ? (
        <PreventivasEstado tipo="loading" mensagem="Carregando setores..." />
      ) : error ? (
        <PreventivasEstado tipo="erro" mensagem="Não foi possível carregar os dados das preventivas." detalhe={error.message} onTentarNovamente={onTentarNovamente} />
      ) : !ordenados.length ? (
        <PreventivasEstado tipo="vazio" mensagem="Nenhum setor cadastrado." />
      ) : (
        <div className="space-y-2">
          {ordenados.map((setor) => {
            const ativo = selecionado === setor.id_setor;
            const inativo = valorEhNao(setor.ativo);
            const total = contador(setor);
            return (
              <button
                type="button"
                key={setor.id_setor}
                onClick={() => onSelecionar(setor.id_setor)}
                className={cn(
                  "w-full min-w-0 rounded-lg border p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  ativo && "border-primary bg-primary/10 shadow-sm",
                  inativo && "opacity-60",
                )}
                aria-pressed={ativo}
              >
                <div className="flex min-w-0 items-start gap-2">
                  <span className={cn("mt-0.5 rounded-md bg-muted p-1.5 text-muted-foreground", ativo && "bg-primary text-primary-foreground")}>
                    {inativo ? <CircleOff className="h-4 w-4" /> : ativo ? <Check className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-semibold text-foreground">{setor.nome_setor}</span>
                    {setor.descricao && <span className="mt-0.5 block break-words text-xs text-muted-foreground">{setor.descricao}</span>}
                  </span>
                  {total !== undefined && total !== null && <Badge variant="outline" className="shrink-0">{String(total)} ativos</Badge>}
                </div>
                {inativo && <span className="mt-2 block text-[10px] font-semibold uppercase text-muted-foreground">Inativo</span>}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
