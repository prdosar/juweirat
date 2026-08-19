import type {
  HotelConfigDto, UnitDto, FolioDto,
  CloturePreviewDto, ClotureDto, PostingDto,
  FactureDto, ContractDataDto,
  MaintenanceTicketDto, MaintenanceCategoryDto, MaintenanceStaffDto, DebiteurDto,
} from './pmsTypes';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('juweirat_token') : null;
}

async function pmsReq<T>(path: string, options: RequestInit = {}): Promise<T> {
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
    throw new Error('Non autorisé');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Config ────────────────────────────────────────────────────────────────────
export const pmsConfig = {
  get:    () => pmsReq<HotelConfigDto>('/api/pms/config'),
  update: (body: Partial<HotelConfigDto>) =>
    pmsReq<HotelConfigDto>('/api/pms/config', { method: 'PUT', body: JSON.stringify(body) }),
};

// ── Units ─────────────────────────────────────────────────────────────────────
export const pmsUnits = {
  getAll:      () => pmsReq<UnitDto[]>('/api/pms/units'),
  getById:     (id: number) => pmsReq<UnitDto>(`/api/pms/units/${id}`),
  patchMenage: (id: number, statutMenage: string, staffId?: number, notes?: string) =>
    pmsReq<UnitDto>(`/api/pms/units/${id}/menage`, {
      method: 'PATCH',
      body: JSON.stringify({ statutMenage, staffId: staffId ?? null, notes: notes ?? null }),
    }),
  patchHs:     (id: number, horsService: boolean) =>
    pmsReq<UnitDto>(`/api/pms/units/${id}/hs`, { method: 'PATCH', body: JSON.stringify({ horsService }) }),
  getHistory:  (id: number, limit = 50) =>
    pmsReq<import('./pmsTypes').RoomHistoryDto>(`/api/pms/units/${id}/history?limit=${limit}`),
};

// ── Folios ────────────────────────────────────────────────────────────────────
export const pmsFolios = {
  getAll: (params?: { closed?: boolean; unitId?: number; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.closed !== undefined) qs.set('closed', String(params.closed));
    if (params?.unitId !== undefined) qs.set('unitId', String(params.unitId));
    if (params?.status) qs.set('status', params.status);
    return pmsReq<FolioDto[]>(`/api/pms/folios?${qs}`);
  },
  getPaged: (params?: import('./types').FolioFilterParams) => {
    const qs = new URLSearchParams();
    if (params?.pageNumber) qs.set('pageNumber', String(params.pageNumber));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params?.search) qs.set('search', params.search);
    if (params?.sortBy) qs.set('sortBy', params.sortBy);
    if (params?.isDescending !== undefined) qs.set('isDescending', String(params.isDescending));
    if (params?.closed !== undefined) qs.set('closed', String(params.closed));
    if (params?.unitId !== undefined) qs.set('unitId', String(params.unitId));
    if (params?.resaStatus) qs.set('resaStatus', params.resaStatus);
    if (params?.segment) qs.set('segment', params.segment);
    if (params?.balanceStatus) qs.set('balanceStatus', params.balanceStatus);
    if (params?.arrivalFrom) qs.set('arrivalFrom', params.arrivalFrom);
    if (params?.arrivalTo) qs.set('arrivalTo', params.arrivalTo);
    if (params?.departureFrom) qs.set('departureFrom', params.departureFrom);
    if (params?.departureTo) qs.set('departureTo', params.departureTo);
    return pmsReq<import('./types').PagedResult<FolioDto>>(`/api/pms/folios/paged?${qs}`);
  },
  getById:       (id: number) => pmsReq<FolioDto>(`/api/pms/folios/${id}`),
  getContractData: (id: number) => pmsReq<ContractDataDto>(`/api/pms/folios/${id}/contract-data`),
  create:   (body: Record<string, unknown>) =>
    pmsReq<FolioDto>('/api/pms/folios', { method: 'POST', body: JSON.stringify(body) }),
  update:   (id: number, body: Record<string, unknown>) =>
    pmsReq<FolioDto>(`/api/pms/folios/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  checkIn:  (id: number) =>
    pmsReq<FolioDto>(`/api/pms/folios/${id}/checkin`, { method: 'POST' }),
  checkOut: (id: number) =>
    pmsReq<FolioDto>(`/api/pms/folios/${id}/checkout`, { method: 'POST' }),
  encaisser: (id: number, montant: number, payMode?: string) =>
    pmsReq<FolioDto>(`/api/pms/folios/${id}/encaisser`, {
      method: 'POST', body: JSON.stringify({ montant, payMode }),
    }),
  transferDebiteur: (id: number, label?: string) =>
    pmsReq<FolioDto>(`/api/pms/folios/${id}/transfer-debiteur`, {
      method: 'POST', body: JSON.stringify({ label }),
    }),
  facturer: (id: number) =>
    pmsReq<FactureDto>(`/api/pms/folios/${id}/facturer`, { method: 'POST' }),
};

// ── Clôture ───────────────────────────────────────────────────────────────────
export const pmsCloture = {
  preview: () => pmsReq<CloturePreviewDto>('/api/pms/cloture/preview'),
  execute: () => pmsReq<ClotureDto>('/api/pms/cloture', { method: 'POST' }),
  history: (limit = 90) => pmsReq<ClotureDto[]>(`/api/pms/cloture/history?limit=${limit}`),
  byDate:  (date: string) => pmsReq<ClotureDto>(`/api/pms/cloture/${date}`),
  postings: (params?: { date?: string; folioId?: number }) => {
    const qs = new URLSearchParams();
    if (params?.date)    qs.set('date', params.date);
    if (params?.folioId) qs.set('folioId', String(params.folioId));
    return pmsReq<PostingDto[]>(`/api/pms/postings?${qs}`);
  },
};

// ── Factures ──────────────────────────────────────────────────────────────────
export const pmsFactures = {
  getAll: (params?: { search?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.from)   qs.set('from',   params.from);
    if (params?.to)     qs.set('to',     params.to);
    return pmsReq<FactureDto[]>(`/api/pms/factures?${qs}`);
  },
  getById:   (id: number) => pmsReq<FactureDto>(`/api/pms/factures/${id}`),
  annuler:   (id: number) => pmsReq<FactureDto>(`/api/pms/factures/${id}/annuler`, { method: 'POST' }),
  rectifier: (id: number, body: Record<string, unknown>) =>
    pmsReq<FactureDto>(`/api/pms/factures/${id}/rectifier`, { method: 'PATCH', body: JSON.stringify(body) }),
  print:     (id: number) => pmsReq<FactureDto>(`/api/pms/factures/${id}/print`, { method: 'POST' }),
};

// ── Maintenance ───────────────────────────────────────────────────────────────
export const pmsMaintenance = {
  getAll:  (params?: { status?: string; priority?: string; unitId?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status)   qs.set('status',   params.status);
    if (params?.priority) qs.set('priority', params.priority);
    if (params?.unitId)   qs.set('unitId',   String(params.unitId));
    return pmsReq<MaintenanceTicketDto[]>(`/api/pms/maintenance?${qs}`);
  },
  getById: (id: number) => pmsReq<MaintenanceTicketDto>(`/api/pms/maintenance/${id}`),
  create:  (body: Record<string, unknown>) =>
    pmsReq<MaintenanceTicketDto>('/api/pms/maintenance', { method: 'POST', body: JSON.stringify(body) }),
  update:  (id: number, body: Record<string, unknown>) =>
    pmsReq<MaintenanceTicketDto>(`/api/pms/maintenance/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete:  (id: number) => pmsReq<void>(`/api/pms/maintenance/${id}`, { method: 'DELETE' }),
};

// ── Maintenance Categories & Staff ────────────────────────────────────────────
export const pmsMaintenanceCategories = {
  getAll: () => pmsReq<MaintenanceCategoryDto[]>('/api/pms/maintenance-categories'),
  create: (name: string) =>
    pmsReq<MaintenanceCategoryDto>('/api/pms/maintenance-categories', { method: 'POST', body: JSON.stringify({ name }) }),
  update: (id: number, body: { name?: string; isActive?: boolean }) =>
    pmsReq<MaintenanceCategoryDto>(`/api/pms/maintenance-categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: number) => pmsReq<void>(`/api/pms/maintenance-categories/${id}`, { method: 'DELETE' }),
};

export const pmsMaintenanceStaff = {
  getAll: (params?: { categoryId?: number; activeOnly?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.categoryId) qs.set('categoryId', String(params.categoryId));
    if (params?.activeOnly) qs.set('activeOnly', 'true');
    return pmsReq<MaintenanceStaffDto[]>(`/api/pms/maintenance-staff?${qs}`);
  },
  create: (body: { categoryId: number; firstName: string; lastName: string; phone?: string }) =>
    pmsReq<MaintenanceStaffDto>('/api/pms/maintenance-staff', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: { categoryId?: number; firstName?: string; lastName?: string; phone?: string; isActive?: boolean }) =>
    pmsReq<MaintenanceStaffDto>(`/api/pms/maintenance-staff/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: number) => pmsReq<void>(`/api/pms/maintenance-staff/${id}`, { method: 'DELETE' }),
};

// ── Débiteurs ─────────────────────────────────────────────────────────────────
export const pmsDebiteurs = {
  getAll:  () => pmsReq<DebiteurDto[]>('/api/pms/debiteurs'),
  getById: (id: number) => pmsReq<DebiteurDto>(`/api/pms/debiteurs/${id}`),
  create:  (body: Record<string, unknown>) =>
    pmsReq<DebiteurDto>('/api/pms/debiteurs', { method: 'POST', body: JSON.stringify(body) }),
  update:  (id: number, body: Record<string, unknown>) =>
    pmsReq<DebiteurDto>(`/api/pms/debiteurs/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  pay:     (id: number, montant: number) =>
    pmsReq<DebiteurDto>(`/api/pms/debiteurs/${id}/payer`, { method: 'POST', body: JSON.stringify({ montant }) }),
  delete:  (id: number) => pmsReq<void>(`/api/pms/debiteurs/${id}`, { method: 'DELETE' }),
};
