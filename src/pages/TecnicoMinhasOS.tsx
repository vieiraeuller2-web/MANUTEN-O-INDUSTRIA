import { useMemo, useState } from "react";
import { ClipboardList, Filter, Loader2, RefreshCw, Wrench } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useMinhasOS } from "@/hooks/use-tecnico";
import { formatDataBr, formatHoraBr } from "@/lib/time-helpers";

export default function TecnicoMinhasOS() {
  const [equipamento, setEquipamento] = useState("");
  const [tipo, setTipo] = useState("");
  const [status, setStatus] = useState("");

  const query = useMinhasOS();
  const lista = query.data?.os ?? [];

  const filtradas = useMemo(() => {
    const eq = equipamento.trim().toLowerCase();
    const tp = tipo.trim().toLowerCase();
    const st = status.trim().toLowerCase();

    return lista.filter((os) => {
      if (eq && !os.equipamento.toLowerCase().includes(eq)) return false;
      if (tp && !os.tipo.toLowerCase().includes(tp)) return false;
      if (st && !os.status.toLowerCase().includes(st)) return false;
      return true;
    });
  }, [lista, equipamento, tipo, status]);

  const colaborador = query.data?.colaborador?.nome || "";

  return (
    <div className="page-container max-w-3xl pb-24">
      <div className="flex items-start justify-between gap-3">
        <PageHeader
          title="Minhas OS"
          subtitle={colaborador ? `Ordens de serviço de ${colaborador}` : "Suas ordens de serviço"}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          aria-label="Atualizar minhas OS"
        >
          {query.isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Filtros rápidos
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              placeholder="Equipamento"
              value={equipamento}
              onChange={(e) => setEquipamento(e.target.value)}
            />
            <Input
              placeholder="Tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            />
            <Input
              placeholder="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {query.isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mb-2 h-6 w-6 animate-spin" />
          <p className="text-sm">Carregando suas OS...</p>
        </div>
      ) : query.isError ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-6 text-center">
            <p className="text-sm font-medium text-destructive">
              {query.error instanceof Error
                ? query.error.message
                : "Não foi possível carregar suas OS."}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => query.refetch()}
            >
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : filtradas.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <ClipboardList className="mx-auto mb-3 h-8 w-8" />
            <p className="text-sm">Nenhuma OS encontrada neste recorte.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Exibindo {filtradas.length} de {query.data?.total ?? filtradas.length} OS
          </div>

          {filtradas.map((os) => (
            <Card key={os.id_os}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-mono text-muted-foreground">
                      {os.id_os || "—"}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Wrench className="h-4 w-4 shrink-0 text-primary" />
                      <p className="truncate text-base font-semibold">
                        {os.equipamento || "—"}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase text-primary">
                    {os.status || os.tipo || "—"}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Tipo</p>
                    <p className="font-medium">{os.tipo || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Setor / Área</p>
                    <p className="font-medium">
                      {[os.setor, os.area].filter(Boolean).join(" / ") || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Início</p>
                    <p className="font-medium">
                      {formatDataBr(os.data_inicio)} {formatHoraBr(os.hora_inicio)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Conclusão</p>
                    <p className="font-medium">
                      {os.data_conclusao
                        ? `${formatDataBr(os.data_conclusao)} ${formatHoraBr(
                            os.hora_conclusao
                          )}`
                        : "Em aberto"}
                    </p>
                  </div>
                </div>

                {os.observacoes && (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="text-[11px] text-muted-foreground">Observações</p>
                    <p className="mt-1 whitespace-pre-wrap text-xs">
                      {os.observacoes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
