/**
 * PATCH QR ↔ AUTH62 — compatibilidade de login HMAC para técnicos
 *
 * Objetivo:
 * - preservar login QR legado atual;
 * - permitir que técnico criado em USUARIOS com HMAC_SHA256_PEPPER_V1
 *   use o MESMO login/senha no QR;
 * - após autenticação HMAC válida, cria/atualiza automaticamente a linha
 *   de compatibilidade em QR_OS_USUARIOS_PILOTO e segue o fluxo QR atual.
 *
 * Não altera QR público, registro de OS, sessão QR ou Enforcement 6.3B.
 */

var QRH_ABA_PILOTO = "QR_OS_USUARIOS_PILOTO";

function qrHSim_(v) {
  var s = String(v === undefined || v === null ? "" : v)
    .trim()
    .toUpperCase();
  return s === "SIM" || s === "TRUE" || s === "1";
}

function qrHValidarTecnicoAuth62_(login, senha) {
  try {
    if (
      typeof f62HashSenha_ !== "function" ||
      typeof f62SafeEqual_ !== "function" ||
      typeof f62LerObjetos_ !== "function"
    ) {
      return { ok: false, code: "AUTH62_HELPER_AUSENTE" };
    }

    var ss = SpreadsheetApp.openById(F62_SPREADSHEET_ID);
    var shU = ss.getSheetByName(F62_ABA_USUARIOS);

    if (!shU) {
      return { ok: false, code: "USUARIOS_AUSENTE" };
    }

    var alvo = String(login || "").trim().toLowerCase();

    var encontrados = f62LerObjetos_(shU).filter(function(u) {
      return String(u.LOGIN || "").trim().toLowerCase() === alvo;
    });

    if (encontrados.length !== 1) {
      return { ok: false, code: "LOGIN_INVALIDO" };
    }

    var u = encontrados[0];

    if (
      String(u.PERFIL || "").trim().toUpperCase() !== "TECNICO" ||
      !qrHSim_(u.ATIVO)
    ) {
      return { ok: false, code: "TECNICO_INATIVO_OU_PERFIL_INVALIDO" };
    }

    if (
      String(u.CREDENCIAL_TIPO || "").trim().toUpperCase() !==
      "HMAC_SHA256_PEPPER_V1"
    ) {
      return { ok: false, code: "CREDENCIAL_NAO_HMAC" };
    }

    var hashEsperado = String(u.SENHA_HASH || "").trim();
    var salt = String(u.SENHA_SALT || "").trim();

    var pepper = PropertiesService
      .getScriptProperties()
      .getProperty(F62_PEPPER_PROPERTY);

    if (!hashEsperado || !salt || !pepper) {
      return { ok: false, code: "CREDENCIAL_INCOMPLETA" };
    }

    var hashInformado = f62HashSenha_(
      String(senha),
      salt,
      pepper
    );

    if (!f62SafeEqual_(hashEsperado, hashInformado)) {
      return { ok: false, code: "LOGIN_INVALIDO" };
    }

    return {
      ok: true,
      usuario: {
        id_usuario: String(u.ID_USUARIO || "").trim(),
        nome: String(u.NOME || "").trim(),
        login: String(u.LOGIN || "").trim(),
        id_colaborador: String(u.ID_COLABORADOR || "").trim()
      }
    };

  } catch (e) {
    console.error("[qrHValidarTecnicoAuth62_]", e);
    return { ok: false, code: "ERRO_AUTH62" };
  }
}

function qrHMapaCabecalhos_(sh) {
  var headers = sh
    .getRange(1, 1, 1, sh.getLastColumn())
    .getDisplayValues()[0];

  var map = {};

  headers.forEach(function(h, i) {
    var key = String(h || "").trim().toUpperCase();
    if (key) map[key] = i + 1;
  });

  return map;
}

function qrHUpsertPiloto_(usuarioAuth, senha) {
  if (typeof qrOsHash_ !== "function") {
    throw new Error("qrOsHash_ não disponível.");
  }

  var ss = SpreadsheetApp.openById(F62_SPREADSHEET_ID);
  var sh = ss.getSheetByName(QRH_ABA_PILOTO);

  if (!sh) {
    throw new Error(
      "Aba QR_OS_USUARIOS_PILOTO não encontrada."
    );
  }

  var map = qrHMapaCabecalhos_(sh);
  var obrigatorias = [
    "ID_USUARIO_PILOTO",
    "NOME_TECNICO",
    "LOGIN",
    "SENHA_HASH",
    "ATIVO",
    "DATA_CADASTRO"
  ];

  obrigatorias.forEach(function(c) {
    if (!map[c]) {
      throw new Error(
        "Coluna obrigatória ausente em QR_OS_USUARIOS_PILOTO: " + c
      );
    }
  });

  var login = String(usuarioAuth.login || "").trim();
  var loginNorm = login.toLowerCase();
  var id = String(usuarioAuth.id_usuario || "").trim();
  var nome = String(usuarioAuth.nome || "").trim();
  var hashQr = String(qrOsHash_(String(senha))).toLowerCase();

  var row = 0;
  var lastRow = sh.getLastRow();

  if (lastRow >= 2) {
    var values = sh
      .getRange(2, 1, lastRow - 1, sh.getLastColumn())
      .getDisplayValues();

    for (var i = 0; i < values.length; i++) {
      var rowLogin = String(
        values[i][map.LOGIN - 1] || ""
      ).trim().toLowerCase();

      var rowId = String(
        values[i][map.ID_USUARIO_PILOTO - 1] || ""
      ).trim();

      if (rowLogin === loginNorm || (id && rowId === id)) {
        row = i + 2;
        break;
      }
    }
  }

  if (!row) {
    row = sh.getLastRow() + 1;
    sh.getRange(row, map.DATA_CADASTRO).setValue(new Date());
  }

  sh.getRange(row, map.ID_USUARIO_PILOTO).setValue(id);
  sh.getRange(row, map.NOME_TECNICO).setValue(nome);
  sh.getRange(row, map.LOGIN).setValue(login);
  sh.getRange(row, map.SENHA_HASH).setValue(hashQr);
  sh.getRange(row, map.ATIVO).setValue("SIM");

  return row;
}

/**
 * SUBSTITUIR a função qrOsLoginApi_ atual por esta versão.
 */
function qrOsLoginApi_(entrada) {
  try {
    var body = qrOsPayload_(entrada);

    var login = String(
      qrOsCampo_(
        body,
        [
          "login",
          "usuario",
          "email"
        ]
      )
    ).trim().toLowerCase();

    var senha = String(
      qrOsCampo_(
        body,
        [
          "senha",
          "password"
        ]
      )
    );

    if (!login || !senha) {
      return qrOsJson_({
        success: false,
        message:
          "Informe login e senha."
      });
    }

    if (!qrOsRateOk_(login)) {
      return qrOsJson_({
        success: false,
        message:
          "Muitas tentativas inválidas. " +
          "Aguarde alguns minutos."
      });
    }

    var c = qrOsCtx_();

    var usuario =
      c.usuarios.find(
        function(u) {
          return (
            String(
              qrOsGet_(
                u,
                ["LOGIN"]
              ) || ""
            ).trim().toLowerCase() ===
            login
          );
        }
      );

    var legadoValido =
      !!usuario &&
      qrOsNorm_(
        qrOsGet_(
          usuario,
          ["ATIVO"]
        )
      ) === "sim" &&
      qrOsEqSeguro_(
        qrOsHash_(senha),
        String(
          qrOsGet_(
            usuario,
            ["SENHA_HASH"]
          ) || ""
        ).toLowerCase()
      );

    // ------------------------------------------------------
    // PONTE HMAC -> QR LEGADO
    // Se o login não validou no piloto QR, tenta USUARIOS.
    // ------------------------------------------------------
    if (!legadoValido) {

      var auth62 =
        qrHValidarTecnicoAuth62_(
          login,
          senha
        );

      if (!auth62.ok) {
        qrOsRateFalha_(login);

        return qrOsJson_({
          success: false,
          message:
            "Usuário ou senha inválidos."
        });
      }

      // Autenticação HMAC válida:
      // cria/atualiza a compatibilidade QR com o mesmo login/senha.
      qrHUpsertPiloto_(
        auth62.usuario,
        senha
      );

      // Recarrega o contexto para que TODO o restante do fluxo QR
      // continue usando exatamente a infraestrutura já homologada.
      c = qrOsCtx_();

      usuario =
        c.usuarios.find(
          function(u) {
            return (
              String(
                qrOsGet_(
                  u,
                  ["LOGIN"]
                ) || ""
              ).trim().toLowerCase() ===
              login
            );
          }
        );

      if (
        !usuario ||
        qrOsNorm_(
          qrOsGet_(
            usuario,
            ["ATIVO"]
          )
        ) !== "sim" ||
        !qrOsEqSeguro_(
          qrOsHash_(senha),
          String(
            qrOsGet_(
              usuario,
              ["SENHA_HASH"]
            ) || ""
          ).toLowerCase()
        )
      ) {
        qrOsRateFalha_(login);

        return qrOsJson_({
          success: false,
          message:
            "Usuário ou senha inválidos."
        });
      }
    }

    qrOsRateLimpar_(login);

    var token =
      qrOsGerarToken_(usuario);

    qrOsAtualizarUltimoLogin_(
      c,
      usuario
    );

    var codigo = String(
      qrOsCampo_(
        body,
        [
          "codigo",
          "codigo_qr",
          "codigo_qr_publico"
        ]
      )
    ).trim();

    var ativo = codigo
      ? qrOsAtivoCodigo_(
          codigo,
          c.ativos
        )
      : null;

    return qrOsJson_({
      success: true,
      message:
        "Login realizado com sucesso.",
      token: token.token,
      expira_em:
        token.expira_em,
      tecnico: {
        id_usuario_piloto:
          qrOsGet_(
            usuario,
            ["ID_USUARIO_PILOTO"]
          ),
        nome:
          qrOsGet_(
            usuario,
            ["NOME_TECNICO"]
          ),
        login:
          qrOsGet_(
            usuario,
            ["LOGIN"]
          )
      },
      equipamento: ativo
        ? qrOsAtivoPublico_(ativo)
        : null
    });

  } catch (e) {
    return qrOsJson_({
      success: false,
      message:
        "Erro no login: " +
        qrOsErro_(e)
    });
  }
}
