import { normalizeText } from "@/lib/data-helpers";

/** Retorna o valor canônico da lista do GAS sem aceitar TAGs ou tipos inexistentes. */
export function encontrarOpcaoOficial(valor: string, opcoes: string[]): string | null {
  const chave = normalizeText(valor).trim();
  if (!chave) return null;
  return opcoes.find((opcao) => normalizeText(opcao).trim() === chave) ?? null;
}
