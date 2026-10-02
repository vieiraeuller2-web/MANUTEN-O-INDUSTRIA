/**
 * BACKEND PATCH — opcoes_formulario_os v1.0
 * 
 * Extensão do contrato: action #48 (além das 46 originais)
 * 
 * Retorna APENAS as opções necessárias para o formulário de OS.
 * O frontend NÃO precisa carregar o histórico inteiro para popular dropdowns.
 * 
 * Uso: adicionar ao doPost/doGet do Apps Script como nova action.
 */

// eslint-disable-next-line no-unused-vars
function opcoes_formulario_os(params, sessao) {
  // ── Autorização ──────────────────────────────────────────────
  if (!sessao || !sessao.token) {
    return { success: false, code: 401, message: "Sessão inválida" };
  }

  var autorizado = auth62Autorizar_(sessao, "LANCAMENTO_OS", "LER");
  if (!autorizado) {
    return { success: false, code: 403, message: "Sem permissão para acessar opções de OS" };
  }

  // ── Leitura da planilha ───────────────────────────────────────
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("BD");
  if (!sheet) {
    return { success: false, message: "Aba BD não encontrada" };
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow < 2) {
    return {
      success: true,
      action: "opcoes_formulario_os",
      equipamentos: [],
      setores: [],
      areas: [],
      responsaveis: [],
      tipos: []
    };
  }

  // Cabeçalhos
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var colIndex = {};
  headers.forEach(function(h, i) {
    colIndex[normalizeColumnKey_(h)] = i;
  });

  // Lê apenas as colunas necessárias para extrair valores únicos
  // Otimização: lê apenas as colunas relevantes em vez de toda a planilha
  var colsNeeded = ["equipamento", "setor", "area", "responsavel", "tipo"];
  var sets = {};
  colsNeeded.forEach(function(col) { sets[col] = {}; });

  // Lê toda a tabela uma vez (inevitável no Sheets, mas eficiente com getValues em bloco)
  var allData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  for (var i = 0; i < allData.length; i++) {
    var row = allData[i];
    colsNeeded.forEach(function(col) {
      if (colIndex[col] !== undefined) {
        var val = String(row[colIndex[col]] || "").trim();
        if (val) sets[col][val.toUpperCase()] = val;
      }
    });
  }

  // Converte para arrays ordenados
  function sortedValues(obj) {
    return Object.values(obj).sort(function(a, b) {
      return String(a).localeCompare(String(b), "pt-BR");
    });
  }

  return {
    success: true,
    action: "opcoes_formulario_os",
    equipamentos: sortedValues(sets.equipamento),
    setores: sortedValues(sets.setor),
    areas: sortedValues(sets.area),
    responsaveis: sortedValues(sets.responsavel),
    tipos: sortedValues(sets.tipo)
  };
}
