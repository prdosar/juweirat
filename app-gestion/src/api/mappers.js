export const mapRoomToUnit = (room) => {
  return {
    id: room.id.toString(),
    label: room.roomNumber,
    type: room.capacity >= 4 ? 'T3' : room.capacity >= 2 ? 'T2' : 'T1',
    mode: 'court',
    rate: room.pricePerNight,
    rent: room.pricePerMonth || room.pricePerNight * 30,
    tarifs: {
      nuit: room.pricePerNight,
      n15: room.pricePerWeek * 2 || room.pricePerNight * 15,
      n30: room.pricePerMonth || room.pricePerNight * 30,
    },
    hs: room.status !== 'Available',
    statutMenage: 'propre',
    floor: room.floor,
    planCol: 1,
    planRow: 1,
  };
};

export const mapReservationToFolio = (resa) => {
  return {
    id: resa.id,
    number: resa.referenceNumber || `RES-${resa.id}`,
    unitId: resa.roomId.toString(),
    guest: resa.client?.nameFr || 'Inconnu',
    phone: resa.client?.phone || '',
    arrival: resa.checkIn,
    departure: resa.checkOut,
    rate: resa.pricePerNight,
    resaStatus: resa.status === 'Confirmed' ? 'confirmée' : resa.status === 'CheckedIn' ? 'en cours' : 'cloturé',
    checkedIn: resa.status === 'CheckedIn',
    closed: resa.status === 'Completed',
    paid: 0,
    discount: 0,
    arrhes: 0,
  };
};

export const mapUnitToRoomRequest = (unit) => {
  return {
    roomNumber: unit.label,
    pricePerNight: unit.rate,
    status: unit.hs ? 'Maintenance' : 'Available',
    floor: unit.floor,
    capacity: unit.type === 'T3' ? 4 : unit.type === 'T2' ? 2 : 1,
  };
};

export const mapFolioToReservationRequest = (folio) => {
  return {
    roomId: parseInt(folio.unitId, 10),
    checkIn: folio.arrival,
    checkOut: folio.departure,
    pricePerNight: folio.rate,
    client: {
      nameFr: folio.guest,
      phone: folio.phone || '',
    },
    status: folio.checkedIn ? 'CheckedIn' : folio.closed ? 'Completed' : 'Confirmed',
  };
};

export const mapConfigToFrontend = (config) => {
  if (!config) return null;
  return {
    buildingName: config.buildingName,
    ownerName: config.ownerName,
    city: config.city,
    currency: {
      code: config.currencyCode || "FCFA",
      decimals: config.currencyDecimals || 0,
    },
    dateHotel: config.dateHotel,
    resaSeq: config.resaSeq || 0,
    factureSeq: config.factureSeq || 0
  };
};

export const mapConfigToBackend = (config) => {
  if (!config) return null;
  return {
    id: 1,
    buildingName: config.buildingName,
    ownerName: config.ownerName,
    city: config.city,
    currencyCode: config.currency?.code || "FCFA",
    currencyDecimals: config.currency?.decimals || 0,
    dateHotel: config.dateHotel,
    resaSeq: config.resaSeq || 0,
    factureSeq: config.factureSeq || 0
  };
};
