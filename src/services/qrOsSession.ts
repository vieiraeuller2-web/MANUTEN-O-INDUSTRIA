export const SESSION_KEY = "controle_manutencao_qr_os_session";

export interface QrOsSession {
  token: string;
  expira_em: string;
  nome: string;
  login: string;
}

export function saveSession(session: QrOsSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error("Erro ao salvar a sessão da OS", error);
  }
}

export function getSession(): QrOsSession | null {
  try {
    const item = localStorage.getItem(SESSION_KEY);
    if (!item) return null;
    const parsed = JSON.parse(item) as QrOsSession;
    if (parsed && parsed.token) {
      return parsed;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    // ignore
  }
}
