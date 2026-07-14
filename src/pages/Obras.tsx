import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCopy,
  Eye,
  Hammer,
  Loader2,
  Play,
  Plus,
  RotateCcw,
  Search,
  Users,
  X,
} from "lucide-react";

import PageHeader from "@/components/PageHeader";
import RefreshButton from "@/components/RefreshButton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { normalizeText, paginateData, safeArray, safeString, uniqueSorted } from "@/lib/data-helpers";
import {
  countEnvolvidos,
  dateInputToBR,
  fetchObras,
  formatObraDate,
  monthFromDate,
  normalizePrioridade,
  normalizeStatus,
  postObraAction,
  primaryObraDate,
  prioridadeLabel,
  sortableDate,
  statusLabel,
  todayInputValue,
  yearFromDate,
  type Obra,
  type ObraActionPayload,
  type ObraPrioridade,
  type ObraStatus,
  type TipoContagemDias,
} from "@/lib/obras-api";
import { cn } from "@/lib/utils";

type CreateMode = "PROGRAMADA" | "EM_ANDAMENTO" | "CONCLUIDA";

interface CreateForm {
  tituloObra: string;
  localizacao: string;
  responsavel: string;
  envolvidos: string;
  prioridade: ObraPrioridade;
  dataProgramadaInicio: string;
  dataProgramadaFim: string;
  dataInicio: string;
  dataFim: string;
  tipoContagemDias: TipoContagemDias;
  diasInformados: string;
  materialPrevisto: string;
  materialUtilizado: string;
  observacao: string;
}

interface StartForm {
  dataInicio: string;
  responsavel: string;
  envolvidos: string;
  materialUtilizado: string;
  observacao: string;
}

interface FinishForm {
  dataFim: string;
  tipoContagemDias: TipoContagemDias;
  diasInformados: string;
  materialUtilizado: string;
  observacao: string;
}

const STATUS_OPTIONS: { value: ObraStatus; label: string }[] = [
  { value: "PROGRAMADA", label: "Programada" },
  { value: "EM ANDAMENTO", label: "Em andamento" },
  { value: "CONCLUIDA", label: "Concluída" },
  { value: "CANCELADA", label: "Cancelada" },
];

const PRIORIDADE_OPTIONS: { value: ObraPrioridade; label: string }[] = [
  { value: "BAIXA", label: "Baixa" },
  { value: "NORMAL", label: "Normal/Média" },
  { value: "ALTA", label: "Alta" },
  { value: "URGENTE", label: "Urgente" },
];

const CONTAGEM_OPTIONS: { value: TipoContagemDias; label: string }[] = [
  { value: "UTEIS", label: "Úteis" },
  { value: "CORRIDOS", label: "Corridos" },
  { value: "INFORMADO", label: "Informado" },
];

const MONTH_OPTIONS = [
  ["01", "Janeiro"],
  ["02", "Fevereiro"],
  ["03", "Março"],
  ["04", "Abril"],
  ["05", "Maio"],
  ["06", "Junho"],
  ["07", "Julho"],
  ["08", "Agosto"],
  ["09", "Setembro"],
  ["10", "Outubro"],
  ["11", "Novembro"],
  ["12", "Dezembro"],
] as const;

const PAGE_SIZE_OPTIONS = [50, 100, 200];

function emptyCreateForm(): CreateForm {
  const today = todayInputValue();
  return {
    tituloObra: "",
    localizacao: "",
    responsavel: "",
    envolvidos: "",
    prioridade: "NORMAL",
    dataProgramadaInicio: today,
    dataProgramadaFim: "",
    dataInicio: today,
    dataFim: today,
    tipoContagemDias: "UTEIS",
    diasInformados: "",
    materialPrevisto: "",
    materialUtilizado: "",
    observacao: "",
  };
}

function emptyStartForm(obra?: Obra): StartForm {
  return {
    dataInicio: todayInputValue(),
    responsavel: safeString(obra?.responsavel),
    envolvidos: safeString(obra?.envolvidos),
    materialUtilizado: safeString(obra?.materialUtilizado),
    observacao: "",
  };
}

function emptyFinishForm(obra?: Obra): FinishForm {
  return {
    dataFim: todayInputValue(),
    tipoContagemDias: "UTEIS",
    diasInformados: safeString(obra?.diasInformados),
    materialUtilizado: safeString(obra?.materialUtilizado),
    observacao: "",
  };
}

function statusBadgeClass(status: unknown) {
  const normalized = normalizeStatus(status);
  if (normalized === "PROGRAMADA") return "bg-primary/10 text-primary border-primary/20";
  if (normalized === "EM ANDAMENTO") return "bg-warning/15 text-warning border-warning/25";
  if (normalized === "CONCLUIDA") return "bg-success/15 text-success border-success/20";
  if (normalized === "CANCELADA") return "bg-destructive/10 text-destructive border-destructive/20";
  return "bg-muted text-muted-foreground border-border";
}

function prioridadeBadgeClass(prioridade: unknown) {
  const normalized = normalizePrioridade(prioridade);
  if (normalized === "URGENTE") return "bg-destructive/10 text-destructive border-destructive/20";
  if (normalized === "ALTA") return "bg-warning/15 text-warning border-warning/25";
  if (normalized === "NORMAL") return "bg-primary/10 text-primary border-primary/20";
  return "bg-muted text-muted-foreground border-border";
}

function actionErrorDescription(error: unknown) {
  const message = error instanceof Error ? error.message : safeString(error, "Falha na comunicação com a API.");
  return `${message} Verifique se o doPost do Apps Script possui as actions registrar_obra, iniciar_obra e concluir_obra.`;
}

function getCreateTitle(mode: CreateMode) {
  if (mode === "PROGRAMADA") return "Nova obra programada";
  if (mode === "EM_ANDAMENTO") return "Lançar obra em andamento";
  return "Lançar obra concluída";
}

function getCreateSuccess(mode: CreateMode) {
  if (mode === "PROGRAMADA") return "Obra programada salva com sucesso.";
  if (mode === "EM_ANDAMENTO") return "Obra em andamento salva com sucesso.";
  return "Obra concluída salva com sucesso.";
}

function makeRegistrarPayload(mode: CreateMode, form: CreateForm): ObraActionPayload {
  const status = mode === "EM_ANDAMENTO" ? "EM ANDAMENTO" : mode;
  const common: ObraActionPayload = {
    action: "registrar_obra",
    status_obra: status,
    titulo_obra: form.tituloObra.trim(),
    localizacao: form.localizacao.trim(),
    responsavel: form.responsavel.trim(),
    envolvidos: form.envolvidos.trim(),
    qtd_envolvidos: countEnvolvidos(form.envolvidos),
    prioridade: form.prioridade,
    observacao: form.observacao.trim(),
  };

  if (mode === "PROGRAMADA") {
    return {
      ...common,
      data_programada_inicio: dateInputToBR(form.dataProgramadaInicio),
      data_programada_fim: dateInputToBR(form.dataProgramadaFim),
      material_previsto: form.materialPrevisto.trim(),
    };
  }

  if (mode === "EM_ANDAMENTO") {
    return {
      ...common,
      data_inicio: dateInputToBR(form.dataInicio),
      material_utilizado: form.materialUtilizado.trim(),
    };
  }

  return {
    ...common,
    data_inicio: dateInputToBR(form.dataInicio),
    data_fim: dateInputToBR(form.dataFim),
    tipo_contagem_dias: form.tipoContagemDias,
    dias_informados: form.tipoContagemDias === "INFORMADO" ? Number(form.diasInformados) : undefined,
    material_utilizado: form.materialUtilizado.trim(),
  };
}

function isCreateValid(mode: CreateMode, form: CreateForm) {
  const requiredCommon = form.tituloObra.trim() && form.localizacao.trim() && form.responsavel.trim() && form.prioridade;
  if (!requiredCommon) return false;
  if (mode === "PROGRAMADA") return Boolean(form.dataProgramadaInicio);
  if (mode === "EM_ANDAMENTO") return Boolean(form.dataInicio);
  if (!form.dataInicio || !form.dataFim || !form.tipoContagemDias) return false;
  if (form.tipoContagemDias === "INFORMADO") return Number(form.diasInformados) > 0;
  return true;
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: typeof Building2;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-destructive/10 text-destructive",
  }[tone];

  return (
    <div className="stat-card flex min-h-[86px] items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-2xl font-bold tabular-nums">{value}</p>
      </div>
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", toneClass)}>
        <Icon className="h-4 w-4" />
      </span>
    </div>
  );
}

function SmallBadge({ children, className }: { children: string; className: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", className)}>
      {children}
    </span>
  );
}

function DetailLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="max-w-[62%] break-words text-right text-xs font-medium">{value || "-"}</span>
    </div>
  );
}

export default function Obras() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [prioridadeFilter, setPrioridadeFilter] = useState("todos");
  const [responsavelFilter, setResponsavelFilter] = useState("todos");
  const [localizacaoFilter, setLocalizacaoFilter] = useState("todos");
  const [monthFilter, setMonthFilter] = useState("todos");
  const [yearFilter, setYearFilter] = useState("todos");
  const [dateStartFilter, setDateStartFilter] = useState("");
  const [dateEndFilter, setDateEndFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [createMode, setCreateMode] = useState<CreateMode | null>(null);
  const [createForm, setCreateForm] = useState<CreateForm>(() => emptyCreateForm());
  const [detailObra, setDetailObra] = useState<Obra | null>(null);
  const [startObra, setStartObra] = useState<Obra | null>(null);
  const [startForm, setStartForm] = useState<StartForm>(() => emptyStartForm());
  const [finishObra, setFinishObra] = useState<Obra | null>(null);
  const [finishForm, setFinishForm] = useState<FinishForm>(() => emptyFinishForm());

  const { data, isError, isFetching, isLoading, refetch } = useQuery({
    queryKey: ["sheet", "obras"],
    queryFn: fetchObras,
    refetchOnWindowFocus: false,
  });

  const obras = safeArray<Obra>(data);

  const responsaveis = useMemo(() => uniqueSorted(obras.map((obra) => obra.responsavel)), [obras]);
  const localizacoes = useMemo(() => uniqueSorted(obras.map((obra) => obra.localizacao)), [obras]);
  const anos = useMemo(() => {
    const current = todayInputValue().slice(0, 4);
    return uniqueSorted([...obras.map((obra) => yearFromDate(primaryObraDate(obra))), current]).reverse();
  }, [obras]);

  const filtered = useMemo(() => {
    const list = safeArray<Obra>(obras);
    const query = normalizeText(debouncedSearch);
    const startLimit = sortableDate(dateStartFilter);
    const endLimit = sortableDate(dateEndFilter);

    return list.filter((obra) => {
      const status = normalizeStatus(obra.statusObra);
      const prioridade = normalizePrioridade(obra.prioridade);
      const baseDate = primaryObraDate(obra);
      const baseSortable = sortableDate(baseDate);

      if (query) {
        const text = [
          obra.tituloObra,
          obra.localizacao,
          obra.responsavel,
          obra.envolvidos,
          obra.materialPrevisto,
          obra.materialUtilizado,
          obra.observacao,
        ].join(" ");
        if (!normalizeText(text).includes(query)) return false;
      }

      if (statusFilter !== "todos" && status !== statusFilter) return false;
      if (prioridadeFilter !== "todos" && prioridade !== prioridadeFilter) return false;
      if (responsavelFilter !== "todos" && safeString(obra.responsavel) !== responsavelFilter) return false;
      if (localizacaoFilter !== "todos" && safeString(obra.localizacao) !== localizacaoFilter) return false;
      if (monthFilter !== "todos" && monthFromDate(baseDate) !== monthFilter) return false;
      if (yearFilter !== "todos" && yearFromDate(baseDate) !== yearFilter) return false;
      if (startLimit && (!baseSortable || baseSortable < startLimit)) return false;
      if (endLimit && (!baseSortable || baseSortable > endLimit)) return false;

      return true;
    });
  }, [
    obras,
    debouncedSearch,
    dateEndFilter,
    dateStartFilter,
    localizacaoFilter,
    monthFilter,
    prioridadeFilter,
    responsavelFilter,
    statusFilter,
    yearFilter,
  ]);

  const kpis = useMemo(() => {
    const today = todayInputValue();
    const currentMonth = today.slice(5, 7);
    const currentYear = today.slice(0, 4);

    return safeArray<Obra>(filtered).reduce(
      (acc, obra) => {
        const status = normalizeStatus(obra.statusObra);
        const prioridade = normalizePrioridade(obra.prioridade);
        const baseDate = primaryObraDate(obra);

        acc.total += 1;
        if (status === "PROGRAMADA") acc.programadas += 1;
        if (status === "EM ANDAMENTO") acc.emAndamento += 1;
        if (status === "CONCLUIDA") acc.concluidas += 1;
        if (prioridade === "ALTA" || prioridade === "URGENTE") acc.alta += 1;
        acc.dias += Number(obra.diasTrabalhados) || 0;
        acc.envolvidos += Number(obra.qtdEnvolvidos) || 0;
        if (monthFromDate(baseDate) === currentMonth && yearFromDate(baseDate) === currentYear) acc.mesAtual += 1;
        return acc;
      },
      { total: 0, programadas: 0, emAndamento: 0, concluidas: 0, alta: 0, dias: 0, envolvidos: 0, mesAtual: 0 },
    );
  }, [filtered]);

  const pagination = useMemo(() => paginateData(filtered, page, pageSize), [filtered, page, pageSize]);
  const pageItems = pagination.pageItems;

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    dateEndFilter,
    dateStartFilter,
    localizacaoFilter,
    monthFilter,
    pageSize,
    prioridadeFilter,
    responsavelFilter,
    statusFilter,
    yearFilter,
  ]);

  const createMutation = useMutation({
    mutationFn: ({ payload }: { mode: CreateMode; payload: ObraActionPayload }) => postObraAction(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sheet", "obras"] });
      toast({ title: getCreateSuccess(variables.mode) });
      setCreateForm(emptyCreateForm());
      setCreateMode(null);
    },
    onError: (error) => {
      toast({ title: "Erro ao salvar obra", description: actionErrorDescription(error), variant: "destructive" });
    },
  });

  const startMutation = useMutation({
    mutationFn: (payload: ObraActionPayload) => postObraAction(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sheet", "obras"] });
      toast({ title: "Obra iniciada com sucesso." });
      setStartObra(null);
      setStartForm(emptyStartForm());
    },
    onError: (error) => {
      toast({ title: "Erro ao iniciar obra", description: actionErrorDescription(error), variant: "destructive" });
    },
  });

  const finishMutation = useMutation({
    mutationFn: (payload: ObraActionPayload) => postObraAction(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sheet", "obras"] });
      toast({ title: "Obra concluída com sucesso." });
      setFinishObra(null);
      setFinishForm(emptyFinishForm());
    },
    onError: (error) => {
      toast({ title: "Erro ao concluir obra", description: actionErrorDescription(error), variant: "destructive" });
    },
  });

  const openCreate = useCallback((mode: CreateMode) => {
    setCreateForm(emptyCreateForm());
    setCreateMode(mode);
  }, []);

  const clearFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("todos");
    setPrioridadeFilter("todos");
    setResponsavelFilter("todos");
    setLocalizacaoFilter("todos");
    setMonthFilter("todos");
    setYearFilter("todos");
    setDateStartFilter("");
    setDateEndFilter("");
  }, []);

  const copyId = useCallback(async (id: string) => {
    const text = safeString(id);
    if (!text) {
      toast({ title: "ID não encontrado", variant: "destructive" });
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "ID da obra copiado." });
    } catch {
      toast({ title: "Não foi possível copiar o ID", description: text, variant: "destructive" });
    }
  }, []);

  const openStart = useCallback((obra: Obra) => {
    setStartForm(emptyStartForm(obra));
    setStartObra(obra);
  }, []);

  const openFinish = useCallback((obra: Obra) => {
    setFinishForm(emptyFinishForm(obra));
    setFinishObra(obra);
  }, []);

  const submitCreate = useCallback(() => {
    if (!createMode || !isCreateValid(createMode, createForm) || createMutation.isPending) return;
    createMutation.mutate({ mode: createMode, payload: makeRegistrarPayload(createMode, createForm) });
  }, [createForm, createMode, createMutation]);

  const submitStart = useCallback(() => {
    if (!startObra?.idObra || !startForm.dataInicio || startMutation.isPending) return;

    startMutation.mutate({
      action: "iniciar_obra",
      id_obra: startObra.idObra,
      data_inicio: dateInputToBR(startForm.dataInicio),
      responsavel: startForm.responsavel.trim(),
      envolvidos: startForm.envolvidos.trim(),
      material_utilizado: startForm.materialUtilizado.trim(),
      observacao: startForm.observacao.trim(),
    });
  }, [startForm, startMutation, startObra]);

  const submitFinish = useCallback(() => {
    if (!finishObra?.idObra || !finishForm.dataFim || finishMutation.isPending) return;
    if (finishForm.tipoContagemDias === "INFORMADO" && !(Number(finishForm.diasInformados) > 0)) return;

    finishMutation.mutate({
      action: "concluir_obra",
      id_obra: finishObra.idObra,
      data_fim: dateInputToBR(finishForm.dataFim),
      tipo_contagem_dias: finishForm.tipoContagemDias,
      dias_informados: finishForm.tipoContagemDias === "INFORMADO" ? Number(finishForm.diasInformados) : undefined,
      material_utilizado: finishForm.materialUtilizado.trim(),
      observacao: finishForm.observacao.trim(),
    });
  }, [finishForm, finishMutation, finishObra]);

  const isFormValid = createMode ? isCreateValid(createMode, createForm) : false;
  const startValid = Boolean(startObra?.idObra && startForm.dataInicio);
  const finishValid = Boolean(
    finishObra?.idObra &&
      finishForm.dataFim &&
      finishForm.tipoContagemDias &&
      (finishForm.tipoContagemDias !== "INFORMADO" || Number(finishForm.diasInformados) > 0),
  );

  const renderActions = (obra: Obra, compact = false) => {
    const status = normalizeStatus(obra.statusObra);
    const canStart = status === "PROGRAMADA";
    const canFinish = status === "PROGRAMADA" || status === "EM ANDAMENTO";
    const iconOnly = compact ? "h-9 flex-1 px-2 text-[11px]" : "h-8 px-2 text-xs";

    return (
      <div className={cn("flex flex-wrap justify-end gap-1.5", compact && "grid grid-cols-2")}>
        <Button type="button" variant="outline" size="sm" className={iconOnly} onClick={() => setDetailObra(obra)}>
          <Eye className="h-3.5 w-3.5" />
          {compact && <span>Ver</span>}
        </Button>
        <Button type="button" variant="outline" size="sm" className={iconOnly} onClick={() => copyId(obra.idObra)}>
          <ClipboardCopy className="h-3.5 w-3.5" />
          {compact && <span>ID</span>}
        </Button>
        {canStart && (
          <Button type="button" variant="outline" size="sm" className={iconOnly} onClick={() => openStart(obra)}>
            <Play className="h-3.5 w-3.5" />
            {compact ? <span>Iniciar</span> : null}
          </Button>
        )}
        {canFinish && (
          <Button type="button" variant="outline" size="sm" className={iconOnly} onClick={() => openFinish(obra)}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            {compact ? <span>Concluir</span> : null}
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          title="Obras / Mão de Obra"
          subtitle={obras.length ? `${filtered.length} de ${obras.length} obras` : "Controle de obras e equipes"}
        />
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <RefreshButton onClick={() => refetch()} isFetching={isFetching} />
          <Button type="button" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => openCreate("PROGRAMADA")}>
            <Plus className="h-3.5 w-3.5" />
            Nova programada
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => openCreate("EM_ANDAMENTO")}>
            <Play className="h-3.5 w-3.5" />
            Em andamento
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => openCreate("CONCLUIDA")}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Concluída
          </Button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        <KpiCard label="Total" value={kpis.total} icon={Building2} />
        <KpiCard label="Programadas" value={kpis.programadas} icon={CalendarDays} />
        <KpiCard label="Em andamento" value={kpis.emAndamento} icon={Hammer} tone="warning" />
        <KpiCard label="Concluídas" value={kpis.concluidas} icon={CheckCircle2} tone="success" />
        <KpiCard label="Prioridade alta" value={kpis.alta} icon={AlertTriangle} tone="danger" />
        <KpiCard label="Dias trabalhados" value={kpis.dias} icon={CalendarDays} />
        <KpiCard label="Envolvidos" value={kpis.envolvidos} icon={Users} />
        <KpiCard label="Mês atual" value={kpis.mesAtual} icon={Building2} />
      </div>

      <div className="stat-card mb-4 space-y-3">
        <div className="grid gap-2 md:grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(140px,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar obra, local, responsável, material..."
              className="h-9 pl-9 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas prioridades</SelectItem>
              {PRIORIDADE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={responsavelFilter} onValueChange={setResponsavelFilter}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos responsáveis</SelectItem>
              {responsaveis.map((responsavel) => (
                <SelectItem key={responsavel} value={responsavel}>
                  {responsavel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2 md:grid-cols-6">
          <Select value={localizacaoFilter} onValueChange={setLocalizacaoFilter}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Localização" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas localizações</SelectItem>
              {localizacoes.map((localizacao) => (
                <SelectItem key={localizacao} value={localizacao}>
                  {localizacao}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos meses</SelectItem>
              {MONTH_OPTIONS.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos anos</SelectItem>
              {anos.map((ano) => (
                <SelectItem key={ano} value={ano}>
                  {ano}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={dateStartFilter} onChange={(event) => setDateStartFilter(event.target.value)} className="h-9 text-sm" />
          <Input type="date" value={dateEndFilter} onChange={(event) => setDateEndFilter(event.target.value)} className="h-9 text-sm" />
          <Button type="button" variant="outline" className="h-9 gap-1.5 text-sm" onClick={clearFilters}>
            <RotateCcw className="h-3.5 w-3.5" />
            Limpar filtros
          </Button>
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {pagination.total ? `${pagination.start + 1}-${pagination.end} de ${pagination.total}` : "Nenhuma obra na seleção"}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Registros</span>
          <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
            <SelectTrigger className="h-8 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((item) => (
            <Skeleton key={item} className="h-16 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="stat-card py-8 text-center">
          <p className="mb-2 text-sm text-destructive">Erro ao carregar obras.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="stat-card py-10 text-center text-sm text-muted-foreground">Nenhuma obra encontrada</div>
      ) : (
        <>
          <div className="stat-card hidden p-0 md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-10 px-3 text-xs">ID</TableHead>
                    <TableHead className="h-10 px-3 text-xs">Título</TableHead>
                    <TableHead className="h-10 px-3 text-xs">Localização</TableHead>
                    <TableHead className="h-10 px-3 text-xs">Responsável</TableHead>
                    <TableHead className="h-10 px-3 text-xs">Prioridade</TableHead>
                    <TableHead className="h-10 px-3 text-xs">Status</TableHead>
                    <TableHead className="h-10 px-3 text-xs">Prog. início</TableHead>
                    <TableHead className="h-10 px-3 text-xs">Início real</TableHead>
                    <TableHead className="h-10 px-3 text-xs">Fim</TableHead>
                    <TableHead className="h-10 px-3 text-xs text-right">Dias</TableHead>
                    <TableHead className="h-10 px-3 text-xs text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((obra, index) => (
                    <TableRow key={`${obra.idObra || "obra"}-${index}`}>
                      <TableCell className="max-w-[120px] truncate p-3 font-mono text-xs">{obra.idObra || "-"}</TableCell>
                      <TableCell className="min-w-[180px] p-3 text-xs font-medium">{obra.tituloObra || "-"}</TableCell>
                      <TableCell className="min-w-[140px] p-3 text-xs">{obra.localizacao || "-"}</TableCell>
                      <TableCell className="min-w-[140px] p-3 text-xs">{obra.responsavel || "-"}</TableCell>
                      <TableCell className="p-3 text-xs">
                        <SmallBadge className={prioridadeBadgeClass(obra.prioridade)}>{prioridadeLabel(obra.prioridade)}</SmallBadge>
                      </TableCell>
                      <TableCell className="p-3 text-xs">
                        <SmallBadge className={statusBadgeClass(obra.statusObra)}>{statusLabel(obra.statusObra)}</SmallBadge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap p-3 text-xs">{formatObraDate(obra.dataProgramadaInicio)}</TableCell>
                      <TableCell className="whitespace-nowrap p-3 text-xs">{formatObraDate(obra.dataInicio)}</TableCell>
                      <TableCell className="whitespace-nowrap p-3 text-xs">{formatObraDate(obra.dataFim)}</TableCell>
                      <TableCell className="p-3 text-right text-xs tabular-nums">{obra.diasTrabalhados || "-"}</TableCell>
                      <TableCell className="p-3">{renderActions(obra)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {pageItems.map((obra, index) => (
              <div key={`${obra.idObra || "obra-mobile"}-${index}`} className="stat-card space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold">{obra.tituloObra || "-"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{obra.localizacao || "-"}</p>
                  </div>
                  <SmallBadge className={statusBadgeClass(obra.statusObra)}>{statusLabel(obra.statusObra)}</SmallBadge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Prioridade</span>
                    <div className="mt-1">
                      <SmallBadge className={prioridadeBadgeClass(obra.prioridade)}>{prioridadeLabel(obra.prioridade)}</SmallBadge>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Responsável</span>
                    <p className="mt-1 font-medium">{obra.responsavel || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data</span>
                    <p className="mt-1 font-medium">{formatObraDate(obra.dataInicio || obra.dataProgramadaInicio)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Dias</span>
                    <p className="mt-1 font-medium tabular-nums">{obra.diasTrabalhados || "-"}</p>
                  </div>
                </div>
                {renderActions(obra, true)}
              </div>
            ))}
          </div>
        </>
      )}

      {filtered.length > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <Button type="button" variant="outline" size="sm" disabled={pagination.safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground">
            Página {pagination.safePage} de {pagination.totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pagination.safePage >= pagination.totalPages}
            onClick={() => setPage((value) => Math.min(pagination.totalPages, value + 1))}
          >
            Próxima
          </Button>
        </div>
      )}

      <Dialog open={!!createMode} onOpenChange={(open) => !open && setCreateMode(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">{createMode ? getCreateTitle(createMode) : "Obra"}</DialogTitle>
            <DialogDescription>Preencha os dados da obra e confirme o lançamento.</DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              submitCreate();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Título da obra *</Label>
                <Input value={createForm.tituloObra} onChange={(event) => setCreateForm((form) => ({ ...form, tituloObra: event.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Localização *</Label>
                <Input value={createForm.localizacao} onChange={(event) => setCreateForm((form) => ({ ...form, localizacao: event.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Responsável *</Label>
                <Input value={createForm.responsavel} onChange={(event) => setCreateForm((form) => ({ ...form, responsavel: event.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Envolvidos</Label>
                <Input value={createForm.envolvidos} onChange={(event) => setCreateForm((form) => ({ ...form, envolvidos: event.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Prioridade *</Label>
                <Select value={createForm.prioridade} onValueChange={(value: ObraPrioridade) => setCreateForm((form) => ({ ...form, prioridade: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORIDADE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {createMode === "PROGRAMADA" && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">Data programada início *</Label>
                    <Input
                      type="date"
                      value={createForm.dataProgramadaInicio}
                      onChange={(event) => setCreateForm((form) => ({ ...form, dataProgramadaInicio: event.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Data programada fim</Label>
                    <Input
                      type="date"
                      value={createForm.dataProgramadaFim}
                      onChange={(event) => setCreateForm((form) => ({ ...form, dataProgramadaFim: event.target.value }))}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Material previsto</Label>
                    <Textarea rows={2} value={createForm.materialPrevisto} onChange={(event) => setCreateForm((form) => ({ ...form, materialPrevisto: event.target.value }))} />
                  </div>
                </>
              )}

              {createMode === "EM_ANDAMENTO" && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">Data início *</Label>
                    <Input type="date" value={createForm.dataInicio} onChange={(event) => setCreateForm((form) => ({ ...form, dataInicio: event.target.value }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Material utilizado</Label>
                    <Textarea rows={2} value={createForm.materialUtilizado} onChange={(event) => setCreateForm((form) => ({ ...form, materialUtilizado: event.target.value }))} />
                  </div>
                </>
              )}

              {createMode === "CONCLUIDA" && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">Data início *</Label>
                    <Input type="date" value={createForm.dataInicio} onChange={(event) => setCreateForm((form) => ({ ...form, dataInicio: event.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Data fim *</Label>
                    <Input type="date" value={createForm.dataFim} onChange={(event) => setCreateForm((form) => ({ ...form, dataFim: event.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Tipo de contagem *</Label>
                    <Select
                      value={createForm.tipoContagemDias}
                      onValueChange={(value: TipoContagemDias) => setCreateForm((form) => ({ ...form, tipoContagemDias: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTAGEM_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {createForm.tipoContagemDias === "INFORMADO" && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Dias informados *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={createForm.diasInformados}
                        onChange={(event) => setCreateForm((form) => ({ ...form, diasInformados: event.target.value }))}
                      />
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Material utilizado</Label>
                    <Textarea rows={2} value={createForm.materialUtilizado} onChange={(event) => setCreateForm((form) => ({ ...form, materialUtilizado: event.target.value }))} />
                  </div>
                </>
              )}

              <div className="sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Observação</Label>
                <Textarea rows={3} value={createForm.observacao} onChange={(event) => setCreateForm((form) => ({ ...form, observacao: event.target.value }))} />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setCreateMode(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!isFormValid || createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {createMode === "PROGRAMADA" ? "Salvar obra programada" : "Salvar obra"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!startObra} onOpenChange={(open) => !open && setStartObra(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Iniciar obra</DialogTitle>
            <DialogDescription>{startObra?.tituloObra || startObra?.idObra || "Obra programada"}</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              submitStart();
            }}
          >
            <div>
              <Label className="text-xs text-muted-foreground">Data início *</Label>
              <Input type="date" value={startForm.dataInicio} onChange={(event) => setStartForm((form) => ({ ...form, dataInicio: event.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Responsável</Label>
              <Input value={startForm.responsavel} onChange={(event) => setStartForm((form) => ({ ...form, responsavel: event.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Envolvidos</Label>
              <Input value={startForm.envolvidos} onChange={(event) => setStartForm((form) => ({ ...form, envolvidos: event.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Material utilizado</Label>
              <Textarea rows={2} value={startForm.materialUtilizado} onChange={(event) => setStartForm((form) => ({ ...form, materialUtilizado: event.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Observação</Label>
              <Textarea rows={3} value={startForm.observacao} onChange={(event) => setStartForm((form) => ({ ...form, observacao: event.target.value }))} />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setStartObra(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!startValid || startMutation.isPending}>
                {startMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Iniciar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!finishObra} onOpenChange={(open) => !open && setFinishObra(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Concluir obra</DialogTitle>
            <DialogDescription>{finishObra?.tituloObra || finishObra?.idObra || "Obra"}</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              submitFinish();
            }}
          >
            <div>
              <Label className="text-xs text-muted-foreground">Data fim *</Label>
              <Input type="date" value={finishForm.dataFim} onChange={(event) => setFinishForm((form) => ({ ...form, dataFim: event.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Tipo de contagem *</Label>
              <Select value={finishForm.tipoContagemDias} onValueChange={(value: TipoContagemDias) => setFinishForm((form) => ({ ...form, tipoContagemDias: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTAGEM_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {finishForm.tipoContagemDias === "INFORMADO" && (
              <div>
                <Label className="text-xs text-muted-foreground">Dias informados *</Label>
                <Input
                  type="number"
                  min="1"
                  value={finishForm.diasInformados}
                  onChange={(event) => setFinishForm((form) => ({ ...form, diasInformados: event.target.value }))}
                />
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">Material utilizado</Label>
              <Textarea rows={2} value={finishForm.materialUtilizado} onChange={(event) => setFinishForm((form) => ({ ...form, materialUtilizado: event.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Observação</Label>
              <Textarea rows={3} value={finishForm.observacao} onChange={(event) => setFinishForm((form) => ({ ...form, observacao: event.target.value }))} />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setFinishObra(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!finishValid || finishMutation.isPending}>
                {finishMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Concluir
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailObra} onOpenChange={(open) => !open && setDetailObra(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Detalhes da obra</DialogTitle>
            <DialogDescription>{detailObra?.tituloObra || detailObra?.idObra || "Registro de obra"}</DialogDescription>
          </DialogHeader>

          {detailObra && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <SmallBadge className={statusBadgeClass(detailObra.statusObra)}>{statusLabel(detailObra.statusObra)}</SmallBadge>
                <SmallBadge className={prioridadeBadgeClass(detailObra.prioridade)}>{prioridadeLabel(detailObra.prioridade)}</SmallBadge>
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => copyId(detailObra.idObra)}>
                  <ClipboardCopy className="h-3.5 w-3.5" />
                  Copiar ID
                </Button>
              </div>

              <div className="grid gap-x-6 sm:grid-cols-2">
                <DetailLine label="ID" value={detailObra.idObra} />
                <DetailLine label="Título" value={detailObra.tituloObra} />
                <DetailLine label="Localização" value={detailObra.localizacao} />
                <DetailLine label="Responsável" value={detailObra.responsavel} />
                <DetailLine label="Envolvidos" value={detailObra.envolvidos} />
                <DetailLine label="Quantidade de envolvidos" value={detailObra.qtdEnvolvidos || "-"} />
                <DetailLine label="Prioridade" value={prioridadeLabel(detailObra.prioridade)} />
                <DetailLine label="Status" value={statusLabel(detailObra.statusObra)} />
                <DetailLine label="Data programada início" value={formatObraDate(detailObra.dataProgramadaInicio)} />
                <DetailLine label="Data programada fim" value={formatObraDate(detailObra.dataProgramadaFim)} />
                <DetailLine label="Data início real" value={formatObraDate(detailObra.dataInicio)} />
                <DetailLine label="Data fim" value={formatObraDate(detailObra.dataFim)} />
                <DetailLine label="Tipo de contagem" value={detailObra.tipoContagemDias} />
                <DetailLine label="Dias informados" value={detailObra.diasInformados || "-"} />
                <DetailLine label="Dias trabalhados" value={detailObra.diasTrabalhados || "-"} />
                <DetailLine label="Material previsto" value={detailObra.materialPrevisto} />
                <DetailLine label="Material utilizado" value={detailObra.materialUtilizado} />
                <DetailLine label="Observação" value={detailObra.observacao} />
                <DetailLine label="Cadastrado por" value={detailObra.cadastradoPor} />
                <DetailLine label="Data cadastro" value={formatObraDate(detailObra.dataCadastro)} />
                <DetailLine label="Alterado por" value={detailObra.alteradoPor} />
                <DetailLine label="Data alteração" value={formatObraDate(detailObra.dataAlteracao)} />
                <DetailLine label="Ativo" value={detailObra.ativo} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
