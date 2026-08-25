export interface HotelConfigDto {
  id: number;
  buildingName: string;
  ownerName: string;
  city: string;
  currencyCode: string;
  currencyDecimals: number;
  dateHotel: string;
  resaSeq: number;
  factureSeq: number;
}

export interface UnitDto {
  id: number;
  pmsRoomNo: string | null;
  pmsType: string | null;
  pmsGamme: string | null;
  tarifNuit: number;
  tarifN15: number;
  tarifN30: number;
  statutMenage: string;
  lastCleaned: string | null;
  horsService: boolean;
  floor: number;
  planCol: number;
  planRow: number;
  nameFr: string;
  nameEn: string;
  currentFolioNumber: string | null;
  currentGuestName: string | null;
  currentCompanyName: string | null;
}

export interface FolioDto {
  id: number;
  number: string;
  unitId: number;
  unitLabel: string;
  guest: string | null;
  guestPhone?: string | null;
  telephone?: string | null;
  nom: string | null;
  prenom: string | null;
  societe: string | null;
  reservataire: string | null;
  cardNumber: string | null;
  cardExpiry: string | null;
  cardHolder: string | null;
  segment: string;
  pax: number;
  arrival: string;
  departure: string;
  nights: number;
  rate: number;
  heb: number;
  tarifTier: string;
  elecIncluded: boolean;
  pdjParJour: number;
  pdjPrix: number;
  debiteur: number;
  dependances: number;
  arrhes: number;
  paid: number;
  payMode: string | null;
  factRecipient: string | null;
  resaStatus: string;
  checkedIn: boolean;
  closed: boolean;
  checkoutDate: string | null;
  note: string | null;
  reservationId: number | null;
  reservationReference: string | null;
  factureId: number | null;
  createdAt: string;
  updatedAt: string;
  totalHeb: number;       // NET (après remise résa) HT.
  totalPdj: number;
  totalDebiteur: number;
  totalDependances: number;
  totalGeneral: number;   // HT — les prix stockés (Rate, PdjPrix, etc.) sont HT.
  solde: number;          // TTC (client paie TTC → dette TTC).
  tvaExonere: boolean;
  tva: number;
  totalTtc: number;
  // Décomposition catalogue → remise → net (source : Reservation liée).
  // Pour un folio direct PMS sans résa, totalHebGross = totalHeb et discount = 0.
  totalHebGross: number;
  discount: number;
}

export interface CloturePreviewDto {
  dateHotel: string;
  pendingArrivals: FolioPendingItemDto[];
  pendingDepartures: FolioPendingItemDto[];
  estimatedActiveCount: number;
  canClose: boolean;
}

export interface FolioPendingItemDto {
  id: number;
  number: string;
  guest: string | null;
  unitLabel: string;
  date: string;
  reservationId: number | null;
}

export interface ClotureDto {
  id: number;
  dateHotel: string;
  executedAt: string;
  dispo: number;
  occ: number;
  occupation: number;
  caHeb: number;
  caPdj: number;
  caTotal: number;
  pm: number;
  revPar: number;
  nbArrivals: number;
  nbDeparts: number;
  nbNoShow: number;
  nbLignes: number;
  montant: number;
}

export interface PostingDto {
  id: number;
  dateHotel: string;
  folioId: number;
  unitId: number;
  famille: string;
  libelle: string;
  montant: number;
  horodatage: string;
}

export interface FactureDto {
  id: number;
  number: string;
  folioId: number;
  folioNumber: string;
  date: string;
  status: string;
  printCount: number;
  corrections: number;
  corrigeeLe: string | null;
  snapshot: FactureSnapshotDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface FactureSnapshotDto {
  lines: { label: string; montant: number }[];
  total: number;
  arrhes: number;
  paid: number;
  payMode: string | null;
  recipient: string | null;
  client: string | null;
  societe: string | null;
  reservataire: string | null;
  unitLabel: string | null;
  arrival: string | null;
  departure: string | null;
  nights: number;
  pax: number;
  // Fiscalité — nullable pour rétro-compat avec les factures antérieures.
  tvaExonere?: boolean | null;
  totalHt?: number | null;
  tva?: number | null;
  totalTtc?: number | null;
  tvaRate?: number | null;
}

export interface MaintenanceTicketDto {
  id: number;
  zone: string;
  unitId: number | null;
  unitLabel: string | null;
  spot: string | null;
  category: string;
  priority: string;
  title: string;
  description: string | null;
  tech: string | null;
  cost: number | null;
  status: string;
  resolvedAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  staffId: number | null;
  staffNom: string | null;
  staffPhone: string | null;
}

export interface MaintenanceCategoryDto {
  id: number;
  name: string;
  isActive: boolean;
  staffCount: number;
}

export interface HousekeepingLogDto {
  id: number;
  roomId: number;
  staffId: number;
  staffFullName: string;
  staffPhone: string | null;
  cleanedAt: string;
  notes: string | null;
}

export interface RoomHistoryDto {
  housekeeping: HousekeepingLogDto[];
  maintenance: MaintenanceTicketDto[];
}

export interface MaintenanceStaffDto {
  id: number;
  categoryId: number;
  categoryName: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isActive: boolean;
  fullName: string;
}

export interface ContractDataDto {
  prenomNom:            string | null;
  nationalite:          string | null;
  pieceIdentite:        string | null;
  adresse:              string | null;
  societe:              string | null;
  aptNo:                string | null;
  floor:                number;
  pmsType:              string | null;
  arrival:              string;
  departure:            string;
  nights:               number;
  rate:                 number;
  monthlyLoyer:         number;
  elecIncluded:         boolean;
  tarifTier:            string;
  folioNumber:          string;
  today:                string;
  discount:             number;
  reservationReference: string | null;
}

export interface DebiteurDto {
  id: number;
  client: string;
  label: string;
  dueDate: string;
  amount: number;
  paid: number;
  solde: number;
  folioId: number | null;
  folioNumber: string | null;
  createdAt: string;
  updatedAt: string;
}
