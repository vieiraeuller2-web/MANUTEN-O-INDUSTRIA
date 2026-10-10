/**
 * BACKEND PATCH — auth62_performance_v1.gs
 * 
 * ATENÇÃO - ESTRATÉGIA DE INSTALAÇÃO (NÃO COPIE COMO NOVO ARQUIVO):
 * Este patch contém as funções centrais de autenticação. O Google Apps Script usa
 * namespace global. Para evitar colisões (funções duplicadas), você NÃO DEVE 
 * adicionar este arquivo ao projeto como está.
 * 
 * INSTRUÇÕES:
 * 1. Abra o arquivo original que contém a autenticação (ex: Auth.gs).
 * 2. SUBSTITUA O CORPO das seguintes funções existentes pelo corpo fornecido aqui:
 *    - auth62ValidarSessao_
 *    - auth62Autorizar_
 * 3. ADICIONE os seguintes helpers novos no mesmo arquivo:
 *    - auth62HashToken_
 *    - auth62ThrottledLogGranted_
 *    - auth62LimparCacheLogout_ (Adicione no fluxo de logout existente)
 * 4. A função f62RegistrarLog_ (ou similar) NÃO SERÁ ALTERADA. Ela continuará
 *    existindo nativamente para processar o appendRow.
 * 5. ROLLBACK: Para reverter, restaure a versão do arquivo original no histórico do GAS.
 */

// ── HELPERS NOVOS (Adicionar) ────────────────────────────────────────────────

function auth62HashToken_(token) {
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(token), Utilities.Charset.UTF_8);
  return rawHash.map(function(e) { return (e < 0 ? e + 256 : e).toString(16).padStart(2, '0'); }).join('');
}

function auth62LimparCacheLogout_(hashSessao) {
  try {
    var cache = CacheService.getScriptCache();
    cache.remove("auth_session_" + hashSessao);
    cache.remove("auth_activity_" + hashSessao);
  } catch(e) {}
}

function auth62ThrottledLogGranted_(hash, modulo, acao) {
  try {
    var cache = CacheService.getScriptCache();
    var logKey = "auth_log_granted_" + hash + "_" + modulo + "_" + acao;
    var exists = cache.get(logKey);
    if (exists) {
      return true; // Throttle ativo, suprimir appendRow
    } else {
      cache.put(logKey, "1", 300); // 5 minutos TTL
      return false; 
    }
  } catch(e) {
    return false; // Falha no cache = sempre registra
  }
}

// ── FUNÇÕES A SUBSTITUIR O CORPO (Substituir nas funções existentes) ─────────

function auth62ValidarSessao_(token) {
  if (!token) return { success: false, message: "Token ausente", bloqueado: true };

  var hash = auth62HashToken_(token);
  var cache = null;
  try { cache = CacheService.getScriptCache(); } catch(e) {}
  
  var sessionKey = "auth_session_" + hash;
  var cachedSession = null;
  var sessaoObj = null;

  if (cache) {
    try { 
      cachedSession = cache.get(sessionKey);
      if (cachedSession) sessaoObj = JSON.parse(cachedSession); 
    } catch(e) { sessaoObj = null; }
  }

  // Fallback / Cache Miss: Leitura Segura via Sheets
  if (!sessaoObj) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetSessao = ss.getSheetByName("SESSOES");
    if (!sheetSessao) return { success: false, message: "Tabela SESSOES inexistente" };

    var lastCol = sheetSessao.getLastColumn();
    var headers = sheetSessao.getRange(1, 1, 1, lastCol).getValues()[0];
    var colIndex = {};
    headers.forEach(function(h, i) { colIndex[String(h).toUpperCase()] = i; });
    var colHashOffset = colIndex["HASH"] ? colIndex["HASH"] + 1 : 2; // Suposição segura, ajuste ao real.

    // A procura deve atuar estritamente na coluna de HASH, com matchEntireCell
    var finder = sheetSessao.getRange(2, colHashOffset, sheetSessao.getLastRow(), 1)
      .createTextFinder(hash)
      .matchEntireCell(true);
      
    var findAll = finder.findAll();

    if (findAll.length === 0) {
      return { success: false, message: "SESSION_INVALID", bloqueado: true };
    }
    if (findAll.length > 1) {
      return { success: false, message: "Erro de integridade: múltiplas sessões detectadas", bloqueado: true };
    }

    var row = findAll[0].getRow();
    var data = sheetSessao.getRange(row, 1, 1, lastCol).getValues()[0];

    var status = String(data[colIndex["STATUS"]] || "").toUpperCase();
    if (status !== "ATIVA") {
      return { success: false, message: "Sessão inativa ou revogada", bloqueado: true };
    }

    var expiraEmDate = new Date(data[colIndex["EXPIRA_EM"]]);
    if (new Date() > expiraEmDate) {
      sheetSessao.getRange(row, colIndex["STATUS"] + 1).setValue("EXPIRADA");
      return { success: false, message: "SESSION_EXPIRED", bloqueado: true };
    }

    sessaoObj = {
      id_usuario: String(data[colIndex["ID_USUARIO"]] || data[colIndex["LOGIN"]] || ""),
      unidade: String(data[colIndex["UNIDADE"]] || ""),
      perfil: "", // Carregado abaixo
      expira_em: expiraEmDate.getTime(),
      linha_sessao: row,
      session_hash_prefix: hash.substring(0, 8),
      colUltimaAtiv: colIndex["ULTIMA_ATIVIDADE"] + 1
    };
  }

  // Verificação imperativa de Expiração, mesmo via cache (Não sobrevive ao TTL cego)
  var msRestantes = sessaoObj.expira_em - Date.now();
  if (msRestantes <= 0) {
    if (cache) {
      try { cache.remove(sessionKey); cache.remove("auth_activity_" + hash); } catch(e){}
    }
    return { success: false, message: "SESSION_EXPIRED", bloqueado: true };
  }

  // Leitura de Usuário (Cache 60s - Pior caso de revogação de inativo é 1 min)
  var userKey = "auth_user_v2_" + sessaoObj.id_usuario;
  var userObj = null;

  if (cache) {
    try {
      var cachedUser = cache.get(userKey);
      if (cachedUser) userObj = JSON.parse(cachedUser);
    } catch(e) {}
  }

  if (!userObj) {
    var ssUser = SpreadsheetApp.getActiveSpreadsheet();
    var sheetUser = ssUser.getSheetByName("USUARIOS");
    var finderUser = sheetUser.createTextFinder(sessaoObj.id_usuario).matchEntireCell(true).findNext();

    if (!finderUser) {
      if (cache) try { cache.remove(sessionKey); } catch(e){}
      return { success: false, message: "Usuário não encontrado", bloqueado: true };
    }

    var userRow = finderUser.getRow();
    var uHeaders = sheetUser.getRange(1, 1, 1, sheetUser.getLastColumn()).getValues()[0];
    var uData = sheetUser.getRange(userRow, 1, 1, sheetUser.getLastColumn()).getValues()[0];
    var uCol = {};
    uHeaders.forEach(function(h, i) { uCol[String(h).toUpperCase()] = i; });

    var uStatus = String(uData[uCol["STATUS"]] || "").toUpperCase();
    if (uStatus !== "ATIVO") {
      if (cache) try { cache.remove(sessionKey); } catch(e){}
      return { success: false, message: "USER_INACTIVE", bloqueado: true };
    }

    userObj = {
      id_usuario: sessaoObj.id_usuario,
      unidade: String(uData[uCol["UNIDADE"]] || sessaoObj.unidade),
      perfil: String(uData[uCol["PERFIL"]] || "")
    };

    if (cache) {
      try { cache.put(userKey, JSON.stringify(userObj), 60); } catch(e){}
    }
  }

  sessaoObj.perfil = userObj.perfil;
  sessaoObj.unidade = userObj.unidade;

  // Calcula TTL da Sessão: max 60s, ou tempo restante da expiração (o que for menor)
  if (cache && !cachedSession) {
    var ttlSessao = Math.min(60, Math.floor(msRestantes / 1000));
    if (ttlSessao > 0) {
      try { cache.put(sessionKey, JSON.stringify(sessaoObj), ttlSessao); } catch(e){}
    }
  }

  // Throttling ULTIMA_ATIVIDADE (Aproximadamente 5 min)
  var activityKey = "auth_activity_" + hash;
  var lastActivity = null;
  if (cache) {
    try { lastActivity = cache.get(activityKey); } catch(e){}
  }

  if (!lastActivity) {
    try {
      var ssAct = SpreadsheetApp.getActiveSpreadsheet();
      var sheetAct = ssAct.getSheetByName("SESSOES");
      // Atualiza apenas atividade sem criar sliding session/alterar expiração
      sheetAct.getRange(sessaoObj.linha_sessao, sessaoObj.colUltimaAtiv).setValue(new Date());
      if (cache) cache.put(activityKey, "1", 300);
    } catch(e) {}
  }

  return {
    success: true,
    autorizado: false,
    usuario: userObj,
    sessao: sessaoObj,
    hash: hash
  };
}


function auth62Autorizar_(token, modulo, acao) {
  var sessionData = auth62ValidarSessao_(token);
  
  if (!sessionData.success) {
    // Falhas críticas e Access Denied NUNCA têm throttle de log.
    try { f62RegistrarLog_(sessionData.hash || "DESCONHECIDO", "UNKNOWN", modulo, acao, "DENIED - " + sessionData.message); } catch(e){}
    return sessionData; 
  }

  var perfil = sessionData.usuario.perfil.toUpperCase();
  var autorizado = false;

  // Regra global Intocada
  if (perfil === "ADM") {
    autorizado = true;
  } else {
    var cache = null;
    try { cache = CacheService.getScriptCache(); } catch(e){}
    var permKey = "auth_perm_v2_" + perfil;
    var cachedPerm = null;
    var perfisPermissoes = [];

    if (cache) {
      try {
        var res = cache.get(permKey);
        if (res) cachedPerm = res;
      } catch(e){}
    }

    if (cachedPerm) {
      try { perfisPermissoes = JSON.parse(cachedPerm); } catch(e){ cachedPerm = null; perfisPermissoes = []; }
    }
    
    if (!cachedPerm) {
      var ssPerm = SpreadsheetApp.getActiveSpreadsheet();
      var sheetPerm = ssPerm.getSheetByName("PERFIS_ACESSO");
      var dataPerm = sheetPerm.getDataRange().getValues();
      var headers = dataPerm.shift();
      var pCol = {};
      headers.forEach(function(h, i) { pCol[String(h).toUpperCase()] = i; });

      for (var p = 0; p < dataPerm.length; p++) {
        var row = dataPerm[p];
        if (String(row[pCol["PERFIL"]]).toUpperCase() === perfil) {
          perfisPermissoes.push({
            modulo: String(row[pCol["MODULO"]]).toUpperCase(),
            acao: String(row[pCol["ACAO"]]).toUpperCase()
          });
        }
      }
      if (cache) {
        // Reduzido para 60s
        try { cache.put(permKey, JSON.stringify(perfisPermissoes), 60); } catch(e){}
      }
    }

    var moduloUpper = String(modulo).toUpperCase();
    var acaoUpper = String(acao).toUpperCase();

    for (var k = 0; k < perfisPermissoes.length; k++) {
      if (perfisPermissoes[k].modulo === moduloUpper && perfisPermissoes[k].acao === acaoUpper) {
        autorizado = true;
        break;
      }
    }
  }

  sessionData.autorizado = autorizado;
  sessionData.success = autorizado;
  sessionData.code = autorizado ? 200 : 403;
  
  if (!autorizado) {
    sessionData.message = "ACCESS_DENIED";
    try { f62RegistrarLog_(sessionData.hash, sessionData.usuario.id_usuario, modulo, acao, "DENIED"); } catch(e){}
  } else {
    var logThrottled = auth62ThrottledLogGranted_(sessionData.hash, modulo, acao);
    if (!logThrottled) {
      try { f62RegistrarLog_(sessionData.hash, sessionData.usuario.id_usuario, modulo, acao, "GRANTED"); } catch(e){}
    }
  }

  return sessionData;
}
