import { Component, Suspense, lazy, type ErrorInfo, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNav from "@/components/BottomNav";
import ThemeToggle from "@/components/ThemeToggle";
import RequireAuth from "@/components/RequireAuth";
import { AuthProvider } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const Login = lazy(() => import("./pages/Login"));
const Lubrificacao = lazy(() => import("./pages/Lubrificacao"));
const NovaOS = lazy(() => import("./pages/NovaOS"));
const ListaOS = lazy(() => import("./pages/ListaOS"));
const DetalhesOS = lazy(() => import("./pages/DetalhesOS"));
const EditarOS = lazy(() => import("./pages/EditarOS"));
const Estoque = lazy(() => import("./pages/Estoque"));
const NotasFiscais = lazy(() => import("./pages/NotasFiscais"));
const ServicosExternos = lazy(() => import("./pages/ServicosExternos"));
const RelatoriosHub = lazy(() => import("./pages/RelatoriosHub"));
const Obras = lazy(() => import("./pages/Obras"));
const PlanosManutencao = lazy(() => import("./pages/PlanosManutencao"));
const EquipamentoPublico = lazy(() => import("./pages/EquipamentoPublico"));
const TecnicoMinhasOS = lazy(() => import("./pages/TecnicoMinhasOS"));
const TecnicoNovaOS = lazy(() => import("./pages/TecnicoNovaOS"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Defaults globais: previnem refetches automáticos desnecessários.
      // Cada hook pode sobrescrever individualmente.
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      staleTime: 2 * 60_000, // 2 min default
    },
  },
});

function PageFallback() {
  return (
    <div className="page-container">
      <div className="stat-card flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando tela...
      </div>
    </div>
  );
}

class AppErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erro ao carregar tela:", error, info);
  }

  componentDidUpdate(prevProps: { resetKey: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-container">
          <div className="stat-card border border-destructive/40 bg-destructive/5 text-center py-8">
            <p className="text-sm font-medium text-destructive mb-2">Erro ao carregar esta tela.</p>
            <p className="text-xs text-muted-foreground">Atualize a página ou limpe os filtros.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  return (
    <>
      <ThemeToggle />
      <AppErrorBoundary resetKey={location.pathname}>
        <Suspense fallback={<PageFallback />}>{children}</Suspense>
      </AppErrorBoundary>
      <BottomNav />
    </>
  );
};

/**
 * Wrapper que exige autenticação e perfil específico.
 * ADM tem acesso a tudo.
 */
const Protected = ({ children }: { children: ReactNode }) => (
  <Layout>
    <RequireAuth>{children}</RequireAuth>
  </Layout>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Rotas públicas */}
            <Route
              path="/equipamento/:codigo"
              element={
                <Suspense fallback={<PageFallback />}>
                  <EquipamentoPublico />
                </Suspense>
              }
            />
            <Route
              path="/login"
              element={
                <Suspense fallback={<PageFallback />}>
                  <Login />
                </Suspense>
              }
            />
            {/* Rota legada — redireciona para /login */}
            <Route
              path="/auth"
              element={
                <Suspense fallback={<PageFallback />}>
                  <Login />
                </Suspense>
              }
            />

            {/* Rotas protegidas por perfil */}
            <Route
              path="/tecnico/nova"
              element={
                <Protected>
                  <TecnicoNovaOS />
                </Protected>
              }
            />
            <Route
              path="/tecnico"
              element={
                <Protected>
                  <TecnicoMinhasOS />
                </Protected>
              }
            />
            <Route
              path="/"
              element={
                <Protected>
                  <Lubrificacao />
                </Protected>
              }
            />
            <Route
              path="/lubrificacao"
              element={
                <Protected>
                  <Lubrificacao />
                </Protected>
              }
            />
            <Route
              path="/os/nova"
              element={
                <Protected>
                  <NovaOS />
                </Protected>
              }
            />
            <Route
              path="/os"
              element={
                <Protected>
                  <ListaOS />
                </Protected>
              }
            />
            <Route
              path="/os/:id"
              element={
                <Protected>
                  <DetalhesOS />
                </Protected>
              }
            />
            <Route
              path="/os/:id/editar"
              element={
                <Protected>
                  <EditarOS />
                </Protected>
              }
            />
            <Route
              path="/preventivas"
              element={
                <Protected>
                  <Estoque />
                </Protected>
              }
            />
            <Route
              path="/nf"
              element={
                <Protected>
                  <NotasFiscais />
                </Protected>
              }
            />
            <Route
              path="/lancamentos"
              element={
                <Protected>
                  <ServicosExternos />
                </Protected>
              }
            />
            <Route
              path="/servicos-externos"
              element={
                <Protected>
                  <ServicosExternos />
                </Protected>
              }
            />
            <Route
              path="/obras"
              element={
                <Protected>
                  <Obras />
                </Protected>
              }
            />
            <Route
              path="/planos-manutencao"
              element={
                <Protected>
                  <PlanosManutencao />
                </Protected>
              }
            />
            <Route
              path="/relatorios"
              element={
                <Protected>
                  <RelatoriosHub />
                </Protected>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
