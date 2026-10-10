/**
 * BACKEND PATCH — listar_os_paginado v1.3
 */

// eslint-disable-next-line no-unused-vars
function listar_os_paginado(params) {
  // ── Autorização ──────────────────────────────────────────────
  var token = params.token;
  if (!token) {
    return { success: false, code: 401, message: "Sessão inválida ou token ausente" };
  }

  var auth = auth62Autorizar_(token, "HISTORICO", "VISUALIZAR");
  if (!auth || auth.success !== true || auth.autorizado !== true) {
    return { success: false, code: auth && auth.code ? auth.code : 403, message: "Sem permissão para listar OS" };
  }

  var unidadeAutenticada = String(
    auth.usuario && auth.usuario.unidade ? auth.usuario.unidade : ""
  ).trim().toUpperCase();

  // ── Parâmetros e Proteções ────────────────────────────────────
  var page_size = Math.min(100, Math.max(1, parseInt(params.page_size, 10) || 50));
  var cursor = params.cursor ? String(params.cursor).trim() : null;

  var filtro_equipamento = (params.filtro_equipamento || "").trim().toUpperCase();
  var filtro_responsavel = (params.filtro_responsavel || "").trim().toUpperCase();
  var filtro_setor = (params.filtro_setor || "").trim().toUpperCase();
  var filtro_area = (params.filtro_area || "").trim().toUpperCase();
  var filtro_tipo = (params.filtro_tipo || "").trim().toUpperCase();
  var data_de = (params.data_de || "").trim();
  var data_ate = (params.data_ate || "").trim();
  var busca = (params.busca || "").trim().toUpperCase();

  var temFiltro = !!(filtro_equipamento || filtro_responsavel || filtro_setor ||
    filtro_area || filtro_tipo || data_de || data_ate || busca);

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
      action: "listar_os_paginado",
      items: [],
      page_size: page_size,
      has_more: false,
      next_cursor: null,
      total_estimate: 0,
      filters_applied: osPagBuildFiltersApplied_()
    };
  }

  var headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  var colIndex = {};
  headers.forEach(function(h, i) {
    colIndex[osPagNormalizeColumnKey_(h)] = i;
  });

  var offsetFilter = 0;
  var startRowNoFilter = lastRow;

  if (cursor) {
    var cInt = parseInt(cursor, 10);
    if (isNaN(cInt) || cInt < 0) {
      return { success: false, code: 400, message: "Cursor fornecido é inválido. Esperado número positivo." };
    }
    if (!temFiltro && (cInt < 2 || cInt > lastRow)) {
       return { success: false, code: 400, message: "Cursor fornecido fora dos limites da BD (2 a " + lastRow + ")." };
    }
    offsetFilter = cInt;
    startRowNoFilter = cInt;
  }

  var items = [];
  var has_more = false;
  var next_cursor = null;
  var total_estimate = lastRow - 1;

  if (!temFiltro) {
    // ── SEM filtros (Leitura em bloco a partir do final) ──
    var startRow = Math.min(startRowNoFilter, lastRow);
    var endRow = Math.max(2, startRow - page_size + 1);
    var numRows = startRow - endRow + 1;

    if (numRows > 0) {
      var data = sheet.getRange(endRow, 1, numRows, lastCol).getDisplayValues();
      for (var i = data.length - 1; i >= 0; i--) {
        var absoluteRow = endRow + i; 
        items.push(osPagRowToObject_(data[i], colIndex, absoluteRow));
      }
      has_more = endRow > 2;
      next_cursor = has_more ? String(endRow - 1) : null;
    }
  } else {
    // ── COM filtros (Varredura total, preservando row_ref) ──
    var allData = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
    var filtered = [];
    
    for (var j = allData.length - 1; j >= 0; j--) {
      var row = allData[j];
      
      if (filtro_equipamento && String(row[colIndex.equipamento] || "").toUpperCase() !== filtro_equipamento) continue;
      if (filtro_responsavel && String(row[colIndex.responsavel] || "").toUpperCase() !== filtro_responsavel) continue;
      if (filtro_setor && String(row[colIndex.setor] || "").toUpperCase() !== filtro_setor) continue;
      if (filtro_area && String(row[colIndex.area] || "").toUpperCase() !== filtro_area) continue;
      if (filtro_tipo && String(row[colIndex.tipo] || "").toUpperCase() !== filtro_tipo) continue;

      if (data_de || data_ate) {
        var dataRow = osPagNormalizeDateStr_(row[colIndex.data_inicio]);
        if (data_de && dataRow < data_de) continue;
        if (data_ate && dataRow > data_ate) continue;
      }

      if (busca) {
        var searchable = [
          String(row[colIndex.equipamento] || ""),
          String(row[colIndex.numero_os] || row[colIndex.id_os] || ""),
          String(row[colIndex.observacoes] || row[colIndex.observacao] || ""),
        ].join(" ").toUpperCase();
        if (searchable.indexOf(busca) === -1) continue;
      }

      var absoluteRowFilter = j + 2;
      filtered.push({ rowData: row, rowRef: absoluteRowFilter });
    }

    total_estimate = filtered.length;
    var page = filtered.slice(offsetFilter, offsetFilter + page_size);
    for (var k = 0; k < page.length; k++) {
      items.push(osPagRowToObject_(page[k].rowData, colIndex, page[k].rowRef));
    }

    has_more = offsetFilter + page_size < filtered.length;
    next_cursor = has_more ? String(offsetFilter + page_size) : null;
  }

  return {
    success: true,
    action: "listar_os_paginado",
    items: items,
    page_size: page_size,
    has_more: has_more,
    next_cursor: next_cursor,
    total_estimate: total_estimate,
    filters_applied: {
      equipamento: filtro_equipamento || null,
      responsavel: filtro_responsavel || null,
      setor: filtro_setor || null,
      area: filtro_area || null,
      tipo: filtro_tipo || null,
      unidade: unidadeAutenticada || null,
      data_de: data_de || null,
      data_ate: data_ate || null,
      busca: busca || null
    }
  };
}


// ── Helpers Nomespaced ─────────────────────────────────────────────────────

function osPagNormalizeColumnKey_(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function osPagRowToObject_(row, colIndex, rowRef) {
  var obj = { row_ref: rowRef };
  
  for (var key in colIndex) {
    var val = String(row[colIndex[key]] || "").trim();
    if (key === "data_inicio" || key === "data_fim" || key === "data_conclusao") {
      obj[key] = osPagNormalizeDateStr_(val);
    } else if (key === "hora_inicio" || key === "hora_fim" || key === "hora_conclusao") {
      obj[key] = osPagNormalizeTimeStr_(val);
    } else {
      obj[key] = val;
    }
  }

  if (!obj.id_os || obj.id_os === "") {
    obj.id_os = null;
  }

  return obj;
}

function osPagNormalizeDateStr_(v) {
  var s = String(v).trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  var br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return br[3] + "-" + br[2].padStart(2, "0") + "-" + br[1].padStart(2, "0");
  return s;
}

function osPagNormalizeTimeStr_(v) {
  var s = String(v).trim();
  if (!s) return "";
  var m = s.match(/^(\d{1,2}):(\d{2})/);
  if (m) return m[1].padStart(2, "0") + ":" + m[2];
  return s;
}

function osPagBuildFiltersApplied_() {
  return {
    equipamento: null, responsavel: null, setor: null,
    area: null, tipo: null, unidade: null,
    data_de: null, data_ate: null, busca: null
  };
}
