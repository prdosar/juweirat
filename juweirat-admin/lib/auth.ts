'use client';

export function saveAuth(token: string, user: { email: string; fullName: string; role: string }) {
  localStorage.setItem('juweirat_token', token);
  localStorage.setItem('juweirat_user', JSON.stringify(user));
  // Also set cookie for middleware
  document.cookie = `juweirat_token=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Strict`;
}

export function clearAuth() {
  localStorage.removeItem('juweirat_token');
  localStorage.removeItem('juweirat_user');
  document.cookie = 'juweirat_token=; path=/; max-age=0';
}

export function getUser(): { email: string; fullName: string; role: string } | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('juweirat_user');
  return raw ? JSON.parse(raw) : null;
}
