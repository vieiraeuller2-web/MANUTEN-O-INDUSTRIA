export function exportToCSV(filename: string, headers: string[], rows: string[][]) {
  const BOM = "\uFEFF";
  const csv = [
    headers.join(";"),
    ...rows.map(r => r.map(cell => `"${(cell ?? "").replace(/"/g, '""')}"`).join(";")),
  ].join("\r\n");

  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
