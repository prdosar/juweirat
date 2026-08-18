'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { pmsUnits, pmsFolios, pmsConfig } from '@/lib/pms';
import { payments } from '@/lib/api';
import type { UnitDto, FolioDto, HotelConfigDto } from '@/lib/pmsTypes';
import type { PaymentDto } from '@/lib/types';
import {
  FileText, Calendar, TrendingUp, Download, Printer, ArrowUpRight,
  ArrowDownRight, Layers, DollarSign, BedDouble, Percent, Users,
  CreditCard, Search, CheckCircle2, AlertCircle, Clock, Building2,
  Filter, ChevronRight, X, Sparkles, BarChart2, ShieldAlert,
} from 'lucide-react';

// Date Helpers
const thisYear = () => new Date().getFullYear();
const thisMonth = () => new Date().toISOString().slice(0, 7);
const todayStr = () => new Date().toISOString().slice(0, 10);
const daysInMonth = (ym: string) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m, 0).getDate(); };
const monthAdd = (ym: string, n: number) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m - 1 + n, 1).toISOString().slice(0, 7); };
const monthList = (a: string, b: string) => { const o = []; let c = a, g = 0; while (c <= b && g < 60) { o.push(c); c = monthAdd(c, 1); g++; } return o; };
const frMonth = (ym: string) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }); };
const frDate = (s: string) => (s ? new Date(s + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");
const dayDiff = (a: string, b: string) => Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000);
const addDays = (s: string, n: number) => { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
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

const fPct = (n: number) => num(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " %";
const fN = (n: number, d = 0) => num(n).toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const money = (n: number) => Math.round(num(n)).toLocaleString("fr-FR") + " FCFA";

const MONTH_NAMES_FR = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sept', 'Oct', 'Nov', 'Dec'];

const activeResa = (f: FolioDto) => f.resaStatus !== "Cancelled" && f.resaStatus !== "NoShow";

export default function StatistiquesPage() {
  const nowMonth = thisMonth();
  const today = todayStr();
  const currentYear = thisYear();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'feuille' | 'previsionnel12' | 'encours' | 'mensuel'>('feuille');

  // Selected date for Feuille de journée
  const [dayDate, setDayDate] = useState<string>(today);

  // Selected year for Prévisionnel 12 mois
  const [prevYear, setPrevYear] = useState<number>(currentYear);

  // Filters for Encours & Dettes
  const [encoursSearch, setEncoursSearch] = useState<string>('');
  const [encoursFilter, setEncoursFilter] = useState<'tous' | 'debiteur' | 'solde' | 'encours'>('tous');

  // Monthly range
  const [startMonth, setStartMonth] = useState<string>(monthAdd(nowMonth, -11));
  const [endMonth, setEndMonth]     = useState<string>(nowMonth);

  // Data states
  const [config, setConfig]     = useState<HotelConfigDto | null>(null);
  const [units, setUnits]       = useState<UnitDto[]>([]);
  const [folios, setFolios]     = useState<FolioDto[]>([]);
  const [payList, setPayList]   = useState<PaymentDto[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      pmsConfig.get().catch(() => null),
      pmsUnits.getAll(),
      pmsFolios.getAll(),
      payments.getAll().catch(() => []),
    ])
      .then(([c, u, f, p]) => {
        setConfig(c);
        setUnits(u);
        setFolios(f);
        setPayList(p);
      })
      .finally(() => setLoading(false));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. FEUILLE DE JOURNÉE CALCULATIONS (Jour / Mois MTD / Année YTD & N-1)
  // ─────────────────────────────────────────────────────────────────────────────
  const dayStats = useMemo(() => {
    const totalUnits = units.length;
    const hsUnits = units.filter((u) => u.horsService).length;
    const availUnits = totalUnits - hsUnits;

    // Dates for MTD and YTD (Year N)
    const ym = dayDate.slice(0, 7);
    const mtdStart = `${ym}-01`;
    const yStart = `${dayDate.slice(0, 4)}-01-01`;

    const mtdDays = Math.max(1, dayDiff(mtdStart, dayDate) + 1);
    const ytdDays = Math.max(1, dayDiff(yStart, dayDate) + 1);

    // Dates for Year N-1
    const [curY, curM, curD] = dayDate.split('-');
    const prevYearStr = String(Number(curY) - 1);
    const dayDateNMinus1 = `${prevYearStr}-${curM}-${curD}`;
    const mtdStartNMinus1 = `${prevYearStr}-${curM}-01`;
    const yStartNMinus1 = `${prevYearStr}-01-01`;

    function computePeriod(dStart: string, dEnd: string, numDays: number) {
      const dEndExcl = addDays(dEnd, 1);
      const totalCapacity = totalUnits * numDays;
      const hsCapacity = hsUnits * numDays;
      const louablesCapacity = availUnits * numDays;

      let occupiedUnits = 0;
      let caHeb = 0;
      let caPdj = 0;
      let caDebiteur = 0;
      let caDependances = 0;
      let occupantsCount = 0;
      let pdjCount = 0;
      let rackDoubleTheorique = 0;

      // Calculate base theoretical rack price from units
      const avgBaseRate = units.reduce((acc, u) => acc + (u.tarifNuit || 35000), 0) / (totalUnits || 1);

      folios.forEach((f) => {
        if (!activeResa(f)) return;
        const nights = Math.max(0, dayDiff(f.arrival, f.departure));
        const ratePerNight = nights > 0 ? f.totalHeb / nights : (f.rate || 0);

        // Check night overlaps in [dStart, dEndExcl]
        const s = f.arrival > dStart ? f.arrival : dStart;
        const e = f.departure < dEndExcl ? f.departure : dEndExcl;
        const on = Math.max(0, dayDiff(s, e));

        if (on > 0) {
          occupiedUnits += on;
          caHeb += ratePerNight * on;
          caPdj += (f.pdjParJour || 0) * (f.pdjPrix || 5000) * on;
          occupantsCount += (f.pax || 1) * on;
          pdjCount += (f.pdjParJour || 0) * on;
          rackDoubleTheorique += (f.rate || avgBaseRate) * on;
        }

        // Extras charged during this period
        if (f.arrival >= dStart && f.arrival <= dEnd) {
          caDebiteur += f.totalDebiteur || 0;
          caDependances += f.totalDependances || 0;
        }
      });

      const caExtras = caDebiteur + caDependances;
      const caTotal = caHeb + caPdj + caExtras;
      const toLouables = louablesCapacity > 0 ? (occupiedUnits / louablesCapacity) * 100 : 0;
      const toConstruites = totalCapacity > 0 ? (occupiedUnits / totalCapacity) * 100 : 0;
      const adr = occupiedUnits > 0 ? caHeb / occupiedUnits : 0;
      const revpar = louablesCapacity > 0 ? caHeb / louablesCapacity : 0;
      const revpac = occupantsCount > 0 ? caTotal / occupantsCount : 0;
      const discountRate = rackDoubleTheorique > 0 ? ((caHeb - rackDoubleTheorique) / rackDoubleTheorique) * 100 : 0;
      const ifreq = occupiedUnits > 0 ? occupantsCount / occupiedUnits : 0;
      const captagePdj = occupantsCount > 0 ? (pdjCount / occupantsCount) * 100 : 0;

      return {
        totalCapacity,
        hsCapacity,
        louablesCapacity,
        occupiedUnits,
        toLouables,
        toConstruites,
        caHeb,
        caPdj,
        caDebiteur,
        caDependances,
        caExtras,
        caTotal,
        adr,
        revpar,
        revpac,
        rackDoubleTheorique,
        discountRate,
        occupantsCount,
        ifreq,
        pdjCount,
        captagePdj,
      };
    }

    const jourN  = computePeriod(dayDate, dayDate, 1);
    const moisN  = computePeriod(mtdStart, dayDate, mtdDays);
    const anneeN = computePeriod(yStart, dayDate, ytdDays);

    const moisN1  = computePeriod(mtdStartNMinus1, dayDateNMinus1, mtdDays);
    const anneeN1 = computePeriod(yStartNMinus1, dayDateNMinus1, ytdDays);

    // Payments synthesis on this day
    const encaissementsJour = payList
      .filter((p) => p.status === 'Completed' && p.createdAt && p.createdAt.slice(0, 10) === dayDate)
      .reduce((sum, p) => sum + p.amount, 0);

    const encaissementsMois = payList
      .filter((p) => p.status === 'Completed' && p.createdAt && p.createdAt.slice(0, 7) === ym && p.createdAt.slice(0, 10) <= dayDate)
      .reduce((sum, p) => sum + p.amount, 0);

    const encaissementsAnnee = payList
      .filter((p) => p.status === 'Completed' && p.createdAt && p.createdAt.slice(0, 4) === curY && p.createdAt.slice(0, 10) <= dayDate)
      .reduce((sum, p) => sum + p.amount, 0);

    // Balance & Situation
    const arrhesTotal = folios
      .filter((f) => !f.closed && f.arrhes > 0)
      .reduce((sum, f) => sum + f.arrhes, 0);

    const encoursSejours = folios
      .filter((f) => !f.closed && activeResa(f))
      .reduce((sum, f) => sum + (f.totalGeneral || 0), 0);

    const balanceGlobale = encoursSejours - arrhesTotal;

    return {
      dayDate,
      dayDateNMinus1,
      jourN,
      moisN,
      anneeN,
      moisN1,
      anneeN1,
      encaissementsJour,
      encaissementsMois,
      encaissementsAnnee,
      arrhesTotal,
      encoursSejours,
      balanceGlobale,
    };
  }, [units, folios, payList, dayDate]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. DÉTAIL DES 18 CHAMBRES POUR LA FEUILLE DE JOURNÉE
  // ─────────────────────────────────────────────────────────────────────────────
  const dayUnitsDetails = useMemo(() => {
    return units.map((u) => {
      const nextDay = addDays(dayDate, 1);

      // Find active stay overlapping this night
      const activeFolio = folios.find(
        (f) => activeResa(f) && f.unitId === u.id && f.arrival < nextDay && f.departure > dayDate
      );

      // Check arrival or departure today
      const isArrivalToday = folios.some((f) => activeResa(f) && f.unitId === u.id && f.arrival === dayDate);
      const isDepartureToday = folios.some((f) => activeResa(f) && f.unitId === u.id && f.departure === dayDate);

      let roomStatus: 'occupée' | 'arrivée' | 'départ' | 'disponible' | 'hors_service' = 'disponible';
      if (u.horsService) {
        roomStatus = 'hors_service';
      } else if (activeFolio) {
        roomStatus = isDepartureToday ? 'départ' : isArrivalToday ? 'arrivée' : 'occupée';
      } else if (isArrivalToday) {
        roomStatus = 'arrivée';
      }

      return {
        unit: u,
        status: roomStatus,
        folio: activeFolio || null,
      };
    });
  }, [units, folios, dayDate]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. PRÉVISIONNEL 12 MOIS CALCULATIONS (12 mois x 31 jours)
  // ─────────────────────────────────────────────────────────────────────────────
  const prev12MoisGrid = useMemo(() => {
    const activeCapacity = units.filter((u) => !u.horsService).length || 18;

    // Grid data: array of 31 days (index 0..30)
    // each day has an array of 12 numbers (for each month Jan..Dec)
    const grid: number[][] = Array.from({ length: 31 }, () => Array(12).fill(0));
    const monthTotals: number[] = Array(12).fill(0);
    const monthTO: number[] = Array(12).fill(0);

    for (let m = 0; m < 12; m++) {
      const monthStr = `${prevYear}-${String(m + 1).padStart(2, '0')}`;
      const totalDays = daysInMonth(monthStr);
      let mNights = 0;

      for (let d = 1; d <= totalDays; d++) {
        const currentDate = `${monthStr}-${String(d).padStart(2, '0')}`;
        const nextDate = addDays(currentDate, 1);

        // Count active rooms occupied for this night
        const count = folios.filter(
          (f) => activeResa(f) && f.arrival < nextDate && f.departure > currentDate
        ).length;

        grid[d - 1][m] = count;
        mNights += count;
      }

      monthTotals[m] = mNights;
      const possibleNights = activeCapacity * totalDays;
      monthTO[m] = possibleNights > 0 ? (mNights / possibleNights) * 100 : 0;
    }

    return { grid, monthTotals, monthTO, activeCapacity };
  }, [units, folios, prevYear]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. REPRISE DE L'EXISTANT : ENCOURS & RÈGLEMENTS DES SÉJOURS (QUI DOIT DE L'ARGENT)
  // ─────────────────────────────────────────────────────────────────────────────
  const encoursList = useMemo(() => {
    const q = encoursSearch.trim().toLowerCase();

    return folios.filter((f) => {
      if (f.resaStatus === 'Cancelled') return false;

      // Filter state
      if (encoursFilter === 'debiteur' && f.solde <= 0) return false;
      if (encoursFilter === 'solde' && f.solde > 0) return false;
      if (encoursFilter === 'encours' && f.closed) return false;

      // Search query
      if (q) {
        const guest = (f.guest || `${f.nom ?? ''} ${f.prenom ?? ''}`).toLowerCase();
        const numFolio = f.number.toLowerCase();
        const unit = f.unitLabel.toLowerCase();
        const soc = (f.societe || '').toLowerCase();
        const phone = (f.guestPhone || f.telephone || '').toLowerCase();

        return (
          guest.includes(q) ||
          numFolio.includes(q) ||
          unit.includes(q) ||
          soc.includes(q) ||
          phone.includes(q)
        );
      }

      return true;
    }).sort((a, b) => {
      // Sort with highest debt first
      if (b.solde !== a.solde) return b.solde - a.solde;
      return a.arrival < b.arrival ? 1 : -1;
    });
  }, [folios, encoursSearch, encoursFilter]);

  const totalFactureGlobal = useMemo(() => folios.reduce((s, f) => s + (f.totalGeneral || 0), 0), [folios]);
  const totalEncaisseGlobal = useMemo(() => folios.reduce((s, f) => s + (f.paid + f.arrhes), 0), [folios]);
  const totalSoldeDebiteur = useMemo(() => folios.reduce((s, f) => s + (f.solde || 0), 0), [folios]);
  const tauxRecouvrement = totalFactureGlobal > 0 ? (totalEncaisseGlobal / totalFactureGlobal) * 100 : 0;

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. VUE MENSUELLE & HISTORIQUE
  // ─────────────────────────────────────────────────────────────────────────────
  const monthlyStats = useMemo(() => {
    const months = monthList(startMonth, endMonth);
    const activeUnitsCount = units.filter((u) => !u.horsService).length || 18;

    return months.map((m) => {
      const d0 = `${m}-01`;
      const d1 = `${monthAdd(m, 1)}-01`;
      const dim = daysInMonth(m);
      const availNights = activeUnitsCount * dim;

      let nightsSold = 0;
      let caHeb = 0;
      let caPdj = 0;
      let caExtras = 0;
      let paxCount = 0;

      folios.forEach((f) => {
        if (!activeResa(f)) return;
        const nights = Math.max(0, dayDiff(f.arrival, f.departure));
        const ratePerNight = nights > 0 ? f.totalHeb / nights : (f.rate || 0);

        const s = f.arrival > d0 ? f.arrival : d0;
        const e = f.departure < d1 ? f.departure : d1;
        const on = Math.max(0, dayDiff(s, e));

        if (on > 0) {
          nightsSold += on;
          caHeb += ratePerNight * on;
          caPdj += (f.pdjParJour || 0) * (f.pdjPrix || 5000) * on;
          paxCount += (f.pax || 1) * on;
        }

        if (f.arrival >= d0 && f.arrival < d1) {
          caExtras += (f.totalDebiteur || 0) + (f.totalDependances || 0);
        }
      });

      const caTotal = caHeb + caPdj + caExtras;
      const to = availNights > 0 ? (nightsSold / availNights) * 100 : 0;
      const adr = nightsSold > 0 ? caHeb / nightsSold : 0;
      const revpar = availNights > 0 ? caHeb / availNights : 0;

      return {
        ym: m,
        availNights,
        nightsSold,
        to,
        caHeb,
        caPdj,
        caExtras,
        caTotal,
        adr,
        revpar,
        paxCount,
      };
    });
  }, [units, folios, startMonth, endMonth]);

  // CSV EXPORTS
  const exportFeuilleCSV = () => {
    downloadCSV(`feuille_journee_${dayDate}.csv`, [
      ["RÉSIDENCE JUWEIRAT — FEUILLE DE JOURNÉE (TOUTE TAXE COMPRISE)", `Date : ${frDate(dayDate)}`],
      ["Code ERP : 81362.H2059", "Devise : FCFA", `Généré le : ${new Date().toLocaleString('fr-FR')}`],
      [],
      ["INDICATEURS OPÉRATIONNELS", `Jour J (${frDate(dayDate)})`, `Cumul Mois (${dayDate.slice(0, 7)})`, `Cumul Année (${dayDate.slice(0, 4)})`, `Mois N-1 (${dayStats.dayDateNMinus1.slice(0, 7)})`, `Année N-1 (${dayStats.dayDateNMinus1.slice(0, 4)})`],
      ["Chambres construites (A)", dayStats.jourN.totalCapacity, dayStats.moisN.totalCapacity, dayStats.anneeN.totalCapacity, dayStats.moisN1.totalCapacity, dayStats.anneeN1.totalCapacity],
      ["dont Chambres Hors Service (B)", dayStats.jourN.hsCapacity, dayStats.moisN.hsCapacity, dayStats.anneeN.hsCapacity, dayStats.moisN1.hsCapacity, dayStats.anneeN1.hsCapacity],
      ["Chambres louables (A - B)", dayStats.jourN.louablesCapacity, dayStats.moisN.louablesCapacity, dayStats.anneeN.louablesCapacity, dayStats.moisN1.louablesCapacity, dayStats.anneeN1.louablesCapacity],
      ["Chambres facturées / occupées (D)", dayStats.jourN.occupiedUnits, dayStats.moisN.occupiedUnits, dayStats.anneeN.occupiedUnits, dayStats.moisN1.occupiedUnits, dayStats.anneeN1.occupiedUnits],
      ["Taux d'occupation (D / (A-B))", fPct(dayStats.jourN.toLouables), fPct(dayStats.moisN.toLouables), fPct(dayStats.anneeN.toLouables), fPct(dayStats.moisN1.toLouables), fPct(dayStats.anneeN1.toLouables)],
      ["CA Hébergement TTC (F)", Math.round(dayStats.jourN.caHeb), Math.round(dayStats.moisN.caHeb), Math.round(dayStats.anneeN.caHeb), Math.round(dayStats.moisN1.caHeb), Math.round(dayStats.anneeN1.caHeb)],
      ["Prix moyen (ADR = F / D)", Math.round(dayStats.jourN.adr), Math.round(dayStats.moisN.adr), Math.round(dayStats.anneeN.adr), Math.round(dayStats.moisN1.adr), Math.round(dayStats.anneeN1.adr)],
      ["REVPAR (F / (A-B))", Math.round(dayStats.jourN.revpar), Math.round(dayStats.moisN.revpar), Math.round(dayStats.anneeN.revpar), Math.round(dayStats.moisN1.revpar), Math.round(dayStats.anneeN1.revpar)],
      ["CA Théorique TTC (I)", Math.round(dayStats.jourN.rackDoubleTheorique), Math.round(dayStats.moisN.rackDoubleTheorique), Math.round(dayStats.anneeN.rackDoubleTheorique), Math.round(dayStats.moisN1.rackDoubleTheorique), Math.round(dayStats.anneeN1.rackDoubleTheorique)],
      ["Taux de discount (%)", fPct(dayStats.jourN.discountRate), fPct(dayStats.moisN.discountRate), fPct(dayStats.anneeN.discountRate), fPct(dayStats.moisN1.discountRate), fPct(dayStats.anneeN1.discountRate)],
      ["Nombre d'occupants (G)", dayStats.jourN.occupantsCount, dayStats.moisN.occupantsCount, dayStats.anneeN.occupantsCount, dayStats.moisN1.occupantsCount, dayStats.anneeN1.occupantsCount],
      ["Indice de fréquentation (G / D)", dayStats.jourN.ifreq.toFixed(2), dayStats.moisN.ifreq.toFixed(2), dayStats.anneeN.ifreq.toFixed(2), dayStats.moisN1.ifreq.toFixed(2), dayStats.anneeN1.ifreq.toFixed(2)],
      [],
      ["SYNTHÈSE CHIFFRE D'AFFAIRES", `Jour J (${frDate(dayDate)})`, `Cumul Mois (${dayDate.slice(0, 7)})`, `Cumul Année (${dayDate.slice(0, 4)})`, `Mois N-1`, `Année N-1`],
      ["Hébergement", Math.round(dayStats.jourN.caHeb), Math.round(dayStats.moisN.caHeb), Math.round(dayStats.anneeN.caHeb), Math.round(dayStats.moisN1.caHeb), Math.round(dayStats.anneeN1.caHeb)],
      ["Petits Déjeuners", Math.round(dayStats.jourN.caPdj), Math.round(dayStats.moisN.caPdj), Math.round(dayStats.anneeN.caPdj), Math.round(dayStats.moisN1.caPdj), Math.round(dayStats.anneeN1.caPdj)],
      ["Extras & Débiteurs Divers", Math.round(dayStats.jourN.caDebiteur), Math.round(dayStats.moisN.caDebiteur), Math.round(dayStats.anneeN.caDebiteur), Math.round(dayStats.moisN1.caDebiteur), Math.round(dayStats.anneeN1.caDebiteur)],
      ["Dépendances & Services", Math.round(dayStats.jourN.caDependances), Math.round(dayStats.moisN.caDependances), Math.round(dayStats.anneeN.caDependances), Math.round(dayStats.moisN1.caDependances), Math.round(dayStats.anneeN1.caDependances)],
      ["TOTAL CA TTC (E)", Math.round(dayStats.jourN.caTotal), Math.round(dayStats.moisN.caTotal), Math.round(dayStats.anneeN.caTotal), Math.round(dayStats.moisN1.caTotal), Math.round(dayStats.anneeN1.caTotal)],
      ["REVPAC (E / G)", Math.round(dayStats.jourN.revpac), Math.round(dayStats.moisN.revpac), Math.round(dayStats.anneeN.revpac), Math.round(dayStats.moisN1.revpac), Math.round(dayStats.anneeN1.revpac)],
      [],
      ["DÉTAIL DES CHAMBRES DU JOUR", "Statut", "N° Folio", "Occupant", "Arrivée", "Départ", "Tarif Jour", "Total Séjour", "Solde Restant"],
      ...dayUnitsDetails.map(({ unit, status, folio }) => [
        `Appt ${unit.pmsRoomNo || unit.id} — ${unit.nameFr}`,
        status.toUpperCase(),
        folio?.number || '—',
        folio ? (folio.guest || `${folio.nom ?? ''} ${folio.prenom ?? ''}`) : '—',
        folio ? frDate(folio.arrival) : '—',
        folio ? frDate(folio.departure) : '—',
        Math.round(folio?.rate || unit.tarifNuit),
        Math.round(folio?.totalGeneral || 0),
        Math.round(folio?.solde || 0),
      ]),
    ]);
  };

  const export12MoisCSV = () => {
    downloadCSV(`previsionnel_12_mois_${prevYear}.csv`, [
      [`RÉSIDENCE JUWEIRAT — PRÉVISIONNEL OCCUPATIONS DES CHAMBRES (${prevYear})`],
      ["Jour", ...MONTH_NAMES_FR],
      ...prev12MoisGrid.grid.map((row, dIdx) => [dIdx + 1, ...row]),
      ["Total Nuitées", ...prev12MoisGrid.monthTotals],
      ["Taux d'Occupation (%)", ...prev12MoisGrid.monthTO.map((to) => to.toFixed(2).replace('.', ','))],
    ]);
  };

  const exportEncoursCSV = () => {
    downloadCSV(`recapitulatif_sejours_et_dettes.csv`, [
      ["RÉSIDENCE JUWEIRAT — RÉCAPITULATIF DES SÉJOURS & ÉTAT DES RÈGLEMENTS"],
      ["Généré le : " + new Date().toLocaleString('fr-FR')],
      [],
      ["Folio", "Logement", "Client / Débiteur", "Société", "Téléphone", "Arrivée", "Départ", "Nuits", "Total Facturé", "Total Encaissé", "Solde Restant Dû", "Statut"],
      ...encoursList.map((f) => [
        f.number,
        f.unitLabel,
        f.guest || `${f.nom ?? ''} ${f.prenom ?? ''}`,
        f.societe || '—',
        f.guestPhone || f.telephone || '—',
        frDate(f.arrival),
        frDate(f.departure),
        f.nights,
        Math.round(f.totalGeneral),
        Math.round(f.paid + f.arrhes),
        Math.round(f.solde),
        f.resaStatus,
      ]),
      [],
      ["TOTAL CONSOLIDÉ", "", "", "", "", "", "", "", Math.round(totalFactureGlobal), Math.round(totalEncaisseGlobal), Math.round(totalSoldeDebiteur), ""],
    ]);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-full">
        <Header title="Statistiques & Feuille de Journée" />
        <div className="flex-1 flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-green/30 border-t-green rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Statistiques & Feuille de Journée" />
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">

        {/* Top Header Card */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-green-dark font-extrabold mb-1">
              PMS · Pilotage Stratégique & Contrôle de Gestion
            </div>
            <h1 className="text-2xl font-black text-charcoal flex items-center gap-2">
              Statistiques & Feuille de Journée
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Résidence Juweirat · Code ERP : 81362.H2059 · Devise : {config?.currencyCode || 'FCFA'} · {units.length} Chambres
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('feuille')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'feuille'
                  ? 'bg-white text-green shadow-xs'
                  : 'text-gray-500 hover:text-charcoal'
              }`}
            >
              <FileText size={15} /> Feuille de Journée
            </button>
            <button
              onClick={() => setActiveTab('previsionnel12')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'previsionnel12'
                  ? 'bg-white text-green shadow-xs'
                  : 'text-gray-500 hover:text-charcoal'
              }`}
            >
              <Calendar size={15} /> Prévisionnel 12 Mois
            </button>
            <button
              onClick={() => setActiveTab('encours')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'encours'
                  ? 'bg-white text-green shadow-xs'
                  : 'text-gray-500 hover:text-charcoal'
              }`}
            >
              <CreditCard size={15} /> Règlements & Dettes
            </button>
            <button
              onClick={() => setActiveTab('mensuel')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'mensuel'
                  ? 'bg-white text-green shadow-xs'
                  : 'text-gray-500 hover:text-charcoal'
              }`}
            >
              <TrendingUp size={15} /> Vue Mensuelle
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* ── ONGLET 1 : FEUILLE DE JOURNÉE (Conforme 11.08.2026 feuille de journée.md) ── */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'feuille' && (
          <div className="space-y-6">
            {/* Control toolbar */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Sélectionner la date de la journée
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={dayDate}
                      onChange={(e) => setDayDate(e.target.value)}
                      className="px-3.5 py-2 border border-gray-200 rounded-lg text-xs font-semibold bg-gray-50 focus:ring-2 focus:ring-green/20 focus:border-green outline-hidden"
                    />
                    <button
                      onClick={() => setDayDate(today)}
                      className="px-3 py-2 text-xs font-bold text-green-dark bg-green/10 hover:bg-green/20 rounded-lg transition-colors"
                    >
                      Aujourd'hui
                    </button>
                    <button
                      onClick={() => setDayDate(addDays(today, -1))}
                      className="px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Hier
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={exportFeuilleCSV}
                  className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-charcoal px-3.5 py-2 text-xs font-semibold rounded-lg hover:bg-gray-50 shadow-xs transition-colors"
                >
                  <Download size={14} className="text-green" /> Exporter Feuille CSV
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 bg-charcoal text-white px-3.5 py-2 text-xs font-semibold rounded-lg hover:bg-charcoal-800 shadow-xs transition-colors"
                >
                  <Printer size={14} /> Imprimer
                </button>
              </div>
            </div>

            {/* Quick KPIs Day */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-xs">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Chambres Occupées (Jour)</div>
                <div className="text-xl font-black text-green-dark">
                  {dayStats.jourN.occupiedUnits} / {dayStats.jourN.louablesCapacity}
                </div>
                <div className="text-[11px] text-gray-400 mt-1 font-semibold">Taux : {fPct(dayStats.jourN.toLouables)}</div>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-xs">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">CA Hébergement (Jour)</div>
                <div className="text-xl font-black text-charcoal">{money(dayStats.jourN.caHeb)}</div>
                <div className="text-[11px] text-gray-400 mt-1 font-semibold">ADR : {money(dayStats.jourN.adr)}</div>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-xs">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">CA Petits Déjeuners</div>
                <div className="text-xl font-black text-charcoal">{money(dayStats.jourN.caPdj)}</div>
                <div className="text-[11px] text-gray-400 mt-1 font-semibold">{dayStats.jourN.pdjCount} PDJ servis</div>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-xs">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">CA Total Journée (E)</div>
                <div className="text-xl font-black text-green-dark">{money(dayStats.jourN.caTotal)}</div>
                <div className="text-[11px] text-gray-400 mt-1 font-semibold">RevPAR : {money(dayStats.jourN.revpar)}</div>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-xs">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cumul Mois (MTD)</div>
                <div className="text-xl font-black text-green-dark">{money(dayStats.moisN.caTotal)}</div>
                <div className="text-[11px] text-gray-400 mt-1 font-semibold">{dayStats.moisN.occupiedUnits} nuits louées</div>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-xs">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cumul Année (YTD)</div>
                <div className="text-xl font-black text-charcoal">{money(dayStats.anneeN.caTotal)}</div>
                <div className="text-[11px] text-gray-400 mt-1 font-semibold">TO : {fPct(dayStats.anneeN.toLouables)}</div>
              </div>
            </div>

            {/* 1. TABLEAU DES INDICATEURS OPÉRATIONNELS (Modèle Feuille de Journée) */}
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-xs">
              <div className="p-4 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-charcoal uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp size={16} className="text-green-dark" />
                    Indicateurs d'Activité & Ratios Hôteliers (Jour / Mois / Année vs N-1)
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Rapport de clôture pour le {frDate(dayDate)} comparé aux exercices N et N-1
                  </p>
                </div>
                <span className="text-[11px] font-bold text-green-dark bg-green/10 px-3 py-1 rounded-full">
                  Journée du {frDate(dayDate)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-charcoal text-white text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Indicateurs</th>
                      <th className="py-3 px-4 text-right bg-charcoal-800">Jour J ({frDate(dayDate)})</th>
                      <th className="py-3 px-4 text-right">Mois ({dayDate.slice(0, 7)})</th>
                      <th className="py-3 px-4 text-right">Année ({dayDate.slice(0, 4)})</th>
                      <th className="py-3 px-4 text-right border-l border-white/20">Mois N-1 ({dayStats.dayDateNMinus1.slice(0, 7)})</th>
                      <th className="py-3 px-4 text-right">Année N-1 ({dayStats.dayDateNMinus1.slice(0, 4)})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="hover:bg-gray-50/60">
                      <td className="py-2.5 px-4 font-semibold text-charcoal">Chambres construites (A)</td>
                      <td className="py-2.5 px-4 text-right font-bold text-charcoal bg-gray-50/50">{dayStats.jourN.totalCapacity}</td>
                      <td className="py-2.5 px-4 text-right font-medium text-gray-600">{dayStats.moisN.totalCapacity}</td>
                      <td className="py-2.5 px-4 text-right font-medium text-gray-600">{dayStats.anneeN.totalCapacity}</td>
                      <td className="py-2.5 px-4 text-right text-gray-500 border-l border-gray-100">{dayStats.moisN1.totalCapacity}</td>
                      <td className="py-2.5 px-4 text-right text-gray-500">{dayStats.anneeN1.totalCapacity}</td>
                    </tr>
                    <tr className="hover:bg-gray-50/60">
                      <td className="py-2.5 px-4 font-semibold text-charcoal">dont Chambres Hors service (B)</td>
                      <td className="py-2.5 px-4 text-right font-bold text-amber-600 bg-gray-50/50">{dayStats.jourN.hsCapacity}</td>
                      <td className="py-2.5 px-4 text-right font-medium text-amber-600">{dayStats.moisN.hsCapacity}</td>
                      <td className="py-2.5 px-4 text-right font-medium text-amber-600">{dayStats.anneeN.hsCapacity}</td>
                      <td className="py-2.5 px-4 text-right text-gray-500 border-l border-gray-100">{dayStats.moisN1.hsCapacity}</td>
                      <td className="py-2.5 px-4 text-right text-gray-500">{dayStats.anneeN1.hsCapacity}</td>
                    </tr>
                    <tr className="hover:bg-gray-50/60 font-semibold">
                      <td className="py-2.5 px-4 text-charcoal">Chambres louables (A - B)</td>
                      <td className="py-2.5 px-4 text-right font-bold text-charcoal bg-gray-50/50">{dayStats.jourN.louablesCapacity}</td>
                      <td className="py-2.5 px-4 text-right font-medium text-gray-700">{dayStats.moisN.louablesCapacity}</td>
                      <td className="py-2.5 px-4 text-right font-medium text-gray-700">{dayStats.anneeN.louablesCapacity}</td>
                      <td className="py-2.5 px-4 text-right text-gray-500 border-l border-gray-100">{dayStats.moisN1.louablesCapacity}</td>
                      <td className="py-2.5 px-4 text-right text-gray-500">{dayStats.anneeN1.louablesCapacity}</td>
                    </tr>
                    <tr className="hover:bg-gray-50/60">
                      <td className="py-2.5 px-4 font-semibold text-charcoal">Chambres facturées / occupées (D)</td>
                      <td className="py-2.5 px-4 text-right font-bold text-green-dark bg-gray-50/50">{dayStats.jourN.occupiedUnits}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-green-dark">{dayStats.moisN.occupiedUnits}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-green-dark">{dayStats.anneeN.occupiedUnits}</td>
                      <td className="py-2.5 px-4 text-right text-gray-500 border-l border-gray-100">{dayStats.moisN1.occupiedUnits}</td>
                      <td className="py-2.5 px-4 text-right text-gray-500">{dayStats.anneeN1.occupiedUnits}</td>
                    </tr>
                    <tr className="hover:bg-green/5 bg-green/5 font-bold">
                      <td className="py-2.5 px-4 text-green-dark">Taux d'occupation (D / (A-B))</td>
                      <td className="py-2.5 px-4 text-right font-black text-green-dark bg-green/10">{fPct(dayStats.jourN.toLouables)}</td>
                      <td className="py-2.5 px-4 text-right text-green-dark">{fPct(dayStats.moisN.toLouables)}</td>
                      <td className="py-2.5 px-4 text-right text-green-dark">{fPct(dayStats.anneeN.toLouables)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-600 border-l border-gray-200">{fPct(dayStats.moisN1.toLouables)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-600">{fPct(dayStats.anneeN1.toLouables)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50/60">
                      <td className="py-2.5 px-4 font-semibold text-charcoal">CA Hébergement TTC (F)</td>
                      <td className="py-2.5 px-4 text-right font-bold text-charcoal bg-gray-50/50">{money(dayStats.jourN.caHeb)}</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-charcoal">{money(dayStats.moisN.caHeb)}</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-charcoal">{money(dayStats.anneeN.caHeb)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-500 border-l border-gray-100">{money(dayStats.moisN1.caHeb)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-500">{money(dayStats.anneeN1.caHeb)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50/60">
                      <td className="py-2.5 px-4 font-semibold text-charcoal">Prix moyen (ADR = F / D)</td>
                      <td className="py-2.5 px-4 text-right font-bold text-charcoal bg-gray-50/50">{money(dayStats.jourN.adr)}</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-charcoal">{money(dayStats.moisN.adr)}</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-charcoal">{money(dayStats.anneeN.adr)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-500 border-l border-gray-100">{money(dayStats.moisN1.adr)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-500">{money(dayStats.anneeN1.adr)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50/60">
                      <td className="py-2.5 px-4 font-semibold text-charcoal">REVPAR (F / (A-B))</td>
                      <td className="py-2.5 px-4 text-right font-bold text-gold bg-gray-50/50">{money(dayStats.jourN.revpar)}</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-gold">{money(dayStats.moisN.revpar)}</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-gold">{money(dayStats.anneeN.revpar)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-500 border-l border-gray-100">{money(dayStats.moisN1.revpar)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-500">{money(dayStats.anneeN1.revpar)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50/60">
                      <td className="py-2.5 px-4 font-semibold text-charcoal">CA Théorique TTC (I)</td>
                      <td className="py-2.5 px-4 text-right text-gray-600 bg-gray-50/50">{money(dayStats.jourN.rackDoubleTheorique)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-600">{money(dayStats.moisN.rackDoubleTheorique)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-600">{money(dayStats.anneeN.rackDoubleTheorique)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-500 border-l border-gray-100">{money(dayStats.moisN1.rackDoubleTheorique)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-500">{money(dayStats.anneeN1.rackDoubleTheorique)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50/60">
                      <td className="py-2.5 px-4 font-semibold text-charcoal">Taux de discount (%)</td>
                      <td className="py-2.5 px-4 text-right text-gray-600 bg-gray-50/50">{fPct(dayStats.jourN.discountRate)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-600">{fPct(dayStats.moisN.discountRate)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-600">{fPct(dayStats.anneeN.discountRate)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-500 border-l border-gray-100">{fPct(dayStats.moisN1.discountRate)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-500">{fPct(dayStats.anneeN1.discountRate)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50/60">
                      <td className="py-2.5 px-4 font-semibold text-charcoal">Nombre d'occupants (G)</td>
                      <td className="py-2.5 px-4 text-right font-bold text-charcoal bg-gray-50/50">{dayStats.jourN.occupantsCount}</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-charcoal">{dayStats.moisN.occupantsCount}</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-charcoal">{dayStats.anneeN.occupantsCount}</td>
                      <td className="py-2.5 px-4 text-right text-gray-500 border-l border-gray-100">{dayStats.moisN1.occupantsCount}</td>
                      <td className="py-2.5 px-4 text-right text-gray-500">{dayStats.anneeN1.occupantsCount}</td>
                    </tr>
                    <tr className="hover:bg-gray-50/60">
                      <td className="py-2.5 px-4 font-semibold text-charcoal">Indice de fréquentation (G / D)</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-gray-700 bg-gray-50/50">{dayStats.jourN.ifreq.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-gray-700">{dayStats.moisN.ifreq.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-gray-700">{dayStats.anneeN.ifreq.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-500 border-l border-gray-100">{dayStats.moisN1.ifreq.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-500">{dayStats.anneeN1.ifreq.toFixed(2)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50/60">
                      <td className="py-2.5 px-4 font-semibold text-charcoal">PDJ vendus / Taux captage</td>
                      <td className="py-2.5 px-4 text-right text-gray-700 bg-gray-50/50">{dayStats.jourN.pdjCount} ({fPct(dayStats.jourN.captagePdj)})</td>
                      <td className="py-2.5 px-4 text-right text-gray-700">{dayStats.moisN.pdjCount} ({fPct(dayStats.moisN.captagePdj)})</td>
                      <td className="py-2.5 px-4 text-right text-gray-700">{dayStats.anneeN.pdjCount} ({fPct(dayStats.anneeN.captagePdj)})</td>
                      <td className="py-2.5 px-4 text-right text-gray-500 border-l border-gray-100">{dayStats.moisN1.pdjCount} ({fPct(dayStats.moisN1.captagePdj)})</td>
                      <td className="py-2.5 px-4 text-right text-gray-500">{dayStats.anneeN1.pdjCount} ({fPct(dayStats.anneeN1.captagePdj)})</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. SYNTHÈSE DU CHIFFRE D'AFFAIRES & ENCAISSEMENTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Synthèse CA */}
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-xs">
                <div className="p-4 bg-gray-50/60 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider">
                    Synthèse Chiffre d'Affaires
                  </h3>
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600 text-[10.5px] font-bold uppercase">
                      <th className="py-2.5 px-4">Poste de Revenu</th>
                      <th className="py-2.5 px-4 text-right">Jour J</th>
                      <th className="py-2.5 px-4 text-right">Mois MTD</th>
                      <th className="py-2.5 px-4 text-right">Année YTD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-charcoal">Hébergement</td>
                      <td className="py-2.5 px-4 text-right font-bold text-charcoal">{money(dayStats.jourN.caHeb)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-700">{money(dayStats.moisN.caHeb)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-700">{money(dayStats.anneeN.caHeb)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-charcoal">Petits Déjeuners</td>
                      <td className="py-2.5 px-4 text-right font-bold text-charcoal">{money(dayStats.jourN.caPdj)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-700">{money(dayStats.moisN.caPdj)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-700">{money(dayStats.anneeN.caPdj)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-charcoal">Débiteurs & Extras</td>
                      <td className="py-2.5 px-4 text-right font-bold text-charcoal">{money(dayStats.jourN.caDebiteur)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-700">{money(dayStats.moisN.caDebiteur)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-700">{money(dayStats.anneeN.caDebiteur)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-charcoal">Dépendances & Services</td>
                      <td className="py-2.5 px-4 text-right font-bold text-charcoal">{money(dayStats.jourN.caDependances)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-700">{money(dayStats.moisN.caDependances)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-700">{money(dayStats.anneeN.caDependances)}</td>
                    </tr>
                    <tr className="bg-green/10 font-extrabold text-charcoal border-t-2 border-green">
                      <td className="py-3 px-4 uppercase text-green-dark">Total CA TTC (E)</td>
                      <td className="py-3 px-4 text-right text-sm text-green-dark font-black">{money(dayStats.jourN.caTotal)}</td>
                      <td className="py-3 px-4 text-right text-sm text-green-dark font-black">{money(dayStats.moisN.caTotal)}</td>
                      <td className="py-3 px-4 text-right text-sm text-green-dark font-black">{money(dayStats.anneeN.caTotal)}</td>
                    </tr>
                    <tr className="bg-gray-50 font-bold">
                      <td className="py-2.5 px-4 text-charcoal">REVPAC (E / G)</td>
                      <td className="py-2.5 px-4 text-right text-gold font-extrabold">{money(dayStats.jourN.revpac)}</td>
                      <td className="py-2.5 px-4 text-right text-gold font-extrabold">{money(dayStats.moisN.revpac)}</td>
                      <td className="py-2.5 px-4 text-right text-gold font-extrabold">{money(dayStats.anneeN.revpac)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Synthèse Encaissements & Balance */}
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-xs space-y-4 p-4">
                <div>
                  <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider mb-2">
                    Encaissements & Situation Journalière
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Encaissements Jour</p>
                    <p className="text-base font-black text-green-dark mt-1">{money(dayStats.encaissementsJour)}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Encaissements Mois</p>
                    <p className="text-base font-black text-charcoal mt-1">{money(dayStats.encaissementsMois)}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Encaissements Année</p>
                    <p className="text-base font-black text-charcoal mt-1">{money(dayStats.encaissementsAnnee)}</p>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1">
                    <span className="font-semibold text-gray-600">Arrhes & Acomptes en compte :</span>
                    <strong className="text-charcoal font-bold">{money(dayStats.arrhesTotal)}</strong>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="font-semibold text-gray-600">Encours Séjours en cours :</span>
                    <strong className="text-charcoal font-bold">{money(dayStats.encoursSejours)}</strong>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t border-dashed border-gray-200 bg-gray-50 px-3 rounded-lg">
                    <span className="font-bold text-charcoal">Total Balance Situation Journalière :</span>
                    <strong className="text-sm font-black text-green-dark">{money(dayStats.balanceGlobale)}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. TABLEAU DÉTAILLÉ DE TOUTES LES 18 CHAMBRES DE CETTE JOURNÉE */}
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-xs">
              <div className="p-4 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider flex items-center gap-2">
                    <BedDouble size={16} className="text-green-dark" />
                    État Opérationnel des {units.length} Chambres pour le {frDate(dayDate)}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Vue exhaustive de l'occupation, des arrivées/départs et des soldes financiers pour chaque logement
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" /> Occupée
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    <div className="w-2 h-2 rounded-full bg-blue-500" /> Arrivée
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                    <div className="w-2 h-2 rounded-full bg-amber-500" /> Départ
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                    <div className="w-2 h-2 rounded-full bg-gray-400" /> Libre
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-500 text-[10.5px] uppercase font-bold tracking-wider">
                      <th className="py-3 px-4">Chambre</th>
                      <th className="py-3 px-4">Type / Gamme</th>
                      <th className="py-3 px-4 text-center">Statut du Jour</th>
                      <th className="py-3 px-4">Occupant / Client</th>
                      <th className="py-3 px-4">Période du Séjour</th>
                      <th className="py-3 px-4 text-right">Tarif Jour</th>
                      <th className="py-3 px-4 text-right">Montant Total</th>
                      <th className="py-3 px-4 text-right">Solde Dû</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dayUnitsDetails.map(({ unit, status, folio }) => {
                      const guestName = folio ? (folio.guest || [folio.prenom, folio.nom].filter(Boolean).join(' ') || 'Client sans nom') : '—';

                      return (
                        <tr key={unit.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-3 px-4 font-bold text-charcoal">
                            {unit.pmsRoomNo ? `Appt ${unit.pmsRoomNo} — ` : ''}{unit.nameFr}
                          </td>
                          <td className="py-3 px-4 text-gray-500">
                            {unit.pmsType || 'Logement'}{unit.pmsGamme ? ` · ${unit.pmsGamme}` : ''}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {status === 'hors_service' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                                Hors Service
                              </span>
                            )}
                            {status === 'occupée' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Occupée
                              </span>
                            )}
                            {status === 'arrivée' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                Arrivée ce jour
                              </span>
                            )}
                            {status === 'départ' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                Départ ce jour
                              </span>
                            )}
                            {status === 'disponible' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                                Vacante / Libre
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {folio ? (
                              <div>
                                <Link
                                  href={`/pms/folios/${folio.id}`}
                                  className="font-bold text-charcoal hover:text-green-dark transition-colors"
                                >
                                  {guestName}
                                </Link>
                                <div className="text-[10px] text-gray-400 font-mono">
                                  Folio : {folio.number}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">Aucun occupant</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                            {folio ? (
                              <span>
                                {frDate(folio.arrival)} ➔ {frDate(folio.departure)} ({folio.nights}n)
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-gray-700">
                            {money(folio?.rate || unit.tarifNuit)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-charcoal">
                            {folio ? money(folio.totalGeneral) : '—'}
                          </td>
                          <td className={`py-3 px-4 text-right font-bold ${folio && folio.solde > 0 ? 'text-amber-600' : 'text-green-dark'}`}>
                            {folio ? (folio.solde > 0 ? money(folio.solde) : 'Soldé ✓') : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* ── ONGLET 2 : PRÉVISIONNEL 12 MOIS (Conforme 11.08.2026 12 mois.md) ── */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'previsionnel12' && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-charcoal m-0 flex items-center gap-2">
                  <Calendar size={18} className="text-green-dark" />
                  Prévisionnel d'Occupation des Chambres sur 12 Mois
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Grille journalière complète du 1er au 31 pour chaque mois de l'année {prevYear}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Année :</label>
                  <select
                    value={prevYear}
                    onChange={(e) => setPrevYear(Number(e.target.value))}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold bg-white focus:ring-2 focus:ring-green/20 focus:border-green outline-hidden cursor-pointer"
                  >
                    {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={export12MoisCSV}
                  className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-charcoal px-3.5 py-1.5 text-xs font-semibold rounded-lg hover:bg-gray-50 shadow-xs transition-colors"
                >
                  <Download size={14} className="text-green" /> Exporter Matrice CSV
                </button>
              </div>
            </div>

            {/* Matrix 12 Months Grid */}
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs border-collapse">
                  <thead>
                    <tr className="bg-charcoal text-white text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3 border-r border-white/10 w-16">Date</th>
                      {MONTH_NAMES_FR.map((mName, mIdx) => (
                        <th key={mIdx} className="py-2.5 px-3 border-r border-white/10">
                          {mName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium font-mono text-xs">
                    {prev12MoisGrid.grid.map((row, dIdx) => {
                      const dayNumber = dIdx + 1;
                      return (
                        <tr key={dayNumber} className={dIdx % 2 ? 'bg-gray-50/40' : 'bg-white'}>
                          <td className="py-1.5 px-3 font-bold text-charcoal bg-gray-100/70 border-r border-gray-200">
                            {dayNumber}
                          </td>
                          {row.map((val, mIdx) => {
                            const monthStr = `${prevYear}-${String(mIdx + 1).padStart(2, '0')}`;
                            const maxDays = daysInMonth(monthStr);

                            if (dayNumber > maxDays) {
                              return (
                                <td key={mIdx} className="py-1.5 px-3 text-gray-300 bg-gray-50/50 border-r border-gray-100">
                                  —
                                </td>
                              );
                            }

                            // Dynamic cell styling based on occupancy
                            const isHigh = val >= 12;
                            const isMedium = val > 0 && val < 12;

                            return (
                              <td
                                key={mIdx}
                                className={`py-1.5 px-3 border-r border-gray-100 transition-colors ${
                                  isHigh
                                    ? 'bg-emerald-100 text-emerald-900 font-bold'
                                    : isMedium
                                    ? 'bg-green/10 text-green-dark font-bold'
                                    : 'text-gray-400'
                                }`}
                              >
                                {val > 0 ? <strong>{val}</strong> : 0}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    {/* Total Row */}
                    <tr className="bg-charcoal text-white font-bold text-xs border-t-2 border-charcoal">
                      <td className="py-3 px-3 uppercase tracking-wider border-r border-white/10 font-bold">
                        Total
                      </td>
                      {prev12MoisGrid.monthTotals.map((tot, mIdx) => (
                        <td key={mIdx} className="py-3 px-3 border-r border-white/10 font-black text-gold">
                          {tot}
                        </td>
                      ))}
                    </tr>
                    {/* TO % Row */}
                    <tr className="bg-green/15 text-charcoal font-black text-xs border-t border-green/20">
                      <td className="py-3 px-3 uppercase tracking-wider border-r border-green/20 text-green-dark">
                        TO (%)
                      </td>
                      {prev12MoisGrid.monthTO.map((to, mIdx) => (
                        <td key={mIdx} className="py-3 px-3 border-r border-green/20 text-green-dark">
                          {fPct(to)}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* ── ONGLET 3 : ENCOURS & RÈGLEMENTS DES SÉJOURS (QUI DOIT DE L'ARGENT) ── */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'encours' && (
          <div className="space-y-6">
            {/* Top KPIs Debt & Recovery */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Facturé Consolidé</div>
                <div className="text-2xl font-black text-charcoal">{money(totalFactureGlobal)}</div>
                <p className="text-[11px] text-gray-400 mt-1">tous séjours enregistrés</p>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Règlements Encaissés</div>
                <div className="text-2xl font-black text-green-dark">{money(totalEncaisseGlobal)}</div>
                <p className="text-[11px] text-gray-400 mt-1">arrhes + paiements perçus</p>
              </div>

              <div className="bg-white border border-red-100 rounded-xl p-4 shadow-xs bg-red-50/20">
                <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">Solde Débiteur Restant Dû</div>
                <div className="text-2xl font-black text-amber-600">{money(totalSoldeDebiteur)}</div>
                <p className="text-[11px] text-amber-700 font-semibold mt-1">créances & impayés à recouvrer</p>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Taux de Recouvrement</div>
                <div className="text-2xl font-black text-green-dark">{fPct(tauxRecouvrement)}</div>
                <p className="text-[11px] text-gray-400 mt-1">pourcentage encaissé</p>
              </div>
            </div>

            {/* Filter toolbar */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[260px] max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={encoursSearch}
                  onChange={(e) => setEncoursSearch(e.target.value)}
                  placeholder="Rechercher par client, société, folio, tél, appartement..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50/50 focus:ring-2 focus:ring-green/20 focus:border-green outline-hidden"
                />
                {encoursSearch && (
                  <button
                    onClick={() => setEncoursSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-charcoal"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-xs font-semibold text-gray-500">
                  <button
                    onClick={() => setEncoursFilter('tous')}
                    className={`px-3 py-1 rounded-md transition-colors ${encoursFilter === 'tous' ? 'bg-white text-green shadow-xs' : 'hover:text-charcoal'}`}
                  >
                    Tous ({folios.length})
                  </button>
                  <button
                    onClick={() => setEncoursFilter('debiteur')}
                    className={`px-3 py-1 rounded-md transition-colors ${encoursFilter === 'debiteur' ? 'bg-white text-amber-700 shadow-xs font-bold' : 'hover:text-charcoal'}`}
                  >
                    Débiteurs / Soldes Dûs
                  </button>
                  <button
                    onClick={() => setEncoursFilter('encours')}
                    className={`px-3 py-1 rounded-md transition-colors ${encoursFilter === 'encours' ? 'bg-white text-green-dark shadow-xs font-bold' : 'hover:text-charcoal'}`}
                  >
                    Séjours en Cours
                  </button>
                  <button
                    onClick={() => setEncoursFilter('solde')}
                    className={`px-3 py-1 rounded-md transition-colors ${encoursFilter === 'solde' ? 'bg-white text-green shadow-xs' : 'hover:text-charcoal'}`}
                  >
                    Soldés ✓
                  </button>
                </div>

                <button
                  onClick={exportEncoursCSV}
                  className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-charcoal px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-gray-50 shadow-xs transition-colors"
                >
                  <Download size={13} className="text-green" /> Exporter CSV
                </button>
              </div>
            </div>

            {/* Stays & Debts Table */}
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-charcoal text-white text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">N° Folio</th>
                      <th className="py-3 px-4">Logement</th>
                      <th className="py-3 px-4">Client / Débiteur</th>
                      <th className="py-3 px-4">Société & Contact</th>
                      <th className="py-3 px-4">Période du Séjour</th>
                      <th className="py-3 px-4 text-center">Nuits</th>
                      <th className="py-3 px-4 text-right">Total Facturé</th>
                      <th className="py-3 px-4 text-right">Total Encaissé</th>
                      <th className="py-3 px-4 text-right">Solde Débiteur Dû</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {encoursList.map((f) => {
                      const guestName = f.guest || [f.prenom, f.nom].filter(Boolean).join(' ') || 'Client sans nom';
                      const isDebiteur = f.solde > 0;

                      return (
                        <tr key={f.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold">
                            <Link href={`/pms/folios/${f.id}`} className="text-green-dark hover:underline">
                              {f.number}
                            </Link>
                          </td>
                          <td className="py-3 px-4 font-bold text-charcoal">
                            {f.unitLabel}
                          </td>
                          <td className="py-3 px-4">
                            <Link href={`/pms/folios/${f.id}`} className="font-bold text-charcoal hover:text-green-dark">
                              {guestName}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-gray-500">
                            {f.societe && <div className="font-semibold text-charcoal">{f.societe}</div>}
                            <div className="text-[11px] text-gray-400">{f.guestPhone || f.telephone || '—'}</div>
                          </td>
                          <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                            {frDate(f.arrival)} ➔ {frDate(f.departure)}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-charcoal">
                            {f.nights}n
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-charcoal">
                            {money(f.totalGeneral)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-green-dark">
                            {money(f.paid + f.arrhes)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isDebiteur ? (
                              <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Reste {money(f.solde)}
                              </span>
                            ) : (
                              <span className="font-bold text-green-dark bg-green/10 px-2 py-0.5 rounded">
                                Soldé ✓
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link
                              href={`/pms/folios/${f.id}`}
                              className="px-2.5 py-1 text-[11px] font-bold text-green-dark bg-green/10 hover:bg-green/20 rounded transition-colors"
                            >
                              Gérer
                            </Link>
                          </td>
                        </tr>
                      );
                    })}

                    {encoursList.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-gray-400 text-sm">
                          Aucun séjour ne correspond à vos critères de recherche.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* ── ONGLET 4 : VUE MENSUELLE & HISTORIQUE PLURIANNUEL ── */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'mensuel' && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Du mois</label>
                  <input
                    type="month"
                    value={startMonth}
                    onChange={(e) => setStartMonth(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold bg-gray-50 focus:ring-2 focus:ring-green/20 focus:border-green outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Au mois</label>
                  <input
                    type="month"
                    value={endMonth}
                    onChange={(e) => setEndMonth(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold bg-gray-50 focus:ring-2 focus:ring-green/20 focus:border-green outline-hidden"
                  />
                </div>
                <button
                  onClick={() => { setStartMonth(nowMonth); setEndMonth(nowMonth); }}
                  className="px-3 py-1.5 text-xs font-semibold text-charcoal bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Ce mois
                </button>
                <button
                  onClick={() => { setStartMonth(monthAdd(nowMonth, -11)); setEndMonth(nowMonth); }}
                  className="px-3 py-1.5 text-xs font-semibold text-green-dark bg-green/10 hover:bg-green/20 rounded-lg transition-colors"
                >
                  12 derniers mois
                </button>
              </div>
            </div>

            {/* Monthly Table */}
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-charcoal text-white text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Mois</th>
                      <th className="py-3 px-4 text-right">Taux Occup.</th>
                      <th className="py-3 px-4 text-right">Nuits Vendues</th>
                      <th className="py-3 px-4 text-right">CA Hébergement</th>
                      <th className="py-3 px-4 text-right">CA Petits Déj.</th>
                      <th className="py-3 px-4 text-right">Prix Moyen (ADR)</th>
                      <th className="py-3 px-4 text-right">RevPAR</th>
                      <th className="py-3 px-4 text-right font-black text-green">Total CA TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {monthlyStats.map((m, i) => (
                      <tr key={m.ym} className={`hover:bg-gray-50/70 transition-colors ${i % 2 ? 'bg-gray-50/30' : 'bg-white'}`}>
                        <td className="py-3 px-4 font-bold capitalize text-charcoal">
                          {frMonth(m.ym)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-green-dark">
                          {fPct(m.to)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-gray-700">
                          {m.nightsSold} / {m.availNights}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-gray-700">
                          {money(m.caHeb)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-gray-600">
                          {money(m.caPdj)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-gray-600">
                          {money(m.adr)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-gold font-bold">
                          {money(m.revpar)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-green-dark">
                          {money(m.caTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
