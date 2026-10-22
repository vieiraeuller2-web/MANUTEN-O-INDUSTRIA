import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/PageHeader";
import RefreshButton from "@/components/RefreshButton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Plus, Loader2, X, FileText, Eye, ExternalLink, ShieldCheck, Clock3, FileWarning } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { documentoDaNota } from "@/lib/nf-documento";
import { fetchSheet, createSheetRow, getField, formatSheetDate, todayISO, nowISO, type SheetRow } from "@/lib/sheets-external";
import { safeArray } from "@/lib/data-helpers";

const SHEET = "notas_fiscais";
const STATUS_OPTIONS = ["PENDENTE", "OK"] as const;

const emptyForm = {
  NUMERO_NF: "",
  DESCRICAO: "",
  EMPRESA: "",
  DATA_EMISSAO: todayISO(),
  STATUS: "PENDENTE" as string,
  OBSERVACAO: "",
};

export default function NotasFiscais() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [notaSelecionada, setNotaSelecionada] = useState<SheetRow | null>(null);

  const [fNumero, setFNumero] = useState("");
  const [fEmpresa, setFEmpresa] = useState("");
  const [fStatus, setFStatus] = useState("todos");

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["sheet", SHEET],
    queryFn: () => fetchSheet(SHEET),
    refetchOnWindowFocus: false,
  });

  const items = safeArray<SheetRow>(data);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const num = getField(it, "NUMERO_NF").toLowerCase();
      const emp = getField(it, "EMPRESA").toLowerCase();
      const st = getField(it, "STATUS").toUpperCase();
      if (fNumero && !num.includes(fNumero.toLowerCase())) return false;
      if (fEmpresa && !emp.includes(fEmpresa.toLowerCase())) return false;
      if (fStatus !== "todos" && st !== fStatus) return false;
      return true;
    });
  }, [items, fNumero, fEmpresa, fStatus]);

  const documentoSelecionado = notaSelecionada ? documentoDaNota(notaSelecionada) : null;
  const pendentes = items.filter((nota) => getField(nota, "STATUS").toUpperCase() === "PENDENTE").length;
  const comArquivo = items.filter((nota) => documentoDaNota(nota) !== null).length;

  const createMut = useMutation({
    mutationFn: async () => {
      await createSheetRow(SHEET, {
        ID: "",
        NUMERO_NF: form.NUMERO_NF.trim(),
        DESCRICAO: form.DESCRICAO.trim(),
        EMPRESA: form.EMPRESA.trim(),
        DATA_EMISSAO: form.DATA_EMISSAO,
        STATUS: form.STATUS,
        OBSERVACAO: form.OBSERVACAO.trim(),
        DATA_CADASTRO: nowISO(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sheet", SHEET] });
      toast({ title: "NF cadastrada!" });
      setForm({ ...emptyForm, DATA_EMISSAO: todayISO() });
      setShowForm(false);
    },
    onError: (err) => toast({ title: "Erro ao cadastrar", description: String(err), variant: "destructive" }),
  });

  const isValid = form.NUMERO_NF && form.EMPRESA && form.DATA_EMISSAO && form.STATUS;

  return (
    <div className="page-container">
      <section className="kron-nf-hero">
        <div>
          <span className="kron-nf-eyebrow"><FileText size={14}/> CENTRAL DOCUMENTAL</span>
          <PageHeader title="Notas Fiscais" subtitle="Consulta de registros fiscais e documentos vinculados à origem." />
          <p>Encontre a nota, examine seus dados e visualize o arquivo original quando a fonte disponibilizar um link.</p>
        </div>
        <span className="kron-nf-hero__deco" aria-hidden="true"><FileText size={57} strokeWidth={1}/></span>
      </section>
      <div className="kron-nf-summary">
        <div><FileText size={18}/><span>Registros</span><strong>{items.length}</strong></div>
        <div><Clock3 size={18}/><span>Pendentes</span><strong>{pendentes}</strong></div>
        <div><Eye size={18}/><span>Com documento vinculado</span><strong>{comArquivo}</strong></div>
      </div>
      <div className="flex items-center justify-between mb-4 gap-2">
        <div><h2 className="text-base font-bold">Arquivo fiscal</h2><p className="text-xs text-muted-foreground">{filtered.length} de {items.length} registro(s) no filtro</p></div>
        <div className="flex gap-2">
          <RefreshButton onClick={() => refetch()} isFetching={isFetching} />
          <Button size="sm" className="active:scale-95" onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X className="w-4 h-4" /> : <><Plus className="w-4 h-4 mr-1" /> Nova</>}
          </Button>
        </div>
      </div>

      <div className="stat-card kron-nf-filters mb-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Número NF" value={fNumero} onChange={(e) => setFNumero(e.target.value)} className="h-8 text-xs" />
          <Input placeholder="Empresa" value={fEmpresa} onChange={(e) => setFEmpresa(e.target.value)} className="h-8 text-xs" />
        </div>
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (isValid && !createMut.isPending) createMut.mutate(); }}
          className="stat-card mb-4 space-y-3 animate-fade-in"
        >
          <p className="text-sm font-medium">Nova nota fiscal</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Número da NF *</Label>
              <Input value={form.NUMERO_NF} onChange={(e) => setForm((p) => ({ ...p, NUMERO_NF: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Data de emissão *</Label>
              <Input type="date" value={form.DATA_EMISSAO} onChange={(e) => setForm((p) => ({ ...p, DATA_EMISSAO: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Descrição</Label>
            <Input value={form.DESCRICAO} onChange={(e) => setForm((p) => ({ ...p, DESCRICAO: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Empresa enviada *</Label>
            <Input value={form.EMPRESA} onChange={(e) => setForm((p) => ({ ...p, EMPRESA: e.target.value }))} />
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

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : isError ? (
        <div className="stat-card text-center py-8">
          <p className="text-sm text-destructive mb-2">Erro ao carregar notas fiscais.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>Tentar novamente</Button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">Nenhuma NF encontrada</p>
      ) : (
        <div className="stat-card kron-nf-table p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-9 px-3 text-xs">Número</TableHead>
                <TableHead className="h-9 px-3 text-xs">Empresa</TableHead>
                <TableHead className="h-9 px-3 text-xs hidden sm:table-cell">Descrição</TableHead>
                <TableHead className="h-9 px-3 text-xs">Emissão</TableHead>
                <TableHead className="h-9 px-3 text-xs">Status</TableHead>
                <TableHead className="h-9 px-3 text-xs text-right">Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((it, idx) => {
                const st = getField(it, "STATUS").toUpperCase();
                return (
                  <TableRow key={`${getField(it, "ID")}-${idx}`} className="cursor-pointer" onClick={() => setNotaSelecionada(it)}>
                    <TableCell className="p-2 text-xs font-mono"><span className="inline-flex items-center gap-2"><FileText size={15} className="text-primary"/>{getField(it, "NUMERO_NF")}</span></TableCell>
                    <TableCell className="p-2 text-xs">{getField(it, "EMPRESA")}</TableCell>
                    <TableCell className="p-2 text-xs hidden sm:table-cell">{getField(it, "DESCRICAO")}</TableCell>
                    <TableCell className="p-2 text-xs whitespace-nowrap">{formatSheetDate(getField(it, "DATA_EMISSAO"))}</TableCell>
                    <TableCell className="p-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${st === "OK" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                        {st || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="p-2 text-right">
                      <button type="button" onClick={(event) => { event.stopPropagation(); setNotaSelecionada(it); }} className="kron-nf-open" title="Consultar nota fiscal" aria-label={`Consultar nota ${getField(it, "NUMERO_NF")}`}>
                        <Eye className="w-4 h-4" /><span className="hidden sm:inline">Visualizar</span>
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={notaSelecionada !== null} onOpenChange={(open) => { if (!open) setNotaSelecionada(null); }}>
        <DialogContent className="kron-nf-dialog max-h-[92dvh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl"><FileText className="text-primary"/> NF {notaSelecionada ? getField(notaSelecionada, "NUMERO_NF") : ""}</DialogTitle>
            <DialogDescription>Consulta somente leitura dos dados e do arquivo fiscal vinculado.</DialogDescription>
          </DialogHeader>
          {notaSelecionada && (
            <div className="kron-nf-inspector">
              <div className="kron-nf-inspector__fields">
                <div><span>EMPRESA</span><strong>{getField(notaSelecionada, "EMPRESA") || "Não informado"}</strong></div>
                <div><span>EMISSÃO</span><strong>{formatSheetDate(getField(notaSelecionada, "DATA_EMISSAO")) || "Não informado"}</strong></div>
                <div><span>STATUS</span><strong>{getField(notaSelecionada, "STATUS") || "Não informado"}</strong></div>
                <div><span>DESCRIÇÃO</span><strong>{getField(notaSelecionada, "DESCRICAO") || "Não informado"}</strong></div>
                <div className="kron-nf-inspector__wide"><span>OBSERVAÇÕES</span><strong>{getField(notaSelecionada, "OBSERVACAO") || "Sem observações"}</strong></div>
              </div>
              <section className="kron-nf-inspector__document" aria-label="Documento fiscal">
                <div className="kron-nf-inspector__heading">
                  <strong><Eye size={17}/> Documento original</strong>
                  {documentoSelecionado && (
                    <a className="kron-nf-open" href={documentoSelecionado.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={15}/> Abrir na origem
                    </a>
                  )}
                </div>
                {documentoSelecionado?.visualizacao ? (
                  <iframe title="Visualização do documento fiscal original" src={documentoSelecionado.visualizacao}
                    loading="lazy" referrerPolicy="no-referrer" className="kron-nf-document-frame"/>
                ) : documentoSelecionado ? (
                  <div className="kron-nf-inspector__empty"><ExternalLink size={28}/><strong>Documento localizado</strong><p>O provedor não oferece uma visualização incorporada segura. Abra o arquivo na origem.</p></div>
                ) : (
                  <div className="kron-nf-inspector__empty"><FileWarning size={29}/><strong>Arquivo original não vinculado</strong>
                    <p>O cadastro consultado não retornou um link reconhecido de PDF ou Drive. Não é possível reproduzir a NF real sem esse vínculo na origem.</p>
                  </div>
                )}
                <p className="kron-nf-inspector__note"><ShieldCheck size={13}/> A visualização respeita as permissões do provedor de origem; alguns arquivos podem exigir login.</p>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
