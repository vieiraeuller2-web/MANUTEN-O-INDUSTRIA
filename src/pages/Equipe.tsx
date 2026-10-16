import { useMemo, useState, type FormEvent } from "react";
import { Loader2, Plus, RefreshCw, Search, UserPlus, Users } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  useCriarEquipeColaborador,
  useCriarEquipeTecnico,
  useEquipeColaboradores,
  useEquipeTecnicos,
} from "@/hooks/use-equipe";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessModule } from "@/lib/authz";

type FormBase = {
  nome: string;
  funcao: string;
  especialidade: string;
  tipo_vinculo: string;
  contabilizar_hh_custo: "SIM" | "NAO";
};

const formBaseInicial: FormBase = {
  nome: "",
  funcao: "",
  especialidade: "",
  tipo_vinculo: "",
  contabilizar_hh_custo: "SIM",
};

export default function Equipe() {
  const { user } = useAuth();
  const [busca, setBusca] = useState("");
  const [dialogColaborador, setDialogColaborador] = useState(false);
  const [dialogTecnico, setDialogTecnico] = useState(false);
  const [formColaborador, setFormColaborador] = useState<FormBase>(formBaseInicial);
  const [formTecnico, setFormTecnico] = useState<FormBase & { login: string; senha: string }>({
    ...formBaseInicial,
    login: "",
    senha: "",
  });

  const podeCriar = canAccessModule(user?.permissoes, "EQUIPE_COLABORADORES", "criar");
  const colaboradoresQuery = useEquipeColaboradores();
  const tecnicosQuery = useEquipeTecnicos();
  const criarColaborador = useCriarEquipeColaborador();
  const criarTecnico = useCriarEquipeTecnico();

  const colaboradores = colaboradoresQuery.data?.colaboradores ?? [];
  const tecnicos = tecnicosQuery.data?.tecnicos ?? [];
  const tecnicosPorColaborador = useMemo(
    () => new Map(tecnicos.map((t) => [t.id_colaborador, t])),
    [tecnicos]
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    if (!termo) return colaboradores;
    return colaboradores.filter((c) =>
      [c.nome, c.nome_bd, c.funcao, c.especialidade]
        .filter(Boolean)
        .some((v) => String(v).toLocaleLowerCase("pt-BR").includes(termo))
    );
  }, [busca, colaboradores]);

  async function submitColaborador(e: FormEvent) {
    e.preventDefault();
    try {
      await criarColaborador.mutateAsync({
        ...formColaborador,
        nome_bd: formColaborador.nome,
      });
      toast({ title: "Colaborador cadastrado", description: "Cadastro criado com sucesso." });
      setDialogColaborador(false);
      setFormColaborador(formBaseInicial);
    } catch (error) {
      toast({
        title: "Não foi possível cadastrar",
        description: error instanceof Error ? error.message : "Erro ao cadastrar colaborador.",
        variant: "destructive",
      });
    }
  }

  async function submitTecnico(e: FormEvent) {
    e.preventDefault();
    try {
      await criarTecnico.mutateAsync({
        ...formTecnico,
        nome_bd: formTecnico.nome,
      });
      toast({ title: "Técnico cadastrado", description: "Colaborador e acesso técnico criados com sucesso." });
      setDialogTecnico(false);
      setFormTecnico({ ...formBaseInicial, login: "", senha: "" });
    } catch (error) {
      toast({
        title: "Não foi possível cadastrar",
        description: error instanceof Error ? error.message : "Erro ao cadastrar técnico.",
        variant: "destructive",
      });
    }
  }

  const carregando = colaboradoresQuery.isLoading || tecnicosQuery.isLoading;
  const erro = colaboradoresQuery.error || tecnicosQuery.error;

  return (
    <div className="page-container max-w-5xl pb-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title="Equipe / Colaboradores" subtitle="Cadastro e consulta da equipe de manutenção" />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              colaboradoresQuery.refetch();
              tecnicosQuery.refetch();
            }}
            disabled={colaboradoresQuery.isFetching || tecnicosQuery.isFetching}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          {podeCriar && (
            <>
              <Button variant="outline" size="sm" onClick={() => setDialogColaborador(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Colaborador
              </Button>
              <Button size="sm" onClick={() => setDialogTecnico(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Técnico
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome, função ou especialidade"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {carregando ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando equipe...
        </div>
      ) : erro ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-6 text-center text-sm text-destructive">
            {erro instanceof Error ? erro.message : "Não foi possível carregar a equipe."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {filtrados.length} colaborador(es) exibido(s)
          </p>

          {filtrados.map((c) => {
            const tecnico = tecnicosPorColaborador.get(c.id_colaborador);
            return (
              <Card key={c.id_colaborador}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 shrink-0 text-primary" />
                        <p className="font-semibold">{c.nome || c.nome_bd || "—"}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {c.funcao || "Função não informada"}
                        {c.especialidade ? ` • ${c.especialidade}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1">
                      <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold">
                        {c.ativo === "SIM" ? "ATIVO" : "INATIVO"}
                      </span>
                      {tecnico && (
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                          TÉCNICO
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                    <div>
                      <p className="text-muted-foreground">Vínculo</p>
                      <p className="font-medium">{c.tipo_vinculo || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">HH / custo</p>
                      <p className="font-medium">{c.contabilizar_hh_custo || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Acesso ao sistema</p>
                      <p className="font-medium">
                        {tecnico ? `${tecnico.login} • ${tecnico.ativo === "SIM" ? "ativo" : "inativo"}` : "Sem login técnico"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogColaborador} onOpenChange={setDialogColaborador}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo colaborador</DialogTitle>
            <DialogDescription>
              Cria o colaborador na equipe sem criar usuário de acesso.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitColaborador} className="space-y-4">
            <EquipeFormBase value={formColaborador} onChange={setFormColaborador} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogColaborador(false)}>Cancelar</Button>
              <Button type="submit" disabled={criarColaborador.isPending || !formColaborador.nome || !formColaborador.funcao}>
                {criarColaborador.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cadastrar colaborador
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogTecnico} onOpenChange={setDialogTecnico}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo técnico</DialogTitle>
            <DialogDescription>
              Cria o colaborador e o usuário TECNICO com unidade TH30 automaticamente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitTecnico} className="space-y-4">
            <EquipeFormBase value={formTecnico} onChange={(v) => setFormTecnico((atual) => ({ ...atual, ...v }))} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tec-login">Login *</Label>
                <Input
                  id="tec-login"
                  autoComplete="username"
                  value={formTecnico.login}
                  onChange={(e) => setFormTecnico({ ...formTecnico, login: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tec-senha">Senha inicial *</Label>
                <Input
                  id="tec-senha"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={formTecnico.senha}
                  onChange={(e) => setFormTecnico({ ...formTecnico, senha: e.target.value })}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogTecnico(false)}>Cancelar</Button>
              <Button
                type="submit"
                disabled={
                  criarTecnico.isPending ||
                  !formTecnico.nome ||
                  !formTecnico.funcao ||
                  !formTecnico.login ||
                  formTecnico.senha.length < 8
                }
              >
                {criarTecnico.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cadastrar técnico
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EquipeFormBase({
  value,
  onChange,
}: {
  value: FormBase;
  onChange: (value: FormBase) => void;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="eq-nome">Nome *</Label>
          <Input
            id="eq-nome"
            value={value.nome}
            onChange={(e) => onChange({ ...value, nome: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="eq-funcao">Função *</Label>
          <Input
            id="eq-funcao"
            placeholder="Ex.: Mecânico"
            value={value.funcao}
            onChange={(e) => onChange({ ...value, funcao: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="eq-especialidade">Especialidade</Label>
          <Input
            id="eq-especialidade"
            value={value.especialidade}
            onChange={(e) => onChange({ ...value, especialidade: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="eq-vinculo">Tipo de vínculo</Label>
          <Input
            id="eq-vinculo"
            placeholder="Ex.: CLT ou PJ"
            value={value.tipo_vinculo}
            onChange={(e) => onChange({ ...value, tipo_vinculo: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Contabiliza HH / custo *</Label>
          <Select
            value={value.contabilizar_hh_custo}
            onValueChange={(v) => onChange({ ...value, contabilizar_hh_custo: v as "SIM" | "NAO" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SIM">Sim</SelectItem>
              <SelectItem value="NAO">Não</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}
