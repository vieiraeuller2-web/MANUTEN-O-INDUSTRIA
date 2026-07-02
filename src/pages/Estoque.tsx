import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/PageHeader";
import RefreshButton from "@/components/RefreshButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { paginateData, safeArray, safeString, textIncludes } from "@/lib/data-helpers";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzz1dTU7HVTScVtb37rxAqSR7X0OQmUiZcfvePwGkWM2LaKx1JRSwcEDKnRPMJBPxS7mw/exec?sheet=estoque";

type Item = Record<string, unknown>;

function getField(item: Item, ...keys: string[]): string {
  if (!item || typeof item !== "object") return "";
  for (const key of keys) {
    const value = safeString(item[key]);
    if (value) return value;
  }
  const lower: Record<string, unknown> = {};
  Object.keys(item).forEach((key) => {
    lower[key.toLowerCase()] = item[key];
  });
  for (const key of keys) {
    const value = safeString(lower[key.toLowerCase()]);
    if (value) return value;
  }
  return "";
}

async function fetchEstoque(): Promise<Item[]> {
  const res = await fetch(ENDPOINT, { method: "GET" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const json = await res.json();
  if (!json?.success || !Array.isArray(json.data)) throw new Error("Resposta inválida");
  return json.data as Item[];
}

export default function Estoque() {
  const [filtroCodigo, setFiltroCodigo] = useState("");
  const [filtroDesc, setFiltroDesc] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["estoque"],
    queryFn: fetchEstoque,
    refetchOnWindowFocus: false,
  });

  const items = safeArray<Item>(data);
  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const codigo = getField(item, "CODIGO", "codigo", "Codigo", "COD");
        const descricao = getField(item, "DESCRICAO", "descricao", "Descricao", "DESCRIÇÃO", "descrição");
        return textIncludes(codigo, filtroCodigo) && textIncludes(descricao, filtroDesc);
      }),
    [items, filtroCodigo, filtroDesc],
  );
  const pagination = useMemo(() => paginateData(filtered, page, pageSize), [filtered, page, pageSize]);
  const startLabel = filtered.length === 0 ? 0 : pagination.start + 1;

  return (
    <div className="page-container max-w-6xl">
      <div className="flex items-center justify-between mb-4 gap-2">
        <PageHeader
          title="Estoque"
          subtitle={data ? `Exibindo ${startLabel}-${pagination.end} de ${filtered.length} itens filtrados · Total: ${items.length}` : undefined}
        />
        <RefreshButton
          onClick={() => refetch()}
          isFetching={isFetching}
          label="Atualizar estoque"
        />
      </div>

      <div className="stat-card mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            placeholder="Filtrar por código"
            value={filtroCodigo}
            onChange={(event) => {
              setFiltroCodigo(event.target.value);
              setPage(1);
            }}
            className="h-9 text-sm"
          />
          <Input
            placeholder="Filtrar por descrição"
            value={filtroDesc}
            onChange={(event) => {
              setFiltroDesc(event.target.value);
              setPage(1);
            }}
            className="h-9 text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((item) => (
            <Skeleton key={item} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-center text-sm text-[hsl(var(--overdue))] py-12">
          Erro ao carregar estoque
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">
          Nenhum item encontrado
        </p>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Exibindo {startLabel}-{pagination.end} de {filtered.length}</span>
            <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}>
              <SelectTrigger className="h-8 w-[88px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="stat-card p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-10 px-3 text-xs">Código</TableHead>
                  <TableHead className="h-10 px-3 text-xs">Descrição</TableHead>
                  <TableHead className="h-10 px-3 text-xs text-right">Saldo atual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.pageItems.map((item, index) => (
                  <TableRow key={`${getField(item, "CODIGO", "codigo", "Codigo", "COD")}-${pagination.start + index}`}>
                    <TableCell className="p-3 text-sm font-mono">
                      {getField(item, "CODIGO", "codigo", "Codigo", "COD")}
                    </TableCell>
                    <TableCell className="p-3 text-sm">
                      {getField(item, "DESCRICAO", "descricao", "Descricao", "DESCRIÇÃO", "descrição")}
                    </TableCell>
                    <TableCell className="p-3 text-sm text-right font-medium">
                      {getField(item, "SALDO_ATUAL", "saldo_atual", "Saldo_Atual", "SALDO")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 gap-2">
              <Button size="sm" variant="outline" disabled={pagination.safePage === 1} onClick={() => setPage(pagination.safePage - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <span className="text-xs text-muted-foreground">Página {pagination.safePage} de {pagination.totalPages}</span>
              <Button size="sm" variant="outline" disabled={pagination.safePage === pagination.totalPages} onClick={() => setPage(pagination.safePage + 1)}>
                Próxima <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
