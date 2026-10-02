/**
 * BACKEND PATCH — listar_os_paginado v1.0
 * 
 * Extensão do contrato: action #47 (além das 46 originais)
 * 
 * Implementação pronta para revisão e inclusão no Apps Script.
 * NÃO foi aplicada em produção.
 * 
 * Uso: adicionar ao doPost/doGet do Apps Script como nova action.
 * 
 * Modelo de paginação: cursor baseado em linha (row index descendente).
 * - Evita inconsistências causadas por novas OS inseridas durante navegação.
 * - O cursor é a linha da planilha (estável para dados append-only).
 * - Fallback para offset quando há filtros ativos.
 * 
 * page_size padrão: 50 | máximo: 200
 */

// eslint-disable-next-line no-unused-vars
function listar_os_paginado(params, sessao) {
  // ── Autorização ──────────────────────────────────────────────
  // Utiliza a sessão real do backend (não aceita perfil do frontend)
  if (!sessao || !sessao.token) {
    return { success: false, code: 401, message: "Sessão inválida" };
  }

  // Verificação de permissão real via mecanismo existente
  var autorizado = auth62Autorizar_(sessao, "HISTORICO_OS", "LER");
  if (!autorizado) {
    return { success: false, code: 403, message: "Sem permissão para listar OS" };
  }

  // ── Parâmetros ────────────────────────────────────────────────
  var page_size = Math.min(200, Math.max(10, parseInt(params.page_size) || 50));
  var cursor = params.cursor ? String(params.cursor).trim() : null;

  // Filtros suportados (apenas os que a interface realmente usa)
  var filtro_equipamento = (params.filtro_equipamento || "").trim().toUpperCase();
  var filtro_responsavel = (params.filtro_responsavel || "").trim().toUpperCase();
  var filtro_setor = (params.filtro_setor || "").trim().toUpperCase();
  var filtro_area = (params.filtro_area || "").trim().toUpperCase();
  var filtro_tipo = (params.filtro_tipo || "").trim().toUpperCase();
  var filtro_unidade = (params.filtro_unidade || "").trim().toUpperCase();
  var data_de = (params.data_de || "").trim();
  var data_ate = (params.data_ate || "").trim();
  var busca = (params.busca || "").trim().toUpperCase();

  var temFiltro = !!(filtro_equipamento || filtro_responsavel || filtro_setor ||
    filtro_area || filtro_tipo || filtro_unidade || data_de || data_ate || busca);

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
      filters_applied: buildFiltersApplied_()
    };
  }

  // Cabeçalhos (linha 1) — leitura única
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var colIndex = {};
  headers.forEach(function(h, i) {
    colIndex[normalizeColumnKey_(h)] = i;
  });

  // ── Estratégia de leitura ─────────────────────────────────────
  // Sem filtros: cursor descendente (do final para o início)
  // Com filtros: leitura completa + filtro em memória + paginação offset
  
  var items = [];
  var has_more = false;
  var next_cursor = null;
  var total_estimate = lastRow - 1; // estimativa sem filtros

  if (!temFiltro) {
    // Cursor descendente: lê diretamente as linhas necessárias
    var startRow;
    if (cursor) {
      startRow = parseInt(cursor);
      if (isNaN(startRow) || startRow < 2) startRow = 2;
    } else {
      startRow = lastRow; // começa do final (mais recentes primeiro)
    }

    var endRow = Math.max(2, startRow - page_size + 1);
    var numRows = startRow - endRow + 1;

    if (numRows > 0) {
      var data = sheet.getRange(endRow, 1, numRows, lastCol).getValues();
      
      // Inverte para ordem descendente (mais recentes primeiro)
      for (var i = data.length - 1; i >= 0; i--) {
        items.push(rowToObject_(data[i], headers, colIndex));
      }

      has_more = endRow > 2;
      next_cursor = has_more ? String(endRow - 1) : null;
    }
  } else {
    // Com filtros: precisa ler tudo, filtrar em memória, paginar
    // Limitação documentada: Google Sheets não possui índice SQL
    var allData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    
    // Filtra
    var filtered = [];
    for (var j = allData.length - 1; j >= 0; j--) { // descendente
      var row = allData[j];
      
      if (filtro_equipamento && String(row[colIndex.equipamento] || "").toUpperCase() !== filtro_equipamento) continue;
      if (filtro_responsavel && String(row[colIndex.responsavel] || "").toUpperCase() !== filtro_responsavel) continue;
      if (filtro_setor && String(row[colIndex.setor] || "").toUpperCase() !== filtro_setor) continue;
      if (filtro_area && String(row[colIndex.area] || "").toUpperCase() !== filtro_area) continue;
      if (filtro_tipo && String(row[colIndex.tipo] || "").toUpperCase() !== filtro_tipo) continue;
      if (filtro_unidade && String(row[colIndex.unidade] || "").toUpperCase() !== filtro_unidade) continue;

      // Datas — comparação string YYYY-MM-DD
      if (data_de || data_ate) {
        var dataRow = normalizeDateStr_(row[colIndex.data_inicio]);
        if (data_de && dataRow < data_de) continue;
        if (data_ate && dataRow > data_ate) continue;
      }

      // Busca textual (equipamento, numero_os, observacoes)
      if (busca) {
        var searchable = [
          String(row[colIndex.equipamento] || ""),
          String(row[colIndex.numero_os] || row[colIndex.id_os] || ""),
          String(row[colIndex.observacoes] || row[colIndex.observacao] || ""),
        ].join(" ").toUpperCase();
        if (searchable.indexOf(busca) === -1) continue;
      }

      filtered.push(row);
    }

    total_estimate = filtered.length;

    // Paginação por offset (cursor é o offset quando filtrado)
    var offset = cursor ? parseInt(cursor) : 0;
    if (isNaN(offset)) offset = 0;

    var page = filtered.slice(offset, offset + page_size);
    for (var k = 0; k < page.length; k++) {
      items.push(rowToObject_(page[k], headers, colIndex));
    }

    has_more = offset + page_size < filtered.length;
    next_cursor = has_more ? String(offset + page_size) : null;
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
      unidade: filtro_unidade || null,
      data_de: data_de || null,
      data_ate: data_ate || null,
      busca: busca || null
    }
  };
}


// ── Helpers ─────────────────────────────────────────────────────

function normalizeColumnKey_(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function rowToObject_(row, headers, colIndex) {
  var obj = {};
  for (var key in colIndex) {
    var val = row[colIndex[key]];
    if (key === "data_inicio" || key === "data_fim" || key === "data_conclusao") {
      obj[key] = normalizeDateStr_(val);
    } else if (key === "hora_inicio" || key === "hora_fim" || key === "hora_conclusao") {
      // Horas puras permanecem texto — SEM new Date(), SEM Intl.DateTimeFormat()
      obj[key] = normalizeTimeStr_(val);
    } else {
      obj[key] = val === null || val === undefined ? "" : val;
    }
  }
  return obj;
}

function normalizeDateStr_(v) {
  if (v == null || v === "") return "";
  if (v instanceof Date) {
    var d = v;
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var dd = String(d.getDate()).padStart(2, "0");
    return yyyy + "-" + mm + "-" + dd;
  }
  var s = String(v).trim();
  // Se já é YYYY-MM-DD, retorna
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY
  var br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return br[3] + "-" + br[2].padStart(2, "0") + "-" + br[1].padStart(2, "0");
  return s;
}

function normalizeTimeStr_(v) {
  if (v == null || v === "") return "";
  // Se for Date do Sheets (1899-12-30T...), extrai HH:MM
  if (v instanceof Date) {
    return String(v.getHours()).padStart(2, "0") + ":" + String(v.getMinutes()).padStart(2, "0");
  }
  var s = String(v).trim();
  var m = s.match(/^(\d{1,2}):(\d{2})/);
  if (m) return m[1].padStart(2, "0") + ":" + m[2];
  return s;
}

function buildFiltersApplied_() {
  return {
    equipamento: null, responsavel: null, setor: null,
    area: null, tipo: null, unidade: null,
    data_de: null, data_ate: null, busca: null
  };
}
