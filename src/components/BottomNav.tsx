import { useLocation, useNavigate } from "react-router-dom";
import {
  Droplets,
  PlusCircle,
  ClipboardList,
  Package,
  FileText,
  Truck,
  BarChart3,
  Hammer,
  ListChecks,
  LogOut,
} from "lucide-react";
import { useAuth, canAccessRoute } from "@/contexts/AuthContext";

interface NavItem {
  path: string;
  icon: typeof Droplets;
  label: string;
  title?: string;
}

const allNavItems: NavItem[] = [
  { path: "/", icon: Droplets, label: "Lubrif." },
  { path: "/os/nova", icon: PlusCircle, label: "Lançar" },
  { path: "/os", icon: ClipboardList, label: "Histórico" },
  { path: "/preventivas", icon: Package, label: "Estoque" },
  { path: "/planos-manutencao", icon: ListChecks, label: "Planos", title: "Planos de Manutenção" },
  { path: "/nf", icon: FileText, label: "NF" },
  { path: "/lancamentos", icon: Truck, label: "Serv. Ext." },
  { path: "/obras", icon: Hammer, label: "Obras" },
  { path: "/relatorios", icon: BarChart3, label: "Relat." },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, status } = useAuth();

  // Não mostra nav se não autenticado
  if (status !== "authenticated" || !user) return null;



  // Filtra itens visíveis pelo perfil
  const visibleItems = allNavItems.filter((item) =>
    canAccessRoute(user, item.path)
  );

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-2xl mx-auto px-1">
        {visibleItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-label={item.title || item.label}
              title={item.title || item.label}
              className={`flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-lg transition-colors min-w-0 flex-1 active:scale-95 ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon
                className="w-5 h-5"
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="text-[10px] font-medium leading-tight truncate w-full text-center">
                {item.label}
              </span>
            </button>
          );
        })}
        <button
          onClick={handleLogout}
          aria-label="Sair"
          title="Sair do sistema"
          className="flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-lg transition-colors min-w-0 flex-1 active:scale-95 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="w-5 h-5" strokeWidth={2} />
          <span className="text-[10px] font-medium leading-tight truncate w-full text-center">
            Sair
          </span>
        </button>
      </div>
    </nav>
  );
}
