import { useLocation, useNavigate } from "react-router-dom";
import {
  Droplets,
  PlusCircle,
  ClipboardList,
  UserRound,
  Users,
  Package,
  FileText,
  Truck,
  BarChart3,
  Hammer,
  ListChecks,
  LogOut,
} from "lucide-react";
import { useAuth, canAccessRoute } from "@/contexts/AuthContext";
import type { Perfil } from "@/lib/api-client";

export interface NavItem {
  path: string;
  icon: typeof Droplets;
  label: string;
  title?: string;
  perfis?: Perfil[];
  group: "operacao" | "gestao";
}

export const allNavItems: NavItem[] = [
  { path: "/tecnico", icon: UserRound, label: "Minhas OS", perfis: ["TECNICO"] , group: "operacao"},
  { path: "/tecnico/nova", icon: PlusCircle, label: "Nova OS", perfis: ["TECNICO"] , group: "operacao"},
  { path: "/equipe", icon: Users, label: "Equipe", title: "Equipe / Colaboradores" , group: "operacao"},
  { path: "/", icon: Droplets, label: "Lubrif." , group: "operacao"},
  { path: "/os/nova", icon: PlusCircle, label: "Lançar" , group: "operacao"},
  { path: "/os", icon: ClipboardList, label: "Histórico" , group: "operacao"},
  { path: "/preventivas", icon: Package, label: "Estoque" , group: "gestao"},
  { path: "/planos-manutencao", icon: ListChecks, label: "Planos", title: "Planos de Manutenção" , group: "gestao"},
  { path: "/nf", icon: FileText, label: "NF" , group: "gestao"},
  { path: "/lancamentos", icon: Truck, label: "Serv. Ext." , group: "gestao"},
  { path: "/obras", icon: Hammer, label: "Obras" , group: "gestao"},
  { path: "/relatorios", icon: BarChart3, label: "Relat." , group: "gestao"},
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, status } = useAuth();

  // Não mostra nav se não autenticado
  if (status !== "authenticated" || !user) return null;



  // Filtra itens visíveis pelo perfil
  const visibleItems = allNavItems.filter((item) => {
    if (item.perfis && !item.perfis.includes(user.perfil)) return false;
    return canAccessRoute(user, item.path);
  });

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <nav className="kron-mobile-nav fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
      <div className="kron-mobile-nav__scroll flex items-center h-16 mx-auto px-2 overflow-x-auto">
        {visibleItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path === "/" && location.pathname === "/lubrificacao") ||
            (item.path !== "/" && location.pathname.startsWith(item.path + "/"));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-label={item.title || item.label}
              title={item.title || item.label}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-[72px] shrink-0 active:scale-95 ${
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
          className="flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-[72px] shrink-0 active:scale-95 text-muted-foreground hover:text-destructive"
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
