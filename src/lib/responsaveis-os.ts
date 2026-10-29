import { normalizeText } from "@/lib/data-helpers";

/** Combina o cadastro ativo de colaboradores e os responsáveis históricos da BD. */
export function combinarResponsaveis(
  historicos: string[],
  colaboradoresAtivos: string[],
): string[] {
  const valores = new Map<string, string>();
  for (const item of [...colaboradoresAtivos, ...historicos]) {
    const texto = String(item ?? "").trim();
    if (!texto) continue;
    const chave = normalizeText(texto);
    if (chave && !valores.has(chave)) valores.set(chave, texto);
  }
  return [...valores.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/** Digitação manual é permitida no lançamento administrativo; não é cadastro. */
export function responsavelForaDaLista(valor: string, opcoes: string[]): boolean {
  const texto = String(valor ?? "").trim();
  return Boolean(texto) && !opcoes.some((item) => normalizeText(item) === normalizeText(texto));
}
