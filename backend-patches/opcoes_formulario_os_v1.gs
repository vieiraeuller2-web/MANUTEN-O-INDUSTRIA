/**
 * BACKEND PATCH — opcoes_formulario_os v1.3
 */

// eslint-disable-next-line no-unused-vars
function opcoes_formulario_os(params) {
  // ── Autorização ──────────────────────────────────────────────
  var token = params.token;
  if (!token) {
    return { success: false, code: 401, message: "Sessão inválida ou token ausente" };
  }

  var auth = auth62Autorizar_(token, "LANCAMENTO", "VISUALIZAR");
  if (!auth || auth.success !== true || auth.autorizado !== true) {
    return { success: false, code: auth && auth.code ? auth.code : 403, message: "Sem permissão para acessar opções de OS" };
  }

  var unidade = String(
    auth.usuario && auth.usuario.unidade ? auth.usuario.unidade : ""
  ).trim().toUpperCase();

  // ── Estratégia de Cache ───────────────────────────────────────
  // Chave baseada 100% no servidor/auth62, blindada de manipulação do frontend
  var cacheKey = "os_form_options_v3_" + (unidade || "GLOBAL");

  var cache = CacheService.getScriptCache();
  try {
    var cachedJson = cache.get(cacheKey);
    if (cachedJson) {
      var cachedResult = JSON.parse(cachedJson);
      if (cachedResult && typeof cachedResult === "object") {
        cachedResult.action = "opcoes_formulario_os";
        return cachedResult;
      }
    }
  } catch (e) {
    // ignora falha de parse
  }

  // ── Leitura da planilha BD ────────────────────────────────────
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
      equipamentos: [], setores: [], areas: [], responsaveis: [], tipos: []
    };
  }

  var headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  var colIndex = {};
  headers.forEach(function(h, i) {
    var key = String(h || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    colIndex[key] = i;
  });

  var colsNeeded = ["equipamento", "setor", "area", "responsavel", "tipo"];
  var sets = {};
  colsNeeded.forEach(function(col) { sets[col] = {}; });

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

  function osFormSortedValues_(obj) {
    return Object.values(obj).sort(function(a, b) {
      return String(a).localeCompare(String(b), "pt-BR");
    });
  }

  var result = {
    success: true,
    action: "opcoes_formulario_os",
    equipamentos: osFormSortedValues_(sets.equipamento),
    setores: osFormSortedValues_(sets.setor),
    areas: osFormSortedValues_(sets.area),
    responsaveis: osFormSortedValues_(sets.responsavel),
    tipos: osFormSortedValues_(sets.tipo)
  };

  try {
    cache.put(cacheKey, JSON.stringify(result), 10800);
  } catch (e) {
    // ignora erro de salvamento
  }

  return result;
}
