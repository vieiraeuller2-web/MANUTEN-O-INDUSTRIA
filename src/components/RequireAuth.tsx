import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth, canAccessRoute } from "@/contexts/AuthContext";

/**
 * Guard de autenticação e autorização.
 *
 * Decisão:
 *  1. usuário autenticado?
 *  2. módulo AUTH62 da rota atual (src/lib/authz.ts → ROUTE_PERMISSION_MAP)
 *  3. regra com a MESMA precedência do auth62Autorizar_ (wildcard → específica)
 *  4. ação exigida (visualizar por padrão) === true
 *  5. libera ou nega
 *
 * Não há autorização por perfil nem arrays `allow` fixos.
 * A fonte oficial é o AUTH62 (permissoes de auth_me).
 */
interface RequireAuthProps {
  children: React.ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps) {
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

  if (!canAccessRoute(user, location.pathname)) {
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
