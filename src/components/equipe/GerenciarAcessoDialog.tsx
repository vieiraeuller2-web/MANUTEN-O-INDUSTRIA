import { useEffect, useState, type FormEvent } from "react";
import { Loader2, LockKeyhole, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAlterarStatusEquipeAcesso, useRedefinirSenhaEquipeAcesso } from "@/hooks/use-equipe";
import type { EquipeAcessoResumo } from "@/lib/equipe-contract";

type Operacao = "status" | "senha";
interface Props {
  acesso: EquipeAcessoResumo | null;
  operacao: Operacao | null;
  onOpenChange: (open: boolean) => void;
}

export default function GerenciarAcessoDialog({ acesso, operacao, onOpenChange }: Props) {
  const [confirmacao, setConfirmacao] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const statusMutation = useAlterarStatusEquipeAcesso();
  const senhaMutation = useRedefinirSenhaEquipeAcesso();
  const pendente = statusMutation.isPending || senhaMutation.isPending;
  const desativado = String(acesso?.ativo).toUpperCase() !== "SIM";
  const acao = desativado ? "ATIVAR" : "DESATIVAR";
  const valido = operacao === "status"
    ? confirmacao.trim().toUpperCase() === acao
    : novaSenha.length >= 8 && novaSenha === confirmarSenha;

  useEffect(() => {
    setConfirmacao("");
    setNovaSenha("");
    setConfirmarSenha("");
  }, [acesso?.id_usuario, operacao]);

  async function executar(event: FormEvent) {
    event.preventDefault();
    if (!acesso?.id_usuario || !valido || pendente) return;
    try {
      if (operacao === "status") {
        await statusMutation.mutateAsync({ id_usuario: acesso.id_usuario, ativo: desativado ? "SIM" : "NAO" });
        toast({ title: "Situação do acesso atualizada", description: `Login ${acesso.login} atualizado pelo backend.` });
      } else if (operacao === "senha") {
        await senhaMutation.mutateAsync({ id_usuario: acesso.id_usuario, nova_senha: novaSenha });
        toast({ title: "Senha redefinida", description: "Nova senha registrada; solicite novo login ao usuário." });
      }
      setNovaSenha("");
      setConfirmarSenha("");
      setConfirmacao("");
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Não foi possível concluir a operação",
        description: error instanceof Error ? error.message : "Falha na confirmação do backend.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={Boolean(acesso && operacao)} onOpenChange={(open) => { if (!open && !pendente) onOpenChange(false); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{operacao === "senha" ? "Redefinir senha" : `${desativado ? "Ativar" : "Desativar"} acesso`}</DialogTitle>
          <DialogDescription>
            {acesso ? `${acesso.login} • ${acesso.perfil}. A alteração será executada no AUTH62.` : "Selecione um acesso."}
          </DialogDescription>
        </DialogHeader>
        {acesso && operacao && (
          <form onSubmit={executar} className="space-y-4">
            {operacao === "status" ? (
              <>
                <div className="flex gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  {desativado
                    ? "Ativar permite que o usuário volte a utilizar sua conta, conforme as regras da sessão."
                    : "Desativar impede novos acessos; sessões já abertas exigem validação de revogação no backend."}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmar-acao">Digite {acao} para confirmar *</Label>
                  <Input id="confirmar-acao" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} autoComplete="off" />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <LockKeyhole className="h-4 w-4" />
                  A senha não será exibida após salvar. Use no mínimo 8 caracteres.
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nova-senha-acesso">Nova senha *</Label>
                  <Input id="nova-senha-acesso" type="password" autoComplete="new-password" minLength={8} value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmar-nova-senha-acesso">Confirmar nova senha *</Label>
                  <Input id="confirmar-nova-senha-acesso" type="password" autoComplete="new-password" minLength={8} value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} required />
                </div>
              </>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={pendente} onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={!valido || pendente}>
                {pendente && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {operacao === "senha" ? "Redefinir senha" : `Confirmar: ${acao}`}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
