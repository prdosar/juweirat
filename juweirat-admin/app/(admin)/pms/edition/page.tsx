'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { pmsUnits, pmsFolios, pmsMaintenance } from '@/lib/pms';
import type { UnitDto, FolioDto, MaintenanceTicketDto } from '@/lib/pmsTypes';

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

const MAINT_STATUS: any = { ouvert: ["Ouvert", C.warn], en_cours: ["En cours", C.blue], resolu: ["Résolu", C.ok], annule: ["Annulé", C.muted] };

export default function EditionPage() {
  const now = thisMonth();
  const [from, setFrom] = useState(now + "-01");
  const [to, setTo] = useState(now + "-" + String(daysInMonth(now)).padStart(2, "0"));
  const [fRoom, setFRoom] = useState("tous");

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
    if (f.status === "Cancelled") return ["Annulée", C.muted];
    if (f.status === "NoShow") return ["No-show", C.danger];
    if (f.status === "CheckedOut") return ["Partie", C.muted];
    if (f.arrival > dateHotel) return ["Confirmée", C.gold];
    if (f.departure < dateHotel) return ["Départ en retard", C.danger];
    if (f.departure === dateHotel) return ["Départ prévu", C.warn];
    if (f.arrival === dateHotel && f.status !== "CheckedIn") return ["Arrivée prévue", C.gold];
    return ["En cours", C.ok];
  }

  const events = useMemo(() => {
    const ev: any[] = [];
    folios.forEach((f) => { 
      if (f.status === "Cancelled") return; 
      if (f.arrival < winEnd && from < f.departure) { 
        const life = resaLifecycle(f); 
        ev.push({ unitId: f.unitId, kind: "sejour", type: "Séjour", ref: f.number, label: f.guest || "(sans nom)", start: f.arrival, end: f.departure, statut: life[0], color: f.status === "CheckedOut" ? C.muted : f.status === "NoShow" ? C.danger : C.green2, fid: f.id }); 
      } 
    });
    tickets.forEach((t) => { 
      const end = t.resolvedAt || to; 
      if (t.createdAt <= to && end >= from) {
        ev.push({ unitId: t.unitId, zone: t.zone, spot: t.spot, kind: "maint", type: "Maintenance", ref: t.category, label: t.title, start: t.createdAt, end: t.resolvedAt || "", statut: (MAINT_STATUS[t.status] || [])[0], color: C.warn, priority: t.priority }); 
      }
    });
    cleaningEvents(folios, from, to).forEach((e) => ev.push(e));
    return fRoom === "tous" ? ev : ev.filter((e) => e.unitId === Number(fRoom));
  }, [folios, tickets, from, to, winEnd, dateHotel, fRoom]);

  const sejN = events.filter((e) => e.kind === "sejour").length;
  const arrN = folios.filter((f) => f.status !== "Cancelled" && inRoom(f.unitId) && f.arrival >= from && f.arrival <= to).length;
  const depN = folios.filter((f) => f.status !== "Cancelled" && inRoom(f.unitId) && f.departure >= from && f.departure <= to).length;
  const maintN = events.filter((e) => e.kind === "maint").length;
  const menageN = events.filter((e) => e.kind === "menage").length;
  
  const caByUnit = useMemo(() => { 
    const m: Record<number, any> = {}; 
    const d0 = from, d1 = addDays(to, 1); 
    unitsView.forEach((u) => { 
      let heb = 0, pdj = 0, extra = 0, nights = 0, stays = 0, losTot = 0; 
      folios.forEach((f) => { 
        if (f.unitId !== u.id || f.status === "Cancelled" || f.status === "NoShow") return; 
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
  }, [unitsView, folios, from, to]);

  const caTotal = Object.keys(caByUnit).reduce((sm, k) => sm + caByUnit[Number(k)].total, 0);
  const agg = Object.keys(caByUnit).reduce((a, k) => { 
    const x = caByUnit[Number(k)]; 
    a.heb += x.heb; a.nights += x.nights; a.stays += x.stays; a.losTot += x.losTot; 
    return a; 
  }, { heb: 0, nights: 0, stays: 0, losTot: 0 });
  const pmGlobal = agg.nights ? agg.heb / agg.nights : 0;
  const losGlobal = agg.stays ? agg.losTot / agg.stays : 0;

  const unitLabel = (id: number) => { const u = units.find((x) => x.id === id); return u ? u.label + " · " + u.type : null; };
  const byUnit = unitsView.map((u) => ({ u, evs: events.filter((e) => e.unitId === u.id).sort((a, b) => (a.start < b.start ? -1 : 1)) }));
  const communs = fRoom === "tous" ? events.filter((e) => e.kind === "maint" && (!e.unitId || e.zone === "commun")).sort((a, b) => (a.start < b.start ? -1 : 1)) : [];

  const list = Array.from({ length: Math.min(span, 92) }, (_, i) => addDays(from, i));
  const tooLong = span > 92;
  const dayW = 38, labelW = 150;

  const exportCSV = () => {
    downloadCSV(`edition_evenements_${from}_${to}.csv`, [
      ["Édition — évènements des chambres", frDate(from) + " → " + frDate(to)], 
      [], 
      ["Logement", "Type", "Référence", "Détail", "Début", "Fin", "Statut"], 
      ...events.slice().sort((a, b) => (a.start < b.start ? -1 : 1)).map((e) => [
        e.unitId ? (unitLabel(e.unitId) || e.unitId) : "Parties communes" + (e.spot ? " · " + e.spot : ""), 
        e.type, e.ref, e.label, frDate(e.start), e.end ? frDate(e.end) : "", e.statut || ""
      ]), 
      [], 
      ["Synthèse par chambre"], 
      ["Chambre", "Séjours", "Nuits", "Durée moy. (nuits)", "Prix moyen", "Hébergement", "PDJ", "Extras", "CA total"], 
      ...unitsView.filter((u) => caByUnit[u.id] && (caByUnit[u.id].total > 0 || caByUnit[u.id].stays > 0)).map((u) => { 
        const x = caByUnit[u.id]; 
        return [u.label + " · " + u.type, x.stays, x.nights, x.los.toFixed(1).replace(".", ","), Math.round(x.pm), Math.round(x.heb), Math.round(x.pdj), Math.round(x.extra), Math.round(x.total)]; 
      }), 
      ["TOTAL", agg.stays, agg.nights, losGlobal.toFixed(1).replace(".", ","), Math.round(pmGlobal), "", "", "", Math.round(caTotal)]
    ]);
  };

  const quick = (f: string, t2: string) => { setFrom(f); setTo(t2); };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-green/30 border-t-green rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[11.5px] uppercase tracking-wider text-gold font-extrabold mb-1">Édition · Rapport</div>
          <h1 className="text-2xl font-bold text-green m-0">Évènements des chambres</h1>
          <div className="h-1 w-12 bg-gold mt-2 rounded-full" />
        </div>
        <button onClick={exportCSV} className="bg-gold text-white px-4 py-2 text-sm font-semibold rounded-lg hover:bg-gold/90 transition-colors">
          Exporter CSV
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-40">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Du</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div className="w-40">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Au</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <button onClick={() => quick(now + "-01", now + "-" + String(daysInMonth(now)).padStart(2, "0"))} className="px-3 py-2 text-sm text-green border border-gray-200 rounded-lg hover:bg-gray-50">Ce mois</button>
          <button onClick={() => quick(dateHotel, addDays(dateHotel, 6))} className="px-3 py-2 text-sm text-green border border-gray-200 rounded-lg hover:bg-gray-50">7 jours</button>
          <button onClick={() => quick(dateHotel, addDays(dateHotel, 29))} className="px-3 py-2 text-sm text-green border border-gray-200 rounded-lg hover:bg-gray-50">30 jours</button>
          
          <div className="w-56">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Chambre</label>
            <select value={fRoom} onChange={e => setFRoom(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
              <option value="tous">Toutes les chambres</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.label} · {u.type}</option>)}
            </select>
          </div>
          <div className={`ml-auto text-sm pb-2 ${validPeriod ? 'text-gray-400 font-medium' : 'text-red-500 font-bold'}`}>
            {validPeriod ? `${span} jour(s) · ${events.length} évènement(s)` : "Période invalide"}
          </div>
        </div>
      </div>

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

      {validPeriod && !tooLong && (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm relative">
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
                    <div className="text-xs font-bold">{u.label}</div>
                    <div className="text-[10px] text-gray-400">{u.type}{u.horsService ? " · HS" : ""}</div>
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

      {tooLong && <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm text-gray-500 text-center">Période trop longue pour le calendrier ({span} jours). Réduis-la à 92 jours max pour l'afficher — l'export CSV reste disponible.</div>}
      
      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-400">
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-green-dark" /> séjour</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-gold" /> option</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-gray-400" /> parti</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundImage: `repeating-linear-gradient(45deg, ${C.warn}, ${C.warn} 5px, #D89A3A 5px, #D89A3A 10px)` }} /> maintenance</span>
        <span className="flex items-center gap-1.5"><div className="w-0.5 h-3 bg-blue-600" /> ménage 3 j</span>
      </div>

    </div>
  );
}
