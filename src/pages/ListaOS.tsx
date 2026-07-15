import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import RefreshButton from "@/components/RefreshButton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type SheetOS } from "@/lib/sheets-api";
import { useRefreshSheetOS, useSheetOS } from "@/hooks/use-sheet-os";
import { calcularTempoOS, formatDataBr, formatHoraBr, parseDataHoraLocal } from "@/lib/time-helpers";
import { useDebounce } from "@/hooks/use-debounce";
import { normalizeText, paginateData, safeArray, safeString, textIncludes } from "@/lib/data-helpers";
import { AlertCircle, ChevronLeft, ChevronRight, Eye, Filter, FilterX, Loader2, Plus, Search } from "lucide-react";

const PAGE_SIZES = [50, 100, 200];

interface NormalizedOS {
  original: SheetOS;
  key: string;
  numero: string;
  equipamento: string;
  setor: string;
  area: string;
  responsavel: string;
  tipo: string;
  dataInicio: string;
  horaInicio: string;
  dataFim: string;
  horaFim: string;
  horimetro: string;
  observacoes: string;
  dataInicioIso: string;
  sortTime: number;
}

function osField(os: SheetOS, field: keyof SheetOS, ...alts: string[]): string {
  if (!os || typeof os !== "object") return "";

  const direct = safeString((os as any)[field]);
  if (direct) return direct;

  for (const key of alts) {
    const exact = safeString((os as any)[key]);
    if (exact) return exact;
  }

  const lower: Record<string, unknown> = {};
  Object.keys(os).forEach((key) => {
    lower[normalizeText(key)] = (os as any)[key];
  });

  for (const key of [String(field), ...alts]) {
    const value = safeString(lower[normalizeText(key)]);
    if (value) return value;
  }

  return "";
}

function dataToIso(value: unknown): string {
  const br = formatDataBr(value);
  const match = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}

function normalizeOS(os: SheetOS, index: number): NormalizedOS {
  const numero = osField(os, "numero_os" as keyof SheetOS, "Numero OS", "Número OS", "Nº OS", "N° OS", "OS", "ID", "id");
  const equipamento = osField(os, "equipamento", "Equipamento", "EQUIPAMENTO");
  const setor = osField(os, "setor", "Setor", "SETOR");
  const area = osField(os, "area", "Área", "Area", "AREA");
  const responsavel = osField(os, "responsavel", "Responsável", "Responsavel", "RESPONSAVEL");
  const tipo = osField(os, "tipo", "Tipo", "TIPO");
  const dataInicio = osField(os, "data_inicio", "Data Início", "Data Inicio", "Data inicial", "DATA_INICIO");
  const horaInicio = osField(os, "hora_inicio", "Hora Início", "Hora Inicio", "HORA_INICIO");
  const dataFim = osField(os, "data_fim", "Data Fim", "Data Conclusão", "DATA_FIM");
  const horaFim = osField(os, "hora_fim", "Hora Fim", "Hora Conclusão", "HORA_FIM");
  const horimetro = osField(os, "horimetro", "Horímetro", "Horimetro", "HORIMETRO");
  const observacoes = osField(os, "observacoes", "Observações", "OBSERVACOES");
  const sortTime = parseDataHoraLocal(dataInicio, horaInicio || "00:00")?.getTime() ?? -Infinity;

  return {
    original: os,
    key: `${numero || "sem-numero"}-${equipamento}-${dataInicio}-${horaInicio}-${index}`,
    numero,
    equipamento,
    setor,
    area,
    responsavel,
    tipo,
    dataInicio,
    horaInicio,
    dataFim,
    horaFim,
    horimetro,
    observacoes,
    dataInicioIso: dataToIso(dataInicio),
    sortTime,
  };
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border py-1.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs text-right">{value || "—"}</span>
    </div>
  );
}

export default function ListaOS() {
  const [search, setSearch] = useState("");
  const [filtroSetor, setFiltroSetor] = useState("");
  const [filtroArea, setFiltroArea] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroResp, setFiltroResp] = useState("");
  const [filtroDataDe, setFiltroDataDe] = useState("");
  const [filtroDataAte, setFiltroDataAte] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [detail, setDetail] = useState<NormalizedOS | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const dSearch = useDebounce(search, 350);
  const dResp = useDebounce(filtroResp, 350);
  const dSetor = useDebounce(filtroSetor, 350);
  const dArea = useDebounce(filtroArea, 350);
  const dTipo = useDebounce(filtroTipo, 350);

  const { data: ordens, isLoading, isError, error, refetch, isFetching } = useSheetOS();
  const refresh = useRefreshSheetOS();
  const listaSegura = safeArray<SheetOS>(ordens);
  const totalBanco = listaSegura.length;

  const normalized = useMemo(
    () => listaSegura.map((os, index) => normalizeOS(os, index)),
    [listaSegura],
  );

  const { filtered, filterError } = useMemo(() => {
    try {
      const rows = normalized
        .filter((os) => {
          if (dSearch && !textIncludes(`${os.numero} ${os.equipamento} ${os.observacoes}`, dSearch)) return false;
          if (dSetor && !textIncludes(os.setor, dSetor)) return false;
          if (dArea && !textIncludes(os.area, dArea)) return false;
          if (dTipo && !textIncludes(os.tipo, dTipo)) return false;
          if (dResp && !textIncludes(os.responsavel, dResp)) return false;
          if (filtroDataDe && (!os.dataInicioIso || os.dataInicioIso < filtroDataDe)) return false;
          if (filtroDataAte && (!os.dataInicioIso || os.dataInicioIso > filtroDataAte)) return false;
          return true;
        })
        .sort((a, b) => b.sortTime - a.sortTime);

      return { filtered: rows, filterError: "" };
    } catch (err) {
      console.error("Erro ao aplicar filtros de OS:", err);
      return {
        filtered: [] as NormalizedOS[],
        filterError: "Erro ao carregar esta tela. Atualize a página ou limpe os filtros.",
      };
    }
  }, [normalized, dSearch, dSetor, dArea, dTipo, dResp, filtroDataDe, filtroDataAte]);

  const pagination = useMemo(() => paginateData(filtered, page, pageSize), [filtered, page, pageSize]);
  const totalFiltered = filtered.length;
  const hasFilters = !!(search || filtroResp || filtroSetor || filtroArea || filtroTipo || filtroDataDe || filtroDataAte);
  const apiErrorMessage = error instanceof Error ? error.message : "Não foi possível carregar os dados.";

  const resetPage = useCallback(() => setPage(1), []);

  const limpar = useCallback(() => {
    setSearch("");
    setFiltroResp("");
    setFiltroSetor("");
    setFiltroArea("");
    setFiltroTipo("");
    setFiltroDataDe("");
    setFiltroDataAte("");
    setPage(1);
  }, []);

  const handlePageSize = useCallback((value: string) => {
    setPageSize(Number(value));
    setPage(1);
  }, []);

  const startLabel = totalFiltered === 0 ? 0 : pagination.start + 1;

  return (
    <div className="page-container max-w-6xl">
      <div className="flex items-start justify-between mb-4 gap-3">
        <PageHeader
          title="Histórico de OS"
          subtitle={isLoading ? "Carregando registros..." : `Exibindo ${startLabel}-${pagination.end} de ${totalFiltered} registros filtrados`}
        />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <RefreshButton onClick={refresh} isFetching={isFetching} label="Atualizar dados" />
          <Button asChild size="sm" className="gap-2">
            <Link to="/os/nova">
              <Plus className="h-4 w-4" /> Registrar OS
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Total no banco: {totalBanco} OS</span>
        {isFetching && !isLoading && <span>Atualizando dados...</span>}
      </div>

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar OS, equipamento ou observações..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetPage();
            }}
            className="pl-9"
          />
        </div>
        <Button
          type="button"
          variant={showFilters ? "default" : "outline"}
          size="icon"
          onClick={() => setShowFilters((value) => !value)}
          aria-label="Alternar filtros"
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {showFilters && (
        <div className="stat-card mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <Input placeholder="Setor" value={filtroSetor} onChange={(event) => { setFiltroSetor(event.target.value); resetPage(); }} />
            <Input placeholder="Área" value={filtroArea} onChange={(event) => { setFiltroArea(event.target.value); resetPage(); }} />
            <Input placeholder="Tipo" value={filtroTipo} onChange={(event) => { setFiltroTipo(event.target.value); resetPage(); }} />
            <Input placeholder="Responsável" value={filtroResp} onChange={(event) => { setFiltroResp(event.target.value); resetPage(); }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input type="date" value={filtroDataDe} onChange={(event) => { setFiltroDataDe(event.target.value); resetPage(); }} />
            <Input type="date" value={filtroDataAte} onChange={(event) => { setFiltroDataAte(event.target.value); resetPage(); }} />
            <Button type="button" variant="ghost" onClick={limpar} disabled={!hasFilters} className="gap-2">
              <FilterX className="h-4 w-4" /> Limpar filtros
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mb-2" />
          <p className="text-sm">Carregando dados da planilha...</p>
        </div>
      ) : isError ? (
        <div className="stat-card border border-destructive/40 bg-destructive/5 text-center py-8">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm font-medium text-destructive mb-3">{apiErrorMessage}</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>Tentar novamente</Button>
        </div>
      ) : filterError ? (
        <div className="stat-card border border-destructive/40 bg-destructive/5 text-center py-8">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm font-medium text-destructive mb-3">{filterError}</p>
          <Button size="sm" variant="outline" onClick={limpar}>Limpar filtros</Button>
        </div>
      ) : totalFiltered === 0 ? (
        <div className="stat-card text-center py-12 text-muted-foreground">
          <p className="text-sm">Nenhum registro de OS encontrado.</p>
          {hasFilters && (
            <Button size="sm" variant="ghost" onClick={limpar} className="mt-3 gap-2">
              <FilterX className="h-4 w-4" /> Limpar filtros
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              Exibindo {startLabel}-{pagination.end} de {totalFiltered} registros filtrados
            </span>
            <div className="flex items-center gap-2">
              <span>Por página</span>
              <Select value={String(pageSize)} onValueChange={handlePageSize}>
                <SelectTrigger className="h-8 w-[86px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="hidden md:block rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">OS</TableHead>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Setor/Área</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.pageItems.map((os, index) => (
                  <TableRow key={os.key}>
                    <TableCell className="font-mono text-xs">{os.numero || `#${pagination.start + index + 1}`}</TableCell>
                    <TableCell className="font-medium max-w-[240px] truncate">{os.equipamento || "—"}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{os.responsavel || "—"}</TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                        {os.tipo || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[180px] truncate">
                      {[os.setor, os.area].filter(Boolean).join(" / ") || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDataBr(os.dataInicio)} {formatHoraBr(os.horaInicio)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button type="button" size="sm" variant="ghost" onClick={() => setDetail(os)} className="gap-1">
                        <Eye className="h-4 w-4" /> Ver detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-2">
            {pagination.pageItems.map((os, index) => (
              <div key={os.key} className="stat-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-mono text-muted-foreground">
                      {os.numero || `Registro #${pagination.start + index + 1}`}
                    </p>
                    <p className="text-sm font-semibold truncate">{os.equipamento || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{os.responsavel || "—"}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                    {os.tipo || "—"}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{formatDataBr(os.dataInicio)}</span>
                  <Button type="button" size="sm" variant="outline" onClick={() => setDetail(os)} className="h-8 gap-1">
                    <Eye className="h-3.5 w-3.5" /> Ver detalhes
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.safePage === 1}
                onClick={() => setPage(pagination.safePage - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <span className="text-xs text-muted-foreground">
                Página {pagination.safePage} de {pagination.totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.safePage === pagination.totalPages}
                onClick={() => setPage(pagination.safePage + 1)}
              >
                Próxima <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Detalhes do registro</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="text-sm space-y-1">
              <DetailRow label="OS" value={detail.numero} />
              <DetailRow label="Equipamento" value={detail.equipamento} />
              <DetailRow label="Setor" value={detail.setor} />
              <DetailRow label="Área" value={detail.area} />
              <DetailRow label="Responsável" value={detail.responsavel} />
              <DetailRow label="Tipo" value={detail.tipo} />
              <DetailRow label="Data do serviço" value={formatDataBr(detail.dataInicio)} />
              <DetailRow label="Hora início" value={formatHoraBr(detail.horaInicio)} />
              <DetailRow label="Data fim" value={formatDataBr(detail.dataFim)} />
              <DetailRow label="Hora fim" value={formatHoraBr(detail.horaFim)} />
              <DetailRow label="Horímetro" value={detail.horimetro} />
              <DetailRow label="Tempo do serviço" value={calcularTempoOS(detail.dataInicio, detail.horaInicio, detail.dataFim, detail.horaFim)} />
              {detail.observacoes && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-1">Observações</p>
                  <p className="text-xs whitespace-pre-wrap">{detail.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
