import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ALLOWED_ACTIONS,
  resolveGASMethodForAction,
  setSessionCookie,
  encryptSession,
  decryptSession,
  clearSessionCookie,
  getSessionFromCookies,
  type SessionPayload,
} from "../../api/_shared/gas-client";

describe("resolveGASMethodForAction", () => {
  it("usa GET para endpoints KPI homologados como leitura", () => {
    expect(resolveGASMethodForAction("kpi_operacional_resumo")).toBe("GET");
    expect(resolveGASMethodForAction("kpi_hh_custo_resumo")).toBe("GET");
  });

  it("usa GET para leituras confirmadas de técnico e equipe", () => {
    expect(resolveGASMethodForAction("equipe_colaboradores")).toBe("GET");
    expect(resolveGASMethodForAction("equipe_colaborador_historico")).toBe("GET");
    expect(resolveGASMethodForAction("equipe_tecnicos")).toBe("GET");
    expect(resolveGASMethodForAction("minhas_os")).toBe("GET");
  });

  it("preserva POST para escritas confirmadas", () => {
    expect(resolveGASMethodForAction("registrar_os")).toBe("POST");
    expect(resolveGASMethodForAction("os_manual_tecnico")).toBe("POST");
  });

  it("respeita método explícito quando informado", () => {
    expect(
      resolveGASMethodForAction("kpi_operacional_resumo", "POST")
    ).toBe("POST");
  });
});

describe("ALLOWED_ACTIONS técnico/equipe", () => {
  it("libera apenas os contratos técnicos auditados nesta etapa", () => {
    expect(ALLOWED_ACTIONS.has("equipe_colaboradores")).toBe(true);
    expect(ALLOWED_ACTIONS.has("equipe_colaborador_historico")).toBe(true);
    expect(ALLOWED_ACTIONS.has("equipe_colaborador_criar")).toBe(true);
    expect(ALLOWED_ACTIONS.has("equipe_acessos")).toBe(true);
    expect(ALLOWED_ACTIONS.has("equipe_acesso_criar")).toBe(true);
    expect(ALLOWED_ACTIONS.has("equipe_tecnicos")).toBe(true);
    expect(ALLOWED_ACTIONS.has("equipe_tecnico_criar")).toBe(true);
    expect(ALLOWED_ACTIONS.has("equipe_tecnico_status")).toBe(true);
    expect(ALLOWED_ACTIONS.has("equipe_tecnico_redefinir_senha")).toBe(true);
    expect(ALLOWED_ACTIONS.has("minhas_os")).toBe(true);
    expect(ALLOWED_ACTIONS.has("os_manual_tecnico")).toBe(true);
  });

  it("mantém escritas administrativas de técnico como POST", () => {
    expect(resolveGASMethodForAction("equipe_colaborador_criar")).toBe("POST");
    expect(resolveGASMethodForAction("equipe_acessos")).toBe("GET");
    expect(resolveGASMethodForAction("equipe_acesso_criar")).toBe("POST");
    expect(resolveGASMethodForAction("equipe_tecnico_criar")).toBe("POST");
    expect(resolveGASMethodForAction("equipe_tecnico_status")).toBe("POST");
    expect(resolveGASMethodForAction("equipe_tecnico_redefinir_senha")).toBe("POST");
  });

  it("mantém fora da whitelist as actions genéricas de acesso ainda não homologadas", () => {
    expect(ALLOWED_ACTIONS.has("equipe_acesso_status")).toBe(false);
    expect(ALLOWED_ACTIONS.has("equipe_acesso_redefinir_senha")).toBe(false);
  });

  it("alinha o cookie Vercel ao TTL de 12h do AUTH62", () => {
    expect(setSessionCookie("teste")).toContain("Max-Age=43200");
  });
});

describe("hardening da sessão criptografada", () => {
  const originalSecret = process.env.SESSION_COOKIE_SECRET;
  const testSecret = "segredo-de-teste-local-com-mais-de-32-caracteres";
  const agora = Date.now();

  const sessaoBase: SessionPayload = {
    token: "token-ficticio-apenas-para-teste",
    perfil: "TECNICO",
    nome: "Tecnico Teste",
    login: "tecnico.teste",
    unidade: "TH30",
    criado_em: agora,
    permissoes: [],
  };

  beforeAll(() => {
    process.env.SESSION_COOKIE_SECRET = testSecret;
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.SESSION_COOKIE_SECRET;
    } else {
      process.env.SESSION_COOKIE_SECRET = originalSecret;
    }
  });

  it("descriptografa uma sessão válida sem expor o token no cookie em texto puro", async () => {
    const cookie = await encryptSession(sessaoBase);
    expect(cookie).not.toContain(sessaoBase.token);
    expect(await decryptSession(cookie)).toEqual(sessaoBase);
  });

  it("nega sessão ausente", () => {
    expect(getSessionFromCookies(null)).toBeNull();
    expect(getSessionFromCookies("outro_cookie=valor")).toBeNull();
  });

  it("nega cookie adulterado", async () => {
    const cookie = await encryptSession(sessaoBase);
    const pos = Math.floor(cookie.length / 2);
    const trocado = cookie[pos] === "A" ? "B" : "A";
    const alterado = cookie.slice(0, pos) + trocado + cookie.slice(pos + 1);
    expect(await decryptSession(alterado)).toBeNull();
  });

  it("nega cookie inválido ou ilegível", async () => {
    expect(await decryptSession("cookie-invalido")).toBeNull();
  });

  it("nega sessão expirada após 12 horas", async () => {
    const expirado = await encryptSession({
      ...sessaoBase,
      criado_em: Date.now() - 12 * 60 * 60 * 1000 - 60_000,
    });
    expect(await decryptSession(expirado)).toBeNull();
  });

  it("mantém atributos de segurança e limpeza do cookie", () => {
    const criado = setSessionCookie("valor-ficticio");
    expect(criado).toContain("HttpOnly");
    expect(criado).toContain("SameSite=Lax");
    expect(criado).toContain("Path=/");
    const limpo = clearSessionCookie();
    expect(limpo).toContain("Max-Age=0");
    expect(limpo).toContain("HttpOnly");
  });
});
