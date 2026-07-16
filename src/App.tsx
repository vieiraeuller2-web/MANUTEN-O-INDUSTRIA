import { Component, Suspense, lazy, type ErrorInfo, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNav from "@/components/BottomNav";
import ThemeToggle from "@/components/ThemeToggle";
import { Loader2 } from "lucide-react";

const Lubrificacao = lazy(() => import("./pages/Lubrificacao"));
const NovaOS = lazy(() => import("./pages/NovaOS"));
const ListaOS = lazy(() => import("./pages/ListaOS"));
const DetalhesOS = lazy(() => import("./pages/DetalhesOS"));
const EditarOS = lazy(() => import("./pages/EditarOS"));
const Estoque = lazy(() => import("./pages/Estoque"));
const NotasFiscais = lazy(() => import("./pages/NotasFiscais"));
const ServicosExternos = lazy(() => import("./pages/ServicosExternos"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Obras = lazy(() => import("./pages/Obras"));
const PlanosManutencao = lazy(() => import("./pages/PlanosManutencao"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout><Lubrificacao /></Layout>} />
          <Route path="/lubrificacao" element={<Layout><Lubrificacao /></Layout>} />
          <Route path="/os/nova" element={<Layout><NovaOS /></Layout>} />
          <Route path="/os" element={<Layout><ListaOS /></Layout>} />
          <Route path="/os/:id" element={<Layout><DetalhesOS /></Layout>} />
          <Route path="/os/:id/editar" element={<Layout><EditarOS /></Layout>} />
          <Route path="/preventivas" element={<Layout><Estoque /></Layout>} />
          <Route path="/nf" element={<Layout><NotasFiscais /></Layout>} />
          <Route path="/lancamentos" element={<Layout><ServicosExternos /></Layout>} />
          <Route path="/servicos-externos" element={<Layout><ServicosExternos /></Layout>} />
          <Route path="/obras" element={<Layout><Obras /></Layout>} />
          <Route path="/planos-manutencao" element={<Layout><PlanosManutencao /></Layout>} />
          <Route path="/relatorios" element={<Layout><Relatorios /></Layout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
