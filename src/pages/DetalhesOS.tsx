import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/supabase-helpers";
import { calcularTempoOS, normalizarHoraSheets } from "@/lib/time-helpers";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Pencil, Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function DetalhesOS() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: os, isLoading } = useQuery({
    queryKey: ["os_escaneadas", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_escaneadas" as any)
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("os_escaneadas" as any)
        .delete()
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["os_escaneadas"] });
      toast({ title: "OS excluída com sucesso!" });
      navigate("/os");
    },
    onError: (err) => {
      toast({ title: "Erro ao excluir", description: String(err), variant: "destructive" });
    },
  });

  if (isLoading) return <div className="page-container"><div className="h-40 bg-muted rounded-lg animate-pulse" /></div>;
  if (!os) return <div className="page-container"><p>OS não encontrada</p></div>;

  const Row = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
    <div className="flex justify-between py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value ?? "—"}</span>
    </div>
  );

  return (
    <div className="page-container">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-95">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <PageHeader title={os.equipamento || "OS"} />
        </div>
        <Button size="sm" variant="outline" onClick={() => navigate(`/os/${os.id}/editar`)} className="active:scale-95">
          <Pencil className="w-4 h-4 mr-1" /> Editar
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive" className="active:scale-95">
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir OS?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. A ordem de serviço será removida permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {os.imagem_url && (
        <img src={os.imagem_url} alt="OS" className="w-full rounded-lg mb-4 max-h-64 object-cover" />
      )}

      <div className="stat-card animate-fade-in">
        <Row label="Tipo" value={os.manutencao_tipo === "preventiva" ? "Preventiva" : "Corretiva"} />
        <Row label="Horímetro" value={os.horimetro} />
        <Row label="Área" value={os.area} />
        <Row label="Setor" value={os.setor} />
        <Row label="Responsável" value={os.responsavel} />
        <Row label="Data Início" value={os.data_inicio ? formatDate(os.data_inicio) : null} />
        <Row label="Hora Início" value={normalizarHoraSheets(os.hora_inicio)} />
        <Row label="Data Conclusão" value={os.data_conclusao ? formatDate(os.data_conclusao) : null} />
        <Row label="Hora Conclusão" value={normalizarHoraSheets(os.hora_conclusao)} />
        <Row label="Tempo da OS" value={calcularTempoOS(os.data_inicio, os.hora_inicio, os.data_conclusao, os.hora_conclusao)} />
        <Row label="Confiança Leitura" value={os.confianca_leitura ? `${os.confianca_leitura}%` : null} />
      </div>

      {os.observacoes && (
        <div className="stat-card mt-3 animate-fade-in" style={{ animationDelay: "80ms" }}>
          <p className="text-xs text-muted-foreground mb-1">Observações</p>
          <p className="text-sm whitespace-pre-wrap">{os.observacoes}</p>
        </div>
      )}
    </div>
  );
}
