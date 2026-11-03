import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { allNavItems } from "@/components/BottomNav";
import { modulosPermitidos, pesquisarModulos } from "@/lib/kron-navigation";
import { anteciparModuloAutorizado } from "@/lib/kron-prefetch";
import { useAuth } from "@/contexts/AuthContext";
import "./KronQuickNav.css";

/** Pesquisa local: sem chamadas de rede, sempre filtrada pelas permissoes do AUTH62. */
export default function KronQuickNav() {
  const { user, status } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");

  const autorizados = useMemo(
    () => status === "authenticated" ? modulosPermitidos(user, allNavItems) : [],
    [user, status],
  );
  const resultados = useMemo(() => pesquisarModulos(autorizados, busca), [autorizados, busca]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((atual) => !atual);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status]);

  useEffect(() => {
    if (!open) setBusca("");
  }, [open]);

  useEffect(() => {
    if (status !== "authenticated") setOpen(false);
  }, [status]);

  if (status !== "authenticated" || !user) return null;

  const irPara = (path: string) => {
    setOpen(false);
    setBusca("");
    navigate(path);
  };

  return (
    <>
      <button type="button" className="kron-quicknav-trigger" onClick={() => setOpen(true)}
        aria-label="Pesquisar módulos do KRON" title="Buscar módulos (Ctrl+K)">
        <Search size={17} aria-hidden="true" />
        <span>Buscar módulo</span>
        <kbd>Ctrl K</kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="kron-quicknav-dialog sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Command size={18}/> Navegação rápida</DialogTitle>
            <DialogDescription>Pesquise módulos disponíveis para seu acesso.</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input autoFocus value={busca} onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar histórico, equipe, planos..." aria-label="Pesquisar módulos"
              className="pl-10 h-11" />
          </div>
          <div className="kron-quicknav-results" role="list" aria-label="Módulos encontrados">
            {resultados.length === 0 ? (
              <p className="p-5 text-center text-sm text-muted-foreground">Nenhum módulo autorizado encontrado.</p>
            ) : resultados.map((item) => (
              <button type="button" role="listitem" key={item.path} onClick={() => irPara(item.path)}
                onMouseEnter={() => anteciparModuloAutorizado(item.path)}
                onFocus={() => anteciparModuloAutorizado(item.path)}
                className="kron-quicknav-result">
                <item.icon size={18} aria-hidden="true"/>
                <span className="min-w-0 flex-1 text-left">{item.title || item.label}</span>
                <span className="kron-quicknav-path">{item.path}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
