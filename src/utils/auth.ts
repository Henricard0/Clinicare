// Utilitários centralizados de autenticação e comunicação com a API
import { User } from '../types';

export const SESSION_TOKEN_KEY = 'clinicacare_session_token';
export const SAVED_ACCOUNTS_KEY = 'clinicacare_saved_accounts';
export const REMEMBERED_EMAIL_KEY = 'clinicacare_remembered_email';
export const REMEMBER_ME_KEY = 'clinicacare_remember_me';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  } catch (err) {
    console.warn('Erro ao salvar token no localStorage:', err);
  }
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(SESSION_TOKEN_KEY);
  } catch (err) {
    console.warn('Erro ao limpar token do localStorage:', err);
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
