export interface LoginResponse {
  token: string;
  email: string;
  fullName: string;
  role: string;
  expiresAt: string;
}

export interface RoomImageDto {
  id: number;
  filePath: string;
  altTextFr: string | null;
  altTextEn: string | null;
  sortOrder: number;
  isCover: boolean;
}

export interface AmenityDto {
  id: number;
  nameFr: string;
  nameEn: string;
  icon: string | null;
}

export interface RoomCategoryDto {
  id: number;
  slug: string;
  pmsType: string;
  pmsGamme: string;
  nameFr: string;
  nameEn: string;
  descriptionFr: string | null;
  descriptionEn: string | null;
  capacityAdults: number;
  capacityChildren: number;
  tarifNuit: number;
  tarifN15: number;
  tarifN30: number;
  roomCount: number;
  images: RoomImageDto[];
  coverImage: string | null;
}

export interface RoomDto {
  id: number;
  roomNumber: string;
  floor: number;
  nameFr: string;
  nameEn: string;
  descriptionFr: string | null;
  descriptionEn: string | null;
  capacityAdults: number;
  capacityChildren: number;
  sizeSqm: number | null;
  pricePerNight: number;
  pricePerWeek: number | null;
  pricePerMonth: number | null;
  status: string;
  isFeatured: boolean;
  categoryId: number | null;
  categorySlug: string | null;
  pmsType: string | null;
  pmsGamme: string | null;
  images: RoomImageDto[];
  amenities: AmenityDto[];
}

export interface ClientDto {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  documentType: string | null;
  documentNumber: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
  totalReservations: number;
  createdAt: string;
}

export interface ReservationDto {
  id: number;
  reference: string;
  roomId: number | null;
  roomNumber: string | null;
  roomNameFr: string | null;
  roomNameEn: string | null;
  categoryId: number;
  categorySlug: string;
  categoryNameFr: string;
  categoryNameEn: string;
  clientId: number;
  clientFullName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  adults: number;
  children: number;
  pricePerNightSnapshot: number;
  totalPrice: number;
  currency: string;
  status: string;
  source: string | null;
  specialRequests: string | null;
  internalNotes: string | null;
  amountPaid: number;
  amountDue: number;
  confirmedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

export interface PaymentDto {
  id: number;
  reservationId: number;
  reservationReference: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  internalReference: string | null;
  gatewayReference: string | null;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface DashboardStats {
  totalRooms: number;
  availableRooms: number;
  totalClients: number;
  pendingReservations: number;
  confirmedReservations: number;
  checkedInReservations: number;
  revenueThisMonth: number;
  currency: string;
}

export interface ContactMessageDto {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: 'New' | 'Read' | 'Replied' | 'Archived';
  replyMessage: string | null;
  repliedAt: string | null;
  repliedBy: string | null;
  createdAt: string;
}

export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface PaginationFilterParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  isDescending?: boolean;
}

export interface ClientFilterParams extends PaginationFilterParams {
  nationality?: string;
  documentType?: string;
  city?: string;
  country?: string;
  hasReservations?: boolean;
}

export interface ReservationFilterParams extends PaginationFilterParams {
  status?: string;
  categoryId?: number;
  roomId?: number;
  clientId?: number;
  startDate?: string;
  endDate?: string;
  source?: string;
  paymentStatus?: string;
}

export interface PaymentFilterParams extends PaginationFilterParams {
  status?: string;
  method?: string;
  reservationId?: number;
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
  currency?: string;
}

export interface FolioFilterParams extends PaginationFilterParams {
  closed?: boolean;
  unitId?: number;
  resaStatus?: string;
  segment?: string;
  balanceStatus?: string;
  arrivalFrom?: string;
  arrivalTo?: string;
  departureFrom?: string;
  departureTo?: string;
}


