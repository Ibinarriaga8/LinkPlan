import type { User } from '@/types';

// Identidad del administrador. El admin no es un usuario real con passkey: se entra
// escribiendo "admin" como nombre de usuario y validando la contraseña de admin.
export const ADMIN_USERNAME = 'admin';
export const ADMIN_USER_ID = 'admin';
export const ADMIN_TOKEN_KEY = 'lp_admin_token';

// Usuario sintético para que la app se renderice en modo admin sin pasar por el
// flujo normal de passkey/onboarding. Los tags evitan que salte el onboarding.
export const ADMIN_USER: User = {
  id: ADMIN_USER_ID,
  name: 'Admin',
  username: ADMIN_USERNAME,
  color: '#0A2E6E',
  foodTags: ['_admin'],
  activityTags: ['_admin'],
  pace: 'moderado'
};

export function getStoredAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setStoredAdminToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  else window.sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}
