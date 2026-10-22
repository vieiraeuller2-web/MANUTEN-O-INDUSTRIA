import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowUpRight, ChevronRight, CircleDot, LogOut, Plus, ShieldCheck } from "lucide-react";
import BottomNav, { allNavItems, type NavItem } from "@/components/BottomNav";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth, canAccessRoute } from "@/contexts/AuthContext";
import "./KronShell.css";

function isSelected(pathname: string, path: string): boolean {
  if (path === "/") return pathname === "/" || pathname === "/lubrificacao";
  if (path === "/os") return pathname === "/os" || /^\/os\/[^/]+(?:\/editar)?$/.test(pathname);
  return pathname === path || pathname.startsWith(path + "/");
}

function getCurrentLabel(pathname: string) {
  if (pathname.startsWith("/os/") && pathname !== "/os/nova") return "Detalhes da ordem";
  return allNavItems.find((item) => isSelected(pathname, item.path))?.title
    || allNavItems.find((item) => isSelected(pathname, item.path))?.label
    || "Centro de controle";
}

export default function KronShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, status, logout } = useAuth();

  // RequireAuth continua sendo a única barreira de acesso: o shell
  // não mostra navegação nem dados do usuário antes da autenticação.
  if (status !== "authenticated" || !user) return <>{children}</>;

  const visibleItems = allNavItems.filter(
    (item) => (!item.perfis || item.perfis.includes(user.perfil)) && canAccessRoute(user, item.path),
  );
  const currentLabel = getCurrentLabel(location.pathname);
  const allowNewOS = canAccessRoute(user, "/os/nova");
  const menuGroups = [
    { title: "OPERAÇÃO", items: visibleItems.filter((item) => item.group === "operacao") },
    { title: "GESTÃO E APOIO", items: visibleItems.filter((item) => item.group === "gestao") },
  ].filter((group) => group.items.length > 0);

  const goTo = (item: NavItem) => navigate(item.path);
  const signOut = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="kron-shell">
      <aside className="kron-sidebar" aria-label="Navegação do KRON">
        <button
          type="button"
          className="kron-sidebar__brand"
          onClick={() => navigate(visibleItems[0]?.path ?? "/")}
          aria-label="KRON — abrir primeiro módulo autorizado"
        >
          <span className="kron-sidebar__monogram">K</span>
          <span className="kron-sidebar__wordmark">
            <strong>KRON<span>.</span></strong>
            <small>CENTRO DE CONTROLE</small>
          </span>
        </button>

        <div className="kron-sidebar__context">
          <div className="kron-sidebar__context-dot"><CircleDot size={16} /></div>
          <div>
            <span>AMBIENTE OPERACIONAL</span>
            <strong>Manutenção industrial</strong>
          </div>
        </div>

        <div className="kron-sidebar__navigation">
          {menuGroups.map((group) => (
            <div className="kron-sidebar__group" key={group.title}>
              <span className="kron-sidebar__group-title">{group.title}</span>
              <nav aria-label={group.title}>
                {group.items.map((item) => {
                  const active = isSelected(location.pathname, item.path);
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => goTo(item)}
                      aria-current={active ? "page" : undefined}
                      className={`kron-sidebar__link ${active ? "is-active" : ""}`}
                      title={item.title || item.label}
                    >
                      <item.icon size={18} strokeWidth={active ? 2 : 1.7} />
                      <span>{item.title || item.label}</span>
                      {active && <span className="kron-sidebar__active-dot" />}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="kron-sidebar__bottom">
          <div className="kron-sidebar__identity">
            <span className="kron-sidebar__avatar">{(user.nome || user.login || "K").charAt(0).toUpperCase()}</span>
            <span className="kron-sidebar__identity-text">
              <strong title={user.nome}>{user.nome || user.login}</strong>
              <small>{user.perfil}{user.unidade ? ` · ${user.unidade}` : ""}</small>
            </span>
            <button type="button" className="kron-sidebar__logout" onClick={signOut} title="Encerrar sessão" aria-label="Sair do KRON"><LogOut size={18}/></button>
          </div>
          <p className="kron-sidebar__version">KRON COMMAND UI <span>•</span> AMBIENTE RESTRITO</p>
        </div>
      </aside>

      <div className="kron-shell__surface">
        <header className="kron-topbar">
          <div className="kron-topbar__brand-mobile"><span>K</span><strong>KRON<b>.</b></strong></div>
          <div className="kron-topbar__location">
            <span>KRON</span>
            <ChevronRight size={14} aria-hidden="true" />
            <strong>{currentLabel}</strong>
          </div>
          <div className="kron-topbar__tools">
            <span className="kron-topbar__auth"><ShieldCheck size={15} /> SESSÃO AUTENTICADA</span>
            {allowNewOS && (
              <button type="button" className="kron-topbar__new" onClick={() => navigate("/os/nova")}>
                <Plus size={16}/><span>Nova ordem de serviço</span><ArrowUpRight size={14}/>
              </button>
            )}
            <ThemeToggle />
            <span className="kron-topbar__avatar" title={user.nome || user.login}>{(user.nome || user.login || "K").charAt(0).toUpperCase()}</span>
          </div>
        </header>

        <main className="kron-shell__main" id="conteudo-principal">
          <div className="kron-shell__main-inner">{children}</div>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
