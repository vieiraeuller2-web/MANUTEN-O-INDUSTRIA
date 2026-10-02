import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  apiGetMe,
  apiLogin,
  apiLogout,
  type AuthUser,
  type Perfil,
} from "@/lib/api-client";

// ── Tipos ──────────────────────────────────────────────────────

interface AuthState {
  user: AuthUser | null;
  status: "loading" | "authenticated" | "unauthenticated";
}

interface AuthContextValue extends AuthState {
  login: (user: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Verifica se o usuário possui pelo menos um dos perfis */
  hasPerfil: (...perfis: Perfil[]) => boolean;
}

// ── Contexto ───────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser utilizado dentro de <AuthProvider>");
  }
  return ctx;
}

// ── Permissões por perfil ──────────────────────────────────────

export const PERFIL_ROUTES: Record<Perfil, string[]> = {
  ADM: ["*"], // acesso completo
  PCM: [
    "/lubrificacao",
    "/os/nova",
    "/os",
    "/servicos-externos",
    "/lancamentos",
    "/obras",
    "/planos-manutencao",
    "/equipe",
  ],
  GESTAO: ["/relatorios", "/lubrificacao"],
  TECNICO: ["/os/nova", "/os"],
};

export function canAccessRoute(perfil: Perfil | undefined, path: string): boolean {
  if (!perfil) return false;
  const routes = PERFIL_ROUTES[perfil];
  if (!routes) return false;
  if (routes.includes("*")) return true;
  return routes.some((r) => path === r || path.startsWith(r + "/"));
}

// ── Provider ───────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({
    user: null,
    status: "loading",
  });

  // Verifica sessão ao montar
  useEffect(() => {
    let mounted = true;

    apiGetMe().then((user) => {
      if (!mounted) return;
      if (user) {
        setState({ user, status: "authenticated" });
      } else {
        setState({ user: null, status: "unauthenticated" });
      }
    });

    // Escuta evento de sessão expirada do api-client
    function handleExpired() {
      if (!mounted) return;
      setState({ user: null, status: "unauthenticated" });
      queryClient.clear();
    }

    window.addEventListener("cmi:session-expired", handleExpired);
    return () => {
      mounted = false;
      window.removeEventListener("cmi:session-expired", handleExpired);
    };
  }, [queryClient]);

  const login = useCallback(
    async (user: string, senha: string) => {
      const authUser = await apiLogin(user, senha);
      setState({ user: authUser, status: "authenticated" });
    },
    []
  );

  const logout = useCallback(async () => {
    await apiLogout();
    queryClient.clear(); // limpa caches protegidos
    setState({ user: null, status: "unauthenticated" });
  }, [queryClient]);

  const hasPerfil = useCallback(
    (...perfis: Perfil[]) => {
      if (!state.user) return false;
      return perfis.includes(state.user.perfil);
    },
    [state.user]
  );

  const value = useMemo(
    () => ({
      ...state,
      login,
      logout,
      hasPerfil,
    }),
    [state, login, logout, hasPerfil]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
