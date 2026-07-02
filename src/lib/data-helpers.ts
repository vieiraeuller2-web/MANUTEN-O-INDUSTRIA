export function safeString(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  if (!text || text === "undefined" || text === "null" || text === "NaN") return fallback;
  return text;
}

export function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function normalizeText(value: unknown): string {
  return safeString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function textIncludes(value: unknown, query: unknown): boolean {
  const q = normalizeText(query);
  if (!q) return true;
  return normalizeText(value).includes(q);
}

export function paginateData<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);

  return {
    pageItems: items.slice(start, end),
    safePage,
    totalPages,
    start,
    end,
    total,
  };
}

export function uniqueSorted(values: unknown[]): string[] {
  return Array.from(new Set(values.map((v) => safeString(v)).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
}
