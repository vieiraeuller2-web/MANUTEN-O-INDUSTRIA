/**
 * KRON / AUTH62 — ponte POST para a rota oficial auth_me.
 *
 * O login utiliza POST para manter o token no corpo da requisição.
 * A implementação histórica expõe auth_me apenas no roteador GET.
 * Este helper invoca o roteador GET INTERNAMENTE, sem realizar requisição
 * HTTP GET ou colocar token na URL.
 *
 * INSTALAÇÃO (no mesmo projeto GAS que publica o Web App):
 * 1. Confirme que auth62RotejarGet_(e) existe e atende action=auth_me.
 * 2. Cole este helper em um arquivo NOVO (nome distinto), sem criar doPost duplicado.
 * 3. No doPost(e) EXISTENTE, após parsear o JSON e obter `body` e `action`,
 *    ANTES de SHADOW/ENFORCEMENT/outros roteadores, inclua APENAS:
 *       if (action === 'auth_me') return kronAuthMePostBridge_(body);
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

  if (typeof auth62RotejarGet_ !== 'function') {
    return erroSeguro_(503, 'AUTH_ME_HANDLER_UNAVAILABLE');
  }

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
    var resposta = auth62RotejarGet_(eventoInterno);
    // Mantém exclusivamente a resposta da rota oficial AUTH62.
    if (resposta && typeof resposta.getContent === 'function') return resposta;
    return erroSeguro_(503, 'AUTH_ME_INVALID_HANDLER_RESULT');
  } catch (erro) {
    // Não registrar mensagem bruta: detalhes de exceção podem conter credenciais.
    return erroSeguro_(503, 'AUTH_ME_HANDLER_ERROR');
  }
}
