'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { pmsUnits, pmsFolios, pmsMaintenance } from '@/lib/pms';
import type { UnitDto, FolioDto, MaintenanceTicketDto } from '@/lib/pmsTypes';
import { Search, BedDouble, Wrench, Sparkles, Calendar, ChevronRight, User, Phone, CheckCircle, AlertCircle, Clock, FileDown, Printer } from 'lucide-react';

const C = {
  green: "#1B4332", green2: "#2D5A45", gold: "#B08D57", gold2: "#C9A227",
  cream: "#F7F4EC", paper: "#FFFFFF", ink: "#2A2622", muted: "#8A8172",
  line: "#E4DCCB", rowAlt: "#FBF8F1", danger: "#9B2C2C", ok: "#2D6A4F", warn: "#B5761F", blue: "#2C5A7A",
};

const thisMonth = () => new Date().toISOString().slice(0, 7);
const todayStr = () => new Date().toISOString().slice(0, 10);
const daysInMonth = (ym: string) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m, 0).getDate(); };
const addDays = (s: string, n: number) => { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const dayDiff = (a: string, b: string) => Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000);
const frDate = (s: string) => (s ? new Date(s + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");
const frDay = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short" });
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

function cleaningEvents(folios: FolioDto[], from: string, to: string) {
  const out: any[] = [];
  folios.forEach((f) => {
    if (f.resaStatus === "Cancelled" || f.resaStatus === "NoShow") return;
    for (let d = addDays(f.arrival, 3); d < f.departure; d = addDays(d, 3)) { 
      if (d >= from && d <= to) out.push({ unitId: f.unitId, kind: "menage", type: "Ménage", ref: "Cadence 3 j", label: "Nettoyage mi-séjour", start: d, end: "", statut: "planifié", color: C.blue, midstay: true, fid: f.id }); 
    }
    if (f.departure >= from && f.departure <= to) {
      out.push({ unitId: f.unitId, kind: "menage", type: "Ménage", ref: "Départ", label: "Ménage après départ", start: f.departure, end: "", statut: "planifié", color: C.blue, midstay: false, fid: f.id + "-d" });
    }
  });
  return out;
}

const MAINT_STATUS: Record<string, [string, string]> = { 
  ouvert: ["Ouvert", C.warn], 
  en_cours: ["En cours", C.blue], 
  resolu: ["Résolu", C.ok], 
  annule: ["Annulé", C.muted] 
};

export default function EditionPage() {
  const now = thisMonth();
  const [from, setFrom] = useState(now + "-01");
  const [to, setTo] = useState(now + "-" + String(daysInMonth(now)).padStart(2, "0"));
  const [fRoom, setFRoom] = useState("tous");
  const [searchDetail, setSearchDetail] = useState("");
  const [filterType, setFilterType] = useState<"tous" | "sejours" | "maint" | "menage">("tous");

  const [units, setUnits] = useState<UnitDto[]>([]);
  const [folios, setFolios] = useState<FolioDto[]>([]);
  const [tickets, setTickets] = useState<MaintenanceTicketDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([pmsUnits.getAll(), pmsFolios.getAll(), pmsMaintenance.getAll()])
      .then(([u, f, t]) => {
        setUnits(u);
        setFolios(f);
        setTickets(t);
      })
      .finally(() => setLoading(false));
  }, []);

  const span = Math.max(0, dayDiff(from, to) + 1);
  const winEnd = addDays(to, 1);
  const validPeriod = to >= from;
  const unitsView = fRoom === "tous" ? units : units.filter((u) => u.id === Number(fRoom));
  const inRoom = (uid: number) => fRoom === "tous" || uid === Number(fRoom);
  const dateHotel = todayStr();

  function resaLifecycle(f: FolioDto): [string, string] {
    if (f.resaStatus === "Cancelled") return ["Annulée", C.muted];
    if (f.resaStatus === "NoShow") return ["No-show", C.danger];
    if (f.resaStatus === "CheckedOut") return ["Partie", C.muted];
    if (f.arrival > dateHotel) return ["Confirmée", C.gold];
    if (f.departure < dateHotel) return ["Départ en retard", C.danger];
    if (f.departure === dateHotel) return ["Départ prévu", C.warn];
    if (f.arrival === dateHotel && f.resaStatus !== "CheckedIn") return ["Arrivée prévue", C.gold];
    return ["En cours", C.ok];
  }

  const events = useMemo(() => {
    const ev: any[] = [];
    folios.forEach((f) => { 
      if (f.resaStatus === "Cancelled") return; 
      if (f.arrival < winEnd && from < f.departure) { 
        const life = resaLifecycle(f); 
        ev.push({ 
          unitId: f.unitId, 
          kind: "sejour", 
          type: "Séjour", 
          ref: f.number, 
          label: f.guest || "(sans nom)", 
          phone: f.guestPhone,
          start: f.arrival, 
          end: f.departure, 
          pax: f.pax,
          nights: f.nights,
          statut: life[0], 
          color: f.resaStatus === "CheckedOut" ? C.muted : f.resaStatus === "NoShow" ? C.danger : C.green2, 
          fid: f.id,
          total: f.heb + (f.pdjParJour * f.pdjPrix * f.nights) + f.debiteur + f.dependances,
          paid: f.paid + f.arrhes,
          solde: Math.max(0, (f.heb + (f.pdjParJour * f.pdjPrix * f.nights) + f.debiteur + f.dependances) - (f.paid + f.arrhes))
        }); 
      } 
    });
    tickets.forEach((t) => { 
      const end = t.resolvedAt || to; 
      if (t.createdAt <= to && end >= from) {
        ev.push({ 
          unitId: t.unitId, 
          zone: t.zone, 
          spot: t.spot, 
          kind: "maint", 
          type: "Maintenance", 
          ref: t.category, 
          label: t.title, 
          description: t.description,
          start: t.createdAt, 
          end: t.resolvedAt || "", 
          statut: (MAINT_STATUS[t.status] || ["Inconnu", C.muted])[0], 
          color: C.warn, 
          priority: t.priority 
        }); 
      }
    });
    cleaningEvents(folios, from, to).forEach((e) => ev.push(e));
    return fRoom === "tous" ? ev : ev.filter((e) => e.unitId === Number(fRoom));
  }, [folios, tickets, from, to, winEnd, dateHotel, fRoom]);

  const sejN = events.filter((e) => e.kind === "sejour").length;
  const arrN = folios.filter((f) => f.resaStatus !== "Cancelled" && inRoom(f.unitId) && f.arrival >= from && f.arrival <= to).length;
  const depN = folios.filter((f) => f.resaStatus !== "Cancelled" && inRoom(f.unitId) && f.departure >= from && f.departure <= to).length;
  const maintN = events.filter((e) => e.kind === "maint").length;
  const menageN = events.filter((e) => e.kind === "menage").length;
  
  const caByUnit = useMemo(() => { 
    const m: Record<number, any> = {}; 
    const d0 = from, d1 = addDays(to, 1); 
    units.forEach((u) => { 
      let heb = 0, pdj = 0, extra = 0, nights = 0, stays = 0, losTot = 0; 
      folios.forEach((f) => { 
        if (f.unitId !== u.id || f.resaStatus === "Cancelled" || f.resaStatus === "NoShow") return; 
        const c = folioCalc(f); 
        const on = overlapNights(f.arrival, f.departure, d0, d1); 
        if (on > 0) { 
          const pn = c.nights ? c.heb / c.nights : 0; 
          heb += pn * on; 
          pdj += num((f as any).pdjParJour) * num((f as any).pdjPrix) * on; 
          nights += on; 
        } 
        if (f.arrival < d1 && f.departure > d0) { 
          stays++; 
          losTot += Math.max(0, dayDiff(f.arrival, f.departure)); 
        } 
        if (f.arrival >= d0 && f.arrival < d1) {
          extra += c.deb + c.dep; 
        }
      }); 
      const total = heb + pdj + extra; 
      m[u.id] = { heb, pdj, extra, nights, total, stays, losTot, pm: nights ? heb / nights : 0, los: stays ? losTot / stays : 0 }; 
    }); 
    return m; 
  }, [units, folios, from, to]);

  const caTotal = unitsView.reduce((sm, u) => sm + (caByUnit[u.id]?.total || 0), 0);
  const agg = unitsView.reduce((a, u) => { 
    const x = caByUnit[u.id] || { heb: 0, pdj: 0, extra: 0, nights: 0, stays: 0, losTot: 0, total: 0 }; 
    a.heb += x.heb; 
    a.pdj += x.pdj;
    a.extra += x.extra;
    a.nights += x.nights; 
    a.stays += x.stays; 
    a.losTot += x.losTot; 
    a.total += x.total;
    return a; 
  }, { heb: 0, pdj: 0, extra: 0, nights: 0, stays: 0, losTot: 0, total: 0 });
  
  const pmGlobal = agg.nights ? agg.heb / agg.nights : 0;
  const losGlobal = agg.stays ? agg.losTot / agg.stays : 0;

  const unitLabel = (id: number) => { const u = units.find((x) => x.id === id); return u ? u.nameFr + " · " + u.pmsType : null; };
  const byUnit = unitsView.map((u) => ({ 
    u, 
    evs: events.filter((e) => e.unitId === u.id).sort((a, b) => (a.start < b.start ? -1 : 1)),
    stays: events.filter((e) => e.unitId === u.id && e.kind === "sejour"),
    maints: events.filter((e) => e.unitId === u.id && e.kind === "maint"),
    cleanings: events.filter((e) => e.unitId === u.id && e.kind === "menage"),
  }));

  // Filtering for detail view
  const filteredUnits = useMemo(() => {
    const q = searchDetail.trim().toLowerCase();
    return byUnit.filter(({ u, evs, stays, maints, cleanings }) => {
      if (filterType === "sejours" && stays.length === 0) return false;
      if (filterType === "maint" && maints.length === 0) return false;
      if (filterType === "menage" && cleanings.length === 0) return false;
      if (!q) return true;
      
      const matchUnit = u.nameFr.toLowerCase().includes(q) || u.pmsType.toLowerCase().includes(q) || u.roomNumber.toLowerCase().includes(q);
      const matchEvent = evs.some(e => 
        (e.label && e.label.toLowerCase().includes(q)) ||
        (e.ref && e.ref.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.phone && e.phone.includes(q))
      );
      return matchUnit || matchEvent;
    });
  }, [byUnit, searchDetail, filterType]);

  const list = Array.from({ length: Math.min(span, 92) }, (_, i) => addDays(from, i));
  const tooLong = span > 92;
  const dayW = 38, labelW = 150;

  const exportCSV = () => {
    downloadCSV(`edition_evenements_${from}_${to}.csv`, [
      ["Édition — Synthèse & Évènements des chambres", frDate(from) + " → " + frDate(to)], 
      [], 
      ["SYNTHÈSE PAR CHAMBRE"],
      ["Logement", "Type", "Séjours", "Nuits vendues", "Durée moy. (j)", "Prix moyen (ADR)", "Hébergement", "Petit Déjeuner", "Extras", "CA Total"], 
      ...unitsView.map((u) => { 
        const x = caByUnit[u.id] || { stays: 0, nights: 0, los: 0, pm: 0, heb: 0, pdj: 0, extra: 0, total: 0 }; 
        return [
          u.nameFr, 
          u.pmsType, 
          x.stays, 
          x.nights, 
          x.los.toFixed(1).replace(".", ","), 
          Math.round(x.pm), 
          Math.round(x.heb), 
          Math.round(x.pdj), 
          Math.round(x.extra), 
          Math.round(x.total)
        ]; 
      }), 
      ["TOTAL CONSOLIDÉ", "", agg.stays, agg.nights, losGlobal.toFixed(1).replace(".", ","), Math.round(pmGlobal), Math.round(agg.heb), Math.round(agg.pdj), Math.round(agg.extra), Math.round(agg.total)],
      [], 
      ["DÉTAIL DES ÉVÈNEMENTS"],
      ["Logement", "Type d'évènement", "Référence / Rôle", "Détail / Client", "Date Début", "Date Fin", "Statut"], 
      ...events.slice().sort((a, b) => (a.start < b.start ? -1 : 1)).map((e) => [
        e.unitId ? (unitLabel(e.unitId) || e.unitId) : "Parties communes" + (e.spot ? " · " + e.spot : ""), 
        e.type, 
        e.ref, 
        e.label, 
        frDate(e.start), 
        e.end ? frDate(e.end) : "", 
        e.statut || ""
      ])
    ]);
  };

  const printConsolidated = () => {
    window.print();
  };

  const quick = (f: string, t2: string) => { setFrom(f); setTo(t2); };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-green/30 border-t-green rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11.5px] uppercase tracking-wider text-gold font-extrabold mb-1">Édition · Reporting Consolidé</div>
          <h1 className="text-2xl font-bold text-green m-0">Évènements & Synthèse des Logements</h1>
          <div className="h-1 w-12 bg-gold mt-2 rounded-full" />
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={exportCSV} className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-charcoal px-3.5 py-2 text-sm font-semibold rounded-lg hover:bg-gray-50 shadow-sm transition-colors">
            <FileDown size={16} className="text-green" />
            Exporter CSV
          </button>
          <button onClick={printConsolidated} className="inline-flex items-center gap-1.5 bg-gold text-white px-4 py-2 text-sm font-semibold rounded-lg hover:bg-gold/90 shadow-sm transition-colors">
            <Printer size={16} />
            Imprimer
          </button>
        </div>
      </div>

      {/* Date Filters Card */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-40">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Du</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green/20 focus:border-green" />
          </div>
          <div className="w-40">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Au</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green/20 focus:border-green" />
          </div>
          <button onClick={() => quick(now + "-01", now + "-" + String(daysInMonth(now)).padStart(2, "0"))} className="px-3 py-2 text-sm text-green font-medium border border-gray-200 rounded-lg hover:bg-green/5">Ce mois</button>
          <button onClick={() => quick(dateHotel, addDays(dateHotel, 6))} className="px-3 py-2 text-sm text-green font-medium border border-gray-200 rounded-lg hover:bg-green/5">7 jours</button>
          <button onClick={() => quick(dateHotel, addDays(dateHotel, 29))} className="px-3 py-2 text-sm text-green font-medium border border-gray-200 rounded-lg hover:bg-green/5">30 jours</button>
          
          <div className="w-56">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Chambre</label>
            <select value={fRoom} onChange={e => setFRoom(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green/20 focus:border-green">
              <option value="tous">Toutes les chambres ({units.length})</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.nameFr} · {u.pmsType}</option>)}
            </select>
          </div>
          <div className={`ml-auto text-sm pb-2 ${validPeriod ? 'text-gray-400 font-medium' : 'text-red-500 font-bold'}`}>
            {validPeriod ? `${span} jour(s) · ${events.length} évènement(s)` : "Période invalide"}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Séjours', value: sejN, c: 'text-green-dark' },
          { label: 'Arrivées', value: arrN, c: 'text-green' },
          { label: 'Départs', value: depN, c: 'text-green' },
          { label: 'Interventions', value: maintN, c: maintN ? 'text-amber-600' : 'text-green' },
          { label: 'Ménages', value: menageN, c: 'text-blue-600' },
          { label: 'Prix moyen', value: money(pmGlobal), c: 'text-green-dark' },
          { label: 'Durée moy.', value: losGlobal ? losGlobal.toFixed(1).replace(".", ",") + " n" : "—", c: 'text-green' },
          { label: 'CA période', value: money(caTotal), c: 'text-gold' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm text-center">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{kpi.label}</div>
            <div className={`text-sm font-extrabold ${kpi.c}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Graphic Calendar */}
      {validPeriod && !tooLong && (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm relative">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-green m-0 flex items-center gap-2">
              <Calendar size={16} className="text-gold" />
              Calendrier des Évènements par Logement
            </h2>
            <span className="text-xs text-gray-400">{frDate(from)} → {frDate(to)}</span>
          </div>
          <div className="overflow-x-auto">
            <div style={{ minWidth: labelW + list.length * dayW }}>
              <div className="flex bg-green text-white">
                <div style={{ width: labelW }} className="shrink-0 px-3 py-2 text-xs font-bold uppercase tracking-wider border-r border-white/10 flex items-center">
                  Logement
                </div>
                {list.map((d) => {
                  const wd = new Date(d + "T00:00:00").getDay(); 
                  const we = wd === 0 || wd === 6; 
                  const isT = d === dateHotel; 
                  return (
                    <div key={d} style={{ width: dayW, backgroundColor: isT ? 'rgba(201,162,39,.20)' : 'transparent' }} className={`shrink-0 text-center py-1 border-r border-white/10 ${isT ? 'text-gold-light' : ''}`}>
                      <div className={`text-[9px] capitalize ${we ? 'opacity-60' : ''}`}>{frDay(d)}</div>
                      <div className="text-xs font-bold">{d.slice(8)}</div>
                    </div>
                  );
                })}
              </div>

              {byUnit.map(({ u, evs }, ri) => (
                <div key={u.id} className={`flex border-b border-gray-100 h-12 ${ri % 2 ? 'bg-gray-50' : 'bg-white'}`}>
                  <div style={{ width: labelW }} className="shrink-0 px-3 py-1 flex flex-col justify-center border-r border-gray-100 bg-inherit z-10">
                    <div className="text-xs font-bold">{u.nameFr}</div>
                    <div className="text-[10px] text-gray-400">{u.pmsType}{u.horsService ? " · HS" : ""}</div>
                    {caByUnit[u.id] && caByUnit[u.id].total > 0 && <div className="text-[9px] text-green-dark font-bold">CA {money(caByUnit[u.id].total)}</div>}
                  </div>
                  <div className="relative shrink-0" style={{ width: list.length * dayW }}>
                    {list.map((d, i) => { 
                      const wd = new Date(d + "T00:00:00").getDay(); 
                      const we = wd === 0 || wd === 6; 
                      return <div key={d} style={{ left: i * dayW, width: dayW }} className={`absolute top-0 h-12 border-r border-gray-100 ${we ? 'bg-black/5' : ''}`} />; 
                    })}
                    {evs.filter(e => e.kind === "sejour").map(e => { 
                      const s = e.start > from ? e.start : from; 
                      const en = e.end < winEnd ? e.end : winEnd; 
                      const off = dayDiff(from, s); 
                      const w = Math.max(1, dayDiff(s, en)); 
                      return (
                        <div key={"s" + e.fid} title={`${e.label} · ${frDate(e.start)}→${frDate(e.end)}`} style={{ left: off * dayW + 2, width: w * dayW - 4, backgroundColor: e.color }} className="absolute top-1.5 h-5 rounded overflow-hidden text-white text-[10px] font-bold flex items-center px-1.5 whitespace-nowrap shadow-sm z-10">
                          {e.label}
                        </div>
                      ); 
                    })}
                    {evs.filter(e => e.kind === "menage" && e.midstay).map((e, k) => { 
                      const off = dayDiff(from, e.start); 
                      if (off < 0 || off >= list.length) return null; 
                      return <div key={"c" + k} title={`Ménage · ${frDate(e.start)}`} style={{ left: off * dayW + dayW / 2 - 1 }} className="absolute top-1.5 w-0.5 h-5 bg-white/90 z-20 shadow-sm" />; 
                    })}
                    {evs.filter(e => e.kind === "menage" && !e.midstay).map((e, k) => { 
                      const off = dayDiff(from, e.start); 
                      if (off < 0 || off >= list.length) return null; 
                      return <div key={"cd" + k} title={`Ménage après départ · ${frDate(e.start)}`} style={{ left: off * dayW + dayW / 2 - 4, backgroundColor: C.blue }} className="absolute top-[34px] w-2 h-2 rounded-full z-10" />; 
                    })}
                    {evs.filter(e => e.kind === "maint").map((e, k) => { 
                      const eEnd = e.end || to; 
                      const s = e.start > from ? e.start : from; 
                      const en = (eEnd < to ? eEnd : to); 
                      const off = dayDiff(from, s); 
                      const w = Math.max(1, dayDiff(s, en) + 1); 
                      return (
                        <div key={"m" + k} title={`Maintenance · ${e.label} (${e.statut || ""})`} style={{ left: off * dayW + 2, width: w * dayW - 4, backgroundImage: `repeating-linear-gradient(45deg, ${C.warn}, ${C.warn} 5px, #D89A3A 5px, #D89A3A 10px)` }} className="absolute top-8 h-2.5 rounded shadow-sm opacity-90 z-10" />
                      ); 
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tooLong && <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm text-gray-500 text-center">Période trop longue pour le calendrier graphique ({span} jours). Réduis-la à 92 jours max pour l'afficher — le tableau récapitulatif et l'export CSV restent disponibles.</div>}
      
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-400 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-green-dark" /> Séjour en cours</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-gold" /> Arrivée / Option</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-gray-400" /> Séjour clôturé</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundImage: `repeating-linear-gradient(45deg, ${C.warn}, ${C.warn} 5px, #D89A3A 5px, #D89A3A 10px)` }} /> Maintenance</span>
        <span className="flex items-center gap-1.5"><div className="w-0.5 h-3 bg-blue-600" /> Ménage mi-séjour (3j)</span>
        <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-600" /> Ménage départ</span>
      </div>

      {/* ── SECTION 1 : SYNTHÈSE PAR CHAMBRE ── */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-surface/50">
          <div>
            <h2 className="text-base font-bold text-charcoal m-0 flex items-center gap-2">
              <BedDouble size={18} className="text-gold" />
              Synthèse d'Activité par Chambre
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Indicateurs clés et chiffre d'affaires consolidé sur la période du {frDate(from)} au {frDate(to)}</p>
          </div>
          <span className="text-xs font-bold text-green bg-green/10 px-2.5 py-1 rounded-full">{unitsView.length} Logements</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-green text-white text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Logement</th>
                <th className="py-3 px-4">Type / Gamme</th>
                <th className="py-3 px-4 text-center">Séjours</th>
                <th className="py-3 px-4 text-center">Nuits</th>
                <th className="py-3 px-4 text-right">Durée moy.</th>
                <th className="py-3 px-4 text-right">Prix moyen (ADR)</th>
                <th className="py-3 px-4 text-right">Hébergement</th>
                <th className="py-3 px-4 text-right">Petit Déj.</th>
                <th className="py-3 px-4 text-right">Extras</th>
                <th className="py-3 px-4 text-right font-extrabold text-gold-light">Chiffre d'Affaires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {unitsView.map((u, i) => {
                const x = caByUnit[u.id] || { stays: 0, nights: 0, los: 0, pm: 0, heb: 0, pdj: 0, extra: 0, total: 0 };
                return (
                  <tr key={u.id} className={`hover:bg-green/5 transition-colors ${i % 2 ? 'bg-gray-50/50' : 'bg-white'}`}>
                    <td className="py-3 px-4 font-bold text-charcoal flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: u.horsService ? C.danger : C.ok }} />
                      {u.nameFr}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{u.pmsType}</td>
                    <td className="py-3 px-4 text-center font-semibold">{x.stays || '—'}</td>
                    <td className="py-3 px-4 text-center font-semibold">{x.nights || '—'}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{x.los ? x.los.toFixed(1).replace(".", ",") + " j" : "—"}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{x.pm ? money(x.pm) : "—"}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-700">{money(x.heb)}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{money(x.pdj)}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{money(x.extra)}</td>
                    <td className="py-3 px-4 text-right font-bold text-green-dark">{money(x.total)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-surface font-extrabold text-charcoal border-t-2 border-green text-sm">
                <td colSpan={2} className="py-3.5 px-4 text-green uppercase text-xs tracking-wider">TOTAL CONSOLIDÉ</td>
                <td className="py-3.5 px-4 text-center text-green-dark">{agg.stays}</td>
                <td className="py-3.5 px-4 text-center text-green-dark">{agg.nights}</td>
                <td className="py-3.5 px-4 text-right text-green-dark">{losGlobal ? losGlobal.toFixed(1).replace(".", ",") + " j" : "—"}</td>
                <td className="py-3.5 px-4 text-right text-green-dark">{money(pmGlobal)}</td>
                <td className="py-3.5 px-4 text-right text-green-dark">{money(agg.heb)}</td>
                <td className="py-3.5 px-4 text-right text-green-dark">{money(agg.pdj)}</td>
                <td className="py-3.5 px-4 text-right text-green-dark">{money(agg.extra)}</td>
                <td className="py-3.5 px-4 text-right text-base text-gold font-black">{money(agg.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── SECTION 2 : DÉTAIL PAR LOGEMENT AVEC RECHERCHE ── */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface/50">
          <div>
            <h2 className="text-base font-bold text-charcoal m-0 flex items-center gap-2">
              <Search size={18} className="text-gold" />
              Détail des Évènements par Logement
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Historique des séjours clients, interventions techniques et passages de ménage</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Bar */}
            <div className="relative min-w-[260px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchDetail}
                onChange={e => setSearchDetail(e.target.value)}
                placeholder="Rechercher logement, client, ticket..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green"
              />
              {searchDetail && (
                <button onClick={() => setSearchDetail("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-charcoal text-xs">
                  ✕
                </button>
              )}
            </div>

            {/* Filter Chips */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-xs font-semibold text-gray-500">
              <button onClick={() => setFilterType("tous")} className={`px-2.5 py-1 rounded-md transition-colors ${filterType === 'tous' ? 'bg-white text-green shadow-sm' : 'hover:text-charcoal'}`}>Tous</button>
              <button onClick={() => setFilterType("sejours")} className={`px-2.5 py-1 rounded-md transition-colors ${filterType === 'sejours' ? 'bg-white text-green shadow-sm' : 'hover:text-charcoal'}`}>Séjours</button>
              <button onClick={() => setFilterType("maint")} className={`px-2.5 py-1 rounded-md transition-colors ${filterType === 'maint' ? 'bg-white text-green shadow-sm' : 'hover:text-charcoal'}`}>Maintenance</button>
              <button onClick={() => setFilterType("menage")} className={`px-2.5 py-1 rounded-md transition-colors ${filterType === 'menage' ? 'bg-white text-green shadow-sm' : 'hover:text-charcoal'}`}>Ménages</button>
            </div>
          </div>
        </div>

        {filteredUnits.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            Aucun évènement ne correspond à vos critères de recherche sur la période.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredUnits.map(({ u, stays, maints, cleanings }) => (
              <div key={u.id} className="p-5 hover:bg-gray-50/30 transition-colors space-y-4">
                {/* Unit Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green text-white font-bold flex items-center justify-center text-sm shadow-sm">
                      {u.roomNumber}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-charcoal m-0">{u.nameFr}</h3>
                      <div className="text-xs text-gray-400">{u.pmsType} · Étage {u.floor} {u.horsService ? "· [HORS SERVICE]" : ""}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1.5 text-charcoal font-semibold">
                      <BedDouble size={14} className="text-green" />
                      {stays.length} séjour(s)
                    </span>
                    <span className="flex items-center gap-1.5 text-charcoal font-semibold">
                      <Wrench size={14} className="text-amber-600" />
                      {maints.length} ticket(s)
                    </span>
                    <span className="flex items-center gap-1.5 text-charcoal font-semibold">
                      <Sparkles size={14} className="text-blue-600" />
                      {cleanings.length} ménage(s)
                    </span>
                    <div className="pl-3 border-l border-gray-200 font-extrabold text-gold">
                      CA {money(caByUnit[u.id]?.total || 0)}
                    </div>
                  </div>
                </div>

                {/* Sub-sections grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* 1. Séjours */}
                  <div className="bg-white border border-gray-100 rounded-lg p-3 shadow-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-green flex items-center gap-1.5">
                        <BedDouble size={14} />
                        Séjours ({stays.length})
                      </span>
                    </div>
                    {stays.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-2">Aucun séjour sur la période.</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {stays.map((s, idx) => (
                          <div key={idx} className="p-2.5 rounded bg-surface text-xs space-y-1 border border-gray-100">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-charcoal">{s.label}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: s.color + "20", color: s.color }}>
                                {s.statut}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500 flex items-center justify-between">
                              <span>{frDate(s.start)} → {frDate(s.end)}</span>
                              <span>{s.nights} nuit(s) · {s.pax} pers.</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-200/50 font-medium">
                              <span className="text-green-dark font-bold">{money(s.total)}</span>
                              <span className={s.solde > 0 ? "text-red-600 font-bold" : "text-green font-semibold"}>
                                {s.solde > 0 ? `Reste ${money(s.solde)}` : "Soldé ✓"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2. Maintenance */}
                  <div className="bg-white border border-gray-100 rounded-lg p-3 shadow-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                        <Wrench size={14} />
                        Problèmes techniques ({maints.length})
                      </span>
                    </div>
                    {maints.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-2">Aucune intervention signalée.</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {maints.map((m, idx) => (
                          <div key={idx} className="p-2.5 rounded bg-surface text-xs space-y-1 border border-gray-100">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-charcoal">{m.label}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: m.color + "20", color: m.color }}>
                                {m.statut}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500">
                              Catégorie : <span className="font-medium text-charcoal">{m.ref}</span> {m.priority ? `· Priorité ${m.priority}` : ''}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              Créé le {frDate(m.start)} {m.end ? `· Résolu le ${frDate(m.end)}` : '· En cours'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 3. Ménages */}
                  <div className="bg-white border border-gray-100 rounded-lg p-3 shadow-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                        <Sparkles size={14} />
                        Passages Ménage ({cleanings.length})
                      </span>
                    </div>
                    {cleanings.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-2">Aucun ménage planifié.</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {cleanings.map((c, idx) => (
                          <div key={idx} className="p-2.5 rounded bg-surface text-xs flex items-center justify-between border border-gray-100">
                            <div>
                              <div className="font-bold text-charcoal">{c.label}</div>
                              <div className="text-[10px] text-gray-400">{c.ref} · Date : {frDate(c.start)}</div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                              Planifié
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
