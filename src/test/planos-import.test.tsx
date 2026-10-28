import { describe, expect, it, vi } from "vitest";

// A autenticação da aplicação é AUTH62. Não há garantia de que as variáveis
// VITE_SUPABASE_* existam no Preview/produção. A importação de Planos NÃO
// pode inicializar o cliente legado, pois createClient(undefined, ...) lança
// uma exceção síncrona antes de a página renderizar.
vi.mock("@/integrations/supabase/client", () => {
  throw new Error("Regressão: Planos de Manutenção importou o cliente Supabase legado");
});

describe("Planos de Manutenção — carregamento do módulo", () => {
  it("importa sem depender do Supabase legado", async () => {
    const modulo = await import("@/pages/PlanosManutencao");
    expect(typeof modulo.default).toBe("function");
  }, 15_000); // Importação com Vite/SWC pode exceder 5s sob carga no Windows.
});
