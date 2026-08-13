import client from './client';
import { mapRoomToUnit, mapReservationToFolio, mapFolioToReservationRequest, mapConfigToFrontend, mapConfigToBackend } from './mappers';

export const apiServices = {
  // CONFIG
  getConfig: async () => {
    const { data } = await client.get('/Config');
    return mapConfigToFrontend(data);
  },
  updateConfig: async (config) => {
    const { data } = await client.put('/Config', mapConfigToBackend(config));
    return mapConfigToFrontend(data);
  },

  // ROOMS (Units)
  getRooms: async () => {
    const { data } = await client.get('/Rooms');
    return (data || []).map(mapRoomToUnit).reduce((acc, unit) => {
      acc[unit.id] = unit;
      return acc;
    }, {});
  },

  // RESERVATIONS (Folios)
  getReservations: async () => {
    const { data } = await client.get('/Reservations');
    return (data || []).map(mapReservationToFolio).reduce((acc, folio) => {
      acc[folio.id] = folio;
      return acc;
    }, {});
  },
  createReservation: async (folio) => {
    const req = mapFolioToReservationRequest(folio);
    const { data } = await client.post('/Reservations', req);
    return mapReservationToFolio(data);
  },
  updateReservationStatus: async (id, status) => {
    const { data } = await client.patch(`/Reservations/${id}/status`, { status });
    return mapReservationToFolio(data);
  },

  // FACTURES
  getFactures: async () => {
    const { data } = await client.get('/Factures');
    return (data || []).reduce((acc, f) => {
      acc[f.id] = f;
      return acc;
    }, {});
  },
  saveFacture: async (facture) => {
    if (facture.id) {
      const { data } = await client.put(`/Factures/${facture.id}`, facture);
      return data;
    } else {
      const { data } = await client.post('/Factures', facture);
      return data;
    }
  },

  // CLOTURES
  getClotures: async () => {
    const { data } = await client.get('/Clotures');
    return data || [];
  },
  createCloture: async (cloture) => {
    const { data } = await client.post('/Clotures', cloture);
    return data;
  },

  // POSTINGS
  getPostings: async () => {
    const { data } = await client.get('/Postings');
    return data || [];
  },
  createPosting: async (posting) => {
    const { data } = await client.post('/Postings', posting);
    return data;
  },

  executeCloture: async (payload) => {
    const { data } = await client.post('/Clotures/Execute', payload);
    return data;
  },

  getDebtors: async () => {
    const { data } = await client.get('/Debtors');
    return data || [];
  },
  saveDebtor: async (debtor) => {
    if (debtor.id) {
      const { data } = await client.put(`/Debtors/${debtor.id}`, debtor);
      return data;
    } else {
      const { data } = await client.post('/Debtors', debtor);
      return data;
    }
  },

  getMonthly: async () => {
    const { data } = await client.get('/Monthly');
    return data || {};
  },
  saveMonthly: async (monthlyObj) => {
    const { data } = await client.post('/Monthly', monthlyObj);
    return data;
  },

  getMaintenanceTickets: async () => {
    const { data } = await client.get('/Maintenance');
    return data || [];
  },
  saveMaintenanceTicket: async (ticket) => {
    if (ticket.id) {
      const { data } = await client.put(`/Maintenance/${ticket.id}`, ticket);
      return data;
    } else {
      const { data } = await client.post('/Maintenance', ticket);
      return data;
    }
  }
};
