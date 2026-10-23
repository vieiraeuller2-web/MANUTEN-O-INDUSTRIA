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
  SessionVerificationError,
  type AuthUser,
  type Perfil,
} from "@/lib/api-client";

// ── Tipos ──────────────────────────────────────────────────────

interface AuthState {
  user: AuthUser | null;
  status: "loading" | "authenticated" | "unauthenticated" | "verification-error";
}

interface AuthContextValue extends AuthState {
  login: (user: string, senha: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  retrySession: () => Promise<void>;
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

// ── Autorização ────────────────────────────────────────────────
// A autorização é baseada EXCLUSIVAMENTE nas `permissoes` do AUTH62.
// Implementação central em src/lib/authz.ts (re-exportada aqui por compatibilidade).
// A antiga matriz PERFIL_ROUTES foi removida: não existe fallback por perfil.

export { canAccessRoute } from "@/lib/authz";
export type { Perfil } from "@/lib/api-client";

// ── Provider ───────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({
    user: null,
    status: "loading",
  });

  const retrySession = useCallback(async () => {
    setState({ user: null, status: "loading" });
    try {
      const user = await apiGetMe();
      setState(user
        ? { user, status: "authenticated" }
        : { user: null, status: "unauthenticated" });
    } catch (error) {
      if (error instanceof SessionVerificationError) {
        setState({ user: null, status: "verification-error" });
        return;
      }
      setState({ user: null, status: "verification-error" });
    }
  }, []);

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      // Falhas temporárias nunca transformam uma sessão não verificada em logout.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const user = await apiGetMe();
          if (active) setState(user
            ? { user, status: "authenticated" }
            : { user: null, status: "unauthenticated" });
          return;
        } catch {
          if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 600));
        }
      }
      if (active) setState({ user: null, status: "verification-error" });
    };
    void bootstrap();

    function handleExpired() {
      if (!active) return;
      setState({ user: null, status: "unauthenticated" });
      queryClient.clear();
    }
    window.addEventListener("cmi:session-expired", handleExpired);
    return () => {
      active = false;
      window.removeEventListener("cmi:session-expired", handleExpired);
    };
  }, [queryClient]);

  const login = useCallback(
    async (user: string, senha: string) => {
      const authUser = await apiLogin(user, senha);
      setState({ user: authUser, status: "authenticated" });
      return authUser;
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
      retrySession,
      hasPerfil,
    }),
    [state, login, logout, retrySession, hasPerfil]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
