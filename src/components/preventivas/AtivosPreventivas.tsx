import { Check, MapPin, Tag, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AtivoPreventiva } from "@/types/preventivas";
import PreventivasEstado from "./PreventivasEstado";
import { compararOrdenados, valorEhNao } from "./preventivas-utils";

interface AtivosPreventivasProps {
  ativos: AtivoPreventiva[];
  setorSelecionado: boolean;
  selecionado: string;
  isLoading: boolean;
  error?: Error | null;
  onSelecionar: (idAtivo: string) => void;
  onTentarNovamente: () => void;
}

export default function AtivosPreventivas({
  ativos,
  setorSelecionado,
  selecionado,
  isLoading,
  error,
  onSelecionar,
  onTentarNovamente,
}: AtivosPreventivasProps) {
  const ordenados = [...ativos].sort((a, b) => compararOrdenados(a, b, a.nome_ativo, b.nome_ativo));
  return (
    <section className="stat-card flex min-h-64 min-w-0 flex-col p-3" aria-labelledby="titulo-ativos">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">Etapa 2</p>
          <h2 id="titulo-ativos" className="text-base">Ativos</h2>
        </div>
        {setorSelecionado && !isLoading && !error && <Badge variant="secondary">{ativos.length}</Badge>}
      </div>
      {!setorSelecionado ? (
        <PreventivasEstado tipo="vazio" mensagem="Selecione um setor para consultar seus ativos." />
      ) : isLoading ? (
        <PreventivasEstado tipo="loading" mensagem="Carregando ativos..." />
      ) : error ? (
        <PreventivasEstado tipo="erro" mensagem="Não foi possível carregar os ativos deste setor." detalhe={error.message} onTentarNovamente={onTentarNovamente} />
      ) : !ordenados.length ? (
        <PreventivasEstado tipo="vazio" mensagem="Nenhum ativo encontrado neste setor." />
      ) : (
        <div className="space-y-2">
          {ordenados.map((ativo) => {
            const selecionadoAgora = selecionado === ativo.id_ativo;
            const inativo = valorEhNao(ativo.ativo);
            const total = ativo.quantidade_planos ?? ativo.total_planos;
            return (
              <button
                type="button"
                key={ativo.id_ativo}
                onClick={() => onSelecionar(ativo.id_ativo)}
                className={cn(
                  "w-full min-w-0 rounded-lg border p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selecionadoAgora && "border-primary bg-primary/10 shadow-sm",
                  inativo && "opacity-60",
                )}
                aria-pressed={selecionadoAgora}
              >
                <div className="flex min-w-0 items-start gap-2">
                  <span className={cn("mt-0.5 rounded-md bg-muted p-1.5 text-muted-foreground", selecionadoAgora && "bg-primary text-primary-foreground")}>
                    {selecionadoAgora ? <Check className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="mb-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="max-w-full gap-1 border-primary/40 bg-primary/5 text-[10px] text-primary">
                        <Tag className="h-3 w-3 shrink-0" />
                        <span className="truncate">{ativo.tag_ativo || "TAG NÃO CADASTRADA"}</span>
                      </Badge>
                      {total !== undefined && total !== null && <Badge variant="secondary" className="text-[10px]">{String(total)} planos</Badge>}
                    </span>
                    <span className="block break-words text-sm font-semibold text-foreground">{ativo.nome_ativo}</span>
                    {(ativo.tipo_ativo || ativo.localizacao || ativo.criticidade) && (
                      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        {ativo.tipo_ativo && <span>{ativo.tipo_ativo}</span>}
                        {ativo.localizacao && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{ativo.localizacao}</span>}
                        {ativo.criticidade && <span>Criticidade: {ativo.criticidade}</span>}
                      </span>
                    )}
                    {inativo && <span className="mt-1 block text-[10px] font-semibold uppercase text-muted-foreground">Inativo</span>}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
