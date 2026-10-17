/**
 * BACKEND PATCH — gestão administrativa de técnicos v1
 *
 * Actions:
 * - equipe_tecnicos                  -> EQUIPE_COLABORADORES / VISUALIZAR
 * - equipe_acessos                   -> EQUIPE_COLABORADORES / VISUALIZAR
 * - equipe_colaborador_criar         -> EQUIPE_COLABORADORES / CRIAR
 * - equipe_acesso_criar              -> EQUIPE_COLABORADORES / EXECUTAR
 * - equipe_acesso_status             -> EQUIPE_COLABORADORES / EDITAR
 * - equipe_acesso_redefinir_senha    -> EQUIPE_COLABORADORES / EXECUTAR
 * - equipe_tecnico_criar            -> EQUIPE_COLABORADORES / CRIAR
 * - equipe_tecnico_status           -> EQUIPE_COLABORADORES / EDITAR
 * - equipe_tecnico_redefinir_senha  -> EQUIPE_COLABORADORES / EXECUTAR
 *
 * Regras:
 * - perfil sempre TECNICO;
 * - unidade sempre TH30;
 * - credencial nova sempre HMAC_SHA256_PEPPER_V1;
 * - hash gerado pelo helper OFICIAL f62HashSenha_ do AUTH62;
 * - nunca retorna SENHA_HASH, SENHA_SALT, pepper ou senha em texto puro.
 */

var EQTEC_ABA_COLABORADORES = "CADASTRO_COLABORADORES";
var EQTEC_UNIDADE_PADRAO = "TH30";
var EQTEC_CREDENCIAL_TIPO = "HMAC_SHA256_PEPPER_V1";

function eqTecAutorizar_(params, acao) {
  var token = params && params.token ? String(params.token) : "";
  if (!token) {
    return {
      ok: false,
      response: {
        success: false,
        code: "SEM_TOKEN",
        message: "Sessão inválida ou token ausente."
      }
    };
  }

  var auth = auth62Autorizar_(token, "EQUIPE_COLABORADORES", acao);
  if (!auth || auth.success !== true || auth.autorizado !== true) {
    return {
      ok: false,
      response: {
        success: false,
        code: auth && auth.code ? auth.code : "ACCESS_DENIED",
        message: "Sem permissão para administrar técnicos."
      }
    };
  }

  return { ok: true, auth: auth };
}

function eqTecSpreadsheet_() {
  if (typeof F62_SPREADSHEET_ID !== "undefined" && F62_SPREADSHEET_ID) {
    return SpreadsheetApp.openById(F62_SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function eqTecExigirAba_(ss, nome) {
  var sh = ss.getSheetByName(nome);
  if (!sh) throw new Error("Aba obrigatória não encontrada: " + nome);
  return sh;
}

function eqTecTxt_(v) {
  if (typeof f62Txt_ === "function") return f62Txt_(v);
  return String(v === undefined || v === null ? "" : v).trim();
}

function eqTecNorm_(v) {
  if (typeof f62Norm_ === "function") return f62Norm_(v);
  return eqTecTxt_(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function eqTecSimNao_(v) {
  var s = eqTecTxt_(v).toUpperCase();
  if (s === "SIM" || s === "TRUE" || s === "1") return "SIM";
  if (s === "NAO" || s === "NÃO" || s === "FALSE" || s === "0") return "NAO";
  return "";
}

function eqTecMapaCabecalhos_(sh) {
  var lastCol = sh.getLastColumn();
  if (lastCol < 1) throw new Error("Aba sem cabeçalhos: " + sh.getName());

  var headers = sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  var map = {};
  headers.forEach(function(h, i) {
    var key = eqTecTxt_(h).toUpperCase();
    if (key) map[key] = i + 1;
  });

  return { headers: headers, map: map };
}

function eqTecExigirColunas_(map, nomes, aba) {
  nomes.forEach(function(nome) {
    if (!map[nome]) throw new Error("Coluna obrigatória ausente em " + aba + ": " + nome);
  });
}

function eqTecLerObjetos_(sh) {
  if (typeof f62LerObjetos_ === "function") {
    return f62LerObjetos_(sh);
  }

  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  var values = sh.getRange(1, 1, lastRow, lastCol).getDisplayValues();
  var headers = values[0];

  return values.slice(1).map(function(row, idx) {
    var obj = { __row: idx + 2 };
    headers.forEach(function(h, i) {
      obj[eqTecTxt_(h)] = row[i];
    });
    return obj;
  });
}

function eqTecGerarId_(prefixo, existentes) {
  var id = "";
  do {
    id = prefixo + Utilities.getUuid().replace(/-/g, "").slice(0, 12).toUpperCase();
  } while (existentes[id]);
  return id;
}

function eqTecGerarSalt_() {
  return (
    Utilities.getUuid().replace(/-/g, "") +
    Utilities.getUuid().replace(/-/g, "")
  );
}

function eqTecAppendPorCabecalho_(sh, valores) {
  var meta = eqTecMapaCabecalhos_(sh);
  var row = meta.headers.map(function(h) {
    var key = eqTecTxt_(h).toUpperCase();
    return Object.prototype.hasOwnProperty.call(valores, key)
      ? valores[key]
      : "";
  });
  sh.appendRow(row);
  return sh.getLastRow();
}

function eqTecAtualizarCampos_(sh, row, campos) {
  var meta = eqTecMapaCabecalhos_(sh);
  Object.keys(campos).forEach(function(key) {
    var col = meta.map[key];
    if (!col) throw new Error("Coluna obrigatória ausente em " + sh.getName() + ": " + key);
    sh.getRange(row, col).setValue(campos[key]);
  });
}

function eqTecEncontrarUsuario_(usuarios, idUsuario, login) {
  var id = eqTecTxt_(idUsuario);
  var loginNorm = eqTecNorm_(login);

  var matches = usuarios.filter(function(u) {
    if (id && eqTecTxt_(u.ID_USUARIO) === id) return true;
    if (loginNorm && eqTecNorm_(u.LOGIN) === loginNorm) return true;
    return false;
  });

  if (matches.length !== 1) return null;
  return matches[0];
}

function equipe_tecnicos(params) {
  var gate = eqTecAutorizar_(params || {}, "VISUALIZAR");
  if (!gate.ok) return gate.response;

  var ss = eqTecSpreadsheet_();
  var shU = typeof F62_ABA_USUARIOS !== "undefined"
    ? eqTecExigirAba_(ss, F62_ABA_USUARIOS)
    : eqTecExigirAba_(ss, "USUARIOS");
  var shC = eqTecExigirAba_(ss, EQTEC_ABA_COLABORADORES);

  var usuarios = eqTecLerObjetos_(shU).filter(function(u) {
    return eqTecTxt_(u.PERFIL).toUpperCase() === "TECNICO";
  });

  var colaboradores = eqTecLerObjetos_(shC);
  var colPorId = {};
  colaboradores.forEach(function(c) {
    var id = eqTecTxt_(c.ID_COLABORADOR);
    if (id) colPorId[id] = c;
  });

  var itens = usuarios.map(function(u) {
    var idCol = eqTecTxt_(u.ID_COLABORADOR);
    var c = colPorId[idCol] || {};

    return {
      id_usuario: eqTecTxt_(u.ID_USUARIO),
      nome: eqTecTxt_(u.NOME),
      login: eqTecTxt_(u.LOGIN),
      perfil: "TECNICO",
      id_colaborador: idCol,
      unidade: eqTecTxt_(u.UNIDADE),
      ativo: eqTecTxt_(u.ATIVO),
      primeiro_acesso: eqTecTxt_(u.PRIMEIRO_ACESSO),
      ultimo_login: eqTecTxt_(u.ULTIMO_LOGIN),
      credencial_tipo: eqTecTxt_(u.CREDENCIAL_TIPO),
      colaborador: {
        nome: eqTecTxt_(c.NOME_EXIBICAO),
        funcao: eqTecTxt_(c.FUNCAO),
        especialidade: eqTecTxt_(c.ESPECIALIDADE),
        ativo: eqTecTxt_(c.ATIVO),
        status_cadastro: eqTecTxt_(c.STATUS_CADASTRO),
        tipo_vinculo: eqTecTxt_(c.TIPO_VINCULO),
        contabilizar_hh_custo: eqTecTxt_(c.CONTABILIZAR_HH_CUSTO)
      }
    };
  });

  return {
    success: true,
    total: itens.length,
    tecnicos: itens,
    versao: "EQUIPE_TECNICOS_V1"
  };
}



function eqTecPerfilSolicitante_(ss, params) {
  var loginSolicitante = eqTecTxt_(params && params.usuario);
  if (!loginSolicitante) return "";

  var shU = typeof F62_ABA_USUARIOS !== "undefined"
    ? eqTecExigirAba_(ss, F62_ABA_USUARIOS)
    : eqTecExigirAba_(ss, "USUARIOS");

  var encontrados = eqTecLerObjetos_(shU).filter(function(u) {
    return (
      eqTecNorm_(u.LOGIN) === eqTecNorm_(loginSolicitante) &&
      eqTecSimNao_(u.ATIVO) === "SIM"
    );
  });

  if (encontrados.length !== 1) return "";
  return eqTecTxt_(encontrados[0].PERFIL).toUpperCase();
}

function equipe_acessos(params) {
  var gate = eqTecAutorizar_(params || {}, "VISUALIZAR");
  if (!gate.ok) return gate.response;

  var ss = eqTecSpreadsheet_();
  var shU = typeof F62_ABA_USUARIOS !== "undefined"
    ? eqTecExigirAba_(ss, F62_ABA_USUARIOS)
    : eqTecExigirAba_(ss, "USUARIOS");

  var usuarios = eqTecLerObjetos_(shU);

  var acessos = usuarios.map(function(u) {
    return {
      id_usuario: eqTecTxt_(u.ID_USUARIO),
      nome: eqTecTxt_(u.NOME),
      login: eqTecTxt_(u.LOGIN),
      perfil: eqTecTxt_(u.PERFIL).toUpperCase(),
      id_colaborador: eqTecTxt_(u.ID_COLABORADOR),
      unidade: eqTecTxt_(u.UNIDADE),
      ativo: eqTecTxt_(u.ATIVO),
      primeiro_acesso: eqTecTxt_(u.PRIMEIRO_ACESSO),
      ultimo_login: eqTecTxt_(u.ULTIMO_LOGIN),
      credencial_tipo: eqTecTxt_(u.CREDENCIAL_TIPO)
    };
  });

  return {
    success: true,
    total: acessos.length,
    acessos: acessos,
    versao: "EQUIPE_ACESSOS_V1"
  };
}

function equipe_acesso_criar(params) {
  params = params || {};
  var gate = eqTecAutorizar_(params, "EXECUTAR");
  if (!gate.ok) return gate.response;

  var idColaborador = eqTecTxt_(params.id_colaborador);
  var perfilAlvo = eqTecTxt_(params.perfil).toUpperCase();
  var login = eqTecTxt_(params.login);
  var senha = String(
    params.senha === undefined || params.senha === null ? "" : params.senha
  );
  var unidadeInformada = eqTecTxt_(params.unidade);

  var perfisPermitidos = ["TECNICO", "PCM", "GESTAO", "ADM"];

  if (!idColaborador || !perfilAlvo || !login || !senha) {
    return {
      success: false,
      code: "CAMPOS_OBRIGATORIOS",
      message: "Colaborador, perfil, login e senha são obrigatórios."
    };
  }

  if (perfisPermitidos.indexOf(perfilAlvo) === -1) {
    return {
      success: false,
      code: "PERFIL_INVALIDO",
      message: "Perfil de acesso inválido."
    };
  }

  if (senha.length < 8) {
    return {
      success: false,
      code: "SENHA_CURTA",
      message: "A senha inicial deve possuir ao menos 8 caracteres."
    };
  }

  if (typeof f62HashSenha_ !== "function") {
    return {
      success: false,
      code: "HELPER_HASH_AUSENTE",
      message: "Helper oficial de credencial f62HashSenha_ não está disponível."
    };
  }

  var pepper = PropertiesService
    .getScriptProperties()
    .getProperty(F62_PEPPER_PROPERTY);

  if (!pepper) {
    return {
      success: false,
      code: "PEPPER_AUSENTE",
      message: "Configuração de credencial indisponível."
    };
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var ss = eqTecSpreadsheet_();
    var perfilSolicitante = eqTecPerfilSolicitante_(ss, params);

    if (perfilSolicitante !== "ADM") {
      if (!(perfilSolicitante === "PCM" && perfilAlvo === "TECNICO")) {
        return {
          success: false,
          code: "CRIACAO_ACESSO_NAO_AUTORIZADA",
          message: "Seu perfil não pode criar esse nível de acesso."
        };
      }
    }

    var shU = typeof F62_ABA_USUARIOS !== "undefined"
      ? eqTecExigirAba_(ss, F62_ABA_USUARIOS)
      : eqTecExigirAba_(ss, "USUARIOS");
    var shC = eqTecExigirAba_(ss, EQTEC_ABA_COLABORADORES);

    var colaboradores = eqTecLerObjetos_(shC);
    var encontradosCol = colaboradores.filter(function(c) {
      return eqTecTxt_(c.ID_COLABORADOR) === idColaborador;
    });

    if (encontradosCol.length !== 1) {
      return {
        success: false,
        code: "COLABORADOR_INVALIDO",
        message: "Colaborador não encontrado de forma única."
      };
    }

    var colaborador = encontradosCol[0];

    if (eqTecSimNao_(colaborador.ATIVO) !== "SIM") {
      return {
        success: false,
        code: "COLABORADOR_INATIVO",
        message: "Não é possível criar acesso para colaborador inativo."
      };
    }

    var usuarios = eqTecLerObjetos_(shU);

    if (usuarios.some(function(u) {
      return eqTecNorm_(u.LOGIN) === eqTecNorm_(login);
    })) {
      return {
        success: false,
        code: "LOGIN_DUPLICADO",
        message: "Já existe um usuário com esse login."
      };
    }

    if (usuarios.some(function(u) {
      return eqTecTxt_(u.ID_COLABORADOR) === idColaborador;
    })) {
      return {
        success: false,
        code: "COLABORADOR_JA_TEM_USUARIO",
        message: "Esse colaborador já possui usuário de acesso."
      };
    }

    var idsUsuario = {};
    usuarios.forEach(function(u) {
      idsUsuario[eqTecTxt_(u.ID_USUARIO)] = true;
    });

    var unidade = perfilAlvo === "TECNICO"
      ? EQTEC_UNIDADE_PADRAO
      : unidadeInformada;

    if (!unidade) {
      return {
        success: false,
        code: "UNIDADE_OBRIGATORIA",
        message: "Informe a unidade para este perfil."
      };
    }

    var idUsuario = eqTecGerarId_("USR-", idsUsuario);
    var salt = eqTecGerarSalt_();
    var hash = f62HashSenha_(senha, salt, pepper);
    var agora = new Date();
    var nome = eqTecTxt_(
      colaborador.NOME_EXIBICAO ||
      colaborador.NOME_BD_EXATO
    );

    eqTecAppendPorCabecalho_(shU, {
      ID_USUARIO: idUsuario,
      NOME: nome,
      LOGIN: login,
      SENHA_HASH: hash,
      SENHA_SALT: salt,
      PERFIL: perfilAlvo,
      ID_COLABORADOR: idColaborador,
      UNIDADE: unidade,
      ATIVO: "SIM",
      PRIMEIRO_ACESSO: "SIM",
      DATA_CADASTRO: agora,
      DATA_ATUALIZACAO: agora,
      ULTIMO_LOGIN: "",
      OBSERVACAO: "Acesso criado via equipe_acesso_criar.",
      CREDENCIAL_TIPO: EQTEC_CREDENCIAL_TIPO
    });

    return {
      success: true,
      code: "ACESSO_CRIADO",
      acesso: {
        id_usuario: idUsuario,
        nome: nome,
        login: login,
        perfil: perfilAlvo,
        id_colaborador: idColaborador,
        unidade: unidade,
        ativo: "SIM",
        primeiro_acesso: "SIM"
      },
      versao: "EQUIPE_ACESSOS_V1"
    };
  } catch (error) {
    console.error("[equipe_acesso_criar]", error);
    return {
      success: false,
      code: "ERRO_INTERNO",
      message: "Não foi possível criar o acesso."
    };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}


function eqTecPodeAdministrarPerfil_(perfilSolicitante, perfilAlvo) {
  perfilSolicitante = eqTecTxt_(perfilSolicitante).toUpperCase();
  perfilAlvo = eqTecTxt_(perfilAlvo).toUpperCase();

  if (perfilSolicitante === "ADM") return true;
  if (perfilSolicitante === "PCM" && perfilAlvo === "TECNICO") return true;
  return false;
}

function equipe_acesso_status(params) {
  params = params || {};
  var gate = eqTecAutorizar_(params, "EDITAR");
  if (!gate.ok) return gate.response;

  var ativo = eqTecSimNao_(params.ativo);
  if (ativo !== "SIM" && ativo !== "NAO") {
    return {
      success: false,
      code: "STATUS_INVALIDO",
      message: "ativo deve ser SIM ou NAO."
    };
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var ss = eqTecSpreadsheet_();
    var shU = typeof F62_ABA_USUARIOS !== "undefined"
      ? eqTecExigirAba_(ss, F62_ABA_USUARIOS)
      : eqTecExigirAba_(ss, "USUARIOS");

    var usuarios = eqTecLerObjetos_(shU);
    var alvo = eqTecEncontrarUsuario_(usuarios, params.id_usuario, params.login);

    if (!alvo) {
      return {
        success: false,
        code: "ACESSO_NAO_ENCONTRADO",
        message: "Usuário de acesso não encontrado."
      };
    }

    var perfilAlvo = eqTecTxt_(alvo.PERFIL).toUpperCase();
    var perfilSolicitante = eqTecPerfilSolicitante_(ss, params);

    if (!eqTecPodeAdministrarPerfil_(perfilSolicitante, perfilAlvo)) {
      return {
        success: false,
        code: "ALTERACAO_ACESSO_NAO_AUTORIZADA",
        message: "Seu perfil não pode alterar esse acesso."
      };
    }

    var loginSolicitante = eqTecTxt_(params.usuario);
    if (
      ativo === "NAO" &&
      eqTecNorm_(alvo.LOGIN) === eqTecNorm_(loginSolicitante)
    ) {
      return {
        success: false,
        code: "AUTO_DESATIVACAO_BLOQUEADA",
        message: "Não é permitido desativar o próprio acesso."
      };
    }

    var row = alvo.__row;
    if (!row) {
      var idAlvo = eqTecTxt_(alvo.ID_USUARIO);
      var meta = eqTecMapaCabecalhos_(shU);
      var qtd = Math.max(0, shU.getLastRow() - 1);
      var ids = qtd > 0
        ? shU.getRange(2, meta.map.ID_USUARIO, qtd, 1).getDisplayValues()
        : [];
      for (var i = 0; i < ids.length; i++) {
        if (eqTecTxt_(ids[i][0]) === idAlvo) {
          row = i + 2;
          break;
        }
      }
    }

    if (!row) throw new Error("Linha do usuário não localizada.");

    eqTecAtualizarCampos_(shU, row, {
      ATIVO: ativo,
      DATA_ATUALIZACAO: new Date()
    });

    return {
      success: true,
      code: ativo === "SIM" ? "ACESSO_ATIVADO" : "ACESSO_DESATIVADO",
      acesso: {
        id_usuario: eqTecTxt_(alvo.ID_USUARIO),
        login: eqTecTxt_(alvo.LOGIN),
        perfil: perfilAlvo,
        ativo: ativo
      },
      versao: "EQUIPE_ACESSOS_V1"
    };
  } catch (error) {
    console.error("[equipe_acesso_status]", error);
    return {
      success: false,
      code: "ERRO_INTERNO",
      message: "Não foi possível alterar o status do acesso."
    };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function equipe_acesso_redefinir_senha(params) {
  params = params || {};
  var gate = eqTecAutorizar_(params, "EXECUTAR");
  if (!gate.ok) return gate.response;

  var novaSenha = String(
    params.nova_senha === undefined || params.nova_senha === null
      ? ""
      : params.nova_senha
  );

  if (novaSenha.length < 8) {
    return {
      success: false,
      code: "SENHA_CURTA",
      message: "A nova senha deve possuir ao menos 8 caracteres."
    };
  }

  if (typeof f62HashSenha_ !== "function") {
    return {
      success: false,
      code: "HELPER_HASH_AUSENTE",
      message: "Helper oficial de credencial f62HashSenha_ não está disponível."
    };
  }

  var pepper = PropertiesService
    .getScriptProperties()
    .getProperty(F62_PEPPER_PROPERTY);

  if (!pepper) {
    return {
      success: false,
      code: "PEPPER_AUSENTE",
      message: "Configuração de credencial indisponível."
    };
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var ss = eqTecSpreadsheet_();
    var shU = typeof F62_ABA_USUARIOS !== "undefined"
      ? eqTecExigirAba_(ss, F62_ABA_USUARIOS)
      : eqTecExigirAba_(ss, "USUARIOS");

    var usuarios = eqTecLerObjetos_(shU);
    var alvo = eqTecEncontrarUsuario_(usuarios, params.id_usuario, params.login);

    if (!alvo) {
      return {
        success: false,
        code: "ACESSO_NAO_ENCONTRADO",
        message: "Usuário de acesso não encontrado."
      };
    }

    var perfilAlvo = eqTecTxt_(alvo.PERFIL).toUpperCase();
    var perfilSolicitante = eqTecPerfilSolicitante_(ss, params);

    if (!eqTecPodeAdministrarPerfil_(perfilSolicitante, perfilAlvo)) {
      return {
        success: false,
        code: "REDEFINICAO_ACESSO_NAO_AUTORIZADA",
        message: "Seu perfil não pode redefinir a senha desse acesso."
      };
    }

    var tipoAtual = eqTecTxt_(alvo.CREDENCIAL_TIPO).toUpperCase();
    if (
      tipoAtual &&
      tipoAtual !== EQTEC_CREDENCIAL_TIPO &&
      tipoAtual !== "LEGACY_QR_HASH"
    ) {
      return {
        success: false,
        code: "CREDENCIAL_NAO_SUPORTADA",
        message: "O tipo atual de credencial não permite redefinição por esta tela."
      };
    }

    var row = alvo.__row;
    if (!row) {
      var idAlvo = eqTecTxt_(alvo.ID_USUARIO);
      var meta = eqTecMapaCabecalhos_(shU);
      var qtd = Math.max(0, shU.getLastRow() - 1);
      var ids = qtd > 0
        ? shU.getRange(2, meta.map.ID_USUARIO, qtd, 1).getDisplayValues()
        : [];
      for (var i = 0; i < ids.length; i++) {
        if (eqTecTxt_(ids[i][0]) === idAlvo) {
          row = i + 2;
          break;
        }
      }
    }

    if (!row) throw new Error("Linha do usuário não localizada.");

    var salt = eqTecGerarSalt_();
    var hash = f62HashSenha_(novaSenha, salt, pepper);

    eqTecAtualizarCampos_(shU, row, {
      SENHA_HASH: hash,
      SENHA_SALT: salt,
      CREDENCIAL_TIPO: EQTEC_CREDENCIAL_TIPO,
      PRIMEIRO_ACESSO: "SIM",
      DATA_ATUALIZACAO: new Date()
    });

    // Se era técnico legado já conhecido pelo QR, força a ponte AUTH62
    // no próximo login QR para que a senha antiga não continue válida.
    if (perfilAlvo === "TECNICO") {
      try {
        var shQr = ss.getSheetByName("QR_OS_USUARIOS_PILOTO");
        if (shQr) {
          var metaQr = eqTecMapaCabecalhos_(shQr);
          if (metaQr.map.LOGIN && metaQr.map.SENHA_HASH) {
            var qtdQr = Math.max(0, shQr.getLastRow() - 1);
            var valoresQr = qtdQr > 0
              ? shQr.getRange(2, 1, qtdQr, shQr.getLastColumn()).getDisplayValues()
              : [];
            for (var q = 0; q < valoresQr.length; q++) {
              if (
                eqTecNorm_(valoresQr[q][metaQr.map.LOGIN - 1]) ===
                eqTecNorm_(alvo.LOGIN)
              ) {
                shQr
                  .getRange(q + 2, metaQr.map.SENHA_HASH)
                  .setValue("AUTH62_ONLY");
                break;
              }
            }
          }
        }
      } catch (qrError) {
        console.error("[equipe_acesso_redefinir_senha] Ponte QR:", qrError);
      }
    }

    return {
      success: true,
      code: "SENHA_REDEFINIDA",
      acesso: {
        id_usuario: eqTecTxt_(alvo.ID_USUARIO),
        login: eqTecTxt_(alvo.LOGIN),
        perfil: perfilAlvo,
        primeiro_acesso: "SIM"
      },
      versao: "EQUIPE_ACESSOS_V1"
    };
  } catch (error) {
    console.error("[equipe_acesso_redefinir_senha]", error);
    return {
      success: false,
      code: "ERRO_INTERNO",
      message: "Não foi possível redefinir a senha."
    };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function equipe_colaborador_criar(params) {
  params = params || {};
  var gate = eqTecAutorizar_(params, "CRIAR");
  if (!gate.ok) return gate.response;

  var nome = eqTecTxt_(params.nome);
  var nomeBd = eqTecTxt_(params.nome_bd || params.nome).toUpperCase();
  var funcao = eqTecTxt_(params.funcao);
  var especialidade = eqTecTxt_(params.especialidade);
  var tipoVinculo = eqTecTxt_(params.tipo_vinculo);
  var contabilizar = eqTecSimNao_(params.contabilizar_hh_custo);

  if (!nome || !funcao) {
    return {
      success: false,
      code: "CAMPOS_OBRIGATORIOS",
      message: "Nome e função são obrigatórios."
    };
  }

  if (contabilizar !== "SIM" && contabilizar !== "NAO") {
    return {
      success: false,
      code: "HH_CUSTO_INVALIDO",
      message: "contabilizar_hh_custo deve ser SIM ou NAO."
    };
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var ss = eqTecSpreadsheet_();
    var shC = eqTecExigirAba_(ss, EQTEC_ABA_COLABORADORES);

    var metaC = eqTecMapaCabecalhos_(shC);
    eqTecExigirColunas_(
      metaC.map,
      [
        "ID_COLABORADOR", "NOME_EXIBICAO", "NOME_BD_EXATO",
        "NOME_NORMALIZADO", "FUNCAO", "ESPECIALIDADE", "ATIVO",
        "STATUS_CADASTRO", "DATA_CADASTRO", "OBSERVACAO",
        "TIPO_VINCULO", "CONTABILIZAR_HH_CUSTO"
      ],
      shC.getName()
    );

    var colaboradores = eqTecLerObjetos_(shC);
    var nomeNorm = eqTecNorm_(nomeBd);

    var existente = colaboradores.find(function(c) {
      return eqTecNorm_(c.NOME_NORMALIZADO || c.NOME_BD_EXATO || c.NOME_EXIBICAO) === nomeNorm;
    });

    if (existente) {
      return {
        success: false,
        code: "COLABORADOR_DUPLICADO",
        message: "Já existe colaborador com esse nome.",
        id_colaborador: eqTecTxt_(existente.ID_COLABORADOR)
      };
    }

    var idsCol = {};
    colaboradores.forEach(function(c) {
      idsCol[eqTecTxt_(c.ID_COLABORADOR)] = true;
    });

    var novoId = eqTecGerarId_("COL-", idsCol);
    var agora = new Date();

    eqTecAppendPorCabecalho_(shC, {
      ID_COLABORADOR: novoId,
      NOME_EXIBICAO: nome,
      NOME_BD_EXATO: nomeBd,
      NOME_NORMALIZADO: nomeNorm,
      FUNCAO: funcao,
      ESPECIALIDADE: especialidade,
      ATIVO: "SIM",
      STATUS_CADASTRO: "VALIDADO",
      DATA_CADASTRO: agora,
      OBSERVACAO: "Cadastro via equipe_colaborador_criar.",
      TIPO_VINCULO: tipoVinculo,
      CONTABILIZAR_HH_CUSTO: contabilizar
    });

    return {
      success: true,
      code: "COLABORADOR_CRIADO",
      colaborador: {
        id_colaborador: novoId,
        nome: nome,
        nome_bd: nomeBd,
        funcao: funcao,
        especialidade: especialidade,
        ativo: "SIM",
        status_cadastro: "VALIDADO",
        tipo_vinculo: tipoVinculo,
        contabilizar_hh_custo: contabilizar
      },
      versao: "EQUIPE_TECNICOS_V1"
    };
  } catch (error) {
    console.error("[equipe_colaborador_criar]", error);
    return {
      success: false,
      code: "ERRO_INTERNO",
      message: "Não foi possível criar o colaborador."
    };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function equipe_tecnico_criar(params) {
  params = params || {};
  var gate = eqTecAutorizar_(params, "CRIAR");
  if (!gate.ok) return gate.response;

  var nome = eqTecTxt_(params.nome);
  var nomeBd = eqTecTxt_(params.nome_bd || params.nome).toUpperCase();
  var login = eqTecTxt_(params.login);
  var senha = String(params.senha === undefined || params.senha === null ? "" : params.senha);
  var funcao = eqTecTxt_(params.funcao);
  var especialidade = eqTecTxt_(params.especialidade);
  var tipoVinculo = eqTecTxt_(params.tipo_vinculo);
  var contabilizar = eqTecSimNao_(params.contabilizar_hh_custo);
  var idColaboradorInformado = eqTecTxt_(params.id_colaborador);

  if (!nome || !login || !senha || !funcao) {
    return {
      success: false,
      code: "CAMPOS_OBRIGATORIOS",
      message: "Nome, login, senha e função são obrigatórios."
    };
  }

  if (senha.length < 8) {
    return {
      success: false,
      code: "SENHA_CURTA",
      message: "A senha inicial deve possuir ao menos 8 caracteres."
    };
  }

  if (contabilizar !== "SIM" && contabilizar !== "NAO") {
    return {
      success: false,
      code: "HH_CUSTO_INVALIDO",
      message: "contabilizar_hh_custo deve ser SIM ou NAO."
    };
  }

  if (typeof f62HashSenha_ !== "function") {
    return {
      success: false,
      code: "HELPER_HASH_AUSENTE",
      message: "Helper oficial de credencial f62HashSenha_ não está disponível."
    };
  }

  var pepper = PropertiesService
    .getScriptProperties()
    .getProperty(F62_PEPPER_PROPERTY);

  if (!pepper) {
    return {
      success: false,
      code: "PEPPER_AUSENTE",
      message: "Configuração de credencial indisponível."
    };
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  var novaLinhaColaborador = 0;

  try {
    var ss = eqTecSpreadsheet_();
    var shU = typeof F62_ABA_USUARIOS !== "undefined"
      ? eqTecExigirAba_(ss, F62_ABA_USUARIOS)
      : eqTecExigirAba_(ss, "USUARIOS");
    var shC = eqTecExigirAba_(ss, EQTEC_ABA_COLABORADORES);

    var metaU = eqTecMapaCabecalhos_(shU);
    eqTecExigirColunas_(
      metaU.map,
      [
        "ID_USUARIO", "NOME", "LOGIN", "SENHA_HASH", "SENHA_SALT",
        "PERFIL", "ID_COLABORADOR", "UNIDADE", "ATIVO",
        "PRIMEIRO_ACESSO", "DATA_CADASTRO", "DATA_ATUALIZACAO",
        "ULTIMO_LOGIN", "OBSERVACAO", "CREDENCIAL_TIPO"
      ],
      shU.getName()
    );

    var metaC = eqTecMapaCabecalhos_(shC);
    eqTecExigirColunas_(
      metaC.map,
      [
        "ID_COLABORADOR", "NOME_EXIBICAO", "NOME_BD_EXATO",
        "NOME_NORMALIZADO", "FUNCAO", "ESPECIALIDADE", "ATIVO",
        "STATUS_CADASTRO", "DATA_CADASTRO", "OBSERVACAO",
        "TIPO_VINCULO", "CONTABILIZAR_HH_CUSTO"
      ],
      shC.getName()
    );

    var usuarios = eqTecLerObjetos_(shU);
    var loginNorm = eqTecNorm_(login);
    var loginDuplicado = usuarios.some(function(u) {
      return eqTecNorm_(u.LOGIN) === loginNorm;
    });

    if (loginDuplicado) {
      return {
        success: false,
        code: "LOGIN_DUPLICADO",
        message: "Já existe um usuário com esse login."
      };
    }

    var colaboradores = eqTecLerObjetos_(shC);
    var colaborador = null;

    if (idColaboradorInformado) {
      var encontradosId = colaboradores.filter(function(c) {
        return eqTecTxt_(c.ID_COLABORADOR) === idColaboradorInformado;
      });

      if (encontradosId.length !== 1) {
        return {
          success: false,
          code: "COLABORADOR_INVALIDO",
          message: "O colaborador informado não foi encontrado de forma única."
        };
      }

      colaborador = encontradosId[0];

      if (eqTecSimNao_(colaborador.ATIVO) !== "SIM") {
        return {
          success: false,
          code: "COLABORADOR_INATIVO",
          message: "O colaborador informado está inativo."
        };
      }

      var jaVinculado = usuarios.some(function(u) {
        return (
          eqTecTxt_(u.PERFIL).toUpperCase() === "TECNICO" &&
          eqTecTxt_(u.ID_COLABORADOR) === idColaboradorInformado
        );
      });

      if (jaVinculado) {
        return {
          success: false,
          code: "COLABORADOR_JA_TEM_USUARIO",
          message: "Esse colaborador já possui usuário técnico."
        };
      }
    } else {
      var nomeNorm = eqTecNorm_(nomeBd);
      var mesmoNome = colaboradores.filter(function(c) {
        return eqTecNorm_(c.NOME_NORMALIZADO || c.NOME_BD_EXATO || c.NOME_EXIBICAO) === nomeNorm;
      });

      if (mesmoNome.length > 0) {
        return {
          success: false,
          code: "COLABORADOR_EXISTENTE_REQUER_VINCULO",
          message: "Já existe colaborador com esse nome. Informe id_colaborador para vinculá-lo.",
          id_colaborador: eqTecTxt_(mesmoNome[0].ID_COLABORADOR)
        };
      }

      var idsCol = {};
      colaboradores.forEach(function(c) {
        idsCol[eqTecTxt_(c.ID_COLABORADOR)] = true;
      });

      var novoIdCol = eqTecGerarId_("COL-", idsCol);
      var agoraCol = new Date();

      novaLinhaColaborador = eqTecAppendPorCabecalho_(shC, {
        ID_COLABORADOR: novoIdCol,
        NOME_EXIBICAO: nome,
        NOME_BD_EXATO: nomeBd,
        NOME_NORMALIZADO: eqTecNorm_(nomeBd),
        FUNCAO: funcao,
        ESPECIALIDADE: especialidade,
        ATIVO: "SIM",
        STATUS_CADASTRO: "VALIDADO",
        DATA_CADASTRO: agoraCol,
        OBSERVACAO: "Cadastro via equipe_tecnico_criar.",
        TIPO_VINCULO: tipoVinculo,
        CONTABILIZAR_HH_CUSTO: contabilizar
      });

      colaborador = {
        ID_COLABORADOR: novoIdCol,
        NOME_EXIBICAO: nome
      };
    }

    var idsUsuario = {};
    usuarios.forEach(function(u) {
      idsUsuario[eqTecTxt_(u.ID_USUARIO)] = true;
    });

    var idUsuario = eqTecGerarId_("USR-", idsUsuario);
    var idColaborador = eqTecTxt_(colaborador.ID_COLABORADOR);
    var salt = eqTecGerarSalt_();
    var hash = f62HashSenha_(senha, salt, pepper);
    var agora = new Date();

    try {
      eqTecAppendPorCabecalho_(shU, {
        ID_USUARIO: idUsuario,
        NOME: nome,
        LOGIN: login,
        SENHA_HASH: hash,
        SENHA_SALT: salt,
        PERFIL: "TECNICO",
        ID_COLABORADOR: idColaborador,
        UNIDADE: EQTEC_UNIDADE_PADRAO,
        ATIVO: "SIM",
        PRIMEIRO_ACESSO: "SIM",
        DATA_CADASTRO: agora,
        DATA_ATUALIZACAO: agora,
        ULTIMO_LOGIN: "",
        OBSERVACAO: "Usuário técnico criado via equipe_tecnico_criar.",
        CREDENCIAL_TIPO: EQTEC_CREDENCIAL_TIPO
      });
    } catch (userWriteError) {
      if (novaLinhaColaborador > 1) {
        try {
          shC.deleteRow(novaLinhaColaborador);
        } catch (rollbackError) {
          console.error("[equipe_tecnico_criar] Falha no rollback do colaborador:", rollbackError);
        }
      }
      throw userWriteError;
    }

    return {
      success: true,
      code: "TECNICO_CRIADO",
      tecnico: {
        id_usuario: idUsuario,
        nome: nome,
        login: login,
        perfil: "TECNICO",
        id_colaborador: idColaborador,
        unidade: EQTEC_UNIDADE_PADRAO,
        ativo: "SIM",
        primeiro_acesso: "SIM"
      },
      versao: "EQUIPE_TECNICOS_V1"
    };
  } catch (error) {
    console.error("[equipe_tecnico_criar]", error);
    return {
      success: false,
      code: "ERRO_INTERNO",
      message: "Não foi possível criar o técnico."
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {
      // lock não adquirido/liberado
    }
  }
}

function equipe_tecnico_status(params) {
  params = params || {};
  var gate = eqTecAutorizar_(params, "EDITAR");
  if (!gate.ok) return gate.response;

  var ativo = eqTecSimNao_(params.ativo);
  if (ativo !== "SIM" && ativo !== "NAO") {
    return {
      success: false,
      code: "STATUS_INVALIDO",
      message: "ativo deve ser SIM ou NAO."
    };
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var ss = eqTecSpreadsheet_();
    var shU = typeof F62_ABA_USUARIOS !== "undefined"
      ? eqTecExigirAba_(ss, F62_ABA_USUARIOS)
      : eqTecExigirAba_(ss, "USUARIOS");

    var usuarios = eqTecLerObjetos_(shU);
    var alvo = eqTecEncontrarUsuario_(usuarios, params.id_usuario, params.login);

    if (!alvo || eqTecTxt_(alvo.PERFIL).toUpperCase() !== "TECNICO") {
      return {
        success: false,
        code: "TECNICO_NAO_ENCONTRADO",
        message: "Usuário técnico não encontrado."
      };
    }

    var row = alvo.__row;
    if (!row) {
      var idAlvo = eqTecTxt_(alvo.ID_USUARIO);
      var meta = eqTecMapaCabecalhos_(shU);
      var ids = shU.getRange(2, meta.map.ID_USUARIO, Math.max(0, shU.getLastRow() - 1), 1).getDisplayValues();
      for (var i = 0; i < ids.length; i++) {
        if (eqTecTxt_(ids[i][0]) === idAlvo) {
          row = i + 2;
          break;
        }
      }
    }

    if (!row) throw new Error("Linha do usuário não localizada.");

    eqTecAtualizarCampos_(shU, row, {
      ATIVO: ativo,
      DATA_ATUALIZACAO: new Date()
    });

    return {
      success: true,
      code: ativo === "SIM" ? "TECNICO_ATIVADO" : "TECNICO_DESATIVADO",
      id_usuario: eqTecTxt_(alvo.ID_USUARIO),
      ativo: ativo,
      versao: "EQUIPE_TECNICOS_V1"
    };
  } catch (error) {
    console.error("[equipe_tecnico_status]", error);
    return {
      success: false,
      code: "ERRO_INTERNO",
      message: "Não foi possível alterar o acesso do técnico."
    };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * IMPORTANTE:
 * Esta action deve ser usada somente quando o login QR estiver unificado com AUTH62.
 * Para usuários LEGACY_QR_HASH ela retorna bloqueio preventivo, evitando senha
 * divergente entre o login normal e o QR legado.
 */
function equipe_tecnico_redefinir_senha(params) {
  params = params || {};
  var gate = eqTecAutorizar_(params, "EXECUTAR");
  if (!gate.ok) return gate.response;

  var novaSenha = String(
    params.nova_senha === undefined || params.nova_senha === null
      ? ""
      : params.nova_senha
  );

  if (novaSenha.length < 8) {
    return {
      success: false,
      code: "SENHA_CURTA",
      message: "A nova senha deve possuir ao menos 8 caracteres."
    };
  }

  if (typeof f62HashSenha_ !== "function") {
    return {
      success: false,
      code: "HELPER_HASH_AUSENTE",
      message: "Helper oficial de credencial f62HashSenha_ não está disponível."
    };
  }

  var pepper = PropertiesService
    .getScriptProperties()
    .getProperty(F62_PEPPER_PROPERTY);

  if (!pepper) {
    return {
      success: false,
      code: "PEPPER_AUSENTE",
      message: "Configuração de credencial indisponível."
    };
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var ss = eqTecSpreadsheet_();
    var shU = typeof F62_ABA_USUARIOS !== "undefined"
      ? eqTecExigirAba_(ss, F62_ABA_USUARIOS)
      : eqTecExigirAba_(ss, "USUARIOS");

    var usuarios = eqTecLerObjetos_(shU);
    var alvo = eqTecEncontrarUsuario_(usuarios, params.id_usuario, params.login);

    if (!alvo || eqTecTxt_(alvo.PERFIL).toUpperCase() !== "TECNICO") {
      return {
        success: false,
        code: "TECNICO_NAO_ENCONTRADO",
        message: "Usuário técnico não encontrado."
      };
    }

    var tipoAtual = eqTecTxt_(alvo.CREDENCIAL_TIPO).toUpperCase();
    if (tipoAtual === "LEGACY_QR_HASH") {
      return {
        success: false,
        code: "LEGACY_QR_REDEFINICAO_BLOQUEADA",
        message: "Redefinição bloqueada enquanto o login QR legado não estiver unificado com AUTH62."
      };
    }

    var row = alvo.__row;
    if (!row) {
      var idAlvo = eqTecTxt_(alvo.ID_USUARIO);
      var meta = eqTecMapaCabecalhos_(shU);
      var ids = shU.getRange(2, meta.map.ID_USUARIO, Math.max(0, shU.getLastRow() - 1), 1).getDisplayValues();
      for (var i = 0; i < ids.length; i++) {
        if (eqTecTxt_(ids[i][0]) === idAlvo) {
          row = i + 2;
          break;
        }
      }
    }

    if (!row) throw new Error("Linha do usuário não localizada.");

    var salt = eqTecGerarSalt_();
    var hash = f62HashSenha_(novaSenha, salt, pepper);

    eqTecAtualizarCampos_(shU, row, {
      SENHA_HASH: hash,
      SENHA_SALT: salt,
      CREDENCIAL_TIPO: EQTEC_CREDENCIAL_TIPO,
      PRIMEIRO_ACESSO: "SIM",
      DATA_ATUALIZACAO: new Date()
    });

    return {
      success: true,
      code: "SENHA_REDEFINIDA",
      id_usuario: eqTecTxt_(alvo.ID_USUARIO),
      primeiro_acesso: "SIM",
      versao: "EQUIPE_TECNICOS_V1"
    };
  } catch (error) {
    console.error("[equipe_tecnico_redefinir_senha]", error);
    return {
      success: false,
      code: "ERRO_INTERNO",
      message: "Não foi possível redefinir a senha do técnico."
    };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}
