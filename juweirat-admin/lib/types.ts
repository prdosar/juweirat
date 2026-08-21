export interface LoginResponse {
  token: string;
  email: string;
  fullName: string;
  role: string;
  expiresAt: string;
}

export type UserRole = 'admin' | 'utilisateur' | 'comptable';

export interface JournalEntryDto {
  sourceType: string;      // "Payment" | "VenteDirecte" | "Facture"
  sourceId: number;
  date: string;
  label: string;
  ht: number;
  tva: number;
  ttc: number;
  encaisse: number;
  decaisse: number;
  paymentMethod: string | null;
}

export interface JournalReportDto {
  from: string | null;
  to: string | null;
  entries: JournalEntryDto[];
  totalHt: number;
  totalTva: number;
  totalTtc: number;
  totalEncaisse: number;
  totalDecaisse: number;
}

export interface CashSessionDto {
  id: number;
  registerId: number;
  registerName: string;
  openedByUserId: number;
  openedByUserName: string;
  openedAt: string;
  openingFloat: number;
  closedByUserId: number | null;
  closedByUserName: string | null;
  closedAt: string | null;
  closingCountedTotal: number | null;
  status: 'Open' | 'Closed';
  notes: string | null;
}

export interface CashSessionReportDto {
  session: CashSessionDto;
  theoreticalTotal: number;
  countedTotal: number | null;
  ecart: number | null;
  totalEncaisse: number;
  totalDecaisse: number;
  totalEntreeManuelle: number;
  movementsCount: number;
}

export interface CashRegisterDto {
  id: number;
  name: string;
  location: string | null;
  isActive: boolean;
  accountId: number | null;
  accountBalance: number;
  createdAt: string;
}

export interface AccountDto {
  id: number;
  kind: string;
  name: string;
  ownerRefId: number | null;
  balance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerLineDto {
  movementId: number;
  date: string;
  direction: 'debit' | 'credit';
  amount: number;
  balance: number;
  reason: string;
  counterpartAccountName: string;
  label: string | null;
  sourceType: string | null;
  sourceId: number | null;
}

export interface LedgerReportDto {
  account: AccountDto;
  from: string | null;
  to: string | null;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  lines: LedgerLineDto[];
}

export interface BalanceLineDto {
  accountId: number;
  kind: string;
  name: string;
  ownerRefId: number | null;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
}

export interface BalanceReportDto {
  from: string | null;
  to: string | null;
  kindFilter: string | null;
  lines: BalanceLineDto[];
  totalDebit: number;
  totalCredit: number;
}

export interface TvaReportLineDto {
  sourceType: string;
  sourceId: number;
  date: string;
  label: string;
  ht: number;
  tva: number;
  ttc: number;
}

export interface TvaReportDto {
  from: string | null;
  to: string | null;
  totalHt: number;
  totalTva: number;
  totalTtc: number;
  tvaRate: number;
  lines: TvaReportLineDto[];
}

export interface UserDto {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
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
  // Tarifs journaliers proxyés depuis la RoomCategory rattachée.
  tarifNuit: number;
  tarifN15: number;
  tarifN30: number;
  status: string;
  isFeatured: boolean;
  categoryId: number | null;
  categorySlug: string | null;
  pmsType: string | null;
  pmsGamme: string | null;
  images: RoomImageDto[];
  amenities: AmenityDto[];
  currentOccupation?: RoomOccupationDto | null;
}

export interface RoomOccupationDto {
  reservationId: number;
  reference: string;
  clientName: string;
  companyName: string | null;
  checkInDate: string;
  checkOutDate: string;
  status: string;
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
  companyId: number | null;
  companyName: string | null;
}

export interface CompanyDto {
  id: number;
  name: string;
  responsableNom: string | null;
  phone: string | null;
  email: string | null;
  adresse: string | null;
  ville: string | null;
  notes: string | null;
  isActive: boolean;
  clientCount: number;
  createdAt: string;
}

export interface CompanyClientDto {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
}

export interface CompanyTarifDto {
  id: number;
  categoryId: number;
  categoryNameFr: string;
  categorySlug: string;
  tarifNuit: number;
  tarifN15: number;
  tarifN30: number;
}

export interface CompanyDetailDto extends CompanyDto {
  clients: CompanyClientDto[];
  tarifs: CompanyTarifDto[];
}

export interface CompanyStayDto {
  reservationId: number;
  reference: string;
  clientId: number;
  clientFullName: string;
  roomId: number | null;
  roomNumber: string | null;
  roomNameFr: string | null;
  categoryId: number;
  categoryNameFr: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  nightsInPeriod: number;
  status: string;
}

export interface FolioActifDto {
  folioId: number;
  folioNumber: string;
  roomNumber: string;
  guestName: string | null;
}

export interface VenteDirecteDto {
  id: number;
  prestationId: number;
  prestationNameFr: string;
  prestationIcon: string | null;
  clientId: number | null;
  clientNom: string | null;
  folioId: number | null;
  folioNumber: string | null;
  roomNumber: string | null;
  quantite: number;
  prixUnitaireSnapshot: number;
  total: number;
  mode: 'Encaissement' | 'SurChambre';
  paymentMethod: string | null;
  notes: string | null;
  createdAt: string;
  tvaExonere?: boolean;
  remisePercent?: number;
}

export interface PrestationAnnexeDto {
  id: number;
  nameFr: string;
  nameEn: string;
  icon: string | null;
  mode: 'ParPersonneParNuit' | 'ParPersonne' | 'Forfait';
  prixInclus: number;
  prixSeule: number;
  isActive: boolean;
  sortOrder: number;
  // Quand true, le prix est saisi à chaque vente (les prix ci-dessus sont ignorés).
  prixFlexible: boolean;
}

export interface PrestationConsumptionDto {
  source: 'Reservation' | 'VenteDirecte';
  sourceId: number;
  reference: string | null;
  date: string;
  clientId: number | null;
  clientName: string | null;
  roomId: number | null;
  roomNumber: string | null;
  roomNameFr: string | null;
  quantite: number;
  prixUnitaireSnapshot: number;
  total: number;
}

export interface ReservationPrestationDto {
  id: number;
  prestationId: number;
  nameFr: string;
  nameEn: string;
  icon: string | null;
  mode: string;
  quantite: number;
  prixUnitaireSnapshot: number;
  totalLigne: number;
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
  garantieType: string | null;
  garantieMontantCash: number | null;
  carteNom: string | null;
  carteSuffix: string | null;
  carteExpiration: string | null;
  totalHebergement: number;
  totalPrestations: number;
  prestations: ReservationPrestationDto[];
  tvaExonere?: boolean;
  discount?: number;
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

export interface NoShowBillingResultDto {
  reservationId: number;
  penaltyNights: number;
  penaltyAmount: number;
  currency: string;
  reservation: ReservationDto;
}

// Aperçu No Show — pour le popup d'application manuelle.
export interface NoShowPreviewDto {
  reservationId: number;
  reference: string;
  guestName: string;
  penaltyNights: number;
  penaltyAmount: number;
  currency: string;
  alreadyBilled: boolean;
}

export interface CancellationBillingResultDto {
  reservationId: number;
  penaltyNights: number;
  penaltyAmount: number;
  currency: string;
  deadlineLabel: string;
  reservation: ReservationDto;
}

export interface TarifPreviewDto {
  pricePerNight: number;
  tarifNuit: number;
  tarifN15: number;
  tarifN30: number;
  tier: 'Nuitee' | 'N15Nuits' | 'N30Nuits' | string;
  source: 'company' | 'category' | 'room' | 'default' | string;
  companyName: string | null;
  totalHebergement: number;
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

export interface CompanyFilterParams extends PaginationFilterParams {
  isActive?: boolean;
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


