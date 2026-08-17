'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { pmsUnits, pmsFolios } from '@/lib/pms';
import type { UnitDto, FolioDto } from '@/lib/pmsTypes';
import { FileText, TrendingUp, Calendar, Download, Printer, ArrowUpRight, ArrowDownRight, Layers, DollarSign, BedDouble, Percent } from 'lucide-react';

// Helpers
const thisMonth = () => new Date().toISOString().slice(0, 7);
const todayStr = () => new Date().toISOString().slice(0, 10);
const daysInMonth = (ym: string) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m, 0).getDate(); };
const monthAdd = (ym: string, n: number) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m - 1 + n, 1).toISOString().slice(0, 7); };
const monthList = (a: string, b: string) => { const o = []; let c = a, g = 0; while (c <= b && g < 60) { o.push(c); c = monthAdd(c, 1); g++; } return o; };
const frMonth = (ym: string) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }); };
const frDate = (s: string) => (s ? new Date(s + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");
const dayDiff = (a: string, b: string) => Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000);
const addDays = (s: string, n: number) => { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const num = (v: any) => (typeof v === "number" && isFinite(v) ? v : 0);

function downloadCSV(fn: string, rows: any[][]) {
  const csv = rows.map((r) => r.map((c) => { 
    const s = String(c == null ? "" : c); 
    return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; 
  }).join(";")).join("\n"); 
  const b = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }); 
  const u = URL.createObjectURL(b); 
  const a = document.createElement("a"); 
  a.href = u; a.download = fn; a.click(); URL.revokeObjectURL(u); 
}

const fPct = (n: number) => num(n).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " %";
const fN = (n: number, d = 0) => num(n).toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const money = (n: number) => Math.round(num(n)).toLocaleString("fr-FR") + " FCFA";

function folioCalc(f: any) {
  const nights = Math.max(0, dayDiff(f.arrival, f.departure));
  const heb = num(f.heb) > 0 ? num(f.heb) : num(f.rate) * nights;
  const pdjTot = num(f.pdjParJour) * num(f.pdjPrix) * nights;
  const deb = num(f.debiteur), dep = num(f.dependances);
  const total = heb + pdjTot + deb + dep;
  const brut = num(f.paid) + num(f.arrhes);
  const solde = Math.max(0, total - brut);
  const avoir = Math.max(0, brut - total);
  return { nights, heb, pdjTot, deb, dep, total, arrhes: num(f.arrhes), encaisse: Math.min(brut, total), solde, avoir };
}

const overlapNights = (a: string, b: string, d0: string, d1excl: string) => { 
  const s = a > d0 ? a : d0; 
  const e = b < d1excl ? b : d1excl; 
  return Math.max(0, dayDiff(s, e)); 
};

const active = (f: FolioDto) => f.resaStatus !== "Cancelled" && f.resaStatus !== "NoShow";

// Computes daily statistics for a precise single date D
function singleDayStat(units: UnitDto[], folios: FolioDto[], date: string) {
  const nextDay = addDays(date, 1);
  const totalUnits = units.length;
  const hsUnits = units.filter(u => u.horsService).length;
  const availUnits = totalUnits - hsUnits;

  let soldUnits = 0;
  let caHeb = 0;
  let caPdj = 0;
  let caExtras = 0;

  folios.forEach((f) => {
    if (!active(f)) return;
    const c = folioCalc(f);
    // Is occupied during this specific night (date -> nextDay)
    if (f.arrival <= date && f.departure >= nextDay) {
      soldUnits++;
      const ratePerNight = c.nights ? c.heb / c.nights : 0;
      caHeb += ratePerNight;
      caPdj += num(f.pdjParJour) * num(f.pdjPrix);
    }
    // Extras recorded on this exact arrival day
    if (f.arrival === date) {
      caExtras += c.deb + c.dep;
    }
  });

  const caTotal = caHeb + caPdj + caExtras;
  const to = availUnits > 0 ? (soldUnits / availUnits) * 100 : 0;
  const adr = soldUnits > 0 ? caHeb / soldUnits : 0;
  const revpar = availUnits > 0 ? caHeb / availUnits : 0;

  return {
    date,
    availUnits,
    hsUnits,
    soldUnits,
    to,
    caHeb,
    caPdj,
    caExtras,
    caTotal,
    adr,
    revpar,
  };
}

// Computes period aggregated stats (from date dStart to dEnd inclusive)
function periodRangeStat(units: UnitDto[], folios: FolioDto[], dStart: string, dEnd: string) {
  const dEndExcl = addDays(dEnd, 1);
  const totalDays = Math.max(1, dayDiff(dStart, dEndExcl));
  const activeUnitsCount = units.filter(u => !u.horsService).length;
  const totalAvailNights = activeUnitsCount * totalDays;

  let totalNightsSold = 0;
  let totalHeb = 0;
  let totalPdj = 0;
  let totalExtras = 0;

  folios.forEach((f) => {
    if (!active(f)) return;
    const c = folioCalc(f);
    const on = overlapNights(f.arrival, f.departure, dStart, dEndExcl);
    if (on > 0) {
      const ratePerNight = c.nights ? c.heb / c.nights : 0;
      totalHeb += ratePerNight * on;
      totalPdj += num(f.pdjParJour) * num(f.pdjPrix) * on;
      totalNightsSold += on;
    }
    if (f.arrival >= dStart && f.arrival < dEndExcl) {
      totalExtras += c.deb + c.dep;
    }
  });

  const caTotal = totalHeb + totalPdj + totalExtras;
  const to = totalAvailNights > 0 ? (totalNightsSold / totalAvailNights) * 100 : 0;
  const adr = totalNightsSold > 0 ? totalHeb / totalNightsSold : 0;
  const revpar = totalAvailNights > 0 ? totalHeb / totalAvailNights : 0;

  return {
    dStart,
    dEnd,
    totalDays,
    totalAvailNights,
    totalNightsSold,
    to,
    totalHeb,
    totalPdj,
    totalExtras,
    caTotal,
    adr,
    revpar,
  };
}

function monthStat(units: UnitDto[], folios: FolioDto[], m: string) {
  const d0 = m + "-01", d1 = monthAdd(m, 1) + "-01", dim = daysInMonth(m);
  const availNights = units.filter((u) => !u.horsService).length * dim;
  const courtActive = units.filter((u) => !u.horsService).length;
  
  let courtHeb = 0, courtPdj = 0, extras = 0, nightsSold = 0, guestNights = 0, pdjCount = 0;
  
  folios.forEach((f) => { 
    if (!active(f)) return; 
    const c = folioCalc(f); 
    const on = overlapNights(f.arrival, f.departure, d0, d1); 
    if (on > 0) { 
      const pn = c.nights ? c.heb / c.nights : 0; 
      courtHeb += pn * on; 
      courtPdj += num(f.pdjParJour) * num(f.pdjPrix) * on; 
      nightsSold += on; 
      guestNights += num(f.pax) * on; 
      pdjCount += num(f.pdjParJour) * on; 
    } 
    if (f.arrival >= d0 && f.arrival < d1) {
      extras += c.deb + c.dep; 
    }
  });
  const courtRevenue = courtHeb + courtPdj + extras;
  return { ym: m, availNights, occNights: nightsSold, courtAvail: courtActive * dim, rentDue: 0, rentPaid: 0, impaye: 0, courtHeb, courtPdj, extras, nightsSold, guestNights, pdjCount, courtRevenue, caTotal: courtRevenue };
}

function rangeStat(units: UnitDto[], folios: FolioDto[], months: string[]) {
  const rows = months.map((m) => monthStat(units, folios, m));
  const K = ["availNights", "occNights", "courtAvail", "rentDue", "rentPaid", "impaye", "courtHeb", "courtPdj", "extras", "nightsSold", "guestNights", "pdjCount", "courtRevenue", "caTotal"] as const;
  const t: any = { rows }; 
  K.forEach((k) => (t[k] = rows.reduce((s: number, r: any) => s + r[k], 0)));
  t.to = t.availNights ? (t.occNights / t.availNights) * 100 : 0;
  t.recouvrement = t.rentDue ? (t.rentPaid / t.rentDue) * 100 : 0;
  t.revpar = t.courtAvail ? t.courtHeb / t.courtAvail : 0;
  t.adr = t.nightsSold ? t.courtHeb / t.nightsSold : 0;
  t.ifreq = t.nightsSold ? t.guestNights / t.nightsSold : 0;
  t.captage = t.guestNights ? (t.pdjCount / t.guestNights) * 100 : 0;
  return t;
}

function computeDiff(valN: number, valNMinus1: number, isPercent = false) {
  const diffVal = valN - valNMinus1;
  const diffPct = valNMinus1 > 0 ? ((valN - valNMinus1) / valNMinus1) * 100 : valN > 0 ? 100 : 0;
  return { diffVal, diffPct };
}

export default function StatistiquesPage() {
  const now = thisMonth();
  const today = todayStr();
  const [activeTab, setActiveTab] = useState<'feuille' | 'mensuel'>('feuille');
  
  // Feuille de journée parameters
  const [dayDate, setDayDate] = useState(today);

  // Vue mensuelle parameters
  const [start, setStart] = useState(monthAdd(now, -5));
  const [end, setEnd] = useState(now);

  const [units, setUnits] = useState<UnitDto[]>([]);
  const [folios, setFolios] = useState<FolioDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([pmsUnits.getAll(), pmsFolios.getAll()])
      .then(([u, f]) => {
        setUnits(u);
        setFolios(f);
      })
      .finally(() => setLoading(false));
  }, []);

  // 1. Feuille de Journée (Year N)
  const currentDayStats = useMemo(() => singleDayStat(units, folios, dayDate), [units, folios, dayDate]);
  
  // MTD (Month to date Year N : from 1st of month to dayDate)
  const currentMtdStats = useMemo(() => {
    const ym = dayDate.slice(0, 7);
    const mtdStart = `${ym}-01`;
    return periodRangeStat(units, folios, mtdStart, dayDate);
  }, [units, folios, dayDate]);

  // 2. Year N-1 Calculations (Same day & same MTD in year N-1)
  const dayDateNMinus1 = useMemo(() => {
    const [y, m, d] = dayDate.split("-");
    const prevYear = String(Number(y) - 1);
    return `${prevYear}-${m}-${d}`;
  }, [dayDate]);

  const nMinus1DayStats = useMemo(() => singleDayStat(units, folios, dayDateNMinus1), [units, folios, dayDateNMinus1]);

  const nMinus1MtdStats = useMemo(() => {
    const [y, m] = dayDate.split("-");
    const prevYear = String(Number(y) - 1);
    const mtdStart = `${prevYear}-${m}-01`;
    return periodRangeStat(units, folios, mtdStart, dayDateNMinus1);
  }, [units, folios, dayDateNMinus1]);

  // 3. Monthly aggregated view
  const s = useMemo(() => rangeStat(units, folios, monthList(start, end)), [units, folios, start, end]);

  const exportFeuilleCSV = () => {
    downloadCSV(`juweirat_feuille_journee_${dayDate}.csv`, [
      ["FEUILLE DE JOURNÉE & RAPPORT D'EXPLOITATION — RÉSIDENCE JUWEIRAT", `Date : ${frDate(dayDate)}`],
      [],
      ["INDICATEUR", `JOUR J (${frDate(dayDate)})`, `JOUR J N-1 (${frDate(dayDateNMinus1)})`, "ÉCART JOUR (%)", `CUMUL MOIS MTD (${dayDate.slice(0,7)})`, `CUMUL MOIS N-1 (${dayDateNMinus1.slice(0,7)})`, "ÉCART MTD (%)"],
      [
        "Chambres Disponibles",
        currentDayStats.availUnits,
        nMinus1DayStats.availUnits,
        `${computeDiff(currentDayStats.availUnits, nMinus1DayStats.availUnits).diffPct.toFixed(1)} %`,
        currentMtdStats.totalAvailNights,
        nMinus1MtdStats.totalAvailNights,
        `${computeDiff(currentMtdStats.totalAvailNights, nMinus1MtdStats.totalAvailNights).diffPct.toFixed(1)} %`
      ],
      [
        "Chambres Vendues / Nuitées",
        currentDayStats.soldUnits,
        nMinus1DayStats.soldUnits,
        `${computeDiff(currentDayStats.soldUnits, nMinus1DayStats.soldUnits).diffPct.toFixed(1)} %`,
        currentMtdStats.totalNightsSold,
        nMinus1MtdStats.totalNightsSold,
        `${computeDiff(currentMtdStats.totalNightsSold, nMinus1MtdStats.totalNightsSold).diffPct.toFixed(1)} %`
      ],
      [
        "Taux d'Occupation (TO)",
        `${currentDayStats.to.toFixed(1)} %`,
        `${nMinus1DayStats.to.toFixed(1)} %`,
        `${(currentDayStats.to - nMinus1DayStats.to).toFixed(1)} pts`,
        `${currentMtdStats.to.toFixed(1)} %`,
        `${nMinus1MtdStats.to.toFixed(1)} %`,
        `${(currentMtdStats.to - nMinus1MtdStats.to).toFixed(1)} pts`
      ],
      [
        "CA Hébergement",
        Math.round(currentDayStats.caHeb),
        Math.round(nMinus1DayStats.caHeb),
        `${computeDiff(currentDayStats.caHeb, nMinus1DayStats.caHeb).diffPct.toFixed(1)} %`,
        Math.round(currentMtdStats.totalHeb),
        Math.round(nMinus1MtdStats.totalHeb),
        `${computeDiff(currentMtdStats.totalHeb, nMinus1MtdStats.totalHeb).diffPct.toFixed(1)} %`
      ],
      [
        "CA Petit Déjeuner",
        Math.round(currentDayStats.caPdj),
        Math.round(nMinus1DayStats.caPdj),
        `${computeDiff(currentDayStats.caPdj, nMinus1DayStats.caPdj).diffPct.toFixed(1)} %`,
        Math.round(currentMtdStats.totalPdj),
        Math.round(nMinus1MtdStats.totalPdj),
        `${computeDiff(currentMtdStats.totalPdj, nMinus1MtdStats.totalPdj).diffPct.toFixed(1)} %`
      ],
      [
        "CA Extras & Divers",
        Math.round(currentDayStats.caExtras),
        Math.round(nMinus1DayStats.caExtras),
        `${computeDiff(currentDayStats.caExtras, nMinus1DayStats.caExtras).diffPct.toFixed(1)} %`,
        Math.round(currentMtdStats.totalExtras),
        Math.round(nMinus1MtdStats.totalExtras),
        `${computeDiff(currentMtdStats.totalExtras, nMinus1MtdStats.totalExtras).diffPct.toFixed(1)} %`
      ],
      [
        "CHIFFRE D'AFFAIRES TOTAL",
        Math.round(currentDayStats.caTotal),
        Math.round(nMinus1DayStats.caTotal),
        `${computeDiff(currentDayStats.caTotal, nMinus1DayStats.caTotal).diffPct.toFixed(1)} %`,
        Math.round(currentMtdStats.caTotal),
        Math.round(nMinus1MtdStats.caTotal),
        `${computeDiff(currentMtdStats.caTotal, nMinus1MtdStats.caTotal).diffPct.toFixed(1)} %`
      ],
      [
        "Prix Moyen (ADR)",
        Math.round(currentDayStats.adr),
        Math.round(nMinus1DayStats.adr),
        `${computeDiff(currentDayStats.adr, nMinus1DayStats.adr).diffPct.toFixed(1)} %`,
        Math.round(currentMtdStats.adr),
        Math.round(nMinus1MtdStats.adr),
        `${computeDiff(currentMtdStats.adr, nMinus1MtdStats.adr).diffPct.toFixed(1)} %`
      ],
      [
        "RevPAR",
        Math.round(currentDayStats.revpar),
        Math.round(nMinus1DayStats.revpar),
        `${computeDiff(currentDayStats.revpar, nMinus1DayStats.revpar).diffPct.toFixed(1)} %`,
        Math.round(currentMtdStats.revpar),
        Math.round(nMinus1MtdStats.revpar),
        `${computeDiff(currentMtdStats.revpar, nMinus1MtdStats.revpar).diffPct.toFixed(1)} %`
      ]
    ]);
  };

  const exportMonthlyCSV = () => {
    downloadCSV(`juweirat_stats_mensuelles_${start}_${end}.csv`, [
      ["Statistiques Mensuelles — Résidence Juweirat", `${frMonth(start)} → ${frMonth(end)}`], 
      [], 
      ["Mois", "Occup. %", "Nuits vendues", "CA nuitées", "Nb PDJ", "CA total"], 
      ...s.rows.map((r: any) => [
        frMonth(r.ym), 
        r.availNights ? ((r.occNights / r.availNights) * 100).toFixed(1).replace(".", ",") : "0", 
        r.nightsSold, 
        Math.round(r.courtRevenue), 
        Math.round(r.pdjCount), 
        Math.round(r.caTotal)
      ]), 
      [], 
      ["TOTAL", s.to.toFixed(1).replace(".", ","), s.nightsSold, Math.round(s.courtRevenue), Math.round(s.pdjCount), Math.round(s.caTotal)]
    ]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-green/30 border-t-green rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11.5px] uppercase tracking-wider text-gold font-extrabold mb-1">PMS · Pilotage de l'Activité</div>
          <h1 className="text-2xl font-bold text-green m-0">Statistiques & Feuille de Journée</h1>
          <div className="h-1 w-12 bg-gold mt-2 rounded-full" />
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('feuille')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'feuille' ? 'bg-white text-green shadow-sm' : 'text-gray-500 hover:text-charcoal'
            }`}
          >
            <FileText size={15} />
            Feuille de Journée & N / N-1
          </button>
          <button
            onClick={() => setActiveTab('mensuel')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'mensuel' ? 'bg-white text-green shadow-sm' : 'text-gray-500 hover:text-charcoal'
            }`}
          >
            <TrendingUp size={15} />
            Vue Mensuelle & Historique
          </button>
        </div>
      </div>

      {/* ── TAB 1 : FEUILLE DE JOURNÉE & COMPARATIF N VS N-1 ── */}
      {activeTab === 'feuille' && (
        <div className="space-y-6">
          {/* Top Control Card */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Date de la feuille
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dayDate}
                    onChange={e => setDayDate(e.target.value)}
                    className="px-3.5 py-2 border border-gray-200 rounded-lg text-sm bg-white font-medium focus:ring-2 focus:ring-green/20 focus:border-green"
                  />
                  <button
                    onClick={() => setDayDate(today)}
                    className="px-3 py-2 text-xs font-semibold text-green border border-gray-200 rounded-lg hover:bg-green/5"
                  >
                    Aujourd'hui
                  </button>
                  <button
                    onClick={() => setDayDate(addDays(today, -1))}
                    className="px-3 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    Hier
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportFeuilleCSV}
                className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-charcoal px-3.5 py-2 text-sm font-semibold rounded-lg hover:bg-gray-50 shadow-sm transition-colors"
              >
                <Download size={15} className="text-green" />
                Exporter Feuille CSV
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 bg-gold text-white px-4 py-2 text-sm font-semibold rounded-lg hover:bg-gold/90 shadow-sm transition-colors"
              >
                <Printer size={15} />
                Imprimer Feuille
              </button>
            </div>
          </div>

          {/* KPI Day Quick Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: 'Chambres louées (Jour)', value: `${currentDayStats.soldUnits} / ${currentDayStats.availUnits}`, sub: `Taux : ${fPct(currentDayStats.to)}`, color: 'text-green' },
              { label: 'CA Hébergement (Jour)', value: money(currentDayStats.caHeb), sub: `ADR : ${money(currentDayStats.adr)}`, color: 'text-green-dark' },
              { label: 'CA Petit Déjeuner (Jour)', value: money(currentDayStats.caPdj), sub: 'Restauration', color: 'text-charcoal' },
              { label: 'CA Total Journée', value: money(currentDayStats.caTotal), sub: `RevPAR : ${money(currentDayStats.revpar)}`, color: 'text-gold' },
              { label: 'Cumul Mois (MTD)', value: money(currentMtdStats.caTotal), sub: `${currentMtdStats.totalNightsSold} nuits vendues`, color: 'text-green-dark' },
              { label: 'TO Cumulé Mois', value: fPct(currentMtdStats.to), sub: `Prix moy : ${money(currentMtdStats.adr)}`, color: 'text-green' },
            ].map((kpi, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{kpi.label}</div>
                <div className={`text-lg font-extrabold ${kpi.color}`}>{kpi.value}</div>
                <div className="text-[11px] text-gray-400 mt-1 font-medium">{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* ── MATRICE COMPARATIVE N vs N-1 ── */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100 bg-surface/50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-charcoal m-0 flex items-center gap-2">
                  <TrendingUp size={18} className="text-gold" />
                  Feuille de Journée & Tableau Comparatif Exercice N vs N-1
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Comparaison directe : Journée du {frDate(dayDate)} (vs {frDate(dayDateNMinus1)}) et Cumul Mois en cours MTD (vs N-1)
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-green text-white text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Indicateur Opérationnel</th>
                    <th className="py-3 px-4 text-right bg-green-dark/40">Jour J (N)</th>
                    <th className="py-3 px-4 text-right">Jour J (N-1)</th>
                    <th className="py-3 px-4 text-right">Écart Jour</th>
                    <th className="py-3 px-4 text-right bg-green-dark/40 border-l border-white/20">Cumul Mois N</th>
                    <th className="py-3 px-4 text-right">Cumul Mois N-1</th>
                    <th className="py-3 px-4 text-right">Écart Mois</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Row 1 : Chambres disponibles */}
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-semibold text-charcoal flex items-center gap-2">
                      <BedDouble size={15} className="text-gray-400" />
                      Chambres Disponibles
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-charcoal bg-gray-50/50">{currentDayStats.availUnits}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{nMinus1DayStats.availUnits}</td>
                    <td className="py-3 px-4 text-right text-xs font-semibold text-gray-500">
                      {currentDayStats.availUnits - nMinus1DayStats.availUnits >= 0 ? `+${currentDayStats.availUnits - nMinus1DayStats.availUnits}` : currentDayStats.availUnits - nMinus1DayStats.availUnits}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-charcoal bg-gray-50/50 border-l border-gray-100">{currentMtdStats.totalAvailNights}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{nMinus1MtdStats.totalAvailNights}</td>
                    <td className="py-3 px-4 text-right text-xs font-semibold text-gray-500">
                      {currentMtdStats.totalAvailNights - nMinus1MtdStats.totalAvailNights >= 0 ? `+${currentMtdStats.totalAvailNights - nMinus1MtdStats.totalAvailNights}` : currentMtdStats.totalAvailNights - nMinus1MtdStats.totalAvailNights}
                    </td>
                  </tr>

                  {/* Row 2 : Chambres vendues */}
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-semibold text-charcoal flex items-center gap-2">
                      <Layers size={15} className="text-gray-400" />
                      Chambres Vendues / Nuitées
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-green-dark bg-gray-50/50">{currentDayStats.soldUnits}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{nMinus1DayStats.soldUnits}</td>
                    <td className="py-3 px-4 text-right font-semibold text-xs">
                      {(() => {
                        const { diffVal, diffPct } = computeDiff(currentDayStats.soldUnits, nMinus1DayStats.soldUnits);
                        const isUp = diffVal >= 0;
                        return (
                          <span className={`inline-flex items-center gap-0.5 ${isUp ? 'text-green' : 'text-red-600'}`}>
                            {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            {diffPct.toFixed(1)} %
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-green-dark bg-gray-50/50 border-l border-gray-100">{currentMtdStats.totalNightsSold}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{nMinus1MtdStats.totalNightsSold}</td>
                    <td className="py-3 px-4 text-right font-semibold text-xs">
                      {(() => {
                        const { diffVal, diffPct } = computeDiff(currentMtdStats.totalNightsSold, nMinus1MtdStats.totalNightsSold);
                        const isUp = diffVal >= 0;
                        return (
                          <span className={`inline-flex items-center gap-0.5 ${isUp ? 'text-green' : 'text-red-600'}`}>
                            {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            {diffPct.toFixed(1)} %
                          </span>
                        );
                      })()}
                    </td>
                  </tr>

                  {/* Row 3 : Taux d'occupation */}
                  <tr className="hover:bg-gray-50/50 bg-green/5">
                    <td className="py-3 px-4 font-bold text-green flex items-center gap-2">
                      <Percent size={15} />
                      Taux d'Occupation (TO)
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-green bg-green/10">{fPct(currentDayStats.to)}</td>
                    <td className="py-3 px-4 text-right text-gray-600 font-semibold">{fPct(nMinus1DayStats.to)}</td>
                    <td className="py-3 px-4 text-right font-bold text-xs">
                      {(() => {
                        const diff = currentDayStats.to - nMinus1DayStats.to;
                        const isUp = diff >= 0;
                        return (
                          <span className={`inline-flex items-center gap-0.5 ${isUp ? 'text-green' : 'text-red-600'}`}>
                            {isUp ? `+${diff.toFixed(1)} pts` : `${diff.toFixed(1)} pts`}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-green bg-green/10 border-l border-gray-100">{fPct(currentMtdStats.to)}</td>
                    <td className="py-3 px-4 text-right text-gray-600 font-semibold">{fPct(nMinus1MtdStats.to)}</td>
                    <td className="py-3 px-4 text-right font-bold text-xs">
                      {(() => {
                        const diff = currentMtdStats.to - nMinus1MtdStats.to;
                        const isUp = diff >= 0;
                        return (
                          <span className={`inline-flex items-center gap-0.5 ${isUp ? 'text-green' : 'text-red-600'}`}>
                            {isUp ? `+${diff.toFixed(1)} pts` : `${diff.toFixed(1)} pts`}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>

                  {/* Row 4 : CA Hébergement */}
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-semibold text-charcoal">CA Hébergement</td>
                    <td className="py-3 px-4 text-right font-bold text-charcoal bg-gray-50/50">{money(currentDayStats.caHeb)}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{money(nMinus1DayStats.caHeb)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-xs">
                      {(() => {
                        const { diffVal, diffPct } = computeDiff(currentDayStats.caHeb, nMinus1DayStats.caHeb);
                        const isUp = diffVal >= 0;
                        return (
                          <span className={`inline-flex items-center gap-0.5 ${isUp ? 'text-green' : 'text-red-600'}`}>
                            {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            {diffPct.toFixed(1)} %
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-charcoal bg-gray-50/50 border-l border-gray-100">{money(currentMtdStats.totalHeb)}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{money(nMinus1MtdStats.totalHeb)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-xs">
                      {(() => {
                        const { diffVal, diffPct } = computeDiff(currentMtdStats.totalHeb, nMinus1MtdStats.totalHeb);
                        const isUp = diffVal >= 0;
                        return (
                          <span className={`inline-flex items-center gap-0.5 ${isUp ? 'text-green' : 'text-red-600'}`}>
                            {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            {diffPct.toFixed(1)} %
                          </span>
                        );
                      })()}
                    </td>
                  </tr>

                  {/* Row 5 : CA Petit Déjeuner */}
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-semibold text-charcoal">CA Petit Déjeuner</td>
                    <td className="py-3 px-4 text-right font-bold text-charcoal bg-gray-50/50">{money(currentDayStats.caPdj)}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{money(nMinus1DayStats.caPdj)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-xs">
                      {(() => {
                        const { diffVal, diffPct } = computeDiff(currentDayStats.caPdj, nMinus1DayStats.caPdj);
                        const isUp = diffVal >= 0;
                        return (
                          <span className={`inline-flex items-center gap-0.5 ${isUp ? 'text-green' : 'text-red-600'}`}>
                            {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            {diffPct.toFixed(1)} %
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-charcoal bg-gray-50/50 border-l border-gray-100">{money(currentMtdStats.totalPdj)}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{money(nMinus1MtdStats.totalPdj)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-xs">
                      {(() => {
                        const { diffVal, diffPct } = computeDiff(currentMtdStats.totalPdj, nMinus1MtdStats.totalPdj);
                        const isUp = diffVal >= 0;
                        return (
                          <span className={`inline-flex items-center gap-0.5 ${isUp ? 'text-green' : 'text-red-600'}`}>
                            {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            {diffPct.toFixed(1)} %
                          </span>
                        );
                      })()}
                    </td>
                  </tr>

                  {/* Row 6 : Extras / Dépendances */}
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-semibold text-charcoal">CA Extras & Dépendances</td>
                    <td className="py-3 px-4 text-right font-bold text-charcoal bg-gray-50/50">{money(currentDayStats.caExtras)}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{money(nMinus1DayStats.caExtras)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-xs">
                      {(() => {
                        const { diffVal, diffPct } = computeDiff(currentDayStats.caExtras, nMinus1DayStats.caExtras);
                        const isUp = diffVal >= 0;
                        return (
                          <span className={`inline-flex items-center gap-0.5 ${isUp ? 'text-green' : 'text-red-600'}`}>
                            {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            {diffPct.toFixed(1)} %
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-charcoal bg-gray-50/50 border-l border-gray-100">{money(currentMtdStats.totalExtras)}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{money(nMinus1MtdStats.totalExtras)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-xs">
                      {(() => {
                        const { diffVal, diffPct } = computeDiff(currentMtdStats.totalExtras, nMinus1MtdStats.totalExtras);
                        const isUp = diffVal >= 0;
                        return (
                          <span className={`inline-flex items-center gap-0.5 ${isUp ? 'text-green' : 'text-red-600'}`}>
                            {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            {diffPct.toFixed(1)} %
                          </span>
                        );
                      })()}
                    </td>
                  </tr>

                  {/* Row 7 : TOTAL CHIFFRE D'AFFAIRES */}
                  <tr className="bg-gold/10 hover:bg-gold/15 font-extrabold border-t-2 border-gold text-charcoal">
                    <td className="py-3.5 px-4 uppercase text-xs tracking-wider text-charcoal flex items-center gap-2">
                      <DollarSign size={16} className="text-gold" />
                      Chiffre d'Affaires Total
                    </td>
                    <td className="py-3.5 px-4 text-right text-base text-gold font-black bg-gold/15">{money(currentDayStats.caTotal)}</td>
                    <td className="py-3.5 px-4 text-right text-gray-700 font-bold">{money(nMinus1DayStats.caTotal)}</td>
                    <td className="py-3.5 px-4 text-right text-xs font-bold">
                      {(() => {
                        const { diffVal, diffPct } = computeDiff(currentDayStats.caTotal, nMinus1DayStats.caTotal);
                        const isUp = diffVal >= 0;
                        return (
                          <span className={`inline-flex items-center gap-0.5 ${isUp ? 'text-green' : 'text-red-600'}`}>
                            {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            {diffPct.toFixed(1)} %
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3.5 px-4 text-right text-base text-gold font-black bg-gold/15 border-l border-gold/30">{money(currentMtdStats.caTotal)}</td>
                    <td className="py-3.5 px-4 text-right text-gray-700 font-bold">{money(nMinus1MtdStats.caTotal)}</td>
                    <td className="py-3.5 px-4 text-right text-xs font-bold">
                      {(() => {
                        const { diffVal, diffPct } = computeDiff(currentMtdStats.caTotal, nMinus1MtdStats.caTotal);
                        const isUp = diffVal >= 0;
                        return (
                          <span className={`inline-flex items-center gap-0.5 ${isUp ? 'text-green' : 'text-red-600'}`}>
                            {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            {diffPct.toFixed(1)} %
                          </span>
                        );
                      })()}
                    </td>
                  </tr>

                  {/* Row 8 : Prix Moyen (ADR) */}
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-semibold text-charcoal">Prix Moyen Chambre (ADR)</td>
                    <td className="py-3 px-4 text-right font-bold text-charcoal bg-gray-50/50">{money(currentDayStats.adr)}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{money(nMinus1DayStats.adr)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-xs">
                      {(() => {
                        const { diffVal, diffPct } = computeDiff(currentDayStats.adr, nMinus1DayStats.adr);
                        const isUp = diffVal >= 0;
                        return (
                          <span className={`inline-flex items-center gap-0.5 ${isUp ? 'text-green' : 'text-red-600'}`}>
                            {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            {diffPct.toFixed(1)} %
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-charcoal bg-gray-50/50 border-l border-gray-100">{money(currentMtdStats.adr)}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{money(nMinus1MtdStats.adr)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-xs">
                      {(() => {
                        const { diffVal, diffPct } = computeDiff(currentMtdStats.adr, nMinus1MtdStats.adr);
                        const isUp = diffVal >= 0;
                        return (
                          <span className={`inline-flex items-center gap-0.5 ${isUp ? 'text-green' : 'text-red-600'}`}>
                            {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            {diffPct.toFixed(1)} %
                          </span>
                        );
                      })()}
                    </td>
                  </tr>

                  {/* Row 9 : RevPAR */}
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-semibold text-charcoal">RevPAR (Revenu / Ch. Dispo)</td>
                    <td className="py-3 px-4 text-right font-bold text-gold bg-gray-50/50">{money(currentDayStats.revpar)}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{money(nMinus1DayStats.revpar)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-xs">
                      {(() => {
                        const { diffVal, diffPct } = computeDiff(currentDayStats.revpar, nMinus1DayStats.revpar);
                        const isUp = diffVal >= 0;
                        return (
                          <span className={`inline-flex items-center gap-0.5 ${isUp ? 'text-green' : 'text-red-600'}`}>
                            {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            {diffPct.toFixed(1)} %
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gold bg-gray-50/50 border-l border-gray-100">{money(currentMtdStats.revpar)}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{money(nMinus1MtdStats.revpar)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-xs">
                      {(() => {
                        const { diffVal, diffPct } = computeDiff(currentMtdStats.revpar, nMinus1MtdStats.revpar);
                        const isUp = diffVal >= 0;
                        return (
                          <span className={`inline-flex items-center gap-0.5 ${isUp ? 'text-green' : 'text-red-600'}`}>
                            {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            {diffPct.toFixed(1)} %
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2 : VUE MENSUELLE & HISTORIQUE ── */}
      {activeTab === 'mensuel' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-40">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">De</label>
                <input type="month" value={start} onChange={e => setStart(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="w-40">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">À</label>
                <input type="month" value={end} onChange={e => setEnd(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <button onClick={() => { setStart(now); setEnd(now); }} className="px-3 py-2 text-sm text-green border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">
                Ce mois
              </button>
              <button onClick={() => { setStart(monthAdd(now, -11)); setEnd(now); }} className="px-3 py-2 text-sm text-green border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">
                12 mois
              </button>
              <button onClick={exportMonthlyCSV} className="ml-auto inline-flex items-center gap-1.5 bg-gold text-white px-4 py-2 text-sm font-semibold rounded-lg hover:bg-gold/90 transition-colors shadow-sm">
                <Download size={15} />
                Exporter CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Occupation immeuble', value: fPct(s.to) },
              { label: 'CA total période', value: money(s.caTotal), color: 'text-green-dark' },
              { label: 'CA nuitées', value: money(s.courtRevenue) },
              { label: 'RevPAR', value: money(s.revpar), color: 'text-gold' },
              { label: 'Prix moyen', value: money(s.adr) },
              { label: 'Ind. fréquentation', value: fN(s.ifreq, 2) },
            ].map((kpi, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{kpi.label}</div>
                <div className={`text-xl font-extrabold ${kpi.color || 'text-green'}`}>{kpi.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-green text-white text-[11.5px] uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Mois</th>
                    <th className="py-3 px-4 text-right">Occup.</th>
                    <th className="py-3 px-4 text-right">Nuits vendues</th>
                    <th className="py-3 px-4 text-right">CA nuitées</th>
                    <th className="py-3 px-4 text-right">CA total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {s.rows.map((r: any, i: number) => {
                    const to = r.availNights ? (r.occNights / r.availNights) * 100 : 0;
                    return (
                      <tr key={r.ym} className={i % 2 !== 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="py-3 px-4 text-sm font-medium capitalize">{frMonth(r.ym)}</td>
                        <td className="py-3 px-4 text-sm text-right font-mono">{fPct(to)}</td>
                        <td className="py-3 px-4 text-sm text-right font-mono">{fN(r.nightsSold)}</td>
                        <td className="py-3 px-4 text-sm text-right font-mono">{money(r.courtRevenue)}</td>
                        <td className="py-3 px-4 text-sm text-right font-mono font-bold text-green">{money(r.caTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-green font-extrabold text-white">
                    <td className="py-3.5 px-4 uppercase text-xs">Total</td>
                    <td className="py-3.5 px-4 text-gold text-right font-mono">{fPct(s.to)}</td>
                    <td className="py-3.5 px-4 text-white text-right font-mono">{fN(s.nightsSold)}</td>
                    <td className="py-3.5 px-4 text-white text-right font-mono">{money(s.courtRevenue)}</td>
                    <td className="py-3.5 px-4 text-gold text-right font-mono text-base">{money(s.caTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
