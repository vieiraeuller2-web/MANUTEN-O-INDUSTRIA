import { useLocation, useNavigate } from "react-router-dom";
import { Droplets, PlusCircle, ClipboardList, Package, FileText, Truck, BarChart3, Hammer } from "lucide-react";

const navItems = [
  { path: "/", icon: Droplets, label: "Lubrif." },
  { path: "/os/nova", icon: PlusCircle, label: "Lançar" },
  { path: "/os", icon: ClipboardList, label: "Histórico" },
  { path: "/preventivas", icon: Package, label: "Estoque" },
  { path: "/nf", icon: FileText, label: "NF" },
  { path: "/lancamentos", icon: Truck, label: "Serv. Ext." },
  { path: "/obras", icon: Hammer, label: "Obras" },
  { path: "/relatorios", icon: BarChart3, label: "Relat." },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-2xl mx-auto px-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-lg transition-colors min-w-0 flex-1 active:scale-95 ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium leading-tight truncate w-full text-center">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
