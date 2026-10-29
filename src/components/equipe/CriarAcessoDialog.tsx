import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useCriarEquipeAcesso } from "@/hooks/use-equipe";
import type {
  EquipeColaborador,
  PerfilAcessoEquipe,
} from "@/lib/equipe-contract";
import type { Perfil } from "@/lib/api-client";

interface CriarAcessoDialogProps {
  colaborador: EquipeColaborador | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  perfilSolicitante: Perfil;
  unidadePadrao?: string;
}

export default function CriarAcessoDialog({
  colaborador,
  open,
  onOpenChange,
  perfilSolicitante,
  unidadePadrao = "TH30",
}: CriarAcessoDialogProps) {
  const criarAcesso = useCriarEquipeAcesso();
  const perfisDisponiveis: PerfilAcessoEquipe[] = ["TECNICO", "PCM", "GESTAO", "ADM"];
  const perfilPermitido = perfilSolicitante === "ADM" || perfil === "TECNICO";

  const [perfil, setPerfil] = useState<PerfilAcessoEquipe>("TECNICO");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [unidade, setUnidade] = useState(unidadePadrao || "TH30");

  useEffect(() => {
    if (!open) return;
    setPerfil("TECNICO");
    setLogin("");
    setSenha("");
    setUnidade(unidadePadrao || "TH30");
  }, [open, unidadePadrao]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!colaborador || !perfilPermitido) return;

    try {
      await criarAcesso.mutateAsync({
        id_colaborador: colaborador.id_colaborador,
        perfil,
        login: login.trim(),
        senha,
        unidade: perfil === "TECNICO" ? "TH30" : unidade.trim(),
      });

      toast({
        title: "Acesso criado",
        description: `Usuário ${perfil} criado para ${colaborador.nome}.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Não foi possível criar o acesso",
        description:
          error instanceof Error ? error.message : "Erro ao criar acesso.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar acesso</DialogTitle>
          <DialogDescription>
            {colaborador
              ? `Cria um usuário para ${colaborador.nome} sem duplicar o cadastro do colaborador.`
              : "Cria um usuário para o colaborador selecionado."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Perfil *</Label>
            <Select
              value={perfil}
              onValueChange={(value) =>
                setPerfil(value as PerfilAcessoEquipe)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {perfisDisponiveis.map((item) => (
                  <SelectItem key={item} value={item} disabled={perfilSolicitante !== "ADM" && item !== "TECNICO"}>
                    {item}{perfilSolicitante !== "ADM" && item !== "TECNICO" ? " — somente ADM" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {perfilSolicitante !== "ADM" && (
              <p className="text-xs text-muted-foreground">
                Todos os perfis são exibidos. Por segurança, somente ADM pode criar acessos PCM, GESTAO ou ADM.
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="acesso-login">Login *</Label>
              <Input
                id="acesso-login"
                autoComplete="username"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="acesso-senha">Senha inicial *</Label>
              <Input
                id="acesso-senha"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="acesso-unidade">Unidade *</Label>
            <Input
              id="acesso-unidade"
              value={perfil === "TECNICO" ? "TH30" : unidade}
              disabled={perfil === "TECNICO"}
              onChange={(e) => setUnidade(e.target.value)}
              required
            />
            {perfil === "TECNICO" && (
              <p className="text-xs text-muted-foreground">
                Técnicos usam TH30 automaticamente.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                criarAcesso.isPending ||
                !perfilPermitido ||
                !colaborador ||
                !login.trim() ||
                senha.length < 8 ||
                !(perfil === "TECNICO" ? "TH30" : unidade.trim())
              }
            >
              {criarAcesso.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Criar acesso
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
