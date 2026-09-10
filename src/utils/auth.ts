// Utilitários centralizados de autenticação e comunicação com a API
export const SESSION_TOKEN_KEY = 'clinicacare_session_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getAuthHeaders(
  additionalHeaders: Record<string, string> = {},
  token?: string | null,
  userId?: string
): Record<string, string> {
  const activeToken = token || getStoredToken();
  const headers: Record<string, string> = {
    ...additionalHeaders,
  };

  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }

  if (userId) {
    headers['x-user-id'] = userId;
  }

  return headers;
}
