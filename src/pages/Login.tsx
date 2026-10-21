import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, ShieldCheck, Activity, ScanLine, ArrowRight, Wrench } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessRoute } from "@/lib/authz";
import type { AuthUser } from "@/lib/api-client";
import "./Login.css";

/**
 * Página de login real usando autenticação do Apps Script.
 * Substitui a tela de login Supabase.
 * 
 * A senha existe apenas durante a requisição.
 * Nunca é salva, logada, ou enviada para analytics.
 */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, status, user } = useAuth();
  const [userLogin, setUserLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);

  const getInitialRoute = (user: AuthUser) => {
    const from = (location.state as any)?.from?.pathname;
    if (from && from !== "/" && canAccessRoute(user, from)) return from;
    
    // Fallbacks preferenciais se tentar acessar a raiz (/) ou sem "from"
    if (canAccessRoute(user, "/relatorios")) return "/relatorios";
    if (canAccessRoute(user, "/lubrificacao")) return "/lubrificacao";
    if (canAccessRoute(user, "/os")) return "/os";
    if (canAccessRoute(user, "/tecnico")) return "/tecnico";
    
    return "/";
  };

  // Se já autenticado, redireciona
  if (status === "authenticated" && user) {
    navigate(getInitialRoute(user), { replace: true });
    return null;
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userLogin.trim() || !senha) return;

    setLoading(true);
    try {
      const authUser = await login(userLogin.trim(), senha);
      navigate(getInitialRoute(authUser || user), { replace: true });
    } catch (err: any) {
      toast({
        title: "Erro de autenticação",
        description: err?.message || "Credenciais inválidas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="kron-login">
      <div className="kron-login__media" aria-hidden="true">
        <video
          className="kron-login__video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/kron-login-poster.svg"
        >
          <source src="/kron-maintenance.mp4" type="video/mp4" />
        </video>
        <div className="kron-login__grid" />
        <div className="kron-login__scan" />
      </div>

      <div className="kron-login__layout">
        <section className="kron-login__hero" aria-label="Apresentação do KRON">
          <div className="kron-login__eyebrow"><span className="kron-login__pulse" /> PLATAFORMA INDUSTRIAL</div>
          <div className="kron-login__brand">
            <div className="kron-login__mark"><Wrench size={35} strokeWidth={1.7} /></div>
            <span>KRON<span className="kron-login__brand-dot">.</span></span>
          </div>
          <h1>Centro de Controle<br />da Manutenção<span className="kron-login__brand-dot">.</span></h1>
          <p>Operação industrial sob controle. Um ambiente para acompanhar, executar e evoluir sua manutenção.</p>
          <div className="kron-login__hero-bottom">
            <span><Activity size={17} /> CONTROLE OPERACIONAL</span>
            <span><ScanLine size={17} /> RASTREABILIDADE</span>
          </div>
        </section>

        <section className="kron-login__access" aria-label="Acesso ao sistema">
          <form onSubmit={handleSubmit} className="kron-login__panel">
            <div className="kron-login__panel-top">
              <span className="kron-login__panel-icon"><ShieldCheck size={22} /></span>
              <span className="kron-login__secure">AMBIENTE RESTRITO</span>
            </div>
            <p className="kron-login__section-tag">IDENTIFICAÇÃO</p>
            <h2>Bem-vindo ao KRON</h2>
            <p className="kron-login__muted">Entre com suas credenciais para acessar a central.</p>

            <div className="kron-login__field">
              <Label htmlFor="login-field">Login</Label>
              <Input
                id="login-field"
                type="text"
                value={userLogin}
                onChange={(e) => setUserLogin(e.target.value)}
                required
                autoComplete="username"
                autoFocus
                placeholder="Seu login"
              />
            </div>

            <div className="kron-login__field">
              <Label htmlFor="senha-field">Senha</Label>
              <div className="relative">
                <Input
                  id="senha-field"
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  minLength={4}
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((value) => !value)}
                  className="absolute right-0 top-0 flex h-full w-11 items-center justify-center text-slate-400 transition-colors hover:text-white"
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="kron-login__submit" disabled={loading || status === "loading"}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {loading ? "Autenticando..." : "Acessar central"}
            </Button>

            <div className="kron-login__panel-footer">
              <ShieldCheck size={15} />
              Acesso protegido. Em caso de dificuldade, contate o administrador.
            </div>
          </form>
          <div className="kron-login__access-signature">KRON / CENTRO DE CONTROLE DA MANUTENÇÃO</div>
        </section>
      </div>
    </main>
  );
}
