/**
 * KRON / AUTH62 — ponte POST para a rota oficial auth_me.
 *
 * O login utiliza POST para manter o token no corpo da requisição.
 * A implementação histórica expõe auth_me apenas no roteador GET.
 * Este helper invoca o roteador GET INTERNAMENTE, sem realizar requisição
 * HTTP GET ou colocar token na URL.
 *
 * INSTALAÇÃO (no mesmo projeto GAS que publica o Web App):
 * 1. Confirme qual roteador GET oficial da Fase 06.2C atende auth_me.
 * 2. Cole este helper em um arquivo NOVO (nome distinto), sem criar doPost duplicado.
 * 3. No doPost(e) EXISTENTE, após parsear o JSON e obter `payloadOriginal` e `action`,
 *    ANTES de SHADOW/ENFORCEMENT/outros roteadores, inclua APENAS:
 *       if (action === 'auth_me') return kronAuthMePostBridge_(payloadOriginal);
 * 4. Teste login, F5, logout e token revogado ANTES de publicar a nova versão.
 *
 * Não altera a matriz AUTH62, expiração, caches ou Enforcement 6.3B.
 */
function kronAuthMePostBridge_(body) {
  function erroSeguro_(codigo, mensagem) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      code: codigo,
      message: mensagem
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Apenas a ação de validação de sessão é encaminhada.
  if (!body || String(body.action || '').trim() !== 'auth_me') {
    return erroSeguro_(400, 'AUTH_ME_ACTION_INVALID');
  }
  var token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token) {
    return erroSeguro_(401, 'SESSION_INVALID');
  }

  // A Fase 06.2C utiliza prefixo auth62c; a memória também documenta\n  // um nome de roteador legado. Não inventar validação paralela.\n  var roteadores = [];\n  if (typeof auth62cRotejarGet_ === 'function') {\n    roteadores.push(auth62cRotejarGet_);\n  }\n  if (typeof auth62RotejarGet_ === 'function') {\n    roteadores.push(auth62RotejarGet_);\n  }\n  if (!roteadores.length) {\n    return erroSeguro_(503, 'AUTH_ME_GET_ROUTER_UNAVAILABLE');\n  }

  // Emular somente o OBJETO e.parameter fornecido pelo Apps Script doGet.
  // Nenhum GET externo é feito; token continua protegido no POST do servidor.
  var eventoInterno = {
    parameter: {
      action: 'auth_me',
      token: token,
      session_token: token
    },
    parameters: {
      action: ['auth_me'],
      token: [token],
      session_token: [token]
    }
  };

  try {
    for (var i = 0; i < roteadores.length; i++) {
      var resposta = roteadores[i](eventoInterno);
      if (!resposta) continue;
      if (typeof resposta.getContent === 'function') {
        var dados;
        try {
          dados = JSON.parse(resposta.getContent());
        } catch (ignorado) {
          return erroSeguro_(503, 'AUTH_ME_INVALID_JSON');
        }
        if (dados && typeof dados.success === 'boolean') return resposta;
        return erroSeguro_(503, 'AUTH_ME_INVALID_RESPONSE');
      }
      if (typeof resposta === 'object' && typeof resposta.success === 'boolean') {
        return ContentService.createTextOutput(JSON.stringify(resposta))
          .setMimeType(ContentService.MimeType.JSON);
      }
      return erroSeguro_(503, 'AUTH_ME_INVALID_RESPONSE');
    }
    return erroSeguro_(503, 'AUTH_ME_NOT_HANDLED');
  } catch (erro) {
    // Não registrar mensagem bruta: detalhes de exceção podem conter credenciais.
    return erroSeguro_(503, 'AUTH_ME_HANDLER_ERROR');
  }
}
