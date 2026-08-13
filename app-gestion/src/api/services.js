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
  updateHousekeeping: async (id, status) => {
    const { data } = await client.patch(`/Rooms/${id}/housekeeping?status=${status}`);
    return mapRoomToUnit(data);
  },

  // FOLIOS (PMS)
  getFolios: async () => {
    const { data } = await client.get('/Folios');
    return (data || []).reduce((acc, folio) => {
      acc[folio.id] = folio;
      return acc;
    }, {});
  },
  createFolio: async (folio) => {
    const { data } = await client.post('/Folios', folio);
    return data;
  },
  updateFolio: async (id, patch) => {
    const { data } = await client.put(`/Folios/${id}`, patch);
    return data;
  },

  // FACTURES
  getFactures: async () => {
    const { data } = await client.get('/Factures');
    return (data || []).reduce((acc, f) => {
      acc[f.id] = f;
      return acc;
    }, {});
  },
  emitFacture: async (folioId, recipient) => {
    const { data } = await client.post(`/Factures/Emit/${folioId}?recipient=${recipient}`);
    return data;
  },
  cancelFacture: async (id) => {
    const { data } = await client.post(`/Factures/${id}/Cancel`);
    return data;
  },

  // CLOTURES
  getClotures: async () => {
    const { data } = await client.get('/Clotures');
    return data || [];
  },

  // POSTINGS
  getPostings: async () => {
    const { data } = await client.get('/Postings');
    return data || [];
  },

  executeCloture: async () => {
    const { data } = await client.post('/Clotures/Execute');
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
  deleteDebtor: async (id) => {
    await client.delete(`/Debtors/${id}`);
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
  },
  deleteMaintenanceTicket: async (id) => {
    await client.delete(`/Maintenance/${id}`);
  }
};
