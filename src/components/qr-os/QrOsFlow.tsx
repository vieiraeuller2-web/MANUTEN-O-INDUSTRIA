import React, { useState, useEffect, useCallback, type FormEvent } from "react";
import { Loader2, Wrench, AlertCircle, CheckCircle2, ChevronRight, LogOut, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  qrOsLogin,
  qrOsContexto,
  qrOsValidarSessao,
  qrOsRegistrar,
  qrOsLogout,
  type QrOsContextoResponse,
} from "@/services/qrPublicoApi";
import { getSession, saveSession, clearSession } from "@/services/qrOsSession";
import { toast } from "@/hooks/use-toast";

interface QrOsFlowProps {
  codigo: string;
  onSuccess: () => void;
}

const AREAS = ["MAN. MECÂNICA", "MAN. ELÉTRICA", "LUBRIFICAÇÃO", "MISTO", "PREDIAL"];
const TIPOS = ["CORRETIVA", "COR. PRO.", "PREVENTIVA", "COR. EQUIP. RESERV.", "DIVERSOS"];

export default function QrOsFlow({ codigo, onSuccess }: QrOsFlowProps) {
  const [step, setStep] = useState<"idle" | "login" | "loading_context" | "form" | "success">("idle");
  const [contexto, setContexto] = useState<QrOsContextoResponse | null>(null);

  // Formulário de Login
  const [loginForm, setLoginForm] = useState({ login: "", senha: "" });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Formulário OS
  const [osForm, setOsForm] = useState({
    area: "",
    tipo: "",
    data_inicio: "",
    hora_inicio: "",
    data_conclusao: "",
    hora_conclusao: "",
    horimetro: "",
    observacoes: "",
  });
  const [osLoading, setOsLoading] = useState(false);
  const [osError, setOsError] = useState("");
  const [registeredOsId, setRegisteredOsId] = useState("");

  const abrirFluxo = async () => {
    const session = getSession();
    if (!session) {
      setStep("login");
      return;
    }

    setStep("loading_context");
    try {
      const isValid = await qrOsValidarSessao(session.token);
      if (!isValid) {
        clearSession();
        setStep("login");
        return;
      }
      const data = await qrOsContexto(session.token, codigo);
      setContexto(data);
      setStep("form");
    } catch (error) {
      clearSession();
      setStep("login");
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const result = await qrOsLogin(loginForm.login, loginForm.senha, codigo);
      saveSession({
        token: result.token,
        expira_em: result.expira_em,
        nome: result.tecnico.nome,
        login: result.tecnico.login,
      });
      setContexto({
        tecnico: result.tecnico,
        equipamento: result.equipamento,
        id_os_sugerido: `OS-${Date.now()}`, // Fallback in case backend doesn't send it yet
      });
      // Try to fetch proper context to get the real id_os_sugerido if it wasn't returned in login
      setStep("loading_context");
      const ctx = await qrOsContexto(result.token, codigo);
      setContexto(ctx);
      setStep("form");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Erro ao fazer login");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegistrar = async (e: FormEvent) => {
    e.preventDefault();
    setOsError("");
    const session = getSession();
    if (!session) {
      setStep("login");
      return;
    }

    if (!osForm.area || !osForm.tipo || !osForm.data_inicio || !osForm.hora_inicio || !osForm.data_conclusao || !osForm.hora_conclusao || !osForm.horimetro || !osForm.observacoes) {
      setOsError("Preencha todos os campos.");
      return;
    }

    setOsLoading(true);
    try {
      const response = await qrOsRegistrar({
        token: session.token,
        codigo,
        id_os: contexto?.id_os_sugerido,
        area: osForm.area,
        tipo: osForm.tipo,
        data_inicio: osForm.data_inicio,
        hora_inicio: osForm.hora_inicio,
        data_conclusao: osForm.data_conclusao,
        hora_conclusao: osForm.hora_conclusao,
        horimetro: osForm.horimetro,
        observacoes: osForm.observacoes,
      });

      setRegisteredOsId(response.id_os);
      setStep("success");
      onSuccess(); // Refresh public equipment page
    } catch (error) {
      setOsError(error instanceof Error ? error.message : "Erro ao registrar OS.");
    } finally {
      setOsLoading(false);
    }
  };

  const handleLogout = async () => {
    const session = getSession();
    if (session) {
      await qrOsLogout(session.token);
    }
    clearSession();
    toast({ title: "Sessão encerrada" });
    setStep("idle");
  };

  const currentSession = getSession();

  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-900 p-4 rounded-lg border border-slate-800">
        <Button onClick={abrirFluxo} size="lg" className="w-full sm:w-auto text-lg gap-2 font-bold shadow-lg bg-blue-600 hover:bg-blue-500 text-white">
          <Wrench className="h-5 w-5" />
          ORDEM DE SERVIÇO
        </Button>
        {currentSession && (
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span>Técnico: <strong className="text-slate-200">{currentSession.nome}</strong></span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="h-8 px-2 text-slate-400 hover:text-white">
              <LogOut className="h-4 w-4 mr-1" /> Sair
            </Button>
          </div>
        )}
      </div>

      <Dialog open={step === "login"} onOpenChange={(open) => !open && setStep("idle")}>
        <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl">Acesso do Técnico</DialogTitle>
            <DialogDescription className="text-slate-400">
              Faça login para registrar a ordem de serviço.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLogin} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="login">Login</Label>
              <Input
                id="login"
                value={loginForm.login}
                onChange={(e) => setLoginForm({ ...loginForm, login: e.target.value })}
                className="bg-slate-900 border-slate-700 h-12 text-lg"
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                value={loginForm.senha}
                onChange={(e) => setLoginForm({ ...loginForm, senha: e.target.value })}
                className="bg-slate-900 border-slate-700 h-12 text-lg"
                autoComplete="current-password"
              />
            </div>
            {loginError && (
              <div className="p-3 bg-red-900/30 border border-red-900 text-red-200 rounded-md text-sm flex items-start gap-2">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{loginError}</p>
              </div>
            )}
            <Button type="submit" className="w-full h-12 text-lg" disabled={loginLoading || !loginForm.login || !loginForm.senha}>
              {loginLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Entrar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={step === "loading_context"} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800 text-slate-100 [&>button]:hidden">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <p className="text-lg">Carregando dados...</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={step === "form"} onOpenChange={(open) => !open && setStep("idle")}>
        <DialogContent className="sm:max-w-xl max-h-[95vh] overflow-y-auto bg-slate-950 border-slate-800 text-slate-100 w-[95vw] sm:w-full p-4 sm:p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl sm:text-2xl flex items-center gap-2 border-b border-slate-800 pb-2">
              <Wrench className="h-6 w-6 text-blue-500" /> NOVA ORDEM DE SERVIÇO
            </DialogTitle>
          </DialogHeader>

          {contexto && (
            <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-900 p-3 rounded-lg border border-slate-800 text-sm">
              <div>
                <span className="block text-slate-400 text-xs">TAG</span>
                <strong className="text-slate-100">{contexto.equipamento.tag_ativo || "S/ TAG"}</strong>
              </div>
              <div>
                <span className="block text-slate-400 text-xs">EQUIPAMENTO</span>
                <strong className="text-slate-100 truncate block">{contexto.equipamento.nome_ativo}</strong>
              </div>
              <div>
                <span className="block text-slate-400 text-xs">SETOR</span>
                <strong className="text-slate-100">{contexto.equipamento.setor}</strong>
              </div>
              <div>
                <span className="block text-slate-400 text-xs">RESPONSÁVEL</span>
                <strong className="text-slate-100 truncate block">{contexto.tecnico.nome}</strong>
              </div>
            </div>
          )}

          <form onSubmit={handleRegistrar} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="area">Área</Label>
                <select
                  id="area"
                  value={osForm.area}
                  onChange={(e) => setOsForm({ ...osForm, area: e.target.value })}
                  className="w-full h-12 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione...</option>
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <select
                  id="tipo"
                  value={osForm.tipo}
                  onChange={(e) => setOsForm({ ...osForm, tipo: e.target.value })}
                  className="w-full h-12 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione...</option>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_inicio">Data Início</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={osForm.data_inicio}
                  onChange={(e) => setOsForm({ ...osForm, data_inicio: e.target.value })}
                  className="bg-slate-900 border-slate-700 h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hora_inicio">Hora Início</Label>
                <Input
                  id="hora_inicio"
                  type="time"
                  value={osForm.hora_inicio}
                  onChange={(e) => setOsForm({ ...osForm, hora_inicio: e.target.value })}
                  className="bg-slate-900 border-slate-700 h-12"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_conclusao">Data Conclusão</Label>
                <Input
                  id="data_conclusao"
                  type="date"
                  value={osForm.data_conclusao}
                  onChange={(e) => setOsForm({ ...osForm, data_conclusao: e.target.value })}
                  className="bg-slate-900 border-slate-700 h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hora_conclusao">Hora Conclusão</Label>
                <Input
                  id="hora_conclusao"
                  type="time"
                  value={osForm.hora_conclusao}
                  onChange={(e) => setOsForm({ ...osForm, hora_conclusao: e.target.value })}
                  className="bg-slate-900 border-slate-700 h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="horimetro">Horímetro</Label>
              <Input
                id="horimetro"
                type="number"
                inputMode="decimal"
                value={osForm.horimetro}
                onChange={(e) => setOsForm({ ...osForm, horimetro: e.target.value })}
                className="bg-slate-900 border-slate-700 h-12 text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Descrição / Observações do Serviço</Label>
              <Textarea
                id="observacoes"
                value={osForm.observacoes}
                onChange={(e) => setOsForm({ ...osForm, observacoes: e.target.value })}
                className="bg-slate-900 border-slate-700 min-h-[100px] text-lg"
              />
            </div>

            {osError && (
              <div className="p-3 bg-red-900/30 border border-red-900 text-red-200 rounded-md text-sm flex items-start gap-2">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{osError}</p>
              </div>
            )}

            <Button type="submit" className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-500 text-white mt-4" disabled={osLoading}>
              {osLoading ? <Loader2 className="animate-spin h-6 w-6" /> : "REGISTRAR ORDEM DE SERVIÇO"}
            </Button>
            
            <Button type="button" variant="ghost" onClick={() => setStep("idle")} className="w-full h-12 text-slate-400 hover:text-white" disabled={osLoading}>
              Cancelar
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={step === "success"} onOpenChange={(open) => !open && setStep("idle")}>
        <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800 text-slate-100 text-center">
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <DialogTitle className="text-2xl text-green-400">ORDEM DE SERVIÇO REGISTRADA</DialogTitle>
            
            <div className="bg-slate-900 p-4 rounded-lg w-full text-left space-y-2 mt-4 border border-slate-800">
              <p className="text-slate-300">OS: <strong className="text-white text-lg">{registeredOsId}</strong></p>
              <p className="text-slate-300">Equipamento: <br/><strong className="text-white">{contexto?.equipamento.tag_ativo} — {contexto?.equipamento.nome_ativo}</strong></p>
              <p className="text-slate-300">Responsável: <br/><strong className="text-white">{contexto?.tecnico.nome}</strong></p>
            </div>

            <div className="w-full space-y-3 mt-6">
              <Button onClick={() => setStep("idle")} className="w-full h-12 bg-slate-800 hover:bg-slate-700 border border-slate-700">
                <ArrowLeft className="h-4 w-4 mr-2" /> VOLTAR AO PRONTUÁRIO
              </Button>
              <Button onClick={() => {
                setOsForm({ ...osForm, area: "", tipo: "", observacoes: "", horimetro: "" });
                setRegisteredOsId("");
                abrirFluxo();
              }} variant="outline" className="w-full h-12 border-slate-700 hover:bg-slate-800">
                NOVA ORDEM DE SERVIÇO <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
