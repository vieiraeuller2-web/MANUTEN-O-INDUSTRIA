import { useMemo, useState } from "react";
import { ClipboardCheck, FileDown, ListTree, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NoPreventiva as NoPreventivaTipo, PlanoPreventiva } from "@/types/preventivas";
import DetalhePlanoPreventivo from "./DetalhePlanoPreventivo";
import NoPreventiva from "./NoPreventiva";
import PreventivasEstado from "./PreventivasEstado";
import { construirArvorePreventiva } from "./preventivas-utils";

interface ArvorePreventivaProps {
  plano?: PlanoPreventiva;
  nos: NoPreventivaTipo[];
  planoSelecionado: boolean;
  isLoading: boolean;
  error?: Error | null;
  onTentarNovamente: () => void;
  onGerarPdfExecucao?: () => void;
  onRegistrarPreventiva?: () => void;
  isGerandoPdf?: boolean;
  podeRegistrar?: boolean;
}

export default function ArvorePreventiva({
  plano,
  nos,
  planoSelecionado,
  isLoading,
  error,
  onTentarNovamente,
  onGerarPdfExecucao,
  onRegistrarPreventiva,
  isGerandoPdf = false,
  podeRegistrar = false,
}: ArvorePreventivaProps) {
  const [detalhe, setDetalhe] = useState<NoPreventivaTipo | null>(null);
  const arvore = useMemo(() => construirArvorePreventiva(nos), [nos]);
  return (
    <section className="stat-card min-w-0 p-3 sm:p-4" aria-labelledby="titulo-checklist">
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">Etapa 4</p>
          <h2 id="titulo-checklist" className="flex items-center gap-2 text-base">
            <ListTree className="h-4 w-4 shrink-0" /> Árvore do checklist
          </h2>
          {plano?.titulo_plano && <p className="mt-1 break-words text-xs text-muted-foreground">{plano.titulo_plano}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {planoSelecionado && !isLoading && !error && <Badge variant="secondary">{nos.length} registros</Badge>}
          {planoSelecionado && plano && onGerarPdfExecucao && (
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={onGerarPdfExecucao} disabled={isGerandoPdf}>
              {isGerandoPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
              {isGerandoPdf ? "Gerando..." : "PDF de Execução"}
            </Button>
          )}
          {planoSelecionado && plano && onRegistrarPreventiva && (
            <Button type="button" size="sm" className="h-8 gap-1.5 text-xs" onClick={onRegistrarPreventiva} disabled={!podeRegistrar}>
              <ClipboardCheck className="h-3.5 w-3.5" /> Registrar Preventiva
            </Button>
          )}
        </div>
      </div>

      {!planoSelecionado ? (
        <PreventivasEstado tipo="vazio" mensagem="Selecione um plano para carregar seu checklist." />
      ) : isLoading ? (
        <PreventivasEstado tipo="loading" mensagem="Carregando árvore do checklist..." />
      ) : error ? (
        <PreventivasEstado tipo="erro" mensagem="Não foi possível carregar o checklist deste plano." detalhe={error.message} onTentarNovamente={onTentarNovamente} />
      ) : !arvore.length ? (
        <PreventivasEstado tipo="vazio" mensagem="Nenhum item cadastrado neste plano." />
      ) : (
        <div className="space-y-2">
          {arvore.map((no) => <NoPreventiva key={no.id_no} no={no} onDetalhar={setDetalhe} />)}
        </div>
      )}

      <DetalhePlanoPreventivo no={detalhe} plano={plano} onOpenChange={(aberto) => !aberto && setDetalhe(null)} />
    </section>
  );
}
