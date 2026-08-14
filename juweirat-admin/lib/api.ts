const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('juweirat_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('juweirat_token');
      localStorage.removeItem('juweirat_user');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const auth = {
  login: (email: string, password: string) =>
    request<{ token: string; email: string; fullName: string; role: string; expiresAt: string }>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    ),
};

// ── Room Categories ────────────────────────────────────────────────────────────
export const categories = {
  getAll: () => request<import('./types').RoomCategoryDto[]>('/api/room-categories'),
  getAvailable: (checkIn: string, checkOut: string, adults: number) =>
    request<import('./types').RoomCategoryDto[]>(
      `/api/room-categories/available?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}`
    ),
  getById: (id: number) => request<import('./types').RoomCategoryDto>(`/api/room-categories/${id}`),
};

// ── Rooms ─────────────────────────────────────────────────────────────────────
export const rooms = {
  getAll:  (params?: { status?: string; floor?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.floor !== undefined) qs.set('floor', String(params.floor));
    return request<import('./types').RoomDto[]>(`/api/rooms?${qs}`);
  },
  getById: (id: number) => request<import('./types').RoomDto>(`/api/rooms/${id}`),
  create:  (body: unknown) => request<import('./types').RoomDto>('/api/rooms', { method: 'POST', body: JSON.stringify(body) }),
  update:  (id: number, body: unknown) => request<import('./types').RoomDto>(`/api/rooms/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete:  (id: number) => request<void>(`/api/rooms/${id}`, { method: 'DELETE' }),
};

// ── Amenities ─────────────────────────────────────────────────────────────────
export const amenities = {
  getAll:  () => request<import('./types').AmenityDto[]>('/api/amenities'),
  create:  (body: { nameFr: string; nameEn: string; icon?: string }) =>
    request<import('./types').AmenityDto>('/api/amenities', { method: 'POST', body: JSON.stringify(body) }),
  delete:  (id: number) => request<void>(`/api/amenities/${id}`, { method: 'DELETE' }),
};

// ── Clients ───────────────────────────────────────────────────────────────────
export const clients = {
  getAll:  (search?: string) => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<import('./types').ClientDto[]>(`/api/clients${qs}`);
  },
  getById: (id: number) => request<import('./types').ClientDto>(`/api/clients/${id}`),
  create:  (body: unknown) => request<import('./types').ClientDto>('/api/clients', { method: 'POST', body: JSON.stringify(body) }),
  update:  (id: number, body: unknown) => request<import('./types').ClientDto>(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
};

// ── Reservations ──────────────────────────────────────────────────────────────
export const reservations = {
  getAll:  (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return request<import('./types').ReservationDto[]>(`/api/reservations${qs}`);
  },
  getById: (id: number) => request<import('./types').ReservationDto>(`/api/reservations/${id}`),
  create:  (body: unknown) => request<import('./types').ReservationDto>('/api/reservations', { method: 'POST', body: JSON.stringify(body) }),
  updateStatus: (id: number, body: { status: string; internalNotes?: string; cancellationReason?: string }) =>
    request<import('./types').ReservationDto>(`/api/reservations/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }),
};

// ── Room Images ───────────────────────────────────────────────────────────────
export const roomImages = {
  upload: async (roomId: number, file: File): Promise<import('./types').RoomImageDto> => {
    const token = getToken();
    const body  = new FormData();
    body.append('file', file);
    const res = await fetch(`${BASE_URL}/api/rooms/${roomId}/images`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    });
    if (res.status === 401) { window.location.href = '/login'; throw new Error('Unauthorized'); }
    if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error ?? `HTTP ${res.status}`); }
    return res.json();
  },
  delete: (roomId: number, imageId: number) =>
    request<void>(`/api/rooms/${roomId}/images/${imageId}`, { method: 'DELETE' }),
  setCover: (roomId: number, imageId: number) =>
    request<void>(`/api/rooms/${roomId}/images/${imageId}/cover`, { method: 'PATCH' }),
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const payments = {
  getByReservation: (reservationId: number) =>
    request<import('./types').PaymentDto[]>(`/api/payments/reservation/${reservationId}`),
  create: (body: { reservationId: number; amount: number; currency?: string; method: string; notes?: string }) =>
    request<import('./types').PaymentDto>('/api/payments', { method: 'POST', body: JSON.stringify(body) }),
};
