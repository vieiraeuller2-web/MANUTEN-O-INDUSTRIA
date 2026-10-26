import type { GASResponse } from "./gas-client.js";

/**
 * Classifica exclusivamente a CATEGORIA do erro do GAS.
 * Nunca expor, registrar ou devolver a mensagem original: alguns backends
 * incluem token, login ou detalhes de planilha nas mensagens de erro.
 */
export function diagnosticarFalhaAuthMe(response: GASResponse): {
  categoria: string;
  motivo: string;
  campos: string;
} {
  const message = [response.message, response.error, response.erro]
    .filter((x): x is string => typeof x === "string").join(" ").toLowerCase();

  const categoria = /timeout|timed? out|tempo limite|excedeu o tempo/.test(message) ? "TIMEOUT" :
    /resposta inv[aá]lida|invalid json|non.json/.test(message) ? "RESPOSTA_INVALIDA" :
    /auth_me|a[cç][aã]o.*(?:inv[aá]lid|desconhecid|n[aã]o encontrad)|unknown action|unsupported action/.test(message) ? "ACAO_NAO_RECONHECIDA" :
    /token|sess[aã]o|session|expirad|revogad|inativ|n[aã]o autorizad/.test(message) ? "SESSAO_OU_TOKEN" :
    /permiss[aã]o|access.denied|proibid|forbidden/.test(message) ? "PERMISSAO_NEGADA" :
    /sheet|planilh|aba |range|coluna|spreadsheet/.test(message) ? "PLANILHA" :
    /error|erro|exception|falha|failed/.test(message) ? "ERRO_BACKEND" :
    message ? "MENSAGEM_NAO_CLASSIFICADA" : "SEM_MENSAGEM";

  // Metadados estruturais autorizados (sem valores de origem ou identidade).
  const allowedKeys = [
    "success", "code", "message", "error", "erro", "authenticated",
    "autenticado", "usuario", "permissoes", "data", "status",
  ];
  const campos = allowedKeys.filter((key) => Object.prototype.hasOwnProperty.call(response, key)).join(",") || "nenhum";

  const motivo = categoria === "TIMEOUT" ? "GAS_TIMEOUT" :
    categoria === "RESPOSTA_INVALIDA" ? "GAS_INVALID_RESPONSE" :
    "AUTH62_NOT_CONFIRMED";
  return { categoria, motivo, campos };
}
