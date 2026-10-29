import { useMemo, useState, type FormEvent } from "react";
import { KeyRound, Loader2, Plus, RefreshCw, Search, UserPlus, Users } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import CriarAcessoDialog from "@/components/equipe/CriarAcessoDialog";
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
  useEquipeAcessos,
  useEquipeColaboradores,
} from "@/hooks/use-equipe";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessModule } from "@/lib/authz";
import type { EquipeColaborador } from "@/lib/equipe-contract";
import { agruparAcessosPorColaborador, filtrarEquipe, type FiltroAcesso, type FiltroSituacao } from "@/lib/equipe-view";

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
  const [situacao, setSituacao] = useState<FiltroSituacao>("todos");
  const [filtroAcesso, setFiltroAcesso] = useState<FiltroAcesso>("todos");
  const [dialogColaborador, setDialogColaborador] = useState(false);
  const [dialogTecnico, setDialogTecnico] = useState(false);
  const [dialogAcesso, setDialogAcesso] = useState(false);
  const [colaboradorAcesso, setColaboradorAcesso] = useState<EquipeColaborador | null>(null);
  const [formColaborador, setFormColaborador] = useState<FormBase>(formBaseInicial);
  const [formTecnico, setFormTecnico] = useState<FormBase & { login: string; senha: string }>({
    ...formBaseInicial,
    login: "",
    senha: "",
  });

  const podeCriar = canAccessModule(user?.permissoes, "EQUIPE_COLABORADORES", "criar");
  const podeCriarAcesso =
    user?.perfil === "ADM" ||
    (user?.perfil === "PCM" &&
      canAccessModule(user?.permissoes, "EQUIPE_COLABORADORES", "executar"));
  const colaboradoresQuery = useEquipeColaboradores();
  const acessosQuery = useEquipeAcessos();
  const criarColaborador = useCriarEquipeColaborador();
  const criarTecnico = useCriarEquipeTecnico();

  const colaboradores = colaboradoresQuery.data?.colaboradores ?? [];
  const acessosConfirmados = acessosQuery.isSuccess && Array.isArray(acessosQuery.data?.acessos);
  const acessos = acessosConfirmados ? (acessosQuery.data?.acessos ?? []) : [];
  const acessosPorColaborador = useMemo(() => agruparAcessosPorColaborador(acessos), [acessos]);
  const filtrados = useMemo(() => filtrarEquipe(colaboradores, acessosPorColaborador, {
    busca,
    situacao,
    acesso: filtroAcesso,
    acessoConfirmado: acessosConfirmados,
  }), [busca, situacao, filtroAcesso, colaboradores, acessosPorColaborador, acessosConfirmados]);

  const totais = useMemo(() => ({
    ativos: colaboradores.filter((c) => String(c.ativo).trim().toUpperCase() === "SIM").length,
    comAcesso: colaboradores.filter((c) => (acessosPorColaborador.get(c.id_colaborador)?.length ?? 0) > 0).length,
  }), [colaboradores, acessosPorColaborador]);

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

  // Falha na consulta de acessos não pode apagar a listagem de colaboradores.
  const carregando = colaboradoresQuery.isLoading;
  const erro = colaboradoresQuery.error;

  return (
    <div className="page-container max-w-5xl pb-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title="Equipe / Colaboradores" subtitle="Cadastro e consulta da equipe de manutenção" />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void colaboradoresQuery.refetch();
              void acessosQuery.refetch();
            }}
            disabled={
              colaboradoresQuery.isFetching ||
              acessosQuery.isFetching
            }
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
        <CardContent className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
            <div><p className="text-muted-foreground">Colaboradores</p><p className="text-lg font-semibold">{colaboradores.length}</p></div>
            <div><p className="text-muted-foreground">Ativos</p><p className="text-lg font-semibold">{totais.ativos}</p></div>
            {acessosConfirmados && <div><p className="text-muted-foreground">Com acesso</p><p className="text-lg font-semibold">{totais.comAcesso}</p></div>}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              aria-label="Buscar colaboradores"
              placeholder="Buscar nome, função, especialidade ou login"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="filtro-situacao">Situação</Label>
              <Select value={situacao} onValueChange={(v) => setSituacao(v as FiltroSituacao)}>
                <SelectTrigger id="filtro-situacao"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativos">Ativos</SelectItem>
                  <SelectItem value="inativos">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="filtro-acesso">Acesso ao sistema</Label>
              <Select
                value={acessosConfirmados ? filtroAcesso : "todos"}
                onValueChange={(v) => setFiltroAcesso(v as FiltroAcesso)}
                disabled={!acessosConfirmados}
              >
                <SelectTrigger id="filtro-acesso"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="com">Com acesso</SelectItem>
                  <SelectItem value="sem">Sem acesso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {acessosQuery.isError && (
            <p role="alert" className="text-xs text-destructive">
              Não foi possível consultar os acessos. A lista de colaboradores continua disponível,
              mas vínculos e criação de novos acessos ficam indisponíveis até atualizar.
            </p>
          )}
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
            {filtrados.length} de {colaboradores.length} colaborador(es) exibido(s)
          </p>
          {filtrados.length === 0 && (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
              Nenhum colaborador encontrado com os filtros selecionados.
            </CardContent></Card>
          )}

          {filtrados.map((c) => {
            const acessosDoColaborador = acessosPorColaborador.get(c.id_colaborador) ?? [];
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
                      {acessosDoColaborador.length > 0 && (
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                          {acessosDoColaborador.length} acesso(s)
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
                      <div className="flex flex-wrap items-center gap-2">
                        {!acessosConfirmados ? (
                          <p className="text-muted-foreground">
                            {acessosQuery.isLoading ? "Verificando acessos..." : "Acessos indisponíveis"}
                          </p>
                        ) : acessosDoColaborador.length === 0 ? (
                          <p className="text-muted-foreground">Sem acesso</p>
                        ) : (
                          <div className="space-y-1">
                            {acessosDoColaborador.map((acesso) => (
                              <p key={acesso.id_usuario || acesso.login} className="font-medium">
                                {acesso.login} • {acesso.perfil} • {String(acesso.ativo).toUpperCase() === "SIM" ? "ativo" : "inativo"}
                              </p>
                            ))}
                          </div>
                        )}
                        {acessosConfirmados && acessosDoColaborador.length === 0 && podeCriarAcesso && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => {
                              setColaboradorAcesso(c);
                              setDialogAcesso(true);
                            }}
                          >
                            <KeyRound className="mr-1 h-3 w-3" />
                            Criar acesso
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {user && (
        <CriarAcessoDialog
          colaborador={colaboradorAcesso}
          open={dialogAcesso}
          onOpenChange={setDialogAcesso}
          perfilSolicitante={user.perfil}
          unidadePadrao={user.unidade || "TH30"}
        />
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
