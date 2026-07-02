import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/PageHeader";
import RefreshButton from "@/components/RefreshButton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Plus, Loader2, X, Eye } from "lucide-react";
import { fetchSheet, createSheetRow, getField, formatSheetDate, todayISO, nowISO, type SheetRow } from "@/lib/sheets-external";
import { safeArray } from "@/lib/data-helpers";

const SHEET = "servicos_externos";
const STATUS_OPTIONS = ["ENVIADO", "EM SERVICO", "AGUARDANDO RETORNO", "RETORNADO", "CANCELADO"] as const;

const emptyForm = {
  DATA_ENVIO: todayISO(),
  EQUIPAMENTO: "",
  POTENCIA_ESPECIFICACAO: "",
  APLICACAO: "",
  EMPRESA: "",
  DESCRICAO_SERVICO: "",
  NF_RELACIONADA: "",
  STATUS: "ENVIADO" as string,
  DATA_RETORNO: "",
  OBSERVACAO: "",
};

function statusCls(s: string) {
  const v = s.toUpperCase();
  if (v === "RETORNADO") return "bg-success/15 text-success";
  if (v === "CANCELADO") return "bg-muted text-muted-foreground";
  if (v === "AGUARDANDO RETORNO") return "bg-warning/15 text-warning";
  if (v === "EM SERVICO") return "bg-primary/15 text-primary";
  return "bg-accent/30 text-foreground";
}

export default function ServicosExternos() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [detail, setDetail] = useState<SheetRow | null>(null);

  const [fEmpresa, setFEmpresa] = useState("");
  const [fEquip, setFEquip] = useState("");
  const [fStatus, setFStatus] = useState("todos");
  const [fNF, setFNF] = useState("");

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["sheet", SHEET],
    queryFn: () => fetchSheet(SHEET),
    refetchOnWindowFocus: false,
  });

  const items = safeArray<SheetRow>(data);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const emp = getField(it, "EMPRESA").toLowerCase();
      const eq = getField(it, "EQUIPAMENTO").toLowerCase();
      const st = getField(it, "STATUS").toUpperCase();
      const nf = getField(it, "NF_RELACIONADA").toLowerCase();
      if (fEmpresa && !emp.includes(fEmpresa.toLowerCase())) return false;
      if (fEquip && !eq.includes(fEquip.toLowerCase())) return false;
      if (fStatus !== "todos" && st !== fStatus) return false;
      if (fNF && !nf.includes(fNF.toLowerCase())) return false;
      return true;
    });
  }, [items, fEmpresa, fEquip, fStatus, fNF]);

  const createMut = useMutation({
    mutationFn: async () => {
      await createSheetRow(SHEET, {
        ID: "",
        DATA_ENVIO: form.DATA_ENVIO,
        EQUIPAMENTO: form.EQUIPAMENTO.trim(),
        POTENCIA_ESPECIFICACAO: form.POTENCIA_ESPECIFICACAO.trim(),
        APLICACAO: form.APLICACAO.trim(),
        EMPRESA: form.EMPRESA.trim(),
        DESCRICAO_SERVICO: form.DESCRICAO_SERVICO.trim(),
        NF_RELACIONADA: form.NF_RELACIONADA.trim(),
        STATUS: form.STATUS,
        DATA_RETORNO: form.DATA_RETORNO,
        OBSERVACAO: form.OBSERVACAO.trim(),
        DATA_CADASTRO: nowISO(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sheet", SHEET] });
      toast({ title: "Serviço externo cadastrado!" });
      setForm({ ...emptyForm, DATA_ENVIO: todayISO() });
      setShowForm(false);
    },
    onError: (err) => toast({ title: "Erro ao cadastrar", description: String(err), variant: "destructive" }),
  });

  const isValid = form.EQUIPAMENTO && form.EMPRESA && form.DATA_ENVIO && form.STATUS;

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-4 gap-2">
        <PageHeader title="Serviços Externos" subtitle={items.length ? `${filtered.length} de ${items.length}` : undefined} />
        <div className="flex gap-2">
          <RefreshButton onClick={() => refetch()} isFetching={isFetching} />
          <Button size="sm" className="active:scale-95" onClick={() => { setShowForm((v) => !v); }}>
            {showForm ? <X className="w-4 h-4" /> : <><Plus className="w-4 h-4 mr-1" /> Novo</>}
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="stat-card mb-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Empresa" value={fEmpresa} onChange={(e) => setFEmpresa(e.target.value)} className="h-8 text-xs" />
          <Input placeholder="Equipamento" value={fEquip} onChange={(e) => setFEquip(e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={fStatus} onValueChange={setFStatus}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="NF relacionada" value={fNF} onChange={(e) => setFNF(e.target.value)} className="h-8 text-xs" />
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (isValid && !createMut.isPending) createMut.mutate(); }}
          className="stat-card mb-4 space-y-3 animate-fade-in"
        >
          <p className="text-sm font-medium">Novo serviço externo</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Data de envio *</Label>
              <Input type="date" value={form.DATA_ENVIO} onChange={(e) => setForm((p) => ({ ...p, DATA_ENVIO: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Data de retorno</Label>
              <Input type="date" value={form.DATA_RETORNO} onChange={(e) => setForm((p) => ({ ...p, DATA_RETORNO: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Equipamento *</Label>
            <Input value={form.EQUIPAMENTO} onChange={(e) => setForm((p) => ({ ...p, EQUIPAMENTO: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Potência / especificação</Label>
            <Input value={form.POTENCIA_ESPECIFICACAO} onChange={(e) => setForm((p) => ({ ...p, POTENCIA_ESPECIFICACAO: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Aplicação</Label>
            <Input value={form.APLICACAO} onChange={(e) => setForm((p) => ({ ...p, APLICACAO: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Empresa enviada *</Label>
            <Input value={form.EMPRESA} onChange={(e) => setForm((p) => ({ ...p, EMPRESA: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Descrição do serviço</Label>
            <Textarea rows={2} value={form.DESCRICAO_SERVICO} onChange={(e) => setForm((p) => ({ ...p, DESCRICAO_SERVICO: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">NF relacionada</Label>
              <Input value={form.NF_RELACIONADA} onChange={(e) => setForm((p) => ({ ...p, NF_RELACIONADA: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status *</Label>
              <Select value={form.STATUS} onValueChange={(v) => setForm((p) => ({ ...p, STATUS: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Observação</Label>
            <Textarea rows={2} value={form.OBSERVACAO} onChange={(e) => setForm((p) => ({ ...p, OBSERVACAO: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={!isValid || createMut.isPending}>
              {createMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Confirmar
            </Button>
          </div>
        </form>
      )}

      {/* Tabela */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : isError ? (
        <div className="stat-card text-center py-8">
          <p className="text-sm text-destructive mb-2">Erro ao carregar serviços externos.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>Tentar novamente</Button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">Nenhum registro encontrado</p>
      ) : (
        <div className="stat-card p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-9 px-3 text-xs">Envio</TableHead>
                <TableHead className="h-9 px-3 text-xs">Equipamento</TableHead>
                <TableHead className="h-9 px-3 text-xs hidden md:table-cell">Pot./Espec.</TableHead>
                <TableHead className="h-9 px-3 text-xs hidden md:table-cell">Aplicação</TableHead>
                <TableHead className="h-9 px-3 text-xs">Empresa</TableHead>
                <TableHead className="h-9 px-3 text-xs hidden sm:table-cell">NF</TableHead>
                <TableHead className="h-9 px-3 text-xs">Status</TableHead>
                <TableHead className="h-9 px-3 text-xs hidden sm:table-cell">Retorno</TableHead>
                <TableHead className="h-9 px-3 text-xs text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((it, idx) => (
                <TableRow key={`${getField(it, "ID")}-${idx}`}>
                  <TableCell className="p-2 text-xs whitespace-nowrap">{formatSheetDate(getField(it, "DATA_ENVIO"))}</TableCell>
                  <TableCell className="p-2 text-xs">{getField(it, "EQUIPAMENTO")}</TableCell>
                  <TableCell className="p-2 text-xs hidden md:table-cell">{getField(it, "POTENCIA_ESPECIFICACAO")}</TableCell>
                  <TableCell className="p-2 text-xs hidden md:table-cell">{getField(it, "APLICACAO")}</TableCell>
                  <TableCell className="p-2 text-xs">{getField(it, "EMPRESA")}</TableCell>
                  <TableCell className="p-2 text-xs hidden sm:table-cell">{getField(it, "NF_RELACIONADA")}</TableCell>
                  <TableCell className="p-2 text-xs">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCls(getField(it, "STATUS"))}`}>
                      {getField(it, "STATUS") || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="p-2 text-xs hidden sm:table-cell whitespace-nowrap">{formatSheetDate(getField(it, "DATA_RETORNO"))}</TableCell>
                  <TableCell className="p-2 text-right">
                    <button onClick={() => setDetail(it)} className="p-1 rounded hover:bg-muted active:scale-95" title="Ver detalhes">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detalhes */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-base">Detalhes do serviço</DialogTitle></DialogHeader>
          {detail && (
            <div className="text-sm space-y-1.5">
              {[
                ["Data envio", formatSheetDate(getField(detail, "DATA_ENVIO"))],
                ["Equipamento", getField(detail, "EQUIPAMENTO")],
                ["Potência/Especificação", getField(detail, "POTENCIA_ESPECIFICACAO")],
                ["Aplicação", getField(detail, "APLICACAO")],
                ["Empresa", getField(detail, "EMPRESA")],
                ["Descrição", getField(detail, "DESCRICAO_SERVICO")],
                ["NF relacionada", getField(detail, "NF_RELACIONADA")],
                ["Status", getField(detail, "STATUS")],
                ["Data retorno", formatSheetDate(getField(detail, "DATA_RETORNO"))],
                ["Observação", getField(detail, "OBSERVACAO")],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-border py-1">
                  <span className="text-xs text-muted-foreground">{k}</span>
                  <span className="text-xs text-right">{v || "—"}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
