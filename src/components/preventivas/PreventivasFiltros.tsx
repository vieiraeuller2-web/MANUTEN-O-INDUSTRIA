import { useState } from "react";
import { Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { AtivoPreventiva, FiltrosPreventivas, SetorPreventiva } from "@/types/preventivas";
import { TODOS_FILTRO } from "./preventivas-utils";

interface PreventivasFiltrosProps {
  filtros: FiltrosPreventivas;
  setores: SetorPreventiva[];
  ativos: AtivoPreventiva[];
  modalidades: string[];
  periodicidades: string[];
  status: string[];
  onChange: (campo: keyof FiltrosPreventivas, valor: string) => void;
  onLimpar: () => void;
}

function CampoSelect({
  id,
  label,
  value,
  placeholder,
  opcoes,
  disabled,
  onValueChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  opcoes: Array<{ value: string; label: string }>;
  disabled?: boolean;
  onValueChange: (valor: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value || TODOS_FILTRO} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id={id} className="h-9 bg-card text-xs">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS_FILTRO}>{placeholder}</SelectItem>
          {opcoes.map((opcao) => (
            <SelectItem key={opcao.value} value={opcao.value}>{opcao.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function PreventivasFiltros({
  filtros,
  setores,
  ativos,
  modalidades,
  periodicidades,
  status,
  onChange,
  onLimpar,
}: PreventivasFiltrosProps) {
  const [aberto, setAberto] = useState(false);
  const quantidadeAtivos = Object.values(filtros).filter((valor) => valor && valor !== TODOS_FILTRO).length;

  return (
    <section className="stat-card p-3" aria-label="Filtros dos planos de manutenção">
      <div className="flex items-center justify-between gap-3 md:hidden">
        <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={() => setAberto((atual) => !atual)}>
          <SlidersHorizontal className="h-4 w-4" />
          Filtros {quantidadeAtivos ? `(${quantidadeAtivos})` : ""}
        </Button>
        {quantidadeAtivos > 0 && (
          <Button type="button" variant="ghost" size="sm" className="gap-1 text-xs" onClick={onLimpar}>
            <X className="h-3.5 w-3.5" /> Limpar
          </Button>
        )}
      </div>

      <div className={cn("gap-3", aberto ? "grid" : "hidden", "md:grid md:grid-cols-2 xl:grid-cols-8")}>
        <div className="min-w-0 space-y-1.5 md:col-span-2 xl:col-span-2">
          <Label htmlFor="busca-preventivas" className="text-xs text-muted-foreground">Busca</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="busca-preventivas"
              value={filtros.busca}
              onChange={(event) => onChange("busca", event.target.value)}
              placeholder="Ativo, TAG, plano, modalidade..."
              className="h-9 bg-card pl-9 text-xs"
            />
          </div>
        </div>
        <CampoSelect
          id="filtro-setor"
          label="Setor"
          value={filtros.setor}
          placeholder="Todos os setores"
          opcoes={setores.map((setor) => ({ value: setor.id_setor, label: setor.nome_setor }))}
          onValueChange={(valor) => onChange("setor", valor)}
        />
        <CampoSelect
          id="filtro-ativo"
          label="Ativo"
          value={filtros.ativo}
          placeholder="Todos os ativos"
          opcoes={ativos.map((ativo) => ({ value: ativo.id_ativo, label: ativo.nome_ativo }))}
          disabled={!filtros.setor || filtros.setor === TODOS_FILTRO}
          onValueChange={(valor) => onChange("ativo", valor)}
        />
        <CampoSelect
          id="filtro-modalidade"
          label="Modalidade"
          value={filtros.modalidade}
          placeholder="Todas"
          opcoes={modalidades.map((valor) => ({ value: valor, label: valor }))}
          disabled={!filtros.ativo || filtros.ativo === TODOS_FILTRO}
          onValueChange={(valor) => onChange("modalidade", valor)}
        />
        <CampoSelect
          id="filtro-periodicidade"
          label="Periodicidade"
          value={filtros.periodicidade}
          placeholder="Todas"
          opcoes={periodicidades.map((valor) => ({ value: valor, label: valor }))}
          disabled={!filtros.ativo || filtros.ativo === TODOS_FILTRO}
          onValueChange={(valor) => onChange("periodicidade", valor)}
        />
        <CampoSelect
          id="filtro-status"
          label="Status"
          value={filtros.status}
          placeholder="Todos"
          opcoes={status.map((valor) => ({ value: valor, label: valor }))}
          disabled={!filtros.ativo || filtros.ativo === TODOS_FILTRO}
          onValueChange={(valor) => onChange("status", valor)}
        />
        <div className="hidden items-end justify-end xl:flex">
          <Button type="button" variant="ghost" size="sm" onClick={onLimpar} disabled={!quantidadeAtivos} className="gap-1.5 text-xs">
            <Filter className="h-3.5 w-3.5" /> Limpar
          </Button>
        </div>
      </div>
    </section>
  );
}
