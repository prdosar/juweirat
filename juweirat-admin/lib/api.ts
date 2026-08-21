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
  update: (id: number, body: unknown) =>
    request<import('./types').RoomCategoryDto>(`/api/room-categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  uploadImage: async (categoryId: number, file: File): Promise<import('./types').RoomImageDto> => {
    const token = getToken();
    const body = new FormData();
    body.append('file', file);
    const res = await fetch(`${BASE_URL}/api/room-categories/${categoryId}/images`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    });
    if (res.status === 401) { window.location.href = '/login'; throw new Error('Unauthorized'); }
    if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error ?? `HTTP ${res.status}`); }
    return res.json();
  },
  deleteImage: (categoryId: number, imageId: number) =>
    request<void>(`/api/room-categories/${categoryId}/images/${imageId}`, { method: 'DELETE' }),
  setCover: (categoryId: number, imageId: number) =>
    request<void>(`/api/room-categories/${categoryId}/images/${imageId}/cover`, { method: 'PATCH' }),
  reorderImages: (categoryId: number, imageIds: number[]) =>
    request<void>(`/api/room-categories/${categoryId}/images/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ imageIds }),
    }),
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

// ── Comptabilité ──────────────────────────────────────────────────────────────
export const comptabilite = {
  getJournal: (params?: { from?: string; to?: string; paymentMethod?: string }) => {
    const qs = new URLSearchParams();
    if (params?.from)          qs.set('from', params.from);
    if (params?.to)            qs.set('to', params.to);
    if (params?.paymentMethod) qs.set('paymentMethod', params.paymentMethod);
    return request<import('./types').JournalReportDto>(`/api/comptabilite/journal?${qs}`);
  },
  backfill: () =>
    request<{ payments: number; ventes: number; factures: number; noShow: number; cancellations: number }>(
      '/api/comptabilite/backfill', { method: 'POST' }),
  getLedger: (accountId: number, params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to)   qs.set('to',   params.to);
    return request<import('./types').LedgerReportDto>(`/api/comptabilite/grand-livre/${accountId}?${qs}`);
  },
  getBalance: (params?: { from?: string; to?: string; kind?: string }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to)   qs.set('to',   params.to);
    if (params?.kind) qs.set('kind', params.kind);
    return request<import('./types').BalanceReportDto>(`/api/comptabilite/balance?${qs}`);
  },
  getTvaReport: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to)   qs.set('to',   params.to);
    return request<import('./types').TvaReportDto>(`/api/comptabilite/tva?${qs}`);
  },
  postOd: (body: {
    date?: string;
    label: string;
    lines: Array<{ accountId: number; direction: 'debit' | 'credit'; amount: number; label?: string }>;
  }) => request<{ lignes: number }>('/api/comptabilite/od', { method: 'POST', body: JSON.stringify(body) }),
};

// ── Comptes (utilisé par grand-livre, balance et OD) ──────────────────────────
export const accounts = {
  getAll: (params?: { kind?: string; search?: string; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.kind)     qs.set('kind', params.kind);
    if (params?.search)   qs.set('search', params.search);
    qs.set('pageSize', String(params?.pageSize ?? 100));
    return request<{ items: import('./types').AccountDto[]; totalCount: number }>(`/api/accounts?${qs}`);
  },
};

// ── Caisse (sessions par caissier) ────────────────────────────────────────────
export const cash = {
  getRegisters: () =>
    request<import('./types').CashRegisterDto[]>('/api/cash-registers'),
  getCurrentSession: () =>
    request<import('./types').CashSessionDto | null>('/api/cash/sessions/current'),
  getHistory: (limit = 50) =>
    request<import('./types').CashSessionDto[]>(`/api/cash/sessions?limit=${limit}`),
  getSession: (id: number) =>
    request<import('./types').CashSessionDto>(`/api/cash/sessions/${id}`),
  getReport: (id: number) =>
    request<import('./types').CashSessionReportDto>(`/api/cash/sessions/${id}/report`),
  openSession: (body: { registerId: number; openingFloat: number }) =>
    request<import('./types').CashSessionDto>('/api/cash/sessions', { method: 'POST', body: JSON.stringify(body) }),
  addMovement: (sessionId: number, body: { amount: number; direction: 'in' | 'out'; label: string }) =>
    request<import('./types').CashSessionDto>(`/api/cash/sessions/${sessionId}/movements`, { method: 'POST', body: JSON.stringify(body) }),
  closeSession: (sessionId: number, body: { closingCountedTotal: number; notes?: string }) =>
    request<import('./types').CashSessionDto>(`/api/cash/sessions/${sessionId}/close`, { method: 'POST', body: JSON.stringify(body) }),
};

// ── Users (admin only côté backend) ───────────────────────────────────────────
export const users = {
  getAll: (includeInactive = true) =>
    request<import('./types').UserDto[]>(`/api/users?includeInactive=${includeInactive}`),
  getById: (id: number) =>
    request<import('./types').UserDto>(`/api/users/${id}`),
  create: (body: { firstName: string; lastName: string; email: string; password: string; role: string }) =>
    request<import('./types').UserDto>('/api/users', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: Partial<{
    firstName: string; lastName: string; email: string;
    password: string; role: string; isActive: boolean;
  }>) => request<import('./types').UserDto>(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
};

// ── Notifications (cloche du header) ──────────────────────────────────────────
export interface NotificationSummary {
  systemDate: string;                     // "2026-08-19"
  todayDate: string;                      // "2026-08-20"
  pendingReservationsCount: number;
  websiteReservationsTodayCount: number;
  unreadMessagesCount: number;
  daysNotClosedCount: number;
}

export const notifications = {
  getSummary: () => request<NotificationSummary>('/api/notifications/summary'),
};

// ── Clients ───────────────────────────────────────────────────────────────────
export const clients = {
  getAll:  (search?: string) => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<import('./types').ClientDto[]>(`/api/clients${qs}`);
  },
  getPaged: (params?: import('./types').ClientFilterParams) => {
    const qs = new URLSearchParams();
    if (params?.pageNumber) qs.set('pageNumber', String(params.pageNumber));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params?.search) qs.set('search', params.search);
    if (params?.sortBy) qs.set('sortBy', params.sortBy);
    if (params?.isDescending !== undefined) qs.set('isDescending', String(params.isDescending));
    if (params?.nationality) qs.set('nationality', params.nationality);
    if (params?.documentType) qs.set('documentType', params.documentType);
    if (params?.city) qs.set('city', params.city);
    if (params?.country) qs.set('country', params.country);
    if (params?.hasReservations !== undefined) qs.set('hasReservations', String(params.hasReservations));
    return request<import('./types').PagedResult<import('./types').ClientDto>>(`/api/clients/paged?${qs}`);
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
  getPaged: (params?: import('./types').ReservationFilterParams) => {
    const qs = new URLSearchParams();
    if (params?.pageNumber) qs.set('pageNumber', String(params.pageNumber));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params?.search) qs.set('search', params.search);
    if (params?.sortBy) qs.set('sortBy', params.sortBy);
    if (params?.isDescending !== undefined) qs.set('isDescending', String(params.isDescending));
    if (params?.status) qs.set('status', params.status);
    if (params?.categoryId) qs.set('categoryId', String(params.categoryId));
    if (params?.roomId) qs.set('roomId', String(params.roomId));
    if (params?.clientId) qs.set('clientId', String(params.clientId));
    if (params?.startDate) qs.set('startDate', params.startDate);
    if (params?.endDate) qs.set('endDate', params.endDate);
    if (params?.source) qs.set('source', params.source);
    if (params?.paymentStatus) qs.set('paymentStatus', params.paymentStatus);
    return request<import('./types').PagedResult<import('./types').ReservationDto>>(`/api/reservations/paged?${qs}`);
  },
  getById: (id: number) => request<import('./types').ReservationDto>(`/api/reservations/${id}`),
  create:  (body: unknown) => request<import('./types').ReservationDto>('/api/reservations', { method: 'POST', body: JSON.stringify(body) }),
  updateStatus: (id: number, body: { status: string; internalNotes?: string; cancellationReason?: string }) =>
    request<import('./types').ReservationDto>(`/api/reservations/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }),
  // Aperçu de la retenue No Show (montant + méthode par défaut) sans effet de bord.
  noShowPreview: (id: number) =>
    request<import('./types').NoShowPreviewDto>(`/api/reservations/${id}/noshow-preview`),
  processNoShow: (id: number, paymentMethod?: string) =>
    request<import('./types').NoShowBillingResultDto>(
      `/api/reservations/${id}/process-noshow`,
      { method: 'POST', body: JSON.stringify({ paymentMethod: paymentMethod ?? null }) },
    ),
  getTarifPreview: (clientId: number, categoryId: number, nights: number) =>
    request<import('./types').TarifPreviewDto>(
      `/api/reservations/tarif-preview?clientId=${clientId}&categoryId=${categoryId}&nights=${nights}`,
    ),
  processCancellation: (id: number, reason?: string, paymentMethod?: string) =>
    request<import('./types').CancellationBillingResultDto>(
      `/api/reservations/${id}/process-cancellation`,
      { method: 'POST', body: JSON.stringify({ reason: reason ?? null, paymentMethod: paymentMethod ?? null }) },
    ),
  update: (id: number, body: Partial<{
    source: string; specialRequests: string; internalNotes: string;
    adults: number; children: number;
    garantieType: string; garantieMontantCash: number;
    carteNom: string; carteSuffix: string; carteExpiration: string;
    // Édition étendue : séjour + prestations
    categoryId: number; roomId: number | null;
    checkInDate: string; checkOutDate: string;
    prestations: Array<{ prestationId: number; quantite: number; prixUnitaire?: number }> | null;
    acceptRefundImbalance: boolean;
    tvaExonere: boolean;
  }>) => request<import('./types').ReservationDto>(`/api/reservations/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
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
  getAll: () => request<import('./types').PaymentDto[]>('/api/payments'),
  getPaged: (params?: import('./types').PaymentFilterParams) => {
    const qs = new URLSearchParams();
    if (params?.pageNumber) qs.set('pageNumber', String(params.pageNumber));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params?.search) qs.set('search', params.search);
    if (params?.sortBy) qs.set('sortBy', params.sortBy);
    if (params?.isDescending !== undefined) qs.set('isDescending', String(params.isDescending));
    if (params?.status) qs.set('status', params.status);
    if (params?.method) qs.set('method', params.method);
    if (params?.reservationId) qs.set('reservationId', String(params.reservationId));
    if (params?.minAmount !== undefined) qs.set('minAmount', String(params.minAmount));
    if (params?.maxAmount !== undefined) qs.set('maxAmount', String(params.maxAmount));
    if (params?.startDate) qs.set('startDate', params.startDate);
    if (params?.endDate) qs.set('endDate', params.endDate);
    if (params?.currency) qs.set('currency', params.currency);
    return request<import('./types').PagedResult<import('./types').PaymentDto>>(`/api/payments/paged?${qs}`);
  },
  getByReservation: (reservationId: number) =>
    request<import('./types').PaymentDto[]>(`/api/payments/reservation/${reservationId}`),
  create: (body: { reservationId: number; amount: number; currency?: string; method: string; notes?: string }) =>
    request<import('./types').PaymentDto>('/api/payments', { method: 'POST', body: JSON.stringify(body) }),
};

// ── Ventes Directes ───────────────────────────────────────────────────────────
export const ventesDirectes = {
  getAll: (date?: string) => {
    const qs = date ? `?date=${date}` : '';
    return request<import('./types').VenteDirecteDto[]>(`/api/ventes-directes${qs}`);
  },
  getFolioActif: (clientId: number) =>
    request<import('./types').FolioActifDto>(`/api/ventes-directes/folio-actif?clientId=${clientId}`),
  create: (body: {
    prestationId: number; quantite?: number;
    clientId?: number; clientNom?: string;
    folioId?: number; mode?: string;
    paymentMethod?: string; notes?: string;
    // Obligatoire seulement pour les prestations à prix flexible.
    prixUnitaire?: number;
  }) => request<import('./types').VenteDirecteDto>('/api/ventes-directes', { method: 'POST', body: JSON.stringify(body) }),
  // Vente de plusieurs prestations en un seul appel — un encaissement caisse agrégé.
  createBatch: (body: {
    items: Array<{ prestationId: number; quantite: number; prixUnitaire?: number }>;
    clientId?: number; clientNom?: string;
    folioId?: number; mode?: string;
    paymentMethod?: string; notes?: string;
    // Remise en % appliquée à toutes les lignes du panier (0..100).
    remisePercent?: number;
  }) => request<import('./types').VenteDirecteDto[]>('/api/ventes-directes/batch', { method: 'POST', body: JSON.stringify(body) }),
};

// ── Prestations Annexes ───────────────────────────────────────────────────────
export const prestations = {
  getAll: (activeOnly = false) =>
    request<import('./types').PrestationAnnexeDto[]>(`/api/prestations?activeOnly=${activeOnly}`),
  getById: (id: number) =>
    request<import('./types').PrestationAnnexeDto>(`/api/prestations/${id}`),
  getConsumptions: (id: number, from: string, to: string) =>
    request<import('./types').PrestationConsumptionDto[]>(`/api/prestations/${id}/consumptions?from=${from}&to=${to}`),
  create: (body: {
    nameFr: string; nameEn: string; icon?: string;
    mode?: string; prixInclus: number; prixSeule: number; sortOrder?: number;
    prixFlexible?: boolean;
  }) => request<import('./types').PrestationAnnexeDto>('/api/prestations', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: Partial<{
    nameFr: string; nameEn: string; icon: string; mode: string;
    prixInclus: number; prixSeule: number; isActive: boolean; sortOrder: number;
    prixFlexible: boolean;
  }>) => request<import('./types').PrestationAnnexeDto>(`/api/prestations/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: number) => request<void>(`/api/prestations/${id}`, { method: 'DELETE' }),
};

// ── Companies ─────────────────────────────────────────────────────────────────
export const companies = {
  getAll: () => request<import('./types').CompanyDto[]>('/api/companies'),
  getPaged: (params?: import('./types').CompanyFilterParams) => {
    const qs = new URLSearchParams();
    if (params?.pageNumber)                qs.set('pageNumber',   String(params.pageNumber));
    if (params?.pageSize)                  qs.set('pageSize',     String(params.pageSize));
    if (params?.search)                    qs.set('search',       params.search);
    if (params?.sortBy)                    qs.set('sortBy',       params.sortBy);
    if (params?.isDescending !== undefined) qs.set('isDescending', String(params.isDescending));
    if (params?.isActive !== undefined)    qs.set('isActive',     String(params.isActive));
    return request<import('./types').PagedResult<import('./types').CompanyDto>>(`/api/companies/paged?${qs}`);
  },
  getById: (id: number) => request<import('./types').CompanyDetailDto>(`/api/companies/${id}`),
  create: (body: { name: string; responsableNom?: string; phone?: string; email?: string; adresse?: string; ville?: string; notes?: string }) =>
    request<import('./types').CompanyDto>('/api/companies', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: Partial<{ name: string; responsableNom: string; phone: string; email: string; adresse: string; ville: string; notes: string; isActive: boolean }>) =>
    request<import('./types').CompanyDto>(`/api/companies/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  setTarif: (id: number, body: { categoryId: number; tarifNuit: number; tarifN15: number; tarifN30: number }) =>
    request<void>(`/api/companies/${id}/tarifs`, { method: 'PUT', body: JSON.stringify(body) }),
  assignClient: (id: number, clientId: number) =>
    request<void>(`/api/companies/${id}/clients`, { method: 'POST', body: JSON.stringify({ clientId }) }),
  removeClient: (id: number, clientId: number) =>
    request<void>(`/api/companies/${id}/clients/${clientId}`, { method: 'DELETE' }),
  getStays: (id: number, from: string, to: string) =>
    request<import('./types').CompanyStayDto[]>(`/api/companies/${id}/stays?from=${from}&to=${to}`),
};

// ── Contact Messages ──────────────────────────────────────────────────────────
export const contactMessages = {
  getAll: (status?: string, search?: string) => {
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (search) qs.set('search', search);
    return request<import('./types').ContactMessageDto[]>(`/api/contactmessages?${qs}`);
  },
  getById: (id: number) =>
    request<import('./types').ContactMessageDto>(`/api/contactmessages/${id}`),
  markAsRead: (id: number) =>
    request<{ success: boolean }>(`/api/contactmessages/${id}/read`, { method: 'POST' }),
  reply: (id: number, replyBody: string) =>
    request<{ success: boolean }>(`/api/contactmessages/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ replyBody }),
    }),
};

