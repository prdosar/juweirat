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
    this.tvaExonere = false,
  });

  final bool tvaExonere;

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
      tvaExonere: json['tvaExonere'] as bool? ?? false,
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

class RoomOccupationDto {
  final int reservationId;
  final String reference;
  final String clientName;
  final String? companyName;
  final String checkInDate;
  final String checkOutDate;
  final String status;

  const RoomOccupationDto({
    required this.reservationId,
    required this.reference,
    required this.clientName,
    this.companyName,
    required this.checkInDate,
    required this.checkOutDate,
    required this.status,
  });

  factory RoomOccupationDto.fromJson(Map<String, dynamic> json) {
    return RoomOccupationDto(
      reservationId: _toInt(json['reservationId']),
      reference: json['reference'] as String? ?? '',
      clientName: json['clientName'] as String? ?? '',
      companyName: json['companyName'] as String?,
      checkInDate: json['checkInDate'] as String? ?? '',
      checkOutDate: json['checkOutDate'] as String? ?? '',
      status: json['status'] as String? ?? '',
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
  final int tarifNuit;
  final int tarifN15;
  final int tarifN30;
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
  final RoomOccupationDto? currentOccupation;

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
    this.tarifNuit = 0,
    this.tarifN15 = 0,
    this.tarifN30 = 0,
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
    this.currentOccupation,
  });

  factory RoomDto.fromJson(Map<String, dynamic> json) {
    final rawImgs = json['images'] as List<dynamic>? ?? [];
    final rawAm = json['amenities'] as List<dynamic>? ?? [];
    final rawOcc = json['currentOccupation'] as Map<String, dynamic>?;

    final tarifNuit = _toInt(json['tarifNuit'], _toInt(json['pricePerNight']));
    final tarifN15 = _toInt(json['tarifN15']);
    final tarifN30 = _toInt(json['tarifN30']);

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
      tarifNuit: tarifNuit,
      tarifN15: tarifN15,
      tarifN30: tarifN30,
      pricePerNight: tarifNuit,
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
      currentOccupation: rawOcc != null ? RoomOccupationDto.fromJson(rawOcc) : null,
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
  final bool tvaExonere;

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
    this.tvaExonere = false,
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
      tvaExonere: json['tvaExonere'] as bool? ?? false,
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
  final int prixInclus;
  final int prixSeule;
  final String mode;
  final String? icon;
  final bool isActive;
  final int sortOrder;
  final bool prixFlexible;

  const PrestationDto({
    required this.id,
    required this.nameFr,
    required this.nameEn,
    this.descriptionFr,
    this.descriptionEn,
    required this.price,
    this.prixInclus = 0,
    this.prixSeule = 0,
    this.mode = 'ParPersonneParNuit',
    this.icon,
    this.isActive = true,
    this.sortOrder = 0,
    this.prixFlexible = false,
  });

  factory PrestationDto.fromJson(Map<String, dynamic> json) {
    final pInclus = _toInt(json['prixInclus']);
    final pSeule = _toInt(json['prixSeule']);
    final pFallback = _toInt(json['price']);
    final effectivePrice = pSeule > 0 ? pSeule : (pInclus > 0 ? pInclus : pFallback);

    return PrestationDto(
      id: _toInt(json['id']),
      nameFr: json['nameFr'] as String? ?? '',
      nameEn: json['nameEn'] as String? ?? '',
      descriptionFr: json['descriptionFr'] as String?,
      descriptionEn: json['descriptionEn'] as String?,
      price: effectivePrice,
      prixInclus: pInclus,
      prixSeule: pSeule,
      mode: json['mode'] as String? ?? 'ParPersonneParNuit',
      icon: json['icon'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      sortOrder: _toInt(json['sortOrder']),
      prixFlexible: json['prixFlexible'] as bool? ?? false,
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
  final String name;
  final String email;
  final String? phone;
  final String subject;
  final String message;
  final String status;
  final String? replyMessage;
  final DateTime? repliedAt;
  final String? repliedBy;
  final DateTime createdAt;

  const ContactMessageDto({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    required this.subject,
    required this.message,
    required this.status,
    this.replyMessage,
    this.repliedAt,
    this.repliedBy,
    required this.createdAt,
  });

  String get fullName => name;
  bool get isUnread => status.toLowerCase() == 'new';

  factory ContactMessageDto.fromJson(Map<String, dynamic> json) {
    final rawName = (json['name'] ?? json['fullName']) as String? ?? '';
    final rawStatus = (json['status'] ?? (json['isRead'] == true ? 'Read' : 'New')) as String? ?? 'New';
    return ContactMessageDto(
      id: _toInt(json['id']),
      name: rawName,
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String?,
      subject: json['subject'] as String? ?? '',
      message: json['message'] as String? ?? '',
      status: rawStatus,
      replyMessage: json['replyMessage'] as String?,
      repliedAt: json['repliedAt'] != null ? DateTime.tryParse(json['repliedAt'].toString()) : null,
      repliedBy: json['repliedBy'] as String?,
      createdAt: json['createdAt'] != null
          ? (DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now())
          : DateTime.now(),
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

class FactureLineDto {
  final String label;
  final int montant;

  const FactureLineDto({
    required this.label,
    required this.montant,
  });

  factory FactureLineDto.fromJson(Map<String, dynamic> json) {
    return FactureLineDto(
      label: json['label'] as String? ?? '',
      montant: _toInt(json['montant']),
    );
  }
}

class FactureSnapshotDto {
  final List<FactureLineDto> lines;
  final int total;
  final int arrhes;
  final int paid;
  final String? payMode;
  final String? recipient;
  final String? client;
  final String? societe;
  final String? reservataire;
  final String? unitLabel;
  final String? arrival;
  final String? departure;
  final int nights;
  final int pax;
  final bool? tvaExonere;
  final int? totalHt;
  final int? tva;
  final int? totalTtc;
  final double? tvaRate;

  const FactureSnapshotDto({
    this.lines = const [],
    required this.total,
    this.arrhes = 0,
    this.paid = 0,
    this.payMode,
    this.recipient,
    this.client,
    this.societe,
    this.reservataire,
    this.unitLabel,
    this.arrival,
    this.departure,
    this.nights = 1,
    this.pax = 1,
    this.tvaExonere,
    this.totalHt,
    this.tva,
    this.totalTtc,
    this.tvaRate,
  });

  factory FactureSnapshotDto.fromJson(Map<String, dynamic> json) {
    final rawLines = json['lines'] as List<dynamic>? ?? [];
    return FactureSnapshotDto(
      lines: rawLines.map((e) => FactureLineDto.fromJson(e as Map<String, dynamic>)).toList(),
      total: _toInt(json['total']),
      arrhes: _toInt(json['arrhes']),
      paid: _toInt(json['paid']),
      payMode: json['payMode'] as String?,
      recipient: json['recipient'] as String?,
      client: json['client'] as String?,
      societe: json['societe'] as String?,
      reservataire: json['reservataire'] as String?,
      unitLabel: json['unitLabel'] as String?,
      arrival: json['arrival'] as String?,
      departure: json['departure'] as String?,
      nights: _toInt(json['nights'], 1),
      pax: _toInt(json['pax'], 1),
      tvaExonere: json['tvaExonere'] as bool?,
      totalHt: _toIntOrNull(json['totalHt']),
      tva: _toIntOrNull(json['tva']),
      totalTtc: _toIntOrNull(json['totalTtc']),
      tvaRate: json['tvaRate'] != null ? _toDouble(json['tvaRate']) : null,
    );
  }
}

class FactureDto {
  final int id;
  final String number;
  final int folioId;
  final String folioNumber;
  final String date;
  final String status;
  final int printCount;
  final int corrections;
  final String? corrigeeLe;
  final FactureSnapshotDto? snapshot;
  final String createdAt;
  final String updatedAt;

  // Compatibility helpers
  String get clientNom => snapshot?.client ?? snapshot?.societe ?? 'Client';
  int get totalTtc => snapshot?.totalTtc ?? snapshot?.total ?? 0;
  String get dateEmission => date;
  String get statut => status;

  const FactureDto({
    required this.id,
    required this.number,
    required this.folioId,
    required this.folioNumber,
    required this.date,
    required this.status,
    this.printCount = 0,
    this.corrections = 0,
    this.corrigeeLe,
    this.snapshot,
    required this.createdAt,
    required this.updatedAt,
  });

  factory FactureDto.fromJson(Map<String, dynamic> json) {
    final rawSnap = json['snapshot'] as Map<String, dynamic>?;
    return FactureDto(
      id: _toInt(json['id']),
      number: json['number'] as String? ?? '',
      folioId: _toInt(json['folioId']),
      folioNumber: json['folioNumber'] as String? ?? '',
      date: json['date'] as String? ?? '',
      status: json['status'] as String? ?? 'Emise',
      printCount: _toInt(json['printCount']),
      corrections: _toInt(json['corrections']),
      corrigeeLe: json['corrigeeLe'] as String?,
      snapshot: rawSnap != null ? FactureSnapshotDto.fromJson(rawSnap) : null,
      createdAt: json['createdAt'] as String? ?? '',
      updatedAt: json['updatedAt'] as String? ?? '',
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

class HousekeepingLogDto {
  final int id;
  final int roomId;
  final int staffId;
  final String staffFullName;
  final String? staffPhone;
  final String cleanedAt;
  final String? notes;

  const HousekeepingLogDto({
    required this.id,
    required this.roomId,
    required this.staffId,
    required this.staffFullName,
    this.staffPhone,
    required this.cleanedAt,
    this.notes,
  });

  factory HousekeepingLogDto.fromJson(Map<String, dynamic> json) {
    return HousekeepingLogDto(
      id: _toInt(json['id']),
      roomId: _toInt(json['roomId']),
      staffId: _toInt(json['staffId']),
      staffFullName: json['staffFullName'] as String? ?? '',
      staffPhone: json['staffPhone'] as String?,
      cleanedAt: json['cleanedAt'] as String? ?? '',
      notes: json['notes'] as String?,
    );
  }
}

class RoomHistoryDto {
  final List<HousekeepingLogDto> housekeeping;
  final List<MaintenanceTicketDto> maintenance;

  const RoomHistoryDto({
    this.housekeeping = const [],
    this.maintenance = const [],
  });

  factory RoomHistoryDto.fromJson(Map<String, dynamic> json) {
    final rawHk = json['housekeeping'] as List<dynamic>? ?? [];
    final rawMt = json['maintenance'] as List<dynamic>? ?? [];
    return RoomHistoryDto(
      housekeeping: rawHk.map((e) => HousekeepingLogDto.fromJson(e as Map<String, dynamic>)).toList(),
      maintenance: rawMt.map((e) => MaintenanceTicketDto.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }
}

class NotificationSummaryDto {
  final String systemDate;
  final String todayDate;
  final int pendingReservationsCount;
  final int websiteReservationsTodayCount;
  final int unreadMessagesCount;
  final int daysNotClosedCount;

  const NotificationSummaryDto({
    required this.systemDate,
    required this.todayDate,
    this.pendingReservationsCount = 0,
    this.websiteReservationsTodayCount = 0,
    this.unreadMessagesCount = 0,
    this.daysNotClosedCount = 0,
  });

  int get totalAlerts => pendingReservationsCount + websiteReservationsTodayCount + unreadMessagesCount + (daysNotClosedCount > 0 ? 1 : 0);

  factory NotificationSummaryDto.fromJson(Map<String, dynamic> json) {
    return NotificationSummaryDto(
      systemDate: (json['systemDate'] ?? json['SystemDate']) as String? ?? '',
      todayDate: (json['todayDate'] ?? json['TodayDate']) as String? ?? '',
      pendingReservationsCount: _toInt(json['pendingReservationsCount'] ?? json['PendingReservationsCount']),
      websiteReservationsTodayCount: _toInt(json['websiteReservationsTodayCount'] ?? json['WebsiteReservationsTodayCount']),
      unreadMessagesCount: _toInt(json['unreadMessagesCount'] ?? json['UnreadMessagesCount']),
      daysNotClosedCount: _toInt(json['daysNotClosedCount'] ?? json['DaysNotClosedCount']),
    );
  }
}

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

// ── COMPTABILITÉ & TRÉSORERIE DTOs ──────────────────────────────────────────

class AccountDto {
  final int id;
  final String kind;
  final String name;
  final int? ownerRefId;
  final int balance;
  final bool isActive;
  final String createdAt;
  final String updatedAt;

  const AccountDto({
    required this.id,
    required this.kind,
    required this.name,
    this.ownerRefId,
    required this.balance,
    this.isActive = true,
    required this.createdAt,
    required this.updatedAt,
  });

  factory AccountDto.fromJson(Map<String, dynamic> json) {
    return AccountDto(
      id: _toInt(json['id']),
      kind: json['kind'] as String? ?? '',
      name: json['name'] as String? ?? '',
      ownerRefId: _toIntOrNull(json['ownerRefId']),
      balance: _toInt(json['balance']),
      isActive: json['isActive'] as bool? ?? true,
      createdAt: json['createdAt'] as String? ?? '',
      updatedAt: json['updatedAt'] as String? ?? '',
    );
  }
}

class AccountMovementDto {
  final int id;
  final String date;
  final int fromAccountId;
  final String fromAccountName;
  final int toAccountId;
  final String toAccountName;
  final int amount;
  final String reason;
  final String? sourceType;
  final int? sourceId;
  final int? sessionId;
  final int? createdByUserId;
  final String? label;

  const AccountMovementDto({
    required this.id,
    required this.date,
    required this.fromAccountId,
    required this.fromAccountName,
    required this.toAccountId,
    required this.toAccountName,
    required this.amount,
    required this.reason,
    this.sourceType,
    this.sourceId,
    this.sessionId,
    this.createdByUserId,
    this.label,
  });

  factory AccountMovementDto.fromJson(Map<String, dynamic> json) {
    return AccountMovementDto(
      id: _toInt(json['id']),
      date: json['date'] as String? ?? '',
      fromAccountId: _toInt(json['fromAccountId']),
      fromAccountName: json['fromAccountName'] as String? ?? '',
      toAccountId: _toInt(json['toAccountId']),
      toAccountName: json['toAccountName'] as String? ?? '',
      amount: _toInt(json['amount']),
      reason: json['reason'] as String? ?? '',
      sourceType: json['sourceType'] as String?,
      sourceId: _toIntOrNull(json['sourceId']),
      sessionId: _toIntOrNull(json['sessionId']),
      createdByUserId: _toIntOrNull(json['createdByUserId']),
      label: json['label'] as String?,
    );
  }
}

class CashRegisterDto {
  final int id;
  final String name;
  final String? location;
  final bool isActive;
  final int? accountId;
  final int accountBalance;
  final String createdAt;

  const CashRegisterDto({
    required this.id,
    required this.name,
    this.location,
    this.isActive = true,
    this.accountId,
    required this.accountBalance,
    required this.createdAt,
  });

  factory CashRegisterDto.fromJson(Map<String, dynamic> json) {
    return CashRegisterDto(
      id: _toInt(json['id']),
      name: json['name'] as String? ?? '',
      location: json['location'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      accountId: _toIntOrNull(json['accountId']),
      accountBalance: _toInt(json['accountBalance']),
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}

class CashSessionDto {
  final int id;
  final int registerId;
  final String registerName;
  final int openedByUserId;
  final String openedByUserName;
  final String openedAt;
  final int openingFloat;
  final int? closedByUserId;
  final String? closedByUserName;
  final String? closedAt;
  final int? closingCountedTotal;
  final String status;
  final String? notes;

  const CashSessionDto({
    required this.id,
    required this.registerId,
    required this.registerName,
    required this.openedByUserId,
    required this.openedByUserName,
    required this.openedAt,
    required this.openingFloat,
    this.closedByUserId,
    this.closedByUserName,
    this.closedAt,
    this.closingCountedTotal,
    required this.status,
    this.notes,
  });

  bool get isOpen => status.toLowerCase() == 'open';

  factory CashSessionDto.fromJson(Map<String, dynamic> json) {
    return CashSessionDto(
      id: _toInt(json['id']),
      registerId: _toInt(json['registerId']),
      registerName: json['registerName'] as String? ?? 'Caisse',
      openedByUserId: _toInt(json['openedByUserId']),
      openedByUserName: json['openedByUserName'] as String? ?? 'Utilisateur',
      openedAt: json['openedAt'] as String? ?? '',
      openingFloat: _toInt(json['openingFloat']),
      closedByUserId: _toIntOrNull(json['closedByUserId']),
      closedByUserName: json['closedByUserName'] as String?,
      closedAt: json['closedAt'] as String?,
      closingCountedTotal: _toIntOrNull(json['closingCountedTotal']),
      status: json['status'] as String? ?? 'Open',
      notes: json['notes'] as String?,
    );
  }
}

class CashSessionReportDto {
  final CashSessionDto session;
  final int theoreticalTotal;
  final int? countedTotal;
  final int? ecart;
  final int totalEncaisse;
  final int totalDecaisse;
  final int totalEntreeManuelle;
  final int movementsCount;

  const CashSessionReportDto({
    required this.session,
    required this.theoreticalTotal,
    this.countedTotal,
    this.ecart,
    required this.totalEncaisse,
    required this.totalDecaisse,
    required this.totalEntreeManuelle,
    required this.movementsCount,
  });

  factory CashSessionReportDto.fromJson(Map<String, dynamic> json) {
    return CashSessionReportDto(
      session: CashSessionDto.fromJson(json['session'] as Map<String, dynamic>),
      theoreticalTotal: _toInt(json['theoreticalTotal']),
      countedTotal: _toIntOrNull(json['countedTotal']),
      ecart: _toIntOrNull(json['ecart']),
      totalEncaisse: _toInt(json['totalEncaisse']),
      totalDecaisse: _toInt(json['totalDecaisse']),
      totalEntreeManuelle: _toInt(json['totalEntreeManuelle']),
      movementsCount: _toInt(json['movementsCount']),
    );
  }
}

class JournalEntryDto {
  final String sourceType;
  final int sourceId;
  final String date;
  final String label;
  final int ht;
  final int tva;
  final int ttc;
  final int encaisse;
  final int decaisse;
  final String? paymentMethod;

  const JournalEntryDto({
    required this.sourceType,
    required this.sourceId,
    required this.date,
    required this.label,
    required this.ht,
    required this.tva,
    required this.ttc,
    required this.encaisse,
    required this.decaisse,
    this.paymentMethod,
  });

  factory JournalEntryDto.fromJson(Map<String, dynamic> json) {
    return JournalEntryDto(
      sourceType: json['sourceType'] as String? ?? '',
      sourceId: _toInt(json['sourceId']),
      date: json['date'] as String? ?? '',
      label: json['label'] as String? ?? '',
      ht: _toInt(json['ht']),
      tva: _toInt(json['tva']),
      ttc: _toInt(json['ttc']),
      encaisse: _toInt(json['encaisse']),
      decaisse: _toInt(json['decaisse']),
      paymentMethod: json['paymentMethod'] as String?,
    );
  }
}

class JournalReportDto {
  final String? from;
  final String? to;
  final List<JournalEntryDto> entries;
  final int totalHt;
  final int totalTva;
  final int totalTtc;
  final int totalEncaisse;
  final int totalDecaisse;

  const JournalReportDto({
    this.from,
    this.to,
    this.entries = const [],
    required this.totalHt,
    required this.totalTva,
    required this.totalTtc,
    required this.totalEncaisse,
    required this.totalDecaisse,
  });

  factory JournalReportDto.fromJson(Map<String, dynamic> json) {
    final rawEntries = json['entries'] as List<dynamic>? ?? [];
    return JournalReportDto(
      from: json['from'] as String?,
      to: json['to'] as String?,
      entries: rawEntries.map((e) => JournalEntryDto.fromJson(e as Map<String, dynamic>)).toList(),
      totalHt: _toInt(json['totalHt']),
      totalTva: _toInt(json['totalTva']),
      totalTtc: _toInt(json['totalTtc']),
      totalEncaisse: _toInt(json['totalEncaisse']),
      totalDecaisse: _toInt(json['totalDecaisse']),
    );
  }
}

class BalanceLineDto {
  final int accountId;
  final String kind;
  final String name;
  final int? ownerRefId;
  final int openingBalance;
  final int totalDebit;
  final int totalCredit;
  final int closingBalance;

  const BalanceLineDto({
    required this.accountId,
    required this.kind,
    required this.name,
    this.ownerRefId,
    required this.openingBalance,
    required this.totalDebit,
    required this.totalCredit,
    required this.closingBalance,
  });

  int get debit => totalDebit;
  int get credit => totalCredit;

  factory BalanceLineDto.fromJson(Map<String, dynamic> json) {
    return BalanceLineDto(
      accountId: _toInt(json['accountId']),
      kind: json['kind'] as String? ?? '',
      name: json['name'] as String? ?? '',
      ownerRefId: _toIntOrNull(json['ownerRefId']),
      openingBalance: _toInt(json['openingBalance']),
      totalDebit: _toInt(json['totalDebit']),
      totalCredit: _toInt(json['totalCredit']),
      closingBalance: _toInt(json['closingBalance']),
    );
  }
}

class BalanceReportDto {
  final String? from;
  final String? to;
  final String? kindFilter;
  final List<BalanceLineDto> lines;
  final int totalDebit;
  final int totalCredit;

  const BalanceReportDto({
    this.from,
    this.to,
    this.kindFilter,
    this.lines = const [],
    required this.totalDebit,
    required this.totalCredit,
  });

  factory BalanceReportDto.fromJson(Map<String, dynamic> json) {
    final rawLines = json['lines'] as List<dynamic>? ?? [];
    return BalanceReportDto(
      from: json['from'] as String?,
      to: json['to'] as String?,
      kindFilter: json['kindFilter'] as String?,
      lines: rawLines.map((e) => BalanceLineDto.fromJson(e as Map<String, dynamic>)).toList(),
      totalDebit: _toInt(json['totalDebit']),
      totalCredit: _toInt(json['totalCredit']),
    );
  }
}

class TvaReportLineDto {
  final String sourceType;
  final int sourceId;
  final String date;
  final String label;
  final int ht;
  final int tva;
  final int ttc;

  const TvaReportLineDto({
    required this.sourceType,
    required this.sourceId,
    required this.date,
    required this.label,
    required this.ht,
    required this.tva,
    required this.ttc,
  });

  factory TvaReportLineDto.fromJson(Map<String, dynamic> json) {
    return TvaReportLineDto(
      sourceType: json['sourceType'] as String? ?? '',
      sourceId: _toInt(json['sourceId']),
      date: json['date'] as String? ?? '',
      label: json['label'] as String? ?? '',
      ht: _toInt(json['ht']),
      tva: _toInt(json['tva']),
      ttc: _toInt(json['ttc']),
    );
  }
}

class TvaReportDto {
  final String? from;
  final String? to;
  final int totalHt;
  final int totalTva;
  final int totalTtc;
  final double tvaRate;
  final List<TvaReportLineDto> lines;

  const TvaReportDto({
    this.from,
    this.to,
    required this.totalHt,
    required this.totalTva,
    required this.totalTtc,
    required this.tvaRate,
    this.lines = const [],
  });

  factory TvaReportDto.fromJson(Map<String, dynamic> json) {
    final rawLines = json['lines'] as List<dynamic>? ?? [];
    return TvaReportDto(
      from: json['from'] as String?,
      to: json['to'] as String?,
      totalHt: _toInt(json['totalHt']),
      totalTva: _toInt(json['totalTva']),
      totalTtc: _toInt(json['totalTtc']),
      tvaRate: _toDouble(json['tvaRate'], 0.18),
      lines: rawLines.map((e) => TvaReportLineDto.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }
}

class UserDto {
  final int id;
  final String firstName;
  final String lastName;
  final String fullName;
  final String email;
  final String role;
  final bool isActive;
  final String? lastLoginAt;
  final String createdAt;

  const UserDto({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.fullName,
    required this.email,
    required this.role,
    this.isActive = true,
    this.lastLoginAt,
    required this.createdAt,
  });

  factory UserDto.fromJson(Map<String, dynamic> json) {
    return UserDto(
      id: _toInt(json['id']),
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
      fullName: json['fullName'] as String? ?? '${json['firstName'] ?? ''} ${json['lastName'] ?? ''}'.trim(),
      email: json['email'] as String? ?? '',
      role: json['role'] as String? ?? 'utilisateur',
      isActive: json['isActive'] as bool? ?? true,
      lastLoginAt: json['lastLoginAt'] as String?,
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}
