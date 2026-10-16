import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Wrench } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessRoute } from "@/lib/authz";
import type { AuthUser } from "@/lib/api-client";

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 stat-card"
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
            <Wrench className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Controle de Manutenção</h1>
          <p className="text-xs text-muted-foreground">
            Acesso restrito — Sistema de Manutenção Industrial
          </p>
        </div>

        <div className="space-y-2">
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

        <div className="space-y-2">
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
              className="absolute right-0 top-0 flex h-full w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
              aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
            >
              {mostrarSenha ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading || status === "loading"}
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Entrar
        </Button>

        <p className="text-[10px] text-center text-muted-foreground/60">
          Em caso de problemas de acesso, contate o administrador do sistema.
        </p>
      </form>
    </div>
  );
}
