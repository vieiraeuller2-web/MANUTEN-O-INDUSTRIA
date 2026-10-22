import "@testing-library/jest-dom";
import { vi } from "vitest";

// Apenas Vitest: mocks locais para o cliente Supabase legado importado por
// sheets-api. Esses testes não fazem chamadas reais ao Supabase e não devem
// depender de credenciais da Vercel, de .env.local ou do ambiente do operador.
vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-only-publishable-key");
vi.stubEnv("VITE_SUPABASE_PROJECT_ID", "example");

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

class ResizeObserverMock implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  configurable: true,
  value: ResizeObserverMock,
});
