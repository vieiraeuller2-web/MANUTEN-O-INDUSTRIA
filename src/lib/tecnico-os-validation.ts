/**
 * Validação cronológica dos campos operacionais da OS Manual.
 * Datas e horas são strings locais — nunca converter para UTC ou Date.
 */
function dataISOValida(valor: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!match) return false;
  const ano = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  if (ano < 1900 || mes < 1 || mes > 12) return false;
  const bissexto = ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0);
  const diasMes = [31, bissexto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return dia >= 1 && dia <= diasMes[mes - 1];
}

function horaLocalValida(valor: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(valor);
  return Boolean(match && Number(match[1]) < 24 && Number(match[2]) < 60);
}

export function periodoOSManualValido(
  dataInicio: string,
  horaInicio: string,
  dataConclusao: string,
  horaConclusao: string,
): boolean {
  if (!dataISOValida(dataInicio) || !dataISOValida(dataConclusao) ||
      !horaLocalValida(horaInicio) || !horaLocalValida(horaConclusao)) {
    return false;
  }

  // Formato ISO local ordena corretamente por comparação de strings.
  // Horário igual é permitido conforme a validação operacional do backend.
  return `${dataConclusao}T${horaConclusao}` >= `${dataInicio}T${horaInicio}`;
}
