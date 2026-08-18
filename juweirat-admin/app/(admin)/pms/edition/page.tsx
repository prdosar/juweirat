'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { pmsUnits, pmsFolios, pmsMaintenance } from '@/lib/pms';
import type { UnitDto, FolioDto, MaintenanceTicketDto } from '@/lib/pmsTypes';
import {
  Search, BedDouble, Wrench, Sparkles, Calendar, User, Phone,
  FileDown, Printer, Filter, ArrowUpDown, Clock, Building2, CheckCircle2,
  AlertCircle, ChevronRight, X, Users, DollarSign, LayoutList, BarChart3,
} from 'lucide-react';

const thisYear = () => new Date().getFullYear();
const thisMonth = () => new Date().toISOString().slice(0, 7);
const todayStr = () => new Date().toISOString().slice(0, 10);
const daysInMonth = (ym: string) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m, 0).getDate(); };
const addDays = (s: string, n: number) => { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const dayDiff = (a: string, b: string) => Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000);
const frDate = (s: string) => (s ? new Date(s + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");
const frDay = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short" });
const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : 0);

function downloadCSV(fn: string, rows: unknown[][]) {
  const csv = rows.map((r) => r.map((c) => {
    const s = String(c == null ? "" : c);
    return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(";")).join("\n");
  const b = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const u = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = u; a.download = fn; a.click(); URL.revokeObjectURL(u);
}

const money = (n: number) => Math.round(num(n)).toLocaleString("fr-FR") + " FCFA";

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  CheckedIn:  { label: 'En séjour',  cls: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
  CheckedOut: { label: 'Parti',      cls: 'bg-gray-100 text-gray-600 border border-gray-200' },
  Confirmee:  { label: 'Confirmée',  cls: 'bg-blue-100 text-blue-800 border border-blue-200' },
  Option:     { label: 'Option',     cls: 'bg-amber-100 text-amber-800 border border-amber-200' },
  Garantie:   { label: 'Garantie',   cls: 'bg-indigo-100 text-indigo-800 border border-indigo-200' },
  NoShow:     { label: 'No Show',    cls: 'bg-charcoal/15 text-charcoal/60' },
  Annulee:    { label: 'Annulée',    cls: 'bg-red-100 text-red-700 border border-red-200' },
};

export default function EditionPage() {
  const currentYm = thisMonth();
  const currentYear = thisYear();

  // Active view tab
  const [activeTab, setActiveTab]     = useState<'occupants' | 'synthese' | 'calendrier'>('occupants');

  // Filter states
  const [from, setFrom]               = useState(`${currentYear}-01-01`);
  const [to, setTo]                   = useState(`${currentYear}-12-31`);
  const [selectedRoom, setSelectedRoom] = useState<string>('tous');
  const [search, setSearch]           = useState('');
  const [stayStatus, setStayStatus]   = useState<string>('tous');
  const [sortBy, setSortBy]           = useState<string>('arrival_desc');

  // Data states
  const [units, setUnits]             = useState<UnitDto[]>([]);
  const [folios, setFolios]           = useState<FolioDto[]>([]);
  const [tickets, setTickets]         = useState<MaintenanceTicketDto[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([pmsUnits.getAll(), pmsFolios.getAll(), pmsMaintenance.getAll()])
      .then(([u, f, t]) => {
        setUnits(u);
        setFolios(f);
        setTickets(t);
      })
      .finally(() => setLoading(false));
  }, []);

  const dateHotel = todayStr();
  const span = Math.max(0, dayDiff(from, to) + 1);
  const winEnd = addDays(to, 1);
  const validPeriod = to >= from;

  // Quick period presets
  const applyPreset = (preset: 'month' | 'quarter' | 'year' | 'all' | 'future') => {
    const today = new Date();
    if (preset === 'month') {
      setFrom(`${currentYm}-01`);
      setTo(`${currentYm}-${String(daysInMonth(currentYm)).padStart(2, '0')}`);
    } else if (preset === 'quarter') {
      const qStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      setFrom(qStart.toISOString().slice(0, 10));
      setTo(todayStr());
    } else if (preset === 'year') {
      setFrom(`${currentYear}-01-01`);
      setTo(`${currentYear}-12-31`);
    } else if (preset === 'all') {
      setFrom('2024-01-01');
      setTo('2030-12-31');
    } else if (preset === 'future') {
      setFrom(todayStr());
      setTo(addDays(todayStr(), 60));
    }
  };

  // Filtered list of folios / stays for the Occupants view
  const filteredFolios = useMemo(() => {
    const q = search.trim().toLowerCase();

    return folios.filter((f) => {
      // 1. Room filter
      if (selectedRoom !== 'tous' && f.unitId !== Number(selectedRoom)) return false;

      // 2. Date overlap filter: stay overlaps with [from, to]
      if (f.arrival > to || f.departure < from) return false;

      // 3. Status filter
      if (stayStatus === 'active') {
        if (f.closed || f.resaStatus === 'Cancelled' || f.resaStatus === 'NoShow') return false;
      } else if (stayStatus === 'closed') {
        if (!f.closed) return false;
      } else if (stayStatus === 'cancelled') {
        if (f.resaStatus !== 'Cancelled' && f.resaStatus !== 'NoShow') return false;
      }

      // 4. Text search
      if (q) {
        const guestName = (f.guest || `${f.prenom ?? ''} ${f.nom ?? ''}`).toLowerCase();
        const unitName = f.unitLabel.toLowerCase();
        const soc = (f.societe || '').toLowerCase();
        const phone = (f.guestPhone || f.telephone || '').toLowerCase();
        const numFolio = f.number.toLowerCase();

        const match =
          guestName.includes(q) ||
          unitName.includes(q) ||
          soc.includes(q) ||
          phone.includes(q) ||
          numFolio.includes(q);

        if (!match) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'arrival_desc') return a.arrival > b.arrival ? -1 : 1;
      if (sortBy === 'arrival_asc')  return a.arrival < b.arrival ? -1 : 1;
      if (sortBy === 'nights_desc')   return b.nights - a.nights;
      if (sortBy === 'total_desc')    return b.totalGeneral - a.totalGeneral;
      if (sortBy === 'name_asc') {
        const nameA = a.guest || `${a.nom ?? ''} ${a.prenom ?? ''}`;
        const nameB = b.guest || `${b.nom ?? ''} ${b.prenom ?? ''}`;
        return nameA.localeCompare(nameB);
      }
      return 0;
    });
  }, [folios, selectedRoom, from, to, stayStatus, search, sortBy]);

  // Group filtered folios by room
  const occupantsByUnit = useMemo(() => {
    const targetUnits = selectedRoom === 'tous' ? units : units.filter((u) => u.id === Number(selectedRoom));

    return targetUnits.map((u) => {
      const unitStays = filteredFolios.filter((f) => f.unitId === u.id);
      const totalCA = unitStays.reduce((sum, f) => sum + (f.totalGeneral || 0), 0);
      const totalNights = unitStays.reduce((sum, f) => sum + (f.nights || 0), 0);

      return {
        unit: u,
        stays: unitStays,
        totalCA,
        totalNights,
      };
    });
  }, [units, selectedRoom, filteredFolios]);

  // Financial synthesis by unit for the Synthese tab
  const caByUnit = useMemo(() => {
    const m: Record<number, { heb: number; pdj: number; extra: number; nights: number; total: number; stays: number; pm: number; los: number }> = {};
    const d0 = from, d1 = addDays(to, 1);

    units.forEach((u) => {
      let heb = 0, pdj = 0, extra = 0, nights = 0, stays = 0, losTot = 0;
      folios.forEach((f) => {
        if (f.unitId !== u.id || f.resaStatus === 'Cancelled' || f.resaStatus === 'NoShow') return;
        if (f.arrival > to || f.departure < from) return;

        stays++;
        nights += f.nights;
        losTot += f.nights;
        heb += f.totalHeb;
        pdj += f.totalPdj;
        extra += (f.totalDebiteur + f.totalDependances);
      });
      const total = heb + pdj + extra;
      m[u.id] = { heb, pdj, extra, nights, total, stays, pm: nights ? heb / nights : 0, los: stays ? losTot / stays : 0 };
    });
    return m;
  }, [units, folios, from, to]);

  const unitsView = selectedRoom === 'tous' ? units : units.filter((u) => u.id === Number(selectedRoom));
  const totalRevenue = unitsView.reduce((sm, u) => sm + (caByUnit[u.id]?.total || 0), 0);
  const totalStaysCount = filteredFolios.length;
  const totalOccupantsNights = filteredFolios.reduce((sum, f) => sum + f.nights, 0);

  // CSV Export
  const exportCSV = () => {
    downloadCSV(`historique_occupants_${from}_${to}.csv`, [
      ["RÉSIDENCE JUWEIRAT — HISTORIQUE D'OCCUPATION DES CHAMBRES", `Période du ${frDate(from)} au ${frDate(to)}`],
      [],
      ["Logement", "N° Folio", "Client / Occupant", "Société", "Téléphone", "Arrivée", "Départ", "Nuits", "Pax", "Statut", "Total Séjour", "Solde Restant"],
      ...filteredFolios.map((f) => {
        const guestName = f.guest || [f.prenom, f.nom].filter(Boolean).join(' ') || '—';
        return [
          f.unitLabel,
          f.number,
          guestName,
          f.societe || '—',
          f.guestPhone || f.telephone || '—',
          frDate(f.arrival),
          frDate(f.departure),
          f.nights,
          f.pax,
          STATUS_CONFIG[f.resaStatus]?.label ?? f.resaStatus,
          Math.round(f.totalGeneral),
          Math.round(f.solde),
        ];
      }),
      [],
      ["TOTAL SÉJOURS", filteredFolios.length, "", "", "", "", "", totalOccupantsNights, "", "", Math.round(totalRevenue), ""],
    ]);
  };

  const resetAllFilters = () => {
    applyPreset('year');
    setSelectedRoom('tous');
    setSearch('');
    setStayStatus('tous');
    setSortBy('arrival_desc');
  };

  const hasFiltersActive = selectedRoom !== 'tous' || search || stayStatus !== 'tous' || sortBy !== 'arrival_desc';

  if (loading) {
    return (
      <div className="flex flex-col min-h-full">
        <Header title="Édition" />
        <div className="flex-1 flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-green/30 border-t-green rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Édition & Historique d'Occupation" />
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-5">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-green-dark font-extrabold mb-1">
              Rapports & Consultations PMS
            </div>
            <h1 className="text-2xl font-extrabold text-charcoal">
              Historique des Occupants & Synthèse des Chambres
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-charcoal px-3.5 py-2 text-xs font-semibold rounded-lg hover:bg-gray-50 shadow-xs transition-colors"
            >
              <FileDown size={15} className="text-green" /> Exporter CSV
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 bg-charcoal text-white px-3.5 py-2 text-xs font-semibold rounded-lg hover:bg-charcoal-800 shadow-xs transition-colors"
            >
              <Printer size={15} /> Imprimer
            </button>
          </div>
        </div>

        {/* Filter Toolbar (Empêche l'encombrement sur les années) */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-5 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Room Selector */}
            <div className="w-full sm:w-64">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Chambre / Appartement
              </label>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 font-medium focus:ring-2 focus:ring-green/20 focus:border-green outline-hidden cursor-pointer"
              >
                <option value="tous">Toutes les chambres ({units.length})</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.pmsRoomNo ? `Appt ${u.pmsRoomNo} — ` : ''}{u.nameFr} {u.pmsType ? `(${u.pmsType})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div className="w-36">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Du (Arrivée dès)
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-green/20 focus:border-green outline-hidden"
              />
            </div>

            {/* Date To */}
            <div className="w-36">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Au (Départ jusqu'à)
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-green/20 focus:border-green outline-hidden"
              />
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset('month')}
                className="px-2.5 py-2 text-xs font-semibold text-charcoal bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Ce mois
              </button>
              <button
                type="button"
                onClick={() => applyPreset('quarter')}
                className="px-2.5 py-2 text-xs font-semibold text-charcoal bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                3 mois
              </button>
              <button
                type="button"
                onClick={() => applyPreset('year')}
                className="px-2.5 py-2 text-xs font-semibold text-charcoal bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Année {currentYear}
              </button>
              <button
                type="button"
                onClick={() => applyPreset('all')}
                className="px-2.5 py-2 text-xs font-semibold text-green-dark bg-green/10 hover:bg-green/20 rounded-lg transition-colors"
              >
                Tout l'historique
              </button>
            </div>
          </div>

          {/* Search, Status & Sorting row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un occupant (nom, société, folio, tél)..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50/50 focus:ring-2 focus:ring-green/20 focus:border-green outline-hidden"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-charcoal"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Stay Status Filter */}
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                <Filter size={13} className="text-gray-400" />
                <span className="text-gray-500 font-medium">État du séjour :</span>
                <select
                  value={stayStatus}
                  onChange={(e) => setStayStatus(e.target.value)}
                  className="bg-transparent border-none text-charcoal font-semibold text-xs focus:ring-0 cursor-pointer outline-hidden"
                >
                  <option value="tous">Tous les séjours</option>
                  <option value="active">En cours / Actifs</option>
                  <option value="closed">Séjours clôturés</option>
                  <option value="cancelled">Annulations & No-shows</option>
                </select>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                <ArrowUpDown size={13} className="text-gray-400" />
                <span className="text-gray-500 font-medium">Tri :</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent border-none text-charcoal font-semibold text-xs focus:ring-0 cursor-pointer outline-hidden"
                >
                  <option value="arrival_desc">Date d'arrivée (récents d'abord)</option>
                  <option value="arrival_asc">Date d'arrivée (anciens d'abord)</option>
                  <option value="nights_desc">Durée du séjour (plus longs)</option>
                  <option value="total_desc">Montant facturé le plus élevé</option>
                  <option value="name_asc">Nom du client (A → Z)</option>
                </select>
              </div>

              {/* Reset Filter Button */}
              {hasFiltersActive && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="flex items-center gap-1 text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded transition-colors"
                >
                  <X size={13} /> Réinitialiser
                </button>
              )}
            </div>
          </div>
        </div>

        {/* KPI Summaries */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Occupants</div>
            <div className="text-2xl font-black text-charcoal flex items-center gap-2">
              <Users size={20} className="text-green" /> {totalStaysCount}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">séjours enregistrés</p>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nuits Occupées</div>
            <div className="text-2xl font-black text-charcoal flex items-center gap-2">
              <BedDouble size={20} className="text-blue-600" /> {totalOccupantsNights}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">nuits vendues sur la période</p>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Chambres Concernées</div>
            <div className="text-2xl font-black text-charcoal flex items-center gap-2">
              <Building2 size={20} className="text-amber-600" /> {unitsView.length}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">logements dans le filtre</p>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">CA Total Période</div>
            <div className="text-2xl font-black text-green-dark flex items-center gap-1">
              <DollarSign size={20} className="text-gold" /> {money(totalRevenue)}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">recettes hébergement & extras</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
          <button
            onClick={() => setActiveTab('occupants')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'occupants'
                ? 'bg-charcoal text-white shadow-xs'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <LayoutList size={16} /> Historique Détaillé des Occupants ({totalStaysCount})
          </button>
          <button
            onClick={() => setActiveTab('synthese')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'synthese'
                ? 'bg-charcoal text-white shadow-xs'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <BarChart3 size={16} /> Synthèse & Chiffre d'Affaires par Chambre
          </button>
          {span <= 92 && (
            <button
              onClick={() => setActiveTab('calendrier')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'calendrier'
                  ? 'bg-charcoal text-white shadow-xs'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Calendar size={16} /> Planning Graphique ({span} jours)
            </button>
          )}
        </div>

        {/* ── TAB 1 : HISTORIQUE DÉTAILLÉ DES OCCUPANTS PAR CHAMBRE ── */}
        {activeTab === 'occupants' && (
          <div className="space-y-6">
            {occupantsByUnit.map(({ unit, stays, totalCA, totalNights }) => {
              if (selectedRoom !== 'tous' && unit.id !== Number(selectedRoom)) return null;

              return (
                <div
                  key={unit.id}
                  className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden"
                >
                  {/* Chambre Header */}
                  <div className="p-4 bg-gray-50/70 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-charcoal text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                        {unit.pmsRoomNo || unit.nameFr.slice(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-charcoal">{unit.nameFr}</h2>
                          {unit.pmsType && (
                            <span className="text-[10px] uppercase font-semibold bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                              {unit.pmsType}
                            </span>
                          )}
                          {unit.pmsGamme && (
                            <span className="text-[10px] uppercase font-semibold bg-green/15 text-green-dark px-2 py-0.5 rounded">
                              {unit.pmsGamme}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">
                          Étage {unit.floor} · {unit.statutMenage === 'Propre' ? '✨ Propre' : '🧹 À nettoyer'}
                          {unit.horsService ? ' · ⚠️ Hors Service' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Stats for this room */}
                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-right">
                        <span className="text-gray-400">Total occupants :</span>{' '}
                        <strong className="font-bold text-charcoal">{stays.length} séjour(s)</strong>
                      </div>
                      <div className="text-right border-l border-gray-200 pl-4">
                        <span className="text-gray-400">Nuits :</span>{' '}
                        <strong className="font-bold text-charcoal">{totalNights} nuits</strong>
                      </div>
                      <div className="text-right border-l border-gray-200 pl-4 font-bold text-green-dark">
                        CA : {money(totalCA)}
                      </div>
                    </div>
                  </div>

                  {/* Occupants Table */}
                  {stays.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-xs italic">
                      Aucun occupant enregistré sur cette chambre pour la période sélectionnée.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50/40 text-[11px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                          <tr>
                            <th className="px-5 py-3 font-medium">N° Folio</th>
                            <th className="px-5 py-3 font-medium">Client / Occupant</th>
                            <th className="px-5 py-3 font-medium">Contact & Société</th>
                            <th className="px-5 py-3 font-medium">Période du Séjour</th>
                            <th className="px-5 py-3 font-medium text-center">Durée</th>
                            <th className="px-5 py-3 font-medium">Statut</th>
                            <th className="px-5 py-3 font-medium text-right">Montant Facturé</th>
                            <th className="px-5 py-3 font-medium text-right">Solde Dû</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {stays.map((f) => {
                            const guestName = f.guest || [f.prenom, f.nom].filter(Boolean).join(' ') || 'Client sans nom';
                            const st = STATUS_CONFIG[f.resaStatus] ?? { label: f.resaStatus, cls: 'bg-gray-100 text-gray-600' };

                            return (
                              <tr key={f.id} className="hover:bg-gray-50/70 transition-colors">
                                <td className="px-5 py-3.5 font-mono font-bold">
                                  <Link
                                    href={`/pms/folios/${f.id}`}
                                    className="text-green-dark hover:underline"
                                  >
                                    {f.number}
                                  </Link>
                                </td>
                                <td className="px-5 py-3.5">
                                  <Link
                                    href={`/pms/folios/${f.id}`}
                                    className="font-bold text-charcoal hover:text-green-dark transition-colors"
                                  >
                                    {guestName}
                                  </Link>
                                  {f.reservataire && f.reservataire !== guestName && (
                                    <p className="text-[10px] text-gray-400">Réservé par : {f.reservataire}</p>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 text-gray-500">
                                  {f.societe && <div className="font-semibold text-charcoal">{f.societe}</div>}
                                  {(f.guestPhone || f.telephone) && (
                                    <div className="flex items-center gap-1 text-[11px] text-gray-400">
                                      <Phone size={10} /> {f.guestPhone || f.telephone}
                                    </div>
                                  )}
                                  {!f.societe && !(f.guestPhone || f.telephone) && '—'}
                                </td>
                                <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                                  <span className="font-semibold">{frDate(f.arrival)}</span> ➔{' '}
                                  <span className="font-semibold">{frDate(f.departure)}</span>
                                </td>
                                <td className="px-5 py-3.5 text-center font-semibold text-charcoal">
                                  {f.nights} nuit(s)
                                  <span className="text-[10px] text-gray-400 block font-normal">{f.pax} pers.</span>
                                </td>
                                <td className="px-5 py-3.5">
                                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${st.cls}`}>
                                    {st.label}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-right font-bold text-charcoal">
                                  {money(f.totalGeneral)}
                                </td>
                                <td className={`px-5 py-3.5 text-right font-bold ${f.solde > 0 ? 'text-amber-600' : 'text-green-dark'}`}>
                                  {f.solde > 0 ? money(f.solde) : 'Soldé ✓'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredFolios.length === 0 && (
              <div className="bg-white rounded-xl p-12 text-center text-gray-400 border border-gray-100 space-y-2">
                <Users size={32} className="mx-auto text-gray-300" />
                <p className="text-sm">Aucun séjour ne correspond à vos filtres sur cette période.</p>
                <button
                  onClick={resetAllFilters}
                  className="text-xs text-green font-semibold hover:underline"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2 : SYNTHÈSE & CHIFFRE D'AFFAIRES PAR CHAMBRE ── */}
        {activeTab === 'synthese' && (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-charcoal">Synthèse Financière et Taux d'Occupation</h2>
                <p className="text-xs text-gray-400">Période du {frDate(from)} au {frDate(to)}</p>
              </div>
              <span className="text-xs font-bold text-green-dark bg-green/10 px-2.5 py-1 rounded-full">
                {unitsView.length} Logements
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-charcoal text-white text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Logement</th>
                    <th className="py-3 px-4">Type / Gamme</th>
                    <th className="py-3 px-4 text-center">Séjours</th>
                    <th className="py-3 px-4 text-center">Nuits Vendues</th>
                    <th className="py-3 px-4 text-right">Durée Moy.</th>
                    <th className="py-3 px-4 text-right">Prix Moyen (ADR)</th>
                    <th className="py-3 px-4 text-right">Hébergement</th>
                    <th className="py-3 px-4 text-right">Petit Déjeuner</th>
                    <th className="py-3 px-4 text-right">Extras</th>
                    <th className="py-3 px-4 text-right font-extrabold text-green">CA Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {unitsView.map((u, i) => {
                    const x = caByUnit[u.id] || { stays: 0, nights: 0, los: 0, pm: 0, heb: 0, pdj: 0, extra: 0, total: 0 };
                    return (
                      <tr key={u.id} className={`hover:bg-gray-50/70 transition-colors ${i % 2 ? 'bg-gray-50/30' : 'bg-white'}`}>
                        <td className="py-3 px-4 font-bold text-charcoal">
                          {u.pmsRoomNo ? `Appt ${u.pmsRoomNo} — ` : ''}{u.nameFr}
                        </td>
                        <td className="py-3 px-4 text-gray-500">
                          {u.pmsType ? `${u.pmsType} ${u.pmsGamme ? `· ${u.pmsGamme}` : ''}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold">{x.stays || '—'}</td>
                        <td className="py-3 px-4 text-center font-semibold">{x.nights || '—'}</td>
                        <td className="py-3 px-4 text-right text-gray-600">{x.los ? `${x.los.toFixed(1)} j` : '—'}</td>
                        <td className="py-3 px-4 text-right text-gray-600">{x.pm ? money(x.pm) : '—'}</td>
                        <td className="py-3 px-4 text-right font-medium text-gray-700">{money(x.heb)}</td>
                        <td className="py-3 px-4 text-right text-gray-600">{money(x.pdj)}</td>
                        <td className="py-3 px-4 text-right text-gray-600">{money(x.extra)}</td>
                        <td className="py-3 px-4 text-right font-bold text-green-dark">{money(x.total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-extrabold text-charcoal border-t-2 border-charcoal text-xs">
                    <td colSpan={2} className="py-3 px-4 text-charcoal uppercase tracking-wider">TOTAL CONSOLIDÉ</td>
                    <td className="py-3 px-4 text-center text-charcoal">{totalStaysCount}</td>
                    <td className="py-3 px-4 text-center text-charcoal">{totalOccupantsNights}</td>
                    <td className="py-3 px-4 text-right text-charcoal">
                      {totalStaysCount ? `${(totalOccupantsNights / totalStaysCount).toFixed(1)} j` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-charcoal">
                      {totalOccupantsNights ? money(totalRevenue / totalOccupantsNights) : '—'}
                    </td>
                    <td colSpan={3} className="py-3 px-4 text-right text-charcoal font-bold">TOTAL :</td>
                    <td className="py-3 px-4 text-right text-sm text-green-dark font-black">{money(totalRevenue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 3 : PLANNING GRAPHIQUE ── */}
        {activeTab === 'calendrier' && span <= 92 && (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-charcoal flex items-center gap-2">
                <Calendar size={16} className="text-green-dark" />
                Planning d'Occupation Journalier
              </h2>
              <span className="text-xs text-gray-400">{frDate(from)} → {frDate(to)}</span>
            </div>

            <div className="overflow-x-auto">
              <div style={{ minWidth: 160 + span * 36 }}>
                {/* Dates Header */}
                <div className="flex bg-charcoal text-white">
                  <div style={{ width: 160 }} className="shrink-0 px-3 py-2 text-xs font-bold uppercase tracking-wider border-r border-white/10 flex items-center">
                    Logement
                  </div>
                  {Array.from({ length: span }, (_, i) => addDays(from, i)).map((d) => {
                    const wd = new Date(d + "T00:00:00").getDay();
                    const we = wd === 0 || wd === 6;
                    const isT = d === dateHotel;
                    return (
                      <div
                        key={d}
                        style={{ width: 36, backgroundColor: isT ? '#2D5A45' : 'transparent' }}
                        className={`shrink-0 text-center py-1 border-r border-white/10 ${isT ? 'text-green font-bold' : ''}`}
                      >
                        <div className={`text-[9px] capitalize ${we ? 'opacity-50' : ''}`}>{frDay(d)}</div>
                        <div className="text-xs font-bold">{d.slice(8)}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Rows per Unit */}
                {unitsView.map((u, ri) => {
                  const dayList = Array.from({ length: span }, (_, i) => addDays(from, i));
                  const unitFolios = folios.filter((f) => f.unitId === u.id && f.resaStatus !== 'Cancelled');

                  return (
                    <div key={u.id} className={`flex border-b border-gray-100 h-11 ${ri % 2 ? 'bg-gray-50/40' : 'bg-white'}`}>
                      <div style={{ width: 160 }} className="shrink-0 px-3 py-1 flex flex-col justify-center border-r border-gray-100 z-10">
                        <div className="text-xs font-bold truncate">{u.pmsRoomNo ? `Appt ${u.pmsRoomNo} · ` : ''}{u.nameFr}</div>
                        <div className="text-[10px] text-gray-400">{u.pmsType || ''}</div>
                      </div>

                      <div className="relative shrink-0" style={{ width: span * 36 }}>
                        {dayList.map((d, i) => {
                          const wd = new Date(d + "T00:00:00").getDay();
                          const we = wd === 0 || wd === 6;
                          return (
                            <div
                              key={d}
                              style={{ left: i * 36, width: 36 }}
                              className={`absolute top-0 h-11 border-r border-gray-100 ${we ? 'bg-black/5' : ''}`}
                            />
                          );
                        })}

                        {unitFolios.map((f) => {
                          if (f.arrival > to || f.departure < from) return null;
                          const s = f.arrival > from ? f.arrival : from;
                          const en = f.departure < winEnd ? f.departure : winEnd;
                          const off = dayDiff(from, s);
                          const w = Math.max(1, dayDiff(s, en));

                          const guestName = f.guest || `${f.nom ?? ''} ${f.prenom ?? ''}`;

                          return (
                            <div
                              key={f.id}
                              title={`${guestName} (${frDate(f.arrival)} → ${frDate(f.departure)})`}
                              style={{ left: off * 36 + 2, width: w * 36 - 4 }}
                              className="absolute top-2 h-6 rounded bg-emerald-700 text-white text-[10px] font-bold flex items-center px-1.5 whitespace-nowrap shadow-xs z-10 overflow-hidden"
                            >
                              {guestName}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
