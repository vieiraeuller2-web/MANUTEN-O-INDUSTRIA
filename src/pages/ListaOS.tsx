import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import RefreshButton from "@/components/RefreshButton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePaginatedOS, type OSFilters } from "@/hooks/use-paginated-os";
import { useAuth } from "@/contexts/AuthContext";
import { calcularTempoOS, formatDataBr, formatHoraBr } from "@/lib/time-helpers";
import { useDebounce } from "@/hooks/use-debounce";
import { AlertCircle, Eye, Filter, FilterX, Loader2, Plus, Search } from "lucide-react";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border py-1.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs text-right">{value || "—"}</span>
    </div>
  );
}

export default function ListaOS() {
  const { user } = useAuth();
  const userId = user?.login || "guest";
  const unidade = user?.unidade || "";

  const [search, setSearch] = useState("");
  const [filtroSetor, setFiltroSetor] = useState("");
  const [filtroArea, setFiltroArea] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroResp, setFiltroResp] = useState("");
  const [filtroDataDe, setFiltroDataDe] = useState("");
  const [filtroDataAte, setFiltroDataAte] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);

  const dSearch = useDebounce(search, 400);
  const dResp = useDebounce(filtroResp, 400);
  const dSetor = useDebounce(filtroSetor, 400);
  const dArea = useDebounce(filtroArea, 400);
  const dTipo = useDebounce(filtroTipo, 400);

  const filters: OSFilters = useMemo(
    () => ({
      busca: dSearch || undefined,
      filtro_setor: dSetor || undefined,
      filtro_area: dArea || undefined,
      filtro_tipo: dTipo || undefined,
      filtro_responsavel: dResp || undefined,
      data_de: filtroDataDe || undefined,
      data_ate: filtroDataAte || undefined,
    }),
    [dSearch, dSetor, dArea, dTipo, dResp, filtroDataDe, filtroDataAte]
  );

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    allItems,
    totalEstimate,
  } = usePaginatedOS(userId, unidade, filters);

  const hasFilters = !!(
    search ||
    filtroResp ||
    filtroSetor ||
    filtroArea ||
    filtroTipo ||
    filtroDataDe ||
    filtroDataAte
  );

  const apiErrorMessage = error instanceof Error ? error.message : "Não foi possível carregar os dados.";

  const limpar = useCallback(() => {
    setSearch("");
    setFiltroResp("");
    setFiltroSetor("");
    setFiltroArea("");
    setFiltroTipo("");
    setFiltroDataDe("");
    setFiltroDataAte("");
  }, []);

  return (
    <div className="page-container max-w-6xl">
      <div className="flex items-start justify-between mb-4 gap-3">
        <PageHeader
          title="Histórico de OS"
          subtitle={
            isLoading
              ? "Carregando registros..."
              : `Exibindo ${allItems.length} de ~${totalEstimate} registros`
          }
        />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <RefreshButton onClick={() => refetch()} isFetching={isFetching && !isFetchingNextPage} label="Atualizar dados" />
          <Button asChild size="sm" className="gap-2">
            <Link to="/os/nova">
              <Plus className="h-4 w-4" /> Registrar OS
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar OS, equipamento ou observações..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
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
        <div className="stat-card mb-4 space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <Input placeholder="Setor" value={filtroSetor} onChange={(event) => setFiltroSetor(event.target.value)} />
            <Input placeholder="Área" value={filtroArea} onChange={(event) => setFiltroArea(event.target.value)} />
            <Input placeholder="Tipo" value={filtroTipo} onChange={(event) => setFiltroTipo(event.target.value)} />
            <Input placeholder="Responsável" value={filtroResp} onChange={(event) => setFiltroResp(event.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input type="date" value={filtroDataDe} onChange={(event) => setFiltroDataDe(event.target.value)} />
            <Input type="date" value={filtroDataAte} onChange={(event) => setFiltroDataAte(event.target.value)} />
            <Button type="button" variant="ghost" onClick={limpar} disabled={!hasFilters} className="gap-2">
              <FilterX className="h-4 w-4" /> Limpar filtros
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mb-2" />
          <p className="text-sm">Carregando dados...</p>
        </div>
      ) : isError ? (
        <div className="stat-card border border-destructive/40 bg-destructive/5 text-center py-8">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm font-medium text-destructive mb-3">{apiErrorMessage}</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>Tentar novamente</Button>
        </div>
      ) : allItems.length === 0 ? (
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
                {allItems.map((os: any, index: number) => {
                  const key = os.id_os || os.row_ref || `idx-${index}`;
                  return (
                    <TableRow key={key}>
                      <TableCell className="font-mono text-xs">{os.id_os || os.numero_os || "—"}</TableCell>
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
                        {formatDataBr(os.data_inicio)} {formatHoraBr(os.hora_inicio)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button type="button" size="sm" variant="ghost" onClick={() => setDetail(os)} className="gap-1">
                          <Eye className="h-4 w-4" /> Ver detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-2">
            {allItems.map((os: any, index: number) => {
              const key = os.id_os || os.row_ref || `idx-${index}`;
              return (
                <div key={key} className="stat-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-mono text-muted-foreground">
                        {os.id_os || os.numero_os || "—"}
                      </p>
                      <p className="text-sm font-semibold truncate">{os.equipamento || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{os.responsavel || "—"}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                      {os.tipo || "—"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{formatDataBr(os.data_inicio)}</span>
                    <Button type="button" size="sm" variant="outline" onClick={() => setDetail(os)} className="h-8 gap-1">
                      <Eye className="h-3.5 w-3.5" /> Ver detalhes
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {hasNextPage && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-full sm:w-auto"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando mais...
                  </>
                ) : (
                  "Carregar mais registros"
                )}
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
              <DetailRow label="OS" value={detail.numero_os || detail.id_os} />
              <DetailRow label="Equipamento" value={detail.equipamento} />
              <DetailRow label="Setor" value={detail.setor} />
              <DetailRow label="Área" value={detail.area} />
              <DetailRow label="Responsável" value={detail.responsavel} />
              <DetailRow label="Tipo" value={detail.tipo} />
              <DetailRow label="Data do serviço" value={formatDataBr(detail.data_inicio)} />
              <DetailRow label="Hora início" value={formatHoraBr(detail.hora_inicio)} />
              <DetailRow label="Data fim" value={formatDataBr(detail.data_conclusao || detail.data_fim)} />
              <DetailRow label="Hora fim" value={formatHoraBr(detail.hora_conclusao || detail.hora_fim)} />
              <DetailRow label="Horímetro" value={detail.horimetro} />
              <DetailRow label="Tempo do serviço" value={calcularTempoOS(detail.data_inicio, detail.hora_inicio, detail.data_conclusao || detail.data_fim, detail.hora_conclusao || detail.hora_fim)} />
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
