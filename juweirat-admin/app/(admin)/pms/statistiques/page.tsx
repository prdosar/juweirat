'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { pmsUnits, pmsFolios } from '@/lib/pms';
import type { UnitDto, FolioDto } from '@/lib/pmsTypes';

// Helpers
const thisMonth = () => new Date().toISOString().slice(0, 7);
const daysInMonth = (ym: string) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m, 0).getDate(); };
const monthAdd = (ym: string, n: number) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m - 1 + n, 1).toISOString().slice(0, 7); };
const monthList = (a: string, b: string) => { const o = []; let c = a, g = 0; while (c <= b && g < 60) { o.push(c); c = monthAdd(c, 1); g++; } return o; };
const frMonth = (ym: string) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }); };
const dayDiff = (a: string, b: string) => Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000);
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

function monthStat(units: UnitDto[], folios: FolioDto[], m: string) {
  const d0 = m + "-01", d1 = monthAdd(m, 1) + "-01", dim = daysInMonth(m);
  const availNights = units.filter((u) => !u.horsService).length * dim;
  const courtActive = units.filter((u) => !u.horsService).length; // Simplify: assume all are court
  
  let courtHeb = 0, courtPdj = 0, extras = 0, nightsSold = 0, guestNights = 0, pdjCount = 0;
  
  folios.forEach((f) => { 
    if (!active(f)) return; 
    const c = folioCalc(f); 
    const on = overlapNights(f.arrival, f.departure, d0, d1); 
    if (on > 0) { 
      const pn = c.nights ? c.heb / c.nights : 0; 
      courtHeb += pn * on; 
      courtPdj += num((f as any).pdjParJour) * num((f as any).pdjPrix) * on; 
      nightsSold += on; 
      guestNights += num((f as any).pax || f.guestsCount) * on; 
      pdjCount += num((f as any).pdjParJour) * on; 
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

export default function StatistiquesPage() {
  const now = thisMonth();
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

  const s = useMemo(() => rangeStat(units, folios, monthList(start, end)), [units, folios, start, end]);

  const exportCSV = () => {
    downloadCSV(`juweirat_stats_${start}_${end}.csv`, [
      ["Immeuble Juweirat", frMonth(start) + " → " + frMonth(end)], 
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
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[11.5px] uppercase tracking-wider text-gold font-extrabold mb-1">Exploitation</div>
          <h1 className="text-2xl font-bold text-green m-0">Statistiques</h1>
          <div className="h-1 w-12 bg-gold mt-2 rounded-full" />
        </div>
        <button onClick={exportCSV} className="bg-gold text-white px-4 py-2 text-sm font-semibold rounded-lg hover:bg-gold/90 transition-colors">
          Exporter CSV
        </button>
      </div>

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
          <button onClick={() => { setStart(now); setEnd(now); }} className="px-3 py-2 text-sm text-green border border-gray-200 rounded-lg hover:bg-gray-50">
            Ce mois
          </button>
          <button onClick={() => { setStart(monthAdd(now, -11)); setEnd(now); }} className="px-3 py-2 text-sm text-green border border-gray-200 rounded-lg hover:bg-gray-50">
            12 mois
          </button>
          <div className="ml-auto text-sm text-gray-400 font-medium pb-2">{s.rows.length} mois</div>
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
              <tr>
                <th className="bg-green text-white text-[11.5px] uppercase tracking-wider font-bold py-3 px-4">Mois</th>
                <th className="bg-green text-white text-[11.5px] uppercase tracking-wider font-bold py-3 px-4 text-right">Occup.</th>
                <th className="bg-green text-white text-[11.5px] uppercase tracking-wider font-bold py-3 px-4 text-right">Nuits vendues</th>
                <th className="bg-green text-white text-[11.5px] uppercase tracking-wider font-bold py-3 px-4 text-right">CA nuitées</th>
                <th className="bg-green text-white text-[11.5px] uppercase tracking-wider font-bold py-3 px-4 text-right">CA total</th>
              </tr>
            </thead>
            <tbody>
              {s.rows.map((r: any, i: number) => {
                const to = r.availNights ? (r.occNights / r.availNights) * 100 : 0;
                return (
                  <tr key={r.ym} className={i % 2 !== 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="py-3 px-4 text-sm font-medium capitalize border-b border-gray-100">{frMonth(r.ym)}</td>
                    <td className="py-3 px-4 text-sm text-right border-b border-gray-100 font-mono">{fPct(to)}</td>
                    <td className="py-3 px-4 text-sm text-right border-b border-gray-100 font-mono">{fN(r.nightsSold)}</td>
                    <td className="py-3 px-4 text-sm text-right border-b border-gray-100 font-mono">{money(r.courtRevenue)}</td>
                    <td className="py-3 px-4 text-sm text-right border-b border-gray-100 font-mono font-bold text-green">{money(r.caTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-green">
                <td className="py-3 px-4 text-white font-extrabold text-sm uppercase">Total</td>
                <td className="py-3 px-4 text-gold font-extrabold text-sm text-right font-mono">{fPct(s.to)}</td>
                <td className="py-3 px-4 text-white font-extrabold text-sm text-right font-mono">{fN(s.nightsSold)}</td>
                <td className="py-3 px-4 text-white font-extrabold text-sm text-right font-mono">{money(s.courtRevenue)}</td>
                <td className="py-3 px-4 text-gold font-extrabold text-sm text-right font-mono">{money(s.caTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
