import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  MinusCircle,
  Tag,
  XCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { safeString } from "@/lib/data-helpers";
import { cn } from "@/lib/utils";
import { concluirPreventiva } from "@/services/preventivasApi";
import type {
  AtivoPreventiva,
  ConcluirPreventivaPayload,
  ConcluirPreventivaResponse,
  NoPreventiva,
  PlanoPreventiva,
  ResultadoPreventiva,
  SetorPreventiva,
} from "@/types/preventivas";
import {
  formatarDataPreventiva,
  formatarModalidadePlano,
  formatarPeriodicidadePlano,
  obterItensFinaisPreventiva,
  valorEhSim,
} from "./preventivas-utils";

interface RegistrarPreventivaProps {
  open: boolean;
  plano?: PlanoPreventiva;
  setor?: SetorPreventiva;
  ativo?: AtivoPreventiva;
  nos: NoPreventiva[];
  apontadoPorPadrao?: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: (response: ConcluirPreventivaResponse) => Promise<void>;
}

interface RespostaFormulario {
  resultado: ResultadoPreventiva | null;
  observacao: string;
}

function hojeLocal(): string {
  const agora = new Date();
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function gerarIdExecucao(): string {
  return `EXE-${Date.now()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function mensagemErro(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const opcoesResultado: Array<{
  valor: ResultadoPreventiva;
  rotulo: string;
  icon: typeof CheckCircle2;
  selecionado: string;
}> = [
  { valor: "OK", rotulo: "OK", icon: CheckCircle2, selecionado: "border-success bg-success text-success-foreground hover:bg-success/90" },
  { valor: "NOK", rotulo: "NOK", icon: XCircle, selecionado: "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90" },
  { valor: "NA", rotulo: "N/A", icon: MinusCircle, selecionado: "border-primary bg-primary text-primary-foreground hover:bg-primary/90" },
];

export default function RegistrarPreventiva({
  open,
  plano,
  setor,
  ativo,
  nos,
  apontadoPorPadrao = "",
  onOpenChange,
  onSuccess,
}: RegistrarPreventivaProps) {
  const inicializado = useRef(false);
  const itens = useMemo(() => obterItensFinaisPreventiva(nos), [nos]);
  const [idExecucao, setIdExecucao] = useState("");
  const [dataRealizada, setDataRealizada] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [apontadoPor, setApontadoPor] = useState("");
  const [observacaoGeral, setObservacaoGeral] = useState("");
  const [respostas, setRespostas] = useState<Record<string, RespostaFormulario>>({});
  const [confirmarTodos, setConfirmarTodos] = useState(false);
  const [confirmarConclusao, setConfirmarConclusao] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState<ConcluirPreventivaResponse | null>(null);

  useEffect(() => {
    if (open && !inicializado.current) {
      inicializado.current = true;
      setIdExecucao(gerarIdExecucao());
      setDataRealizada(hojeLocal());
      setResponsavel(safeString(plano?.responsavel_padrao));
      setApontadoPor(safeString(apontadoPorPadrao));
      setObservacaoGeral("");
      setRespostas(Object.fromEntries(itens.map((item) => [item.id_no, { resultado: null, observacao: "" }])));
      setSucesso(null);
    }
    if (!open) {
      inicializado.current = false;
      setConfirmarTodos(false);
      setConfirmarConclusao(false);
    }
  }, [apontadoPorPadrao, itens, open, plano?.responsavel_padrao]);

  useEffect(() => {
    if (open && apontadoPorPadrao && !apontadoPor.trim()) setApontadoPor(apontadoPorPadrao);
  }, [apontadoPor, apontadoPorPadrao, open]);

  const respondidos = itens.filter((item) => Boolean(respostas[item.id_no]?.resultado)).length;
  const contadores = itens.reduce(
    (total, item) => {
      const resultado = respostas[item.id_no]?.resultado;
      if (resultado) total[resultado] += 1;
      return total;
    },
    { OK: 0, NOK: 0, NA: 0 } as Record<ResultadoPreventiva, number>,
  );
  const nokSemObservacao = itens.some((item) => {
    const resposta = respostas[item.id_no];
    return resposta?.resultado === "NOK" && !resposta.observacao.trim();
  });
  const todosRespondidos = itens.length > 0 && respondidos === itens.length;
  const formularioValido = Boolean(dataRealizada && responsavel.trim() && todosRespondidos && !nokSemObservacao);
  const progresso = itens.length ? (respondidos / itens.length) * 100 : 0;

  const motivoBloqueio = !itens.length
    ? "Este plano não possui itens finais de verificação."
    : !dataRealizada
      ? "Informe a data realizada."
      : !responsavel.trim()
        ? "Informe o responsável."
        : !todosRespondidos
          ? "Responda todos os itens do checklist."
          : nokSemObservacao
            ? "Descreva o problema em todos os itens NOK."
            : "";

  const atualizarResposta = (idNo: string, atualizacao: Partial<RespostaFormulario>) => {
    setRespostas((atuais) => ({
      ...atuais,
      [idNo]: { resultado: null, observacao: "", ...atuais[idNo], ...atualizacao },
    }));
  };

  const marcarTodosComoOk = () => {
    setRespostas((atuais) => Object.fromEntries(
      itens.map((item) => [
        item.id_no,
        { resultado: "OK" as const, observacao: atuais[item.id_no]?.observacao ?? "" },
      ]),
    ));
  };

  const enviar = async () => {
    if (!plano || !formularioValido || enviando) return;
    const payload: ConcluirPreventivaPayload = {
      action: "preventiva_concluir",
      id_execucao: idExecucao,
      id_plano: plano.id_plano,
      data_realizada: dataRealizada,
      responsavel: responsavel.trim(),
      apontado_por: apontadoPor.trim(),
      observacao: observacaoGeral.trim(),
      itens: itens.map((item) => ({
        id_no: item.id_no,
        resultado: respostas[item.id_no].resultado!,
        observacao: respostas[item.id_no].observacao.trim(),
      })),
    };

    setEnviando(true);
    try {
      const response = await concluirPreventiva(payload);
      setSucesso(response);
      const titulo = response.duplicado
        ? "Esta preventiva já havia sido registrada. Nenhum registro foi duplicado."
        : "Preventiva registrada com sucesso";
      toast({
        title: titulo,
        description: response.ciclo?.proxima_execucao
          ? `Próxima execução: ${response.ciclo.proxima_execucao}`
          : response.message,
      });

      try {
        await onSuccess(response);
      } catch (error) {
        toast({
          title: "Preventiva registrada, mas a atualização da tela falhou.",
          description: mensagemErro(error),
          variant: "destructive",
        });
      }

      await new Promise((resolve) => window.setTimeout(resolve, 1_400));
      setRespostas({});
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Não foi possível registrar a preventiva.",
        description: mensagemErro(error),
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
    }
  };

  const alterarAbertura = (novoEstado: boolean) => {
    if (!enviando) onOpenChange(novoEstado);
  };

  if (!plano) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={alterarAbertura}>
        <DialogContent className="flex h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-[calc(100dvh-2rem)] sm:max-w-5xl sm:rounded-lg">
          <DialogHeader className="shrink-0 border-b bg-background p-4 pr-12 text-left sm:p-5">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">{formatarModalidadePlano(plano)}</Badge>
              <Badge variant="outline">{formatarPeriodicidadePlano(plano)}</Badge>
            </div>
            <DialogTitle className="break-words text-lg sm:text-xl">Registrar Preventiva</DialogTitle>
            <DialogDescription className="break-words">{plano.titulo_plano}</DialogDescription>
            <div className="grid gap-1.5 pt-1 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
              <span><strong className="text-foreground">Setor:</strong> {setor?.nome_setor || plano.setor || "Não informado"}</span>
              <span className="inline-flex min-w-0 items-center gap-1"><Tag className="h-3.5 w-3.5 shrink-0" /><strong className="text-foreground">{ativo?.tag_ativo || plano.tag_ativo || "TAG NÃO CADASTRADA"}</strong> · <span className="truncate">{ativo?.nome_ativo || plano.nome_ativo}</span></span>
              {plano.proxima_execucao && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /><strong className="text-foreground">Programada:</strong> {formatarDataPreventiva(plano.proxima_execucao)}</span>}
              <span className="truncate" title={idExecucao}><strong className="text-foreground">Execução:</strong> {idExecucao}</span>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/10 p-4 sm:p-5">
            {sucesso && (
              <div className="mb-4 rounded-lg border border-success/40 bg-success/10 p-4 text-success" role="status">
                <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5" />{sucesso.duplicado ? "Registro já existente confirmado" : "Preventiva registrada com sucesso"}</p>
                {sucesso.ciclo?.proxima_execucao && <p className="mt-1 text-sm">Próxima execução: {sucesso.ciclo.proxima_execucao}</p>}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="preventiva-data">Data realizada *</Label>
                <Input id="preventiva-data" type="date" value={dataRealizada} onChange={(event) => setDataRealizada(event.target.value)} disabled={enviando || Boolean(sucesso)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="preventiva-responsavel">Responsável *</Label>
                <Input id="preventiva-responsavel" value={responsavel} onChange={(event) => setResponsavel(event.target.value)} placeholder="Nome do responsável" disabled={enviando || Boolean(sucesso)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="preventiva-apontado">Apontado por</Label>
                <Input id="preventiva-apontado" value={apontadoPor} onChange={(event) => setApontadoPor(event.target.value)} placeholder="Usuário responsável pelo apontamento" disabled={enviando || Boolean(sucesso)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="preventiva-observacao">Observação geral</Label>
                <Textarea id="preventiva-observacao" value={observacaoGeral} onChange={(event) => setObservacaoGeral(event.target.value)} placeholder="Opcional" className="min-h-10 resize-y" disabled={enviando || Boolean(sucesso)} />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold"><ClipboardCheck className="h-4 w-4" />Checklist de execução</h3>
                <p className="text-xs text-muted-foreground">Responda todos os itens finais. Em caso de NOK, descreva o problema.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirmarTodos(true)} disabled={!itens.length || enviando || Boolean(sucesso)} className="gap-1.5">
                <Check className="h-4 w-4" /> Marcar todos como OK
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {itens.map((item, indice) => {
                const resposta = respostas[item.id_no] ?? { resultado: null, observacao: "" };
                const nokInvalido = resposta.resultado === "NOK" && !resposta.observacao.trim();
                return (
                  <article key={item.id_no} className={cn("rounded-lg border bg-card p-3 sm:p-4", nokInvalido && "border-destructive/60")}>
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">{indice + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h4 className="break-words text-sm font-semibold">{item.item_verificacao || item.nome_no || "Item sem descrição"}</h4>
                          {valorEhSim(item.obrigatorio) && <Badge variant="outline" className="shrink-0 text-[10px]">Obrigatório</Badge>}
                        </div>
                        {item.criterio_aceite && <p className="mt-1 break-words text-xs text-muted-foreground"><strong>Critério:</strong> {item.criterio_aceite}</p>}
                        {item.metodo_verificacao && <p className="mt-1 break-words text-xs text-muted-foreground"><strong>Método:</strong> {item.metodo_verificacao}</p>}

                        <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label={`Resultado do item ${indice + 1}`}>
                          {opcoesResultado.map(({ valor, rotulo, icon: Icone, selecionado }) => (
                            <Button
                              type="button"
                              key={valor}
                              variant="outline"
                              onClick={() => atualizarResposta(item.id_no, { resultado: valor })}
                              disabled={enviando || Boolean(sucesso)}
                              aria-pressed={resposta.resultado === valor}
                              className={cn("h-11 gap-1 px-2 text-xs sm:text-sm", resposta.resultado === valor && selecionado)}
                            >
                              <Icone className="h-4 w-4 shrink-0" /> {rotulo}
                            </Button>
                          ))}
                        </div>

                        <div className="mt-3 space-y-1.5">
                          <Label htmlFor={`observacao-${item.id_no}`} className={cn("text-xs", nokInvalido && "text-destructive")}>
                            Observação {resposta.resultado === "NOK" ? "*" : "(opcional)"}
                          </Label>
                          <Textarea
                            id={`observacao-${item.id_no}`}
                            value={resposta.observacao}
                            onChange={(event) => atualizarResposta(item.id_no, { observacao: event.target.value })}
                            placeholder={resposta.resultado === "NOK" ? "Descreva o problema encontrado" : "Observação do item"}
                            className={cn("min-h-16 resize-y", nokInvalido && "border-destructive focus-visible:ring-destructive")}
                            disabled={enviando || Boolean(sucesso)}
                            aria-invalid={nokInvalido}
                          />
                          {nokInvalido && <p className="flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="h-3.5 w-3.5" />A observação é obrigatória para resultado NOK.</p>}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <footer className="shrink-0 border-t bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
            <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <strong>{respondidos} de {itens.length} itens respondidos</strong>
                  <span className="flex flex-wrap gap-2 text-muted-foreground">
                    <span>OK: <strong className="text-success">{contadores.OK}</strong></span>
                    <span>NOK: <strong className="text-destructive">{contadores.NOK}</strong></span>
                    <span>N/A: <strong className="text-primary">{contadores.NA}</strong></span>
                  </span>
                </div>
                <Progress value={progresso} className="h-2" />
                {motivoBloqueio && !sucesso && <p className="mt-1 text-[11px] text-muted-foreground">{motivoBloqueio}</p>}
              </div>
              <Button
                type="button"
                className="h-11 w-full shrink-0 gap-2 sm:w-auto"
                disabled={!formularioValido || enviando || Boolean(sucesso)}
                onClick={() => setConfirmarConclusao(true)}
              >
                {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                {enviando ? "Registrando..." : "Concluir e Registrar Preventiva"}
              </Button>
            </div>
          </footer>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmarTodos} onOpenChange={setConfirmarTodos}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar todos os itens como OK?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação substituirá os resultados já selecionados. As observações preenchidas serão mantidas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={marcarTodosComoOk}>Confirmar todos como OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmarConclusao} onOpenChange={setConfirmarConclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar registro da preventiva?</AlertDialogTitle>
            <AlertDialogDescription>Confira o resumo antes de enviar. Esta operação atualizará o ciclo do plano.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5 rounded-lg border bg-muted/20 p-3 text-sm">
            <p><strong>Plano:</strong> {plano.titulo_plano}</p>
            <p><strong>Data realizada:</strong> {formatarDataPreventiva(dataRealizada)}</p>
            <p><strong>Responsável:</strong> {responsavel}</p>
            <div className="flex flex-wrap gap-3 pt-1">
              <span>OK: <strong>{contadores.OK}</strong></span>
              <span>NOK: <strong>{contadores.NOK}</strong></span>
              <span>N/A: <strong>{contadores.NA}</strong></span>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enviando}>Voltar</AlertDialogCancel>
            <AlertDialogAction disabled={!formularioValido || enviando} onClick={() => void enviar()} className="gap-2">
              {enviando && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar registro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
