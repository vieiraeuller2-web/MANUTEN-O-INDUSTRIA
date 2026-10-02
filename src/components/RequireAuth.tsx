import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth, canAccessRoute, type Perfil } from "@/contexts/AuthContext";

/**
 * Guard de autenticação e autorização por perfil.
 * 
 * Substitui o RequireAuth antigo baseado em Supabase.
 * 
 * Uso em rotas:
 *   <RequireAuth>            → apenas autenticação
 *   <RequireAuth allow={["ADM","PCM"]}>  → autenticação + perfil
 */
interface RequireAuthProps {
  children: React.ReactNode;
  /** Perfis permitidos. Se omitido, qualquer usuário autenticado é aceito. */
  allow?: Perfil[];
}

export default function RequireAuth({ children, allow }: RequireAuthProps) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Não autenticado → login
  if (status === "unauthenticated" || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Verifica perfil se especificado
  if (allow && allow.length > 0 && !allow.includes(user.perfil)) {
    return (
      <div className="page-container">
        <div className="stat-card border border-destructive/40 bg-destructive/5 text-center py-8">
          <p className="text-sm font-medium text-destructive mb-2">
            Acesso restrito
          </p>
          <p className="text-xs text-muted-foreground">
            Seu perfil ({user.perfil}) não possui permissão para acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  // Verifica se a rota é acessível pelo perfil
  if (!canAccessRoute(user.perfil, location.pathname)) {
    return (
      <div className="page-container">
        <div className="stat-card border border-destructive/40 bg-destructive/5 text-center py-8">
          <p className="text-sm font-medium text-destructive mb-2">
            Acesso não autorizado
          </p>
          <p className="text-xs text-muted-foreground">
            Área restrita para seu perfil ({user.perfil}).
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
