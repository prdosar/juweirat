// Models DTOs pour Juweirat Direction Mobile (Safe numeric casting)

int _toInt(dynamic value, [int defaultValue = 0]) {
  if (value == null) return defaultValue;
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) {
    final n = num.tryParse(value);
    if (n != null) return n.toInt();
  }
  return defaultValue;
}

int? _toIntOrNull(dynamic value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) {
    final n = num.tryParse(value);
    if (n != null) return n.toInt();
  }
  return null;
}

double _toDouble(dynamic value, [double defaultValue = 0.0]) {
  if (value == null) return defaultValue;
  if (value is double) return value;
  if (value is num) return value.toDouble();
  if (value is String) {
    final n = num.tryParse(value);
    if (n != null) return n.toDouble();
  }
  return defaultValue;
}

class ReservationPrestationDto {
  final int id;
  final int prestationId;
  final int quantite;
  final int prixUnitaireSnapshot;
  final int totalLigne;
  final String nameFr;
  final String nameEn;
  final String? icon;
  final String? mode;

  const ReservationPrestationDto({
    required this.id,
    required this.prestationId,
    required this.quantite,
    required this.prixUnitaireSnapshot,
    required this.totalLigne,
    required this.nameFr,
    required this.nameEn,
    this.icon,
    this.mode,
  });

  factory ReservationPrestationDto.fromJson(Map<String, dynamic> json) {
    return ReservationPrestationDto(
      id: _toInt(json['id']),
      prestationId: _toInt(json['prestationId']),
      quantite: _toInt(json['quantite'], 1),
      prixUnitaireSnapshot: _toInt(json['prixUnitaireSnapshot']),
      totalLigne: _toInt(json['totalLigne']),
      nameFr: json['nameFr'] as String? ?? '',
      nameEn: json['nameEn'] as String? ?? '',
      icon: json['icon'] as String?,
      mode: json['mode'] as String?,
    );
  }
}

class ReservationDto {
  final int id;
  final String reference;
  final int? roomId;
  final String? roomNumber;
  final String? roomNameFr;
  final String? roomNameEn;
  final int categoryId;
  final String categorySlug;
  final String categoryNameFr;
  final String categoryNameEn;
  final int clientId;
  final String clientFullName;
  final String? clientEmail;
  final String? clientPhone;
  final String checkInDate;
  final String checkOutDate;
  final int nights;
  final int adults;
  final int children;
  final int pricePerNightSnapshot;
  final int totalPrice;
  final String currency;
  final String status;
  final String? source;
  final String? specialRequests;
  final String? internalNotes;
  final int amountPaid;
  final int amountDue;
  final String? confirmedAt;
  final String? cancelledAt;
  final String? createdAt;
  final String? garantieType;
  final int? garantieMontantCash;
  final String? carteNom;
  final String? carteSuffix;
  final String? carteExpiration;
  final int totalHebergement;
  final int totalPrestations;
  final List<ReservationPrestationDto> prestations;

  const ReservationDto({
    required this.id,
    required this.reference,
    this.roomId,
    this.roomNumber,
    this.roomNameFr,
    this.roomNameEn,
    required this.categoryId,
    required this.categorySlug,
    required this.categoryNameFr,
    required this.categoryNameEn,
    required this.clientId,
    required this.clientFullName,
    this.clientEmail,
    this.clientPhone,
    required this.checkInDate,
    required this.checkOutDate,
    required this.nights,
    required this.adults,
    required this.children,
    required this.pricePerNightSnapshot,
    required this.totalPrice,
    required this.currency,
    required this.status,
    this.source,
    this.specialRequests,
    this.internalNotes,
    this.amountPaid = 0,
    this.amountDue = 0,
    this.confirmedAt,
    this.cancelledAt,
    this.createdAt,
    this.garantieType,
    this.garantieMontantCash,
    this.carteNom,
    this.carteSuffix,
    this.carteExpiration,
    this.totalHebergement = 0,
    this.totalPrestations = 0,
    this.prestations = const [],
  });

  factory ReservationDto.fromJson(Map<String, dynamic> json) {
    final rawPres = json['prestations'] as List<dynamic>? ?? [];
    return ReservationDto(
      id: _toInt(json['id']),
      reference: json['reference'] as String? ?? '',
      roomId: _toIntOrNull(json['roomId']),
      roomNumber: json['roomNumber'] as String?,
      roomNameFr: json['roomNameFr'] as String?,
      roomNameEn: json['roomNameEn'] as String?,
      categoryId: _toInt(json['categoryId']),
      categorySlug: json['categorySlug'] as String? ?? '',
      categoryNameFr: json['categoryNameFr'] as String? ?? '',
      categoryNameEn: json['categoryNameEn'] as String? ?? '',
      clientId: _toInt(json['clientId']),
      clientFullName: json['clientFullName'] as String? ?? 'Client',
      clientEmail: json['clientEmail'] as String?,
      clientPhone: json['clientPhone'] as String?,
      checkInDate: json['checkInDate'] as String? ?? '',
      checkOutDate: json['checkOutDate'] as String? ?? '',
      nights: _toInt(json['nights'], 1),
      adults: _toInt(json['adults'], 1),
      children: _toInt(json['children'], 0),
      pricePerNightSnapshot: _toInt(json['pricePerNightSnapshot']),
      totalPrice: _toInt(json['totalPrice']),
      currency: json['currency'] as String? ?? 'XOF',
      status: json['status'] as String? ?? 'Pending',
      source: json['source'] as String?,
      specialRequests: json['specialRequests'] as String?,
      internalNotes: json['internalNotes'] as String?,
      amountPaid: _toInt(json['amountPaid']),
      amountDue: _toInt(json['amountDue']),
      confirmedAt: json['confirmedAt'] as String?,
      cancelledAt: json['cancelledAt'] as String?,
      createdAt: json['createdAt'] as String?,
      garantieType: json['garantieType'] as String?,
      garantieMontantCash: _toIntOrNull(json['garantieMontantCash']),
      carteNom: json['carteNom'] as String?,
      carteSuffix: json['carteSuffix'] as String?,
      carteExpiration: json['carteExpiration'] as String?,
      totalHebergement: _toInt(json['totalHebergement']),
      totalPrestations: _toInt(json['totalPrestations']),
      prestations: rawPres
          .map((e) => ReservationPrestationDto.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class ClientDto {
  final int id;
  final String firstName;
  final String lastName;
  final String fullName;
  final String? email;
  final String? phone;
  final String? nationality;
  final String? documentType;
  final String? documentNumber;
  final String? city;
  final String? country;
  final String? notes;
  final int totalReservations;
  final String createdAt;
  final int? companyId;
  final String? companyName;

  const ClientDto({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.fullName,
    this.email,
    this.phone,
    this.nationality,
    this.documentType,
    this.documentNumber,
    this.city,
    this.country,
    this.notes,
    this.totalReservations = 0,
    required this.createdAt,
    this.companyId,
    this.companyName,
  });

  factory ClientDto.fromJson(Map<String, dynamic> json) {
    return ClientDto(
      id: _toInt(json['id']),
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
      fullName: json['fullName'] as String? ?? '${json['firstName'] ?? ''} ${json['lastName'] ?? ''}'.trim(),
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      nationality: json['nationality'] as String?,
      documentType: json['documentType'] as String?,
      documentNumber: json['documentNumber'] as String?,
      city: json['city'] as String?,
      country: json['country'] as String?,
      notes: json['notes'] as String?,
      totalReservations: _toInt(json['totalReservations']),
      createdAt: json['createdAt'] as String? ?? '',
      companyId: _toIntOrNull(json['companyId']),
      companyName: json['companyName'] as String?,
    );
  }
}

class RoomImageDto {
  final int id;
  final String filePath;
  final String? altTextFr;
  final String? altTextEn;
  final int sortOrder;
  final bool isCover;

  const RoomImageDto({
    required this.id,
    required this.filePath,
    this.altTextFr,
    this.altTextEn,
    this.sortOrder = 0,
    this.isCover = false,
  });

  factory RoomImageDto.fromJson(Map<String, dynamic> json) {
    return RoomImageDto(
      id: _toInt(json['id']),
      filePath: json['filePath'] as String? ?? '',
      altTextFr: json['altTextFr'] as String?,
      altTextEn: json['altTextEn'] as String?,
      sortOrder: _toInt(json['sortOrder']),
      isCover: json['isCover'] as bool? ?? false,
    );
  }
}

class AmenityDto {
  final int id;
  final String nameFr;
  final String nameEn;
  final String? icon;

  const AmenityDto({
    required this.id,
    required this.nameFr,
    required this.nameEn,
    this.icon,
  });

  factory AmenityDto.fromJson(Map<String, dynamic> json) {
    return AmenityDto(
      id: _toInt(json['id']),
      nameFr: json['nameFr'] as String? ?? '',
      nameEn: json['nameEn'] as String? ?? '',
      icon: json['icon'] as String?,
    );
  }
}

class RoomCategoryDto {
  final int id;
  final String slug;
  final String pmsType;
  final String pmsGamme;
  final String nameFr;
  final String nameEn;
  final String? descriptionFr;
  final String? descriptionEn;
  final int capacityAdults;
  final int capacityChildren;
  final int tarifNuit;
  final int tarifN15;
  final int tarifN30;
  final int roomCount;
  final List<RoomImageDto> images;
  final String? coverImage;

  const RoomCategoryDto({
    required this.id,
    required this.slug,
    required this.pmsType,
    required this.pmsGamme,
    required this.nameFr,
    required this.nameEn,
    this.descriptionFr,
    this.descriptionEn,
    required this.capacityAdults,
    required this.capacityChildren,
    required this.tarifNuit,
    required this.tarifN15,
    required this.tarifN30,
    this.roomCount = 0,
    this.images = const [],
    this.coverImage,
  });

  factory RoomCategoryDto.fromJson(Map<String, dynamic> json) {
    final rawImgs = json['images'] as List<dynamic>? ?? [];
    return RoomCategoryDto(
      id: _toInt(json['id']),
      slug: json['slug'] as String? ?? '',
      pmsType: json['pmsType'] as String? ?? '',
      pmsGamme: json['pmsGamme'] as String? ?? 'standard',
      nameFr: json['nameFr'] as String? ?? '',
      nameEn: json['nameEn'] as String? ?? '',
      descriptionFr: json['descriptionFr'] as String?,
      descriptionEn: json['descriptionEn'] as String?,
      capacityAdults: _toInt(json['capacityAdults'], 2),
      capacityChildren: _toInt(json['capacityChildren'], 0),
      tarifNuit: _toInt(json['tarifNuit']),
      tarifN15: _toInt(json['tarifN15']),
      tarifN30: _toInt(json['tarifN30']),
      roomCount: _toInt(json['roomCount']),
      images: rawImgs.map((e) => RoomImageDto.fromJson(e as Map<String, dynamic>)).toList(),
      coverImage: json['coverImage'] as String?,
    );
  }
}

class RoomDto {
  final int id;
  final String roomNumber;
  final int floor;
  final String nameFr;
  final String nameEn;
  final String? descriptionFr;
  final String? descriptionEn;
  final int capacityAdults;
  final int capacityChildren;
  final int? sizeSqm;
  final int pricePerNight;
  final int? pricePerWeek;
  final int? pricePerMonth;
  final String status;
  final bool isFeatured;
  final int? categoryId;
  final String? categorySlug;
  final String? pmsType;
  final String? pmsGamme;
  final List<RoomImageDto> images;
  final List<AmenityDto> amenities;

  const RoomDto({
    required this.id,
    required this.roomNumber,
    required this.floor,
    required this.nameFr,
    required this.nameEn,
    this.descriptionFr,
    this.descriptionEn,
    required this.capacityAdults,
    required this.capacityChildren,
    this.sizeSqm,
    required this.pricePerNight,
    this.pricePerWeek,
    this.pricePerMonth,
    required this.status,
    this.isFeatured = false,
    this.categoryId,
    this.categorySlug,
    this.pmsType,
    this.pmsGamme,
    this.images = const [],
    this.amenities = const [],
  });

  factory RoomDto.fromJson(Map<String, dynamic> json) {
    final rawImgs = json['images'] as List<dynamic>? ?? [];
    final rawAm = json['amenities'] as List<dynamic>? ?? [];
    return RoomDto(
      id: _toInt(json['id']),
      roomNumber: json['roomNumber'] as String? ?? '',
      floor: _toInt(json['floor'], 1),
      nameFr: json['nameFr'] as String? ?? '',
      nameEn: json['nameEn'] as String? ?? '',
      descriptionFr: json['descriptionFr'] as String?,
      descriptionEn: json['descriptionEn'] as String?,
      capacityAdults: _toInt(json['capacityAdults'], 2),
      capacityChildren: _toInt(json['capacityChildren'], 0),
      sizeSqm: _toIntOrNull(json['sizeSqm']),
      pricePerNight: _toInt(json['pricePerNight']),
      pricePerWeek: _toIntOrNull(json['pricePerWeek']),
      pricePerMonth: _toIntOrNull(json['pricePerMonth']),
      status: json['status'] as String? ?? 'Available',
      isFeatured: json['isFeatured'] as bool? ?? false,
      categoryId: _toIntOrNull(json['categoryId']),
      categorySlug: json['categorySlug'] as String?,
      pmsType: json['pmsType'] as String?,
      pmsGamme: json['pmsGamme'] as String?,
      images: rawImgs.map((e) => RoomImageDto.fromJson(e as Map<String, dynamic>)).toList(),
      amenities: rawAm.map((e) => AmenityDto.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }
}

class PaymentDto {
  final int id;
  final int reservationId;
  final String reservationReference;
  final int amount;
  final String currency;
  final String method;
  final String status;
  final String? internalReference;
  final String? gatewayReference;
  final String? notes;
  final String? paidAt;
  final String createdAt;

  const PaymentDto({
    required this.id,
    required this.reservationId,
    required this.reservationReference,
    required this.amount,
    required this.currency,
    required this.method,
    required this.status,
    this.internalReference,
    this.gatewayReference,
    this.notes,
    this.paidAt,
    required this.createdAt,
  });

  factory PaymentDto.fromJson(Map<String, dynamic> json) {
    return PaymentDto(
      id: _toInt(json['id']),
      reservationId: _toInt(json['reservationId']),
      reservationReference: json['reservationReference'] as String? ?? '',
      amount: _toInt(json['amount']),
      currency: json['currency'] as String? ?? 'XOF',
      method: json['method'] as String? ?? 'Cash',
      status: json['status'] as String? ?? 'Completed',
      internalReference: json['internalReference'] as String?,
      gatewayReference: json['gatewayReference'] as String?,
      notes: json['notes'] as String?,
      paidAt: json['paidAt'] as String?,
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}

class VenteDirecteDto {
  final int id;
  final int prestationId;
  final String prestationNameFr;
  final String? prestationIcon;
  final int? clientId;
  final String? clientNom;
  final int? folioId;
  final String? folioNumber;
  final String? roomNumber;
  final int quantite;
  final int prixUnitaireSnapshot;
  final int total;
  final String mode;
  final String? paymentMethod;
  final String? notes;
  final String createdAt;

  const VenteDirecteDto({
    required this.id,
    required this.prestationId,
    required this.prestationNameFr,
    this.prestationIcon,
    this.clientId,
    this.clientNom,
    this.folioId,
    this.folioNumber,
    this.roomNumber,
    required this.quantite,
    required this.prixUnitaireSnapshot,
    required this.total,
    required this.mode,
    this.paymentMethod,
    this.notes,
    required this.createdAt,
  });

  factory VenteDirecteDto.fromJson(Map<String, dynamic> json) {
    return VenteDirecteDto(
      id: _toInt(json['id']),
      prestationId: _toInt(json['prestationId']),
      prestationNameFr: json['prestationNameFr'] as String? ?? '',
      prestationIcon: json['prestationIcon'] as String?,
      clientId: _toIntOrNull(json['clientId']),
      clientNom: json['clientNom'] as String?,
      folioId: _toIntOrNull(json['folioId']),
      folioNumber: json['folioNumber'] as String?,
      roomNumber: json['roomNumber'] as String?,
      quantite: _toInt(json['quantite'], 1),
      prixUnitaireSnapshot: _toInt(json['prixUnitaireSnapshot']),
      total: _toInt(json['total']),
      mode: json['mode'] as String? ?? 'Encaissement',
      paymentMethod: json['paymentMethod'] as String?,
      notes: json['notes'] as String?,
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}

class PrestationDto {
  final int id;
  final String nameFr;
  final String nameEn;
  final String? descriptionFr;
  final String? descriptionEn;
  final int price;
  final String? icon;
  final bool isActive;

  const PrestationDto({
    required this.id,
    required this.nameFr,
    required this.nameEn,
    this.descriptionFr,
    this.descriptionEn,
    required this.price,
    this.icon,
    this.isActive = true,
  });

  factory PrestationDto.fromJson(Map<String, dynamic> json) {
    return PrestationDto(
      id: _toInt(json['id']),
      nameFr: json['nameFr'] as String? ?? '',
      nameEn: json['nameEn'] as String? ?? '',
      descriptionFr: json['descriptionFr'] as String?,
      descriptionEn: json['descriptionEn'] as String?,
      price: _toInt(json['price']),
      icon: json['icon'] as String?,
      isActive: json['isActive'] as bool? ?? true,
    );
  }
}

typedef PrestationAnnexeDto = PrestationDto;

class CompanyDto {
  final int id;
  final String name;
  final String? code;
  final String? email;
  final String? phone;
  final String? contactPerson;
  final int defaultDiscount;
  final int? tarifNuitStandard;
  final int? tarifN15Standard;
  final int? tarifN30Standard;
  final int? tarifNuitSuperieure;
  final int? tarifN15Superieure;
  final int? tarifN30Superieure;
  final int? tarifNuitSuite;
  final int? tarifN15Suite;
  final int? tarifN30Suite;
  final bool isActive;
  final String createdAt;

  const CompanyDto({
    required this.id,
    required this.name,
    this.code,
    this.email,
    this.phone,
    this.contactPerson,
    this.defaultDiscount = 0,
    this.tarifNuitStandard,
    this.tarifN15Standard,
    this.tarifN30Standard,
    this.tarifNuitSuperieure,
    this.tarifN15Superieure,
    this.tarifN30Superieure,
    this.tarifNuitSuite,
    this.tarifN15Suite,
    this.tarifN30Suite,
    this.isActive = true,
    required this.createdAt,
  });

  factory CompanyDto.fromJson(Map<String, dynamic> json) {
    return CompanyDto(
      id: _toInt(json['id']),
      name: json['name'] as String? ?? '',
      code: json['code'] as String?,
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      contactPerson: json['contactPerson'] as String?,
      defaultDiscount: _toInt(json['defaultDiscount']),
      tarifNuitStandard: _toIntOrNull(json['tarifNuitStandard']),
      tarifN15Standard: _toIntOrNull(json['tarifN15Standard']),
      tarifN30Standard: _toIntOrNull(json['tarifN30Standard']),
      tarifNuitSuperieure: _toIntOrNull(json['tarifNuitSuperieure']),
      tarifN15Superieure: _toIntOrNull(json['tarifN15Superieure']),
      tarifN30Superieure: _toIntOrNull(json['tarifN30Superieure']),
      tarifNuitSuite: _toIntOrNull(json['tarifNuitSuite']),
      tarifN15Suite: _toIntOrNull(json['tarifN15Suite']),
      tarifN30Suite: _toIntOrNull(json['tarifN30Suite']),
      isActive: json['isActive'] as bool? ?? true,
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}

class ContactMessageDto {
  final int id;
  final String fullName;
  final String email;
  final String? phone;
  final String subject;
  final String message;
  final bool isRead;
  final String createdAt;

  const ContactMessageDto({
    required this.id,
    required this.fullName,
    required this.email,
    this.phone,
    required this.subject,
    required this.message,
    this.isRead = false,
    required this.createdAt,
  });

  factory ContactMessageDto.fromJson(Map<String, dynamic> json) {
    return ContactMessageDto(
      id: _toInt(json['id']),
      fullName: json['fullName'] as String? ?? '',
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String?,
      subject: json['subject'] as String? ?? '',
      message: json['message'] as String? ?? '',
      isRead: json['isRead'] as bool? ?? false,
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}

class HotelConfigDto {
  final int id;
  final String buildingName;
  final String ownerName;
  final String city;
  final String currencyCode;
  final int currencyDecimals;
  final String dateHotel;
  final int resaSeq;
  final int factureSeq;

  const HotelConfigDto({
    required this.id,
    required this.buildingName,
    required this.ownerName,
    required this.city,
    required this.currencyCode,
    required this.currencyDecimals,
    required this.dateHotel,
    required this.resaSeq,
    required this.factureSeq,
  });

  factory HotelConfigDto.fromJson(Map<String, dynamic> json) {
    return HotelConfigDto(
      id: _toInt(json['id']),
      buildingName: json['buildingName'] as String? ?? 'Immeuble Juweirat',
      ownerName: json['ownerName'] as String? ?? 'Saka Tidjani',
      city: json['city'] as String? ?? 'Lomé',
      currencyCode: json['currencyCode'] as String? ?? 'FCFA',
      currencyDecimals: _toInt(json['currencyDecimals']),
      dateHotel: json['dateHotel'] as String? ?? '',
      resaSeq: _toInt(json['resaSeq']),
      factureSeq: _toInt(json['factureSeq']),
    );
  }
}

class UnitDto {
  final int id;
  final String? pmsRoomNo;
  final String? pmsType;
  final String? pmsGamme;
  final int tarifNuit;
  final int tarifN15;
  final int tarifN30;
  final String statutMenage;
  final String? lastCleaned;
  final bool horsService;
  final int floor;
  final int planCol;
  final int planRow;
  final String nameFr;
  final String nameEn;
  final String? currentFolioNumber;

  const UnitDto({
    required this.id,
    this.pmsRoomNo,
    this.pmsType,
    this.pmsGamme,
    required this.tarifNuit,
    required this.tarifN15,
    required this.tarifN30,
    required this.statutMenage,
    this.lastCleaned,
    this.horsService = false,
    required this.floor,
    required this.planCol,
    required this.planRow,
    required this.nameFr,
    required this.nameEn,
    this.currentFolioNumber,
  });

  factory UnitDto.fromJson(Map<String, dynamic> json) {
    return UnitDto(
      id: _toInt(json['id']),
      pmsRoomNo: json['pmsRoomNo'] as String?,
      pmsType: json['pmsType'] as String?,
      pmsGamme: json['pmsGamme'] as String?,
      tarifNuit: _toInt(json['tarifNuit']),
      tarifN15: _toInt(json['tarifN15']),
      tarifN30: _toInt(json['tarifN30']),
      statutMenage: json['statutMenage'] as String? ?? 'Propre',
      lastCleaned: json['lastCleaned'] as String?,
      horsService: json['horsService'] as bool? ?? false,
      floor: _toInt(json['floor'], 1),
      planCol: _toInt(json['planCol']),
      planRow: _toInt(json['planRow']),
      nameFr: json['nameFr'] as String? ?? '',
      nameEn: json['nameEn'] as String? ?? '',
      currentFolioNumber: json['currentFolioNumber'] as String?,
    );
  }
}

class FolioDto {
  final int id;
  final String number;
  final int unitId;
  final String unitLabel;
  final String? guest;
  final String? nom;
  final String? prenom;
  final String? societe;
  final String? reservataire;
  final String? cardNumber;
  final String? cardExpiry;
  final String? cardHolder;
  final String segment;
  final int pax;
  final String arrival;
  final String departure;
  final int nights;
  final int rate;
  final int heb;
  final String tarifTier;
  final bool elecIncluded;
  final int pdjParJour;
  final int pdjPrix;
  final int debiteur;
  final int dependances;
  final int arrhes;
  final int paid;
  final String? payMode;
  final String? factRecipient;
  final String resaStatus;
  final bool checkedIn;
  final bool closed;
  final String? checkoutDate;
  final String? note;
  final int? reservationId;
  final int? factureId;
  final String? createdAt;
  final String? updatedAt;
  final int totalHeb;
  final int totalPdj;
  final int totalDebiteur;
  final int totalDependances;
  final int totalGeneral;
  final int solde;

  const FolioDto({
    required this.id,
    required this.number,
    required this.unitId,
    required this.unitLabel,
    this.guest,
    this.nom,
    this.prenom,
    this.societe,
    this.reservataire,
    this.cardNumber,
    this.cardExpiry,
    this.cardHolder,
    required this.segment,
    required this.pax,
    required this.arrival,
    required this.departure,
    required this.nights,
    required this.rate,
    required this.heb,
    required this.tarifTier,
    required this.elecIncluded,
    required this.pdjParJour,
    required this.pdjPrix,
    required this.debiteur,
    required this.dependances,
    required this.arrhes,
    required this.paid,
    this.payMode,
    this.factRecipient,
    required this.resaStatus,
    required this.checkedIn,
    required this.closed,
    this.checkoutDate,
    this.note,
    this.reservationId,
    this.factureId,
    this.createdAt,
    this.updatedAt,
    required this.totalHeb,
    required this.totalPdj,
    required this.totalDebiteur,
    required this.totalDependances,
    required this.totalGeneral,
    required this.solde,
  });

  factory FolioDto.fromJson(Map<String, dynamic> json) {
    return FolioDto(
      id: _toInt(json['id']),
      number: json['number'] as String? ?? '',
      unitId: _toInt(json['unitId']),
      unitLabel: json['unitLabel'] as String? ?? '',
      guest: json['guest'] as String?,
      nom: json['nom'] as String?,
      prenom: json['prenom'] as String?,
      societe: json['societe'] as String?,
      reservataire: json['reservataire'] as String?,
      cardNumber: json['cardNumber'] as String?,
      cardExpiry: json['cardExpiry'] as String?,
      cardHolder: json['cardHolder'] as String?,
      segment: json['segment'] as String? ?? 'Direct',
      pax: _toInt(json['pax'], 1),
      arrival: json['arrival'] as String? ?? '',
      departure: json['departure'] as String? ?? '',
      nights: _toInt(json['nights'], 1),
      rate: _toInt(json['rate']),
      heb: _toInt(json['heb']),
      tarifTier: json['tarifTier'] as String? ?? 'Nuitee',
      elecIncluded: json['elecIncluded'] as bool? ?? true,
      pdjParJour: _toInt(json['pdjParJour']),
      pdjPrix: _toInt(json['pdjPrix']),
      debiteur: _toInt(json['debiteur']),
      dependances: _toInt(json['dependances']),
      arrhes: _toInt(json['arrhes']),
      paid: _toInt(json['paid']),
      payMode: json['payMode'] as String?,
      factRecipient: json['factRecipient'] as String?,
      resaStatus: json['resaStatus'] as String? ?? 'Confirmee',
      checkedIn: json['checkedIn'] as bool? ?? false,
      closed: json['closed'] as bool? ?? false,
      checkoutDate: json['checkoutDate'] as String?,
      note: json['note'] as String?,
      reservationId: _toIntOrNull(json['reservationId']),
      factureId: _toIntOrNull(json['factureId']),
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
      totalHeb: _toInt(json['totalHeb']),
      totalPdj: _toInt(json['totalPdj']),
      totalDebiteur: _toInt(json['totalDebiteur']),
      totalDependances: _toInt(json['totalDependances']),
      totalGeneral: _toInt(json['totalGeneral']),
      solde: _toInt(json['solde']),
    );
  }
}

class CloturePreviewArrivalDto {
  final int id;
  final String number;
  final String? guest;
  final String unitLabel;
  final String date;

  const CloturePreviewArrivalDto({
    required this.id,
    required this.number,
    this.guest,
    required this.unitLabel,
    required this.date,
  });

  factory CloturePreviewArrivalDto.fromJson(Map<String, dynamic> json) {
    return CloturePreviewArrivalDto(
      id: _toInt(json['id']),
      number: json['number'] as String? ?? '',
      guest: json['guest'] as String?,
      unitLabel: json['unitLabel'] as String? ?? '',
      date: json['date'] as String? ?? '',
    );
  }
}

class CloturePreviewDto {
  final String dateHotel;
  final List<CloturePreviewArrivalDto> pendingArrivals;
  final List<CloturePreviewArrivalDto> pendingDepartures;
  final int estimatedActiveCount;
  final bool canClose;

  const CloturePreviewDto({
    required this.dateHotel,
    this.pendingArrivals = const [],
    this.pendingDepartures = const [],
    required this.estimatedActiveCount,
    required this.canClose,
  });

  factory CloturePreviewDto.fromJson(Map<String, dynamic> json) {
    final rawArr = json['pendingArrivals'] as List<dynamic>? ?? [];
    final rawDep = json['pendingDepartures'] as List<dynamic>? ?? [];
    return CloturePreviewDto(
      dateHotel: json['dateHotel'] as String? ?? '',
      pendingArrivals: rawArr.map((e) => CloturePreviewArrivalDto.fromJson(e as Map<String, dynamic>)).toList(),
      pendingDepartures: rawDep.map((e) => CloturePreviewArrivalDto.fromJson(e as Map<String, dynamic>)).toList(),
      estimatedActiveCount: _toInt(json['estimatedActiveCount']),
      canClose: json['canClose'] as bool? ?? false,
    );
  }
}

class ClotureHistoryDto {
  final int id;
  final String dateHotel;
  final String executedAt;
  final int dispo;
  final int occ;
  final double occupation;
  final int caHeb;
  final int caPdj;
  final int caTotal;
  final int pm;
  final int revPar;
  final int nbArrivals;
  final int nbDeparts;
  final int nbNoShow;
  final int nbLignes;
  final int montant;

  const ClotureHistoryDto({
    required this.id,
    required this.dateHotel,
    required this.executedAt,
    required this.dispo,
    required this.occ,
    required this.occupation,
    required this.caHeb,
    required this.caPdj,
    required this.caTotal,
    required this.pm,
    required this.revPar,
    required this.nbArrivals,
    required this.nbDeparts,
    required this.nbNoShow,
    required this.nbLignes,
    required this.montant,
  });

  factory ClotureHistoryDto.fromJson(Map<String, dynamic> json) {
    return ClotureHistoryDto(
      id: _toInt(json['id']),
      dateHotel: json['dateHotel'] as String? ?? '',
      executedAt: json['executedAt'] as String? ?? '',
      dispo: _toInt(json['dispo']),
      occ: _toInt(json['occ']),
      occupation: _toDouble(json['occupation']),
      caHeb: _toInt(json['caHeb']),
      caPdj: _toInt(json['caPdj']),
      caTotal: _toInt(json['caTotal']),
      pm: _toInt(json['pm']),
      revPar: _toInt(json['revPar']),
      nbArrivals: _toInt(json['nbArrivals']),
      nbDeparts: _toInt(json['nbDeparts']),
      nbNoShow: _toInt(json['nbNoShow']),
      nbLignes: _toInt(json['nbLignes']),
      montant: _toInt(json['montant']),
    );
  }
}

typedef ClotureDto = ClotureHistoryDto;

class DebiteurDto {
  final int id;
  final String client;
  final String label;
  final String dueDate;
  final int amount;
  final int paid;
  final int solde;
  final int? folioId;
  final String? folioNumber;
  final String? createdAt;
  final String? updatedAt;

  const DebiteurDto({
    required this.id,
    required this.client,
    required this.label,
    required this.dueDate,
    required this.amount,
    required this.paid,
    required this.solde,
    this.folioId,
    this.folioNumber,
    this.createdAt,
    this.updatedAt,
  });

  factory DebiteurDto.fromJson(Map<String, dynamic> json) {
    return DebiteurDto(
      id: _toInt(json['id']),
      client: json['client'] as String? ?? '',
      label: json['label'] as String? ?? '',
      dueDate: json['dueDate'] as String? ?? '',
      amount: _toInt(json['amount']),
      paid: _toInt(json['paid']),
      solde: _toInt(json['solde']),
      folioId: _toIntOrNull(json['folioId']),
      folioNumber: json['folioNumber'] as String?,
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
    );
  }
}

class FactureDto {
  final int id;
  final String number;
  final int? folioId;
  final String? clientNom;
  final int totalTtc;
  final String dateEmission;
  final String? statut;

  const FactureDto({
    required this.id,
    required this.number,
    this.folioId,
    this.clientNom,
    required this.totalTtc,
    required this.dateEmission,
    this.statut,
  });

  factory FactureDto.fromJson(Map<String, dynamic> json) {
    return FactureDto(
      id: _toInt(json['id']),
      number: json['number'] as String? ?? '',
      folioId: _toIntOrNull(json['folioId']),
      clientNom: json['clientNom'] as String?,
      totalTtc: _toInt(json['totalTtc']),
      dateEmission: json['dateEmission'] as String? ?? '',
      statut: json['statut'] as String?,
    );
  }
}

class MaintenanceDto {
  final int id;
  final int unitId;
  final String unitNumber;
  final String description;
  final String status;
  final String priority;
  final String? reportedAt;
  final String? resolvedAt;
  final String? assignedTo;

  const MaintenanceDto({
    required this.id,
    required this.unitId,
    required this.unitNumber,
    required this.description,
    required this.status,
    required this.priority,
    this.reportedAt,
    this.resolvedAt,
    this.assignedTo,
  });

  factory MaintenanceDto.fromJson(Map<String, dynamic> json) {
    return MaintenanceDto(
      id: _toInt(json['id']),
      unitId: _toInt(json['unitId']),
      unitNumber: json['unitNumber'] as String? ?? '',
      description: json['description'] as String? ?? '',
      status: json['status'] as String? ?? 'Pending',
      priority: json['priority'] as String? ?? 'Normal',
      reportedAt: json['reportedAt'] as String?,
      resolvedAt: json['resolvedAt'] as String?,
      assignedTo: json['assignedTo'] as String?,
    );
  }
}

typedef MaintenanceTicketDto = MaintenanceDto;

class NotificationItemDto {
  final String id;
  final String type;
  final String title;
  final String body;
  final String? entityType;
  final String? entityId;
  final String? deepLink;
  final DateTime createdAt;
  final bool isRead;

  const NotificationItemDto({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    this.entityType,
    this.entityId,
    this.deepLink,
    required this.createdAt,
    this.isRead = false,
  });

  factory NotificationItemDto.fromJson(Map<String, dynamic> json) {
    return NotificationItemDto(
      id: json['id']?.toString() ?? '',
      type: json['type'] as String? ?? 'info',
      title: json['title'] as String? ?? '',
      body: (json['body'] ?? json['message']) as String? ?? '',
      entityType: json['entityType'] as String?,
      entityId: json['entityId'] as String?,
      deepLink: json['deepLink'] as String?,
      createdAt: json['createdAt'] != null
          ? (DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now())
          : DateTime.now(),
      isRead: json['isRead'] as bool? ?? false,
    );
  }
}
