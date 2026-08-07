/**
 * Gera a relação de QR Codes dos ativos liberados para consulta pública.
 *
 * Antes da primeira execução, configure nas Propriedades do script:
 * QR_APP_BASE_URL=https://manutencao-industria.vercel.app
 */
function gerarQrCodesAtivos20260806() {
  var resultado = gerarQrCodesAtivosInterno20260806_();
  SpreadsheetApp.getActive().toast(
    resultado.quantidade + ' ativo(s) processado(s) na aba QR_CODES.',
    'QR Codes atualizados',
    8
  );
  return resultado;
}

/**
 * Gera a aba completa e destaca no registro de execução o QR do ativo piloto.
 * Para testar outro ativo, execute por exemplo:
 * gerarQrCodePilotoPorNome20260806('FORNO 01')
 */
function gerarQrCodePilotoPorNome20260806(nomeAtivo) {
  var nomeProcurado = String(nomeAtivo || 'POLITRIZ AGF').trim();
  var resultado = gerarQrCodesAtivosInterno20260806_();
  var piloto = null;

  for (var i = 0; i < resultado.registros.length; i++) {
    if (normalizarTextoQr20260806_(resultado.registros[i].nomeAtivo) === normalizarTextoQr20260806_(nomeProcurado)) {
      piloto = resultado.registros[i];
      break;
    }
  }

  if (!piloto) {
    throw new Error('Ativo piloto não encontrado entre os ativos liberados: ' + nomeProcurado);
  }

  var aviso = piloto.tagAtivo
    ? 'QR piloto pronto para validação.'
    : 'ATENÇÃO: ativo sem TAG. Não imprimir etiqueta definitiva.';

  Logger.log(aviso + ' ' + piloto.nomeAtivo + ': ' + piloto.urlPublica);
  SpreadsheetApp.getActive().toast(aviso, piloto.nomeAtivo, 10);

  return {
    nome_ativo: piloto.nomeAtivo,
    tag_ativo: piloto.tagAtivo || '[SEM TAG]',
    codigo_qr_publico: piloto.codigoPublico,
    url_publica: piloto.urlPublica,
    pronto_para_impressao: Boolean(piloto.tagAtivo && piloto.status === 'PRONTO'),
    aviso: aviso
  };
}

function gerarQrCodesAtivosInterno20260806_() {
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var origem = planilha.getSheetByName('preventivas_ativos');

  if (!origem) {
    throw new Error('A aba preventivas_ativos não foi encontrada.');
  }

  var valores = origem.getDataRange().getDisplayValues();
  if (valores.length < 2) {
    throw new Error('A aba preventivas_ativos não possui registros.');
  }

  var colunas = mapearCabecalhosQr20260806_(valores[0]);
  validarCabecalhosQr20260806_(colunas);
  var baseUrl = obterBaseUrlQr20260806_();
  var candidatos = [];

  for (var linha = 1; linha < valores.length; linha++) {
    var dados = valores[linha];
    var ativo = lerColunaQr20260806_(dados, colunas, 'ATIVO');
    var qrAtivo = lerColunaQr20260806_(dados, colunas, 'QR_PUBLICO_ATIVO');
    var codigo = lerColunaQr20260806_(dados, colunas, 'CODIGO_QR_PUBLICO');
    var observacao = lerColunaQr20260806_(dados, colunas, 'OBSERVACAO');

    if (!ehSimQr20260806_(ativo) || !ehSimQr20260806_(qrAtivo) || !codigo) continue;
    if (ehClasseAgrupadaQr20260806_(observacao)) continue;

    candidatos.push({
      idAtivo: lerColunaQr20260806_(dados, colunas, 'ID_ATIVO'),
      tagAtivo: lerColunaQr20260806_(dados, colunas, 'TAG_ATIVO'),
      nomeAtivo: lerColunaQr20260806_(dados, colunas, 'NOME_ATIVO'),
      setor: lerColunaQr20260806_(dados, colunas, 'SETOR'),
      codigoPublico: codigo
    });
  }

  var quantidadePorCodigo = {};
  for (var c = 0; c < candidatos.length; c++) {
    var chaveCodigo = candidatos[c].codigoPublico.toUpperCase();
    quantidadePorCodigo[chaveCodigo] = (quantidadePorCodigo[chaveCodigo] || 0) + 1;
  }

  var validacoes = validarDestinosPublicosQr20260806_(candidatos, quantidadePorCodigo, baseUrl);

  var agora = new Date();
  var linhasSaida = [];
  var registros = [];

  for (var indice = 0; indice < candidatos.length; indice++) {
    var item = candidatos[indice];
    var codigoNormalizado = item.codigoPublico.toUpperCase();
    var urlPublica = baseUrl + '/equipamento/' + encodeURIComponent(item.codigoPublico);
    var urlQrPng = 'https://quickchart.io/qr?text=' + encodeURIComponent(urlPublica) + '&size=300&margin=2';
    var status = 'PRONTO';

    if (quantidadePorCodigo[codigoNormalizado] > 1) {
      status = 'CÓDIGO DUPLICADO - NÃO IMPRIMIR';
    } else if (!item.tagAtivo) {
      status = 'SEM TAG - NÃO IMPRIMIR';
    } else if (!validacoes[codigoNormalizado] || !validacoes[codigoNormalizado].paginaOk) {
      status = 'PÁGINA INDISPONÍVEL - NÃO IMPRIMIR';
    } else if (!validacoes[codigoNormalizado].apiOk) {
      status = 'API SEM SUCESSO - NÃO IMPRIMIR';
    }

    linhasSaida.push([
      item.idAtivo,
      item.tagAtivo || '[SEM TAG]',
      item.nomeAtivo,
      item.setor,
      item.codigoPublico,
      urlPublica,
      urlQrPng,
      '',
      status,
      agora
    ]);

    registros.push({
      idAtivo: item.idAtivo,
      tagAtivo: item.tagAtivo,
      nomeAtivo: item.nomeAtivo,
      setor: item.setor,
      codigoPublico: item.codigoPublico,
      urlPublica: urlPublica,
      urlQrPng: urlQrPng,
      status: status
    });
  }

  var destino = planilha.getSheetByName('QR_CODES') || planilha.insertSheet('QR_CODES');
  destino.clear();

  var cabecalhos = [[
    'ID_ATIVO',
    'TAG_ATIVO',
    'NOME_ATIVO',
    'SETOR',
    'CODIGO_QR_PUBLICO',
    'URL_PUBLICA',
    'URL_QR_PNG',
    'QR_PREVIEW',
    'STATUS',
    'DATA_GERACAO'
  ]];

  destino.getRange(1, 1, 1, cabecalhos[0].length).setValues(cabecalhos);

  if (linhasSaida.length > 0) {
    destino.getRange(2, 1, linhasSaida.length, cabecalhos[0].length).setValues(linhasSaida);

    for (var r = 0; r < linhasSaida.length; r++) {
      destino.getRange(r + 2, 8).setFormula('=IMAGE("' + linhasSaida[r][6] + '")');
      destino.setRowHeight(r + 2, 120);
    }

    destino.getRange(2, 10, linhasSaida.length, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  }

  formatarAbaQrCodes20260806_(destino, Math.max(1, linhasSaida.length));

  return {
    quantidade: registros.length,
    baseUrl: baseUrl,
    registros: registros
  };
}

function obterBaseUrlQr20260806_() {
  var valor = PropertiesService.getScriptProperties().getProperty('QR_APP_BASE_URL');
  var baseUrl = String(valor || '').trim();

  if (!baseUrl) {
    throw new Error('QR_APP_BASE_URL precisa ser configurada nas Propriedades do script.');
  }

  baseUrl = baseUrl.replace(/\/+$/, '');

  if (!/^https:\/\//i.test(baseUrl) || /localhost|127\.0\.0\.1/i.test(baseUrl)) {
    throw new Error('QR_APP_BASE_URL deve ser uma URL HTTPS pública e não pode apontar para localhost.');
  }

  return baseUrl;
}

function validarDestinosPublicosQr20260806_(candidatos, quantidadePorCodigo, baseUrl) {
  var urlApi = 'https://script.google.com/macros/s/AKfycbzz1dTU7HVTScVtb37rxAqSR7X0OQmUiZcfvePwGkWM2LaKx1JRSwcEDKnRPMJBPxS7mw/exec';
  var versaoEsperada = 'CONTROLE_MANUTENCAO_QR_API_PUBLICA_20260806_V1';
  var itensValidar = [];
  var requisicoesPagina = [];
  var requisicoesApi = [];
  var validacoes = {};

  for (var i = 0; i < candidatos.length; i++) {
    var codigo = candidatos[i].codigoPublico;
    var chave = codigo.toUpperCase();
    if (quantidadePorCodigo[chave] !== 1 || validacoes[chave]) continue;

    validacoes[chave] = { paginaOk: false, apiOk: false };
    itensValidar.push(chave);
    requisicoesPagina.push({
      url: baseUrl + '/equipamento/' + encodeURIComponent(codigo),
      method: 'get',
      followRedirects: true,
      muteHttpExceptions: true
    });
    requisicoesApi.push({
      url: urlApi + '?action=qr_resumo_ativo&codigo=' + encodeURIComponent(codigo),
      method: 'get',
      followRedirects: true,
      muteHttpExceptions: true,
      headers: { Accept: 'application/json' }
    });
  }

  if (!itensValidar.length) return validacoes;

  try {
    var respostasPagina = UrlFetchApp.fetchAll(requisicoesPagina);
    for (var p = 0; p < respostasPagina.length; p++) {
      var statusPagina = respostasPagina[p].getResponseCode();
      validacoes[itensValidar[p]].paginaOk = statusPagina >= 200 && statusPagina < 400;
    }
  } catch (erroPagina) {
    Logger.log('Falha ao validar as páginas públicas: ' + erroPagina.message);
  }

  try {
    var respostasApi = UrlFetchApp.fetchAll(requisicoesApi);
    for (var a = 0; a < respostasApi.length; a++) {
      var statusApi = respostasApi[a].getResponseCode();
      if (statusApi < 200 || statusApi >= 400) continue;
      try {
        var conteudo = JSON.parse(respostasApi[a].getContentText());
        validacoes[itensValidar[a]].apiOk = conteudo.success === true && conteudo.versao === versaoEsperada;
      } catch (erroJson) {
        validacoes[itensValidar[a]].apiOk = false;
      }
    }
  } catch (erroApi) {
    Logger.log('Falha ao validar a API pública: ' + erroApi.message);
  }

  return validacoes;
}

function mapearCabecalhosQr20260806_(cabecalhos) {
  var mapa = {};
  for (var i = 0; i < cabecalhos.length; i++) {
    mapa[normalizarCabecalhoQr20260806_(cabecalhos[i])] = i;
  }
  return mapa;
}

function validarCabecalhosQr20260806_(colunas) {
  var obrigatorios = [
    'ID_ATIVO',
    'TAG_ATIVO',
    'NOME_ATIVO',
    'SETOR',
    'ATIVO',
    'CODIGO_QR_PUBLICO',
    'QR_PUBLICO_ATIVO'
  ];
  var ausentes = [];

  for (var i = 0; i < obrigatorios.length; i++) {
    if (typeof colunas[obrigatorios[i]] !== 'number') ausentes.push(obrigatorios[i]);
  }

  if (ausentes.length) {
    throw new Error('Cabeçalhos obrigatórios ausentes em preventivas_ativos: ' + ausentes.join(', '));
  }
}

function lerColunaQr20260806_(linha, colunas, nome) {
  var indice = colunas[nome];
  return typeof indice === 'number' ? String(linha[indice] || '').trim() : '';
}

function normalizarCabecalhoQr20260806_(valor) {
  return normalizarTextoQr20260806_(valor).replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function normalizarTextoQr20260806_(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function ehSimQr20260806_(valor) {
  return normalizarTextoQr20260806_(valor) === 'SIM';
}

function ehClasseAgrupadaQr20260806_(observacao) {
  var texto = normalizarTextoQr20260806_(observacao);
  return texto.indexOf('CLASSE AGRUPADA') >= 0 || texto.indexOf('ATIVO AGRUPADO') >= 0 || texto.indexOf('CADASTRO AGRUPADO') >= 0;
}

function formatarAbaQrCodes20260806_(aba, quantidadeLinhas) {
  aba.setFrozenRows(1);
  aba.getRange(1, 1, 1, 10)
    .setBackground('#17324D')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  aba.getRange(2, 1, quantidadeLinhas, 10).setVerticalAlignment('middle');
  aba.getRange(2, 8, quantidadeLinhas, 1).setHorizontalAlignment('center');
  aba.setColumnWidth(1, 150);
  aba.setColumnWidth(2, 110);
  aba.setColumnWidth(3, 220);
  aba.setColumnWidth(4, 140);
  aba.setColumnWidth(5, 150);
  aba.setColumnWidth(6, 330);
  aba.setColumnWidth(7, 330);
  aba.setColumnWidth(8, 145);
  aba.setColumnWidth(9, 220);
  aba.setColumnWidth(10, 165);

  if (aba.getFilter()) aba.getFilter().remove();
  aba.getRange(1, 1, quantidadeLinhas + 1, 10).createFilter();
}
