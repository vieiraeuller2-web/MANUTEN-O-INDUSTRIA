import type { AuthUser } from "@/lib/api-client";
import type { NavItem } from "@/components/BottomNav";
import { canAccessRoute } from "@/lib/authz";
import { normalizeText } from "@/lib/data-helpers";

export function modulosPermitidos(user: AuthUser | null, items: NavItem[]): NavItem[] {
  if (!user) return [];
  return items.filter((item) =>
    (!item.perfis || item.perfis.includes(user.perfil)) && canAccessRoute(user, item.path),
  );
}

export function pesquisarModulos(items: NavItem[], termo: string): NavItem[] {
  const busca = normalizeText(termo).trim();
  if (!busca) return items;
  return items.filter((item) =>
    normalizeText([item.title, item.label, item.path].filter(Boolean).join(" ")).includes(busca),
  );
}
