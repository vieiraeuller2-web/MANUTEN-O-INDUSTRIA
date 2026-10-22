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
        <section className="kron-login__content" aria-label="Identificação e acesso ao KRON">
          <header className="kron-login__header">
            <span className="kron-login__logo"><Wrench size={29} strokeWidth={1.7} /></span>
            <span className="kron-login__brand">
              <strong>KRON<span className="kron-login__brand-dot">.</span></strong>
              <small>CENTRO DE CONTROLE DA MANUTENÇÃO</small>
            </span>
          </header>

          <h1>O controle da manutenção começa <em>aqui.</em></h1>
          <p className="kron-login__intro">Sua central de operação, rastreabilidade e gestão da manutenção industrial.</p>

          <form onSubmit={handleSubmit} className="kron-login__panel">
            <div className="kron-login__panel-head">
              <div>
                <span className="kron-login__section-tag">ACESSO À CENTRAL</span>
                <h2>Bem-vindo ao KRON</h2>
                <p>Acesse com suas credenciais de trabalho.</p>
              </div>
              <span className="kron-login__panel-icon" aria-hidden="true"><ShieldCheck size={23} /></span>
            </div>

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
                placeholder="Digite seu login"
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
                  placeholder="Digite sua senha"
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((value) => !value)}
                  className="absolute right-0 top-0 flex h-full w-11 items-center justify-center text-slate-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400"
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="kron-login__submit" disabled={loading || status === "loading"}>
              {loading || status === "loading"
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <ArrowRight className="h-4 w-4" />}
              {loading ? "Autenticando..." : status === "loading" ? "Verificando sessão..." : "Entrar no KRON"}
            </Button>
            <p className="kron-login__secure"><ShieldCheck size={14} aria-hidden="true" /> Acesso protegido. Em caso de dificuldade, contate o administrador.</p>
          </form>

          <footer className="kron-login__footer">
            <span>KRON / CENTRO DE CONTROLE DA MANUTENÇÃO</span>
            <span>AMBIENTE OPERACIONAL RESTRITO</span>
          </footer>
        </section>

        <aside className="kron-login__visual" aria-hidden="true">
          <div className="kron-login__reticle"><ScanLine size={27} strokeWidth={1.2} /></div>
          <div className="kron-login__visual-caption">
            <span><Activity size={15} /> INDÚSTRIA EM MOVIMENTO</span>
            <strong>PRECISÃO EM CADA OPERAÇÃO.</strong>
            <span>MANUTENÇÃO • CONTROLE • CONFIABILIDADE</span>
          </div>
        </aside>
      </div>
    </main>
  );
}
