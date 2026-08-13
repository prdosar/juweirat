import React, { useState, useEffect, useMemo, createContext, useContext } from "react";
import { apiServices } from '../api/services';

/* ============================================================
   GESTION JUWEIRAT — PMS (Lomé) · Livrable 1
   Aligné sur les 5 concepts FOLS : date hôtel · nuitée ·
   folio · main courante · deux axes de statut.
   ============================================================ */

const C = {
  green: "#1B4332", green2: "#2D5A45", gold: "#B08D57", gold2: "#C9A227",
  cream: "#F7F4EC", paper: "#FFFFFF", ink: "#2A2622", muted: "#8A8172",
  line: "#E4DCCB", rowAlt: "#FBF8F1", danger: "#9B2C2C", ok: "#2D6A4F", warn: "#B5761F", blue: "#2C5A7A",
};
const KEYS = { config: "juweirat:config", units: "juweirat:units", folios: "juweirat:folios", monthly: "juweirat:monthly", debtors: "juweirat:debtors", postings: "juweirat:postings", clotures: "juweirat:clotures", factures: "juweirat:factures", maintenance: "juweirat:maintenance" };
const SEGMENTS = ["Direct", "OTA", "Société", "Agence", "Autre"];
const RESA_STATUS = ["option", "confirmée", "garantie", "no-show", "annulée"];

const iso0 = () => new Date().toISOString().slice(0, 10);
const JUWEIRAT_FLOORS = [
  { floor: 2, rooms: [{ no: "24", type: "T3", col: 0, row: 0 }, { no: "22", type: "T2", col: 0, row: 1 }, { no: "21", type: "T1", col: 0, row: 2 }, { no: "25", type: "T2", col: 1, row: 0 }, { no: "23", type: "T3", col: 1, row: 1 }] },
  { floor: 4, rooms: [{ no: "44", type: "T3", col: 0, row: 0 }, { no: "42", type: "T2", col: 0, row: 1 }, { no: "41", type: "T1", col: 0, row: 2 }, { no: "46", type: "T1", col: 1, row: 0 }, { no: "45", type: "T2", col: 1, row: 1 }, { no: "43", type: "T3", col: 1, row: 2 }] },
  { floor: 5, rooms: [{ no: "54", type: "T3", col: 0, row: 0 }, { no: "52", type: "T2", col: 0, row: 1 }, { no: "51", type: "T1", col: 0, row: 2 }, { no: "56", type: "T1", col: 1, row: 0 }, { no: "55", type: "T2", col: 1, row: 1 }, { no: "53", type: "T3", col: 1, row: 2 }] },
  { floor: 6, rooms: [{ no: "61", type: "T1", col: 0, row: 0 }, { no: "67", type: "T4", col: 1, row: 0 }] },
];
const TYPE_DEFAULTS = { T1: { rent: 85000, rate: 18000 }, T2: { rent: 150000, rate: 30000 }, T3: { rent: 200000, rate: 40000 } };
// Grille tarifaire réelle (FCFA). 3 tarifs selon la durée : nuitée (élec incl.) / 15 nuits / 30 nuits (hors élec).
const TARIFS = {
  "22": { type: "T2", gamme: "supérieure", nuit: 45000, n15: 325000, n30: 600000 },
  "23": { type: "T3", gamme: "supérieure", nuit: 80000, n15: 500000, n30: 900000 },
  "24": { type: "T3", gamme: "supérieure", nuit: 80000, n15: 500000, n30: 900000 },
  "25": { type: "T2", gamme: "privilège", nuit: 55000, n15: 350000, n30: 700000 },
  "41": { type: "T1", gamme: "standard", nuit: 30000, n15: 200000, n30: 300000 },
  "42": { type: "T2", gamme: "standard", nuit: 40000, n15: 300000, n30: 450000 },
  "43": { type: "T3", gamme: "standard", nuit: 65000, n15: 450000, n30: 750000 },
  "44": { type: "T3", gamme: "standard", nuit: 65000, n15: 450000, n30: 750000 },
  "45": { type: "T2", gamme: "supérieure", nuit: 45000, n15: 300000, n30: 500000 },
  "46": { type: "T1", gamme: "supérieur", nuit: 35000, n15: 250000, n30: 400000 },
  "51": { type: "T1", gamme: "standard", nuit: 30000, n15: 200000, n30: 300000 },
  "52": { type: "T2", gamme: "standard", nuit: 40000, n15: 300000, n30: 450000 },
  "53": { type: "T3", gamme: "standard", nuit: 65000, n15: 450000, n30: 750000 },
  "54": { type: "T3", gamme: "standard", nuit: 65000, n15: 450000, n30: 750000 },
  "55": { type: "T2", gamme: "supérieure", nuit: 45000, n15: 300000, n30: 500000 },
  "56": { type: "T1", gamme: "supérieure", nuit: 35000, n15: 250000, n30: 400000 },
  "61": { type: "T1", gamme: "privilège", nuit: 40000, n15: 300000, n30: 450000 },
  "67": { type: "T4", gamme: "suite", nuit: 95000, n15: 800000, n30: 1500000 },
};
const FALLBACK_TARIF = { T1: { nuit: 30000, n15: 200000, n30: 300000 }, T2: { nuit: 40000, n15: 300000, n30: 450000 }, T3: { nuit: 65000, n15: 450000, n30: 750000 }, T4: { nuit: 95000, n15: 800000, n30: 1500000 } };
const tarifsForRoom = (no, type) => { const g = TARIFS[no]; if (g) return { nuit: g.nuit, n15: g.n15, n30: g.n30 }; return FALLBACK_TARIF[type] || FALLBACK_TARIF.T2; };
// Sélection du tarif selon la durée du séjour
function tarifForStay(tarifs, nights) { if (!tarifs) return null; if (nights >= 30) return { tier: "30 nuits", key: "n30", perNight: tarifs.n30 / 30, elec: false }; if (nights >= 15) return { tier: "15 nuits", key: "n15", perNight: tarifs.n15 / 15, elec: false }; return { tier: "nuitée", key: "nuit", perNight: tarifs.nuit, elec: true }; }
const genUnits = () => {
  const u = [];
  JUWEIRAT_FLOORS.forEach((fl) => fl.rooms.forEach((r) => {
    const tar = tarifsForRoom(r.no, r.type);
    const gamme = (TARIFS[r.no] && TARIFS[r.no].gamme) || "standard";
    u.push({ id: r.no, label: "Logement " + r.no, type: r.type, gamme, mode: "court", rent: tar.n30, rate: tar.nuit, tarifs: { nuit: tar.nuit, n15: tar.n15, n30: tar.n30 }, tenant: "", leaseStart: "", phone: "", note: "", hs: false, statutMenage: "propre", floor: fl.floor, roomNo: r.no, planCol: r.col, planRow: r.row });
  }));
  return u;
};
const DEFAULT_CONFIG = { buildingName: "Immeuble Juweirat", ownerName: "Saka Tidjani", city: "Lomé", currency: { code: "FCFA", decimals: 0 }, dateHotel: iso0(), resaSeq: 0, factureSeq: 0 };

async function loadKey(key, fb) {
  try {
    if (key === "juweirat:config") return await apiServices.getConfig() || fb;
    if (key === "juweirat:units") { const obj = await apiServices.getRooms(); return Object.values(obj) || fb; }
    if (key === "juweirat:folios") { const obj = await apiServices.getReservations(); return Object.values(obj) || fb; }
    if (key === "juweirat:factures") { const obj = await apiServices.getFactures(); return Object.values(obj) || fb; }
    if (key === "juweirat:clotures") return await apiServices.getClotures() || fb;
    if (key === "juweirat:postings") return await apiServices.getPostings() || fb;
    if (key === "juweirat:debtors") return await apiServices.getDebtors() || fb;
    if (key === "juweirat:monthly") return await apiServices.getMonthly() || fb;
    if (key === "juweirat:maintenance") return await apiServices.getMaintenanceTickets() || fb;
  } catch (e) { console.error(e); }
  return fb;
}
async function saveKey(key, v) {
  try {
    if (key === "juweirat:config") { await apiServices.updateConfig(v); return; }
    if (key === "juweirat:monthly") { await apiServices.saveMonthly(v); return; }
    if (key === "juweirat:debtors") { await Promise.all(v.map(d => apiServices.saveDebtor(d))); return; }
    if (key === "juweirat:maintenance") { await Promise.all(v.map(t => apiServices.saveMaintenanceTicket(t))); return; }
    if (key === "juweirat:units" || key === "juweirat:folios") return;
  } catch (e) { console.error(e); }
}

const num = (v) => (typeof v === "number" && isFinite(v) ? v : 0);
const fN = (n, d = 0) => num(n).toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const fPct = (n) => num(n).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " %";

const MoneyCtx = createContext(DEFAULT_CONFIG.currency);
function useMoney() { const c = useContext(MoneyCtx) || DEFAULT_CONFIG.currency; return (n) => (c.decimals ? num(n).toLocaleString("fr-FR", { minimumFractionDigits: c.decimals, maximumFractionDigits: c.decimals }) : Math.round(num(n)).toLocaleString("fr-FR")) + " " + (c.code || "FCFA"); }

const iso = (d) => d.toISOString().slice(0, 10);
const today = () => iso(new Date());
const addDays = (s, n) => { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return iso(d); };
const dayDiff = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
const frDate = (s) => (s ? new Date(s + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");
const frDateLong = (s) => (s ? new Date(s + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) : "—");
const frDay = (s) => new Date(s + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short" });
const thisMonth = () => today().slice(0, 7);
const daysInMonth = (ym) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m, 0).getDate(); };
const monthAdd = (ym, n) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m - 1 + n, 1).toISOString().slice(0, 7); };
const monthList = (a, b) => { const o = []; let c = a, g = 0; while (c <= b && g < 60) { o.push(c); c = monthAdd(c, 1); g++; } return o; };
const frMonth = (ym) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }); };

function downloadCSV(fn, rows) { const csv = rows.map((r) => r.map((c) => { const s = String(c == null ? "" : c); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(";")).join("\n"); const b = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = fn; a.click(); URL.revokeObjectURL(u); }
function downloadText(fn, t) { const b = new Blob([t], { type: "text/plain;charset=utf-8;" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = fn; a.click(); URL.revokeObjectURL(u); }

/* ---------- atoms ---------- */
function Btn({ children, onClick, kind = "primary", size = "md", title, style, disabled }) {
  const base = { border: "1px solid transparent", borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer", fontWeight: 600, padding: size === "sm" ? "5px 10px" : "9px 16px", fontSize: size === "sm" ? 12.5 : 13.5, opacity: disabled ? 0.5 : 1 };
  const k = { primary: { background: C.green, color: "#fff" }, gold: { background: C.gold, color: "#fff" }, ghost: { background: "transparent", color: C.green, borderColor: C.line }, danger: { background: "transparent", color: C.danger, borderColor: "#E4C6C6" } };
  return <button title={title} disabled={disabled} onClick={onClick} style={{ ...base, ...k[kind], ...style }}>{children}</button>;
}
function Field({ label, children, hint }) { return (<label style={{ display: "block" }}><div style={{ fontSize: 11.5, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>{label}</div>{children}{hint && <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{hint}</div>}</label>); }
const inputStyle = { width: "100%", padding: "8px 10px", border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 14, color: C.ink, background: "#fff", boxSizing: "border-box" };
const NumInput = ({ value, onChange, min }) => <input type="number" min={min} value={value === 0 || value ? value : ""} onChange={(e) => onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))} style={inputStyle} />;
const MoneyInput = ({ value, onChange, min }) => { const cur = useContext(MoneyCtx); return (<div style={{ position: "relative", width: "100%" }}><input type="number" min={min} value={value === 0 || value ? value : ""} onChange={(e) => onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))} style={{ ...inputStyle, paddingRight: 46, textAlign: "right" }} /><span style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", fontSize: 10.5, fontWeight: 700, color: C.muted, pointerEvents: "none" }}>{cur.code}</span></div>); };
const TextInput = ({ value, onChange, placeholder }) => <input type="text" value={value || ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={inputStyle} />;
const DateInput = ({ value, onChange }) => <input type="date" value={value || ""} onChange={(e) => onChange(e.target.value)} style={inputStyle} />;
const MonthInput = ({ value, onChange }) => <input type="month" value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />;
const Select = ({ value, onChange, options }) => <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>{options.map((o) => <option key={o.v ?? o} value={o.v ?? o}>{o.l ?? o}</option>)}</select>;
function Card({ children, style }) { return <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 10, ...style }}>{children}</div>; }
function SectionTitle({ eyebrow, title, right }) { return (<div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}><div>{eyebrow && <div style={{ fontSize: 11.5, letterSpacing: 1.4, textTransform: "uppercase", color: C.gold, fontWeight: 800 }}>{eyebrow}</div>}<h2 style={{ margin: "4px 0 0", fontSize: 22, color: C.green, fontWeight: 700 }}>{title}</h2><div style={{ height: 3, width: 46, background: C.gold, marginTop: 8, borderRadius: 2 }} /></div>{right}</div>); }
function Kpi({ label, value, sub, accent }) { return (<Card style={{ padding: "16px 18px", flex: "1 1 150px", minWidth: 140 }}><div style={{ fontSize: 11.5, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</div><div style={{ fontSize: 24, fontWeight: 800, color: accent || C.green, marginTop: 6, lineHeight: 1.1 }}>{value}</div>{sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{sub}</div>}</Card>); }
const th = { textAlign: "left", padding: "10px 12px", fontSize: 11.5, letterSpacing: 0.5, textTransform: "uppercase", color: "#fff", background: C.green, fontWeight: 700, whiteSpace: "nowrap" };
const td = { padding: "9px 12px", fontSize: 13.5, color: C.ink, borderBottom: `1px solid ${C.line}` };
const tdR = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };
const Tag = ({ children, color }) => <span style={{ fontSize: 11, fontWeight: 700, color, background: color + "1a", border: `1px solid ${color}44`, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>{children}</span>;
function Modal({ title, onClose, children, footer, wide }) {
  return (<div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,25,20,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 }}>
    <div onClick={(e) => e.stopPropagation()} style={{ background: C.paper, borderRadius: 12, maxWidth: wide ? 700 : 560, width: "100%", maxHeight: "88vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: `1px solid ${C.line}`, position: "sticky", top: 0, background: C.paper }}><div style={{ fontWeight: 800, color: C.green }}>{title}</div><button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 22, cursor: "pointer", color: C.muted }}>×</button></div>
      <div style={{ padding: 20 }}>{children}</div>
      {footer && <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.line}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>{footer}</div>}
    </div></div>);
}

/* ============================================================
   Domaine
   ============================================================ */
function folioCalc(f) {
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
const overlapNights = (a, b, d0, d1excl) => { const s = a > d0 ? a : d0; const e = b < d1excl ? b : d1excl; return Math.max(0, dayDiff(s, e)); };
const active = (f) => f.resaStatus !== "annulée" && f.resaStatus !== "no-show";
function unitMonthLong(u, rec) { const leased = rec?.leased ?? true; const rentDue = rec?.rentDue ?? (leased ? num(u.rent) : 0); const rentPaid = num(rec?.rentPaid); return { leased, rentDue, rentPaid, impaye: Math.max(0, rentDue - rentPaid) }; }
function unitDayInfo(u, D, folios, monthly) {
  if (u.hs) return { status: "hs" };
  if (u.mode === "court") {
    const act = folios.filter((f) => f.unitId === u.id && active(f) && !f.closed && f.arrival <= D && D < f.departure);
    const inhouse = act.find((f) => f.checkedIn || f.arrival < D);
    if (inhouse) return { status: "occ", mode: "court", folio: inhouse };
    const pending = act.find((f) => f.arrival === D && !f.checkedIn);
    if (pending) return { status: "attendu", mode: "court", folio: pending };
    return { status: "dispo" };
  }
  const rec = monthly[D.slice(0, 7)]?.[u.id]; const leased = rec?.leased ?? true;
  return leased && u.tenant ? { status: "occ", mode: "long" } : { status: "dispo" };
}
function resaLifecycle(f, D) {
  if (f.resaStatus === "annulée") return ["Annulée", C.muted];
  if (f.resaStatus === "no-show") return ["No-show", C.danger];
  if (f.closed) return ["Partie", C.muted];
  if (f.arrival > D) return f.resaStatus === "option" ? ["Option", C.warn] : f.resaStatus === "garantie" ? ["Garantie", C.green2] : ["Confirmée", C.gold];
  if (f.departure < D) return ["Départ en retard", C.danger];
  if (f.departure === D) return ["Départ prévu", C.warn];
  if (f.arrival === D && !f.checkedIn) return ["Arrivée prévue", C.gold];
  return ["En cours", C.ok];
}
function folioConflicts(folio, folios) {
  if (!folio || !active(folio) || folio.closed) return [];
  if (!(folio.arrival < folio.departure)) return [];
  return folios.filter((g) => g.id !== folio.id && g.unitId === folio.unitId && active(g) && !g.closed && g.arrival < folio.departure && folio.arrival < g.departure);
}
function allConflicts(folios) {
  const seen = new Set(); const pairs = [];
  folios.forEach((f) => { if (!active(f) || f.closed) return; folioConflicts(f, folios).forEach((g) => { const key = [f.id, g.id].sort().join("-"); if (!seen.has(key)) { seen.add(key); pairs.push([f, g]); } }); });
  return pairs;
}
function cleaningEvents(folios, from, to) {
  const out = [];
  folios.forEach((f) => {
    if (f.resaStatus === "annulée" || f.resaStatus === "no-show") return;
    for (let d = addDays(f.arrival, 3); d < f.departure; d = addDays(d, 3)) { if (d >= from && d <= to) out.push({ unitId: f.unitId, kind: "menage", type: "Ménage", ref: "Cadence 3 j", label: "Nettoyage mi-séjour", start: d, end: "", statut: "planifié", color: C.blue, midstay: true, fid: f.id }); }
    if (f.departure >= from && f.departure <= to) out.push({ unitId: f.unitId, kind: "menage", type: "Ménage", ref: "Départ", label: "Ménage après départ", start: f.departure, end: "", statut: "planifié", color: C.blue, midstay: false, fid: f.id + "-d" });
  });
  return out;
}
function dayIndicators(units, folios, monthly, D) {
  const info = units.map((u) => ({ u, ...unitDayInfo(u, D, folios, monthly) }));
  const dispo = units.filter((u) => !u.hs).length;
  const occ = info.filter((x) => x.status === "occ").length;
  const courtOcc = info.filter((x) => x.status === "occ" && x.mode === "court");
  const caHebCourt = courtOcc.reduce((s, x) => s + num(x.folio.rate), 0);
  const caPdj = courtOcc.reduce((s, x) => s + num(x.folio.pdjParJour) * num(x.folio.pdjPrix), 0);
  let caHebLong = 0; info.filter((x) => x.status === "occ" && x.mode === "long").forEach((x) => { caHebLong += num(x.u.rent) / daysInMonth(D.slice(0, 7)); });
  const occCourt = courtOcc.length; const dispoCourt = units.filter((u) => u.mode === "court" && !u.hs).length;
  return { dispo, occ, occupation: dispo ? (occ / dispo) * 100 : 0, caHeb: caHebCourt + caHebLong, caPdj, caTotal: caHebCourt + caHebLong + caPdj, pm: occCourt ? caHebCourt / occCourt : 0, revpar: dispoCourt ? caHebCourt / dispoCourt : 0 };
}
function monthStat(units, folios, monthly, m) {
  const d0 = m + "-01", d1 = monthAdd(m, 1) + "-01", dim = daysInMonth(m);
  const availNights = units.filter((u) => !u.hs).length * dim;
  const courtActive = units.filter((u) => u.mode === "court" && !u.hs).length;
  let rentDue = 0, rentPaid = 0, impaye = 0, longOcc = 0;
  units.filter((u) => u.mode === "long").forEach((u) => { const rec = monthly[m]?.[u.id]; if (!u.tenant && !rec) return; const um = unitMonthLong(u, rec); rentDue += um.rentDue; rentPaid += um.rentPaid; impaye += um.impaye; if (um.leased && u.tenant) longOcc += dim; });
  let courtHeb = 0, courtPdj = 0, extras = 0, nightsSold = 0, guestNights = 0, pdjCount = 0;
  folios.forEach((f) => { if (!active(f)) return; const c = folioCalc(f); const on = overlapNights(f.arrival, f.departure, d0, d1); if (on > 0) { const pn = c.nights ? c.heb / c.nights : 0; courtHeb += pn * on; courtPdj += num(f.pdjParJour) * num(f.pdjPrix) * on; nightsSold += on; guestNights += num(f.pax) * on; pdjCount += num(f.pdjParJour) * on; } if (f.arrival >= d0 && f.arrival < d1) extras += c.deb + c.dep; });
  const courtRevenue = courtHeb + courtPdj + extras;
  return { ym: m, availNights, occNights: longOcc + nightsSold, courtAvail: courtActive * dim, rentDue, rentPaid, impaye, courtHeb, courtPdj, extras, nightsSold, guestNights, pdjCount, courtRevenue, caTotal: rentPaid + courtRevenue };
}
function rangeStat(units, folios, monthly, months) {
  const rows = months.map((m) => monthStat(units, folios, monthly, m));
  const K = ["availNights", "occNights", "courtAvail", "rentDue", "rentPaid", "impaye", "courtHeb", "courtPdj", "extras", "nightsSold", "guestNights", "pdjCount", "courtRevenue", "caTotal"];
  const t = { rows }; K.forEach((k) => (t[k] = rows.reduce((s, r) => s + r[k], 0)));
  t.to = t.availNights ? (t.occNights / t.availNights) * 100 : 0;
  t.recouvrement = t.rentDue ? (t.rentPaid / t.rentDue) * 100 : 0;
  t.revpar = t.courtAvail ? t.courtHeb / t.courtAvail : 0;
  t.adr = t.nightsSold ? t.courtHeb / t.nightsSold : 0;
  t.ifreq = t.nightsSold ? t.guestNights / t.nightsSold : 0;
  t.captage = t.guestNights ? (t.pdjCount / t.guestNights) * 100 : 0;
  return t;
}
function arrears(units, monthly) { const out = []; Object.keys(monthly).forEach((ym) => units.filter((u) => u.mode === "long").forEach((u) => { const um = unitMonthLong(u, monthly[ym]?.[u.id]); if (um.impaye > 0.5) out.push({ ym, unitId: u.id, label: u.label, tenant: u.tenant, due: um.rentDue, impaye: um.impaye }); })); return out.sort((a, b) => (a.ym < b.ym ? -1 : 1)); }

/* helpers check-in / check-out partagés */
const roomReady = (unit) => !!unit && !unit.hs && (unit.statutMenage || "propre") !== "sale";
const CLEAN_CADENCE = 3;
function occupyingFolio(unit, folios, D) { return folios.find((x) => x.unitId === unit.id && x.resaStatus !== "annulée" && x.resaStatus !== "no-show" && !x.closed && x.arrival <= D && D < x.departure && (x.checkedIn || x.arrival < D)); }
function menageDue(unit, folios, D) { if (!unit || unit.hs) return false; const f = occupyingFolio(unit, folios, D); if (!f) return false; const anchor = unit.lastCleaned && unit.lastCleaned > f.arrival ? unit.lastCleaned : f.arrival; return dayDiff(anchor, D) >= CLEAN_CADENCE; }
const needsClean = (unit, folios, D) => !!unit && !unit.hs && ((unit.statutMenage || "propre") === "sale" || menageDue(unit, folios, D));
const clearForCheckin = (unit) => { if (!unit) return true; if (unit.hs) { window.alert("Check-in impossible : logement hors service. Remettez-le en service dans la Gouvernante."); return false; } if ((unit.statutMenage || "propre") === "sale") { window.alert("Check-in impossible : logement non nettoyé.\n\nPassez-le en « propre » dans l'onglet Gouvernante avant l'arrivée du client."); return false; } return true; };
const isSettled = (f) => folioCalc(f).solde <= 0.5;
const settledForCheckout = (f) => { if (isSettled(f)) return true; window.alert("Check-out impossible : le folio n'est pas soldé.\n\nEncaissez le solde restant avant le départ (ou transférez-le en débiteur)."); return false; };

/* ============================================================
   Contexte folio (hub client cliquable) + facture
   ============================================================ */
const FolioCtx = createContext({ open: () => {} });
function ClientLink({ id, children }) {
  const ctx = useContext(FolioCtx);
  if (!id) return <span>{children}</span>;
  return <button onClick={() => ctx.open(id)} style={{ background: "none", border: "none", padding: 0, margin: 0, color: C.green, fontWeight: 700, cursor: "pointer", textDecoration: "underline", textDecorationColor: C.gold, textUnderlineOffset: 2, font: "inherit", textAlign: "left" }} title="Ouvrir le folio">{children}</button>;
}
function buildFactureHTML(fac, config, duplicata) {
  const cur = config.currency || DEFAULT_CONFIG.currency; const fm = (n) => (cur.decimals ? num(n).toLocaleString("fr-FR", { minimumFractionDigits: cur.decimals, maximumFractionDigits: cur.decimals }) : Math.round(num(n)).toLocaleString("fr-FR")) + " " + cur.code;
  const s = fac.snapshot || {};
  const cancelled = fac.status === "annulée";
  const destSociete = s.recipient === "societe" && s.societe;
  const destNom = destSociete ? s.societe : (s.client || "Client");
  const total = num(s.total); const paid = num(s.paid); const arrhes = num(s.arrhes); const solde = Math.max(0, total - paid - arrhes); const avoir = Math.max(0, paid + arrhes - total);
  const rowsHTML = (s.lines || []).map((r) => '<tr><td>' + r.label + '</td><td style="text-align:right">' + fm(r.montant) + '</td></tr>').join("");
  const banner = cancelled ? '<div class="dup">FACTURE ANNULÉE</div>' : (duplicata ? '<div class="dup">DUPLICATA</div>' : (fac.corrections ? '<div class="dup" style="color:#B5761F;border-color:#B5761F">FACTURE RECTIFIÉE</div>' : ''));
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>' + fac.number + '</title>' +
'<style>*{box-sizing:border-box}body{font-family:Segoe UI,system-ui,Arial,sans-serif;color:#2A2622;margin:0;padding:40px;background:#fff}' +
'.doc{max-width:720px;margin:0 auto}' + (cancelled ? '.doc{opacity:.72}' : '') + '.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #B08D57;padding-bottom:16px}' +
'.brand{font-size:22px;font-weight:800;color:#1B4332}.muted{color:#8A8172;font-size:12.5px}.num{font-size:13px;color:#1B4332;font-weight:700}' +
'.dup{display:inline-block;margin-top:8px;color:#9B2C2C;border:1px solid #9B2C2C;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700;letter-spacing:1px}' +
'.boxes{display:flex;gap:24px;margin:22px 0}.box{flex:1;border:1px solid #E4DCCB;border-radius:8px;padding:12px 14px}.box h4{margin:0 0 6px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#B08D57}' +
'table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#1B4332;color:#fff;text-align:left;padding:9px 12px;font-size:12px;text-transform:uppercase;letter-spacing:.5px}' +
'td{padding:9px 12px;border-bottom:1px solid #E4DCCB;font-size:13.5px}tfoot td{border:none;font-weight:800;color:#1B4332}.tot{font-size:16px}' +
'.pay td{color:#2D6A4F}.solde td{font-size:16px;font-weight:800}.foot{margin-top:28px;font-size:11.5px;color:#8A8172;border-top:1px solid #E4DCCB;padding-top:12px}' +
'@media print{body{padding:0}}</style></head><body><div class="doc">' +
'<div class="head"><div><div class="brand">' + config.buildingName + '</div><div class="muted">' + config.city + ' — Propriétaire : ' + config.ownerName + '</div></div>' +
'<div style="text-align:right"><div class="num">FACTURE ' + fac.number + '</div><div class="muted">Date : ' + frDate(fac.date) + '</div>' + banner + '</div></div>' +
'<div class="boxes"><div class="box"><h4>Destinataire</h4><div style="font-weight:700">' + destNom + '</div>' + (!destSociete && s.reservataire ? '<div class="muted">' + s.reservataire + '</div>' : '') + '</div>' +
'<div class="box"><h4>Séjour</h4><div>' + (s.unitLabel || "") + '</div><div class="muted">' + frDate(s.arrival) + ' → ' + frDate(s.departure) + ' · ' + num(s.nights) + ' nuit(s) · ' + num(s.pax) + ' pax</div></div></div>' +
'<table><thead><tr><th>Désignation</th><th style="text-align:right">Montant</th></tr></thead><tbody>' + rowsHTML + '</tbody>' +
'<tfoot><tr class="tot"><td>Total</td><td style="text-align:right">' + fm(total) + '</td></tr>' +
(arrhes > 0 ? '<tr class="pay"><td>Arrhes / acompte</td><td style="text-align:right">' + fm(arrhes) + '</td></tr>' : '') +
'<tr class="pay"><td>Réglé (' + (s.payMode || "Espèces") + ')</td><td style="text-align:right">' + fm(paid) + '</td></tr>' +
'<tr class="solde"><td>Solde</td><td style="text-align:right;color:' + (solde > 0.5 ? '#9B2C2C' : '#2D6A4F') + '">' + fm(solde) + '</td></tr>' + (avoir > 0.5 ? '<tr class="pay"><td>Avoir / trop-perçu (arrhes)</td><td style="text-align:right;color:#2C5A7A">' + fm(avoir) + '</td></tr>' : '') + '</tfoot></table>' +
'<div class="foot">Facture éditée le ' + frDate(fac.date) + (fac.corrections ? ' · rectifiée le ' + frDate(fac.corrigeeLe) : '') + ' — ' + config.buildingName + ', ' + config.city + '. Montants en ' + cur.code + '. Document généré par le PMS Juweirat.</div>' +
'</div></body></html>';
}

/* ============================================================
   Extrait de compte
   ============================================================ */
function ExtraitView({ folio, unit, config }) {
  const money = useMoney();
  const c = folioCalc(folio);
  const line = (l, v, strong) => (<div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.line}`, fontWeight: strong ? 800 : 500, color: strong ? C.green : C.ink }}><span>{l}</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{v}</span></div>);
  const dl = () => downloadText(`extrait_${folio.number}.txt`,
`EXTRAIT DE COMPTE — FOLIO ${folio.number}
${config.buildingName} — ${config.city}

Client   : ${folio.guest || "—"}${folio.societe ? " (" + folio.societe + ")" : ""}
Logement : ${unit ? unit.label + " (" + unit.type + ")" : folio.unitId}
Séjour   : ${frDate(folio.arrival)} → ${frDate(folio.departure)} (${c.nights} nuit(s))
Segment  : ${folio.segment || "—"}   Pax : ${num(folio.pax)}

Hébergement    : ${money(c.heb)}
Petit-déjeuner : ${money(c.pdjTot)}
Débiteur divers: ${money(c.deb)}
Dépendances    : ${money(c.dep)}
--------------------------------
TOTAL          : ${money(c.total)}
Arrhes/acompte : ${money(num(folio.arrhes))}
Réglé (séjour) : ${money(folio.paid)}
SOLDE          : ${money(c.solde)}

Édité le ${frDate(today())}`);
  return (<div>
    <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>Folio <b style={{ color: C.ink }}>{folio.number}</b> · {folio.segment} · {num(folio.pax)} pax{folio.societe ? " · " + folio.societe : ""}</div>
    <div style={{ fontWeight: 700, color: C.green, marginBottom: 2 }}>{folio.guest || "(sans nom)"}</div>
    <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>{unit ? unit.label + " · " + unit.type : folio.unitId} — {frDate(folio.arrival)} → {frDate(folio.departure)} ({c.nights} nuit(s))</div>
    {line("Hébergement", money(c.heb))}
    {line("Petit-déjeuner", money(c.pdjTot))}
    {line("Débiteur divers", money(c.deb))}
    {line("Dépendances", money(c.dep))}
    {line("Total", money(c.total), true)}
    {num(folio.arrhes) > 0 && line("Arrhes / acompte", money(folio.arrhes))}
    {line("Réglé (séjour)", money(folio.paid))}
    {line("Solde", money(c.solde), true)}
    {c.avoir > 0.5 && line("Avoir / trop-perçu (arrhes)", money(c.avoir))}
    <div style={{ marginTop: 16, textAlign: "right" }}><Btn kind="gold" size="sm" onClick={dl}>Télécharger l'extrait</Btn></div>
  </div>);
}

/* ============================================================
   Modal folio
   ============================================================ */
function FolioModal({ folio, units, folios, updateFolio, onClose, config, factures, emitFacture, transferDebiteur }) {
  const money = useMoney();
  const [showExt, setShowExt] = useState(false);
  const [recu, setRecu] = useState(0);
  const canBill = !!emitFacture;
  const conflicts = folios ? folioConflicts(folio, folios) : [];
  const c = folioCalc(folio);
  const set = (patch) => updateFolio(folio.id, patch);
  const applyTarif = (patch) => { const nf = { ...folio, ...patch }; const nights = Math.max(0, dayDiff(nf.arrival, nf.departure)); const uu = units.find((x) => x.id === nf.unitId); const tf = uu && uu.tarifs ? tarifForStay(uu.tarifs, nights) : null; set(tf ? { ...patch, rate: Math.round(tf.perNight), tarifTier: tf.tier, elecIncluded: tf.elec } : patch); };
  const setName = (patch) => { const nom = patch.nom ?? folio.nom ?? ""; const prenom = patch.prenom ?? folio.prenom ?? ""; updateFolio(folio.id, { ...patch, guest: (prenom + " " + nom).trim() }); };
  const eyebrow = { fontSize: 11.5, fontWeight: 800, color: C.gold, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" };
  return (<Modal title={"Folio " + folio.number} onClose={onClose} footer={<Btn onClick={onClose}>Fermer</Btn>}>
    {conflicts.length > 0 && (<div style={{ background: "#FBEDEA", border: `1px solid ${C.danger}`, borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
      <div style={{ fontWeight: 800, color: C.danger, fontSize: 13.5 }}>⚠ Double réservation détectée</div>
      <div style={{ fontSize: 12.5, color: C.ink, marginTop: 4 }}>Le logement {units.find((u) => u.id === folio.unitId)?.label || folio.unitId} est déjà attribué sur des dates qui se chevauchent : {conflicts.map((g, i) => <span key={g.id}>{i > 0 ? ", " : ""}<b>{g.number}</b> ({g.guest || "(sans nom)"} · {frDate(g.arrival)}→{frDate(g.departure)})</span>)}. Changez le logement ou les dates.</div>
    </div>)}
    <div style={eyebrow}>Identité & réservation</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <Field label="Nom"><TextInput value={folio.nom} onChange={(v) => setName({ nom: v })} /></Field>
      <Field label="Prénom"><TextInput value={folio.prenom} onChange={(v) => setName({ prenom: v })} /></Field>
      <Field label="Société"><TextInput value={folio.societe} placeholder="—" onChange={(v) => set({ societe: v })} /></Field>
      <Field label="Réservataire" hint="personne ayant réservé"><TextInput value={folio.reservataire} onChange={(v) => set({ reservataire: v })} /></Field>
      <Field label="Date d'arrivée"><DateInput value={folio.arrival} onChange={(v) => applyTarif({ arrival: v })} /></Field>
      <Field label="Date de départ"><DateInput value={folio.departure} onChange={(v) => applyTarif({ departure: v })} /></Field>
      <div style={{ alignSelf: "end", paddingBottom: 6 }}><div style={{ fontSize: 11.5, color: C.muted, fontWeight: 700, textTransform: "uppercase" }}>Durée du séjour</div><div style={{ fontSize: 18, fontWeight: 800, color: C.green }}>{c.nights} nuit(s)</div></div>
      <Field label="Logement"><Select value={folio.unitId} onChange={(v) => applyTarif({ unitId: v })} options={units.map((u) => ({ v: u.id, l: u.label + " · " + u.type + (u.gamme ? " " + u.gamme : "") }))} /></Field>
      <Field label="Statut réservation"><Select value={folio.resaStatus || "confirmée"} onChange={(v) => set({ resaStatus: v })} options={RESA_STATUS} /></Field>
      <Field label="Pax"><NumInput value={folio.pax} min={0} onChange={(v) => set({ pax: v })} /></Field>
      <Field label="Segment / origine"><Select value={folio.segment} onChange={(v) => set({ segment: v })} options={SEGMENTS} /></Field>
    </div>
    {(() => { const uu = units.find((x) => x.id === folio.unitId); const tf = uu && uu.tarifs ? tarifForStay(uu.tarifs, c.nights) : null; if (!tf) return null; return (<div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: "#F5FAF6", border: `1px solid ${C.green2}33` }}>
      <div style={{ fontSize: 12.5 }}><b style={{ color: C.green }}>Tarif appliqué :</b> forfait <b>{tf.tier}</b> — {money(Math.round(tf.perNight))}/nuit {tf.elec ? <span style={{ color: C.ok }}>· électricité incluse</span> : <span style={{ color: C.warn }}>· hors électricité (à la charge du client)</span>}</div>
      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>Grille {uu.type}{uu.gamme ? " " + uu.gamme : ""} — nuitée {money(uu.tarifs.nuit)} · 15 nuits {money(uu.tarifs.n15)} · 30 nuits {money(uu.tarifs.n30)}</div>
    </div>); })()}
    <div style={{ ...eyebrow, margin: "18px 0 8px" }}>Garantie — carte bancaire</div>
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr", gap: 14 }}>
      <Field label="Numéro de carte"><TextInput value={folio.cardNumber} placeholder="•••• •••• •••• ••••" onChange={(v) => set({ cardNumber: v })} /></Field>
      <Field label="Expiration" hint="MM/AA"><TextInput value={folio.cardExpiry} placeholder="MM/AA" onChange={(v) => set({ cardExpiry: v })} /></Field>
      <Field label="Nom du porteur"><TextInput value={folio.cardHolder} onChange={(v) => set({ cardHolder: v })} /></Field>
    </div>
    <div style={{ fontSize: 11, color: C.warn, marginTop: 6 }}>Donnée sensible : en production, ne conserver que les 4 derniers chiffres + une empreinte de pré-autorisation (PCI-DSS).</div>
    <div style={{ ...eyebrow, margin: "18px 0 8px" }}>Prestations & solde</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <Field label="Tarif / nuit" hint={folio.tarifTier ? "forfait " + folio.tarifTier : ""}><MoneyInput value={folio.rate} onChange={(v) => set({ rate: v })} /></Field>
      <Field label="PDJ / jour (nb)"><NumInput value={folio.pdjParJour} min={0} onChange={(v) => set({ pdjParJour: v })} /></Field>
      <Field label="Prix du PDJ"><MoneyInput value={folio.pdjPrix} onChange={(v) => set({ pdjPrix: v })} /></Field>
      <Field label="Débiteur divers"><MoneyInput value={folio.debiteur} onChange={(v) => set({ debiteur: v })} /></Field>
      <Field label="Dépendances"><MoneyInput value={folio.dependances} onChange={(v) => set({ dependances: v })} /></Field>
      <Field label="Arrhes / acompte"><MoneyInput value={folio.arrhes} onChange={(v) => set({ arrhes: v })} /></Field>
      <Field label="Réglé (séjour)"><MoneyInput value={folio.paid} onChange={(v) => set({ paid: v })} /></Field>
      <div style={{ alignSelf: "end", paddingBottom: 6 }}><div style={{ fontSize: 11.5, color: C.muted, fontWeight: 700, textTransform: "uppercase" }}>Solde</div><div style={{ fontSize: 18, fontWeight: 800, color: c.solde > 0.5 ? C.danger : C.ok }}>{money(c.solde)}</div>{c.avoir > 0.5 && <div style={{ fontSize: 12, fontWeight: 700, color: C.blue, marginTop: 2 }}>Avoir (arrhes) : {money(c.avoir)}</div>}</div>
    </div>
    {canBill && <>
      <div style={{ ...eyebrow, margin: "18px 0 8px" }}>Facturation & encaissement</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Mode de paiement"><Select value={folio.payMode || "Espèces"} onChange={(v) => set({ payMode: v })} options={["Espèces", "Carte bancaire", "Virement", "Chèque", "Mobile Money", "Débiteur divers"]} /></Field>
        <Field label="Destinataire de la facture"><Select value={folio.factRecipient || (folio.societe ? "societe" : "client")} onChange={(v) => set({ factRecipient: v })} options={[{ v: "client", l: "Client — " + (folio.guest || "—") }, { v: "societe", l: "Société — " + (folio.societe || "—") }]} /></Field>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 12, flexWrap: "wrap" }}>
        <div style={{ width: 180 }}><Field label="Encaisser un montant reçu"><MoneyInput value={recu} onChange={setRecu} /></Field></div>
        <Btn disabled={num(recu) <= 0} onClick={() => { const due = c.solde; const toStay = Math.min(num(recu), due); const surplus = Math.max(0, num(recu) - due); set({ paid: num(folio.paid) + toStay, arrhes: num(folio.arrhes) + surplus }); setRecu(0); }}>Encaisser</Btn>
        <span style={{ fontSize: 11.5, color: C.muted, paddingBottom: 8 }}>Tout montant au-delà du solde est placé en arrhes (avoir).</span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
        <Btn disabled={c.solde <= 0.5} onClick={() => set({ paid: num(folio.paid) + c.solde })}>Encaisser le solde ({money(c.solde)})</Btn>
        <Btn kind="gold" onClick={() => emitFacture(folio, folio.factRecipient || (folio.societe ? "societe" : "client"))}>{folio.factureId ? "Rééditer (duplicata)" : "Éditer la facture"}</Btn>
        <Btn kind="ghost" onClick={() => setShowExt((x) => !x)}>{showExt ? "Masquer l'extrait" : "Aperçu de l'extrait"}</Btn>
        {c.solde > 0.5 && <Btn kind="danger" onClick={() => transferDebiteur(folio)}>Transférer le solde en débiteur</Btn>}
      </div>
      {folio.factureId && (() => { const fac = (factures || []).find((x) => x.id === folio.factureId); return fac ? <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Facture émise : <b style={{ color: C.green }}>{fac.number}</b> le {frDate(fac.date)} — la réédition porte la mention « duplicata ».</div> : null; })()}
      {showExt && <div style={{ marginTop: 14, padding: 16, border: `1px solid ${C.line}`, borderRadius: 8, background: C.rowAlt }}><ExtraitView folio={folio} unit={units.find((u) => u.id === folio.unitId)} config={config} /></div>}
    </>}
  </Modal>);
}

/* ============================================================
   Bandeau permanent (date hôtel)
   ============================================================ */
function Bandeau({ config, units, folios, monthly, tickets }) {
  const D = config.dateHotel;
  const info = units.map((u) => ({ u, ...unitDayInfo(u, D, folios, monthly) }));
  const dispo = units.filter((u) => !u.hs).length;
  const occ = info.filter((x) => x.status === "occ").length;
  const attendu = info.filter((x) => x.status === "attendu").length;
  const departs = folios.filter((f) => f.departure === D && active(f) && !f.closed && (f.checkedIn || f.arrival < D)).length;
  const aNettoyer = units.filter((u) => needsClean(u, folios, D)).length;
  const conflits = allConflicts(folios).length;
  const maintActifs = (tickets || []).filter((t) => t.status === "ouvert" || t.status === "en_cours").length;
  const cell = (label, value, accent) => (<div style={{ padding: "6px 16px", borderRight: "1px solid rgba(255,255,255,.14)" }}><div style={{ fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: "rgba(255,255,255,.6)", fontWeight: 700 }}>{label}</div><div style={{ fontSize: 15, fontWeight: 800, color: accent || "#fff" }}>{value}</div></div>);
  return (<div style={{ background: C.green2, color: "#fff", borderRadius: 10, display: "flex", flexWrap: "wrap", alignItems: "center", marginBottom: 22, boxShadow: "0 1px 0 rgba(0,0,0,.04)" }}>
    <div style={{ padding: "8px 18px", borderRight: "1px solid rgba(255,255,255,.14)" }}><div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: C.gold2, fontWeight: 800 }}>Date hôtel</div><div style={{ fontSize: 15, fontWeight: 800, textTransform: "capitalize" }}>{frDateLong(D)}</div></div>
    {cell("Occupation", fPct(dispo ? (occ / dispo) * 100 : 0))}
    {cell("Arrivées restantes", attendu, attendu ? C.gold2 : "#fff")}
    {cell("Départs restants", departs, departs ? C.gold2 : "#fff")}
    {cell("À nettoyer", aNettoyer, aNettoyer ? C.gold2 : "#fff")}
    {conflits > 0 && <div style={{ padding: "6px 16px", background: "rgba(155,44,44,.28)" }}><div style={{ fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: "#FFD9D2", fontWeight: 700 }}>⚠ Conflits</div><div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{conflits}</div></div>}
    {maintActifs > 0 && <div style={{ padding: "6px 16px" }}><div style={{ fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: "rgba(255,255,255,.6)", fontWeight: 700 }}>⚒ Maintenance</div><div style={{ fontSize: 15, fontWeight: 800, color: C.gold2 }}>{maintActifs}</div></div>}
  </div>);
}

/* ============================================================
   Écran journée
   ============================================================ */
function Journee({ units, setUnits, folios, setFolios, monthly, setMonthly, config, setTab }) {
  const money = useMoney();
  const { open } = useContext(FolioCtx);
  const [date, setDate] = useState(config.dateHotel);
  const updateFolio = (id, patch) => setFolios((p) => p.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const roomDirty = (unitId) => setUnits((p) => p.map((u) => (u.id === unitId ? { ...u, statutMenage: "sale" } : u)));

  const info = useMemo(() => units.map((u) => ({ u, ...unitDayInfo(u, date, folios, monthly) })), [units, folios, monthly, date]);
  const hsN = info.filter((x) => x.status === "hs").length;
  const occ = info.filter((x) => x.status === "occ");
  const attendu = info.filter((x) => x.status === "attendu");
  const dispoParc = units.length - hsN;
  const to = dispoParc ? (occ.length / dispoParc) * 100 : 0;
  const courtOcc = occ.filter((x) => x.mode === "court");
  const nbPDJ = courtOcc.reduce((s, x) => s + num(x.folio.pdjParJour), 0);
  const paxPresent = courtOcc.reduce((s, x) => s + num(x.folio.pax), 0);
  const captage = paxPresent ? (nbPDJ / paxPresent) * 100 : 0;

  const checkIn = (f) => { const u = units.find((x) => x.id === f.unitId); if (!clearForCheckin(u)) return; updateFolio(f.id, { checkedIn: true, resaStatus: f.resaStatus === "option" ? "confirmée" : f.resaStatus, arrival: f.arrival > date ? date : f.arrival }); };
  const checkOut = (f) => { if (!settledForCheckout(f)) return; updateFolio(f.id, { closed: true, checkoutDate: date }); roomDirty(f.unitId); };

  const presents = [
    ...courtOcc.map((x) => ({ id: x.folio.id, name: x.folio.guest || "(sans nom)", period: frDate(x.folio.arrival) + " → " + frDate(x.folio.departure), tag: "Courte", color: C.gold })),
    ...occ.filter((x) => x.mode === "long").map((x) => ({ id: null, name: x.u.tenant, period: (x.u.leaseStart ? frDate(x.u.leaseStart) : "—") + " → en cours", tag: "Longue", color: C.green2 })),
  ];
  const arrivees = folios.filter((f) => f.arrival === date && active(f)).map((f) => ({ id: f.id, name: f.guest || "(sans nom)", period: frDate(f.arrival) + " → " + frDate(f.departure), action: f.checkedIn ? <Tag color={C.ok}>Arrivé</Tag> : (() => { const rdy = roomReady(units.find((x) => x.id === f.unitId)); return <Btn size="sm" disabled={!rdy} title={rdy ? "" : "Logement non nettoyé — voir Gouvernante"} onClick={() => checkIn(f)}>Check-in</Btn>; })() }));
  const departs = folios.filter((f) => f.departure === date && active(f)).map((f) => ({ id: f.id, name: f.guest || "(sans nom)", period: frDate(f.arrival) + " → " + frDate(f.departure), action: f.closed ? <Tag color={C.muted}>Parti</Tag> : <Btn size="sm" kind="gold" disabled={!isSettled(f)} title={isSettled(f) ? "" : "Folio non soldé"} onClick={() => checkOut(f)}>Check-out</Btn> }));

  const empty = folios.length === 0 && Object.keys(monthly).length === 0;
  const loadDemo = () => {
    const cu = units.filter((u) => u.mode === "court"); const nf = []; const D = config.dateHotel;
    if (cu[0]) nf.push({ id: Date.now() + 1, number: "FL-DEMO-001", unitId: cu[0].id, guest: "Kodjo A.", nom: "A.", prenom: "Kodjo", societe: "", reservataire: "", cardNumber: "", cardExpiry: "", cardHolder: "", segment: "Direct", pax: 2, arrival: addDays(D, -2), departure: addDays(D, 2), rate: cu[0].rate, heb: 0, pdjParJour: 2, pdjPrix: 3000, debiteur: 0, dependances: 15000, arrhes: 20000, paid: 40000, resaStatus: "confirmée", checkedIn: true, note: "", closed: false });
    if (cu[1]) nf.push({ id: Date.now() + 2, number: "FL-DEMO-002", unitId: cu[1].id, guest: "M. Sena", nom: "Sena", prenom: "M.", societe: "YAS", reservataire: "", cardNumber: "", cardExpiry: "", cardHolder: "", segment: "OTA", pax: 2, arrival: D, departure: addDays(D, 3), rate: cu[1].rate, heb: 0, pdjParJour: 2, pdjPrix: 3000, debiteur: 0, dependances: 0, arrhes: 0, paid: 0, resaStatus: "confirmée", checkedIn: false, note: "", closed: false });
    if (cu[2]) nf.push({ id: Date.now() + 3, number: "FL-DEMO-003", unitId: cu[2].id, guest: "Ayaba K.", nom: "K.", prenom: "Ayaba", societe: "", reservataire: "", cardNumber: "", cardExpiry: "", cardHolder: "", segment: "Société", pax: 1, arrival: addDays(D, -3), departure: D, rate: cu[2].rate, heb: 0, pdjParJour: 1, pdjPrix: 3000, debiteur: 5000, dependances: 0, arrhes: 0, paid: 60000, resaStatus: "confirmée", checkedIn: true, note: "", closed: false });
    setFolios((p) => [...nf, ...p]);
    const seed = {}; [monthAdd(thisMonth(), -1), thisMonth()].forEach((mm) => { const r = {}; units.filter((u) => u.mode === "long").forEach((u) => { r[u.id] = { leased: true, rentDue: u.rent, rentPaid: u.rent }; }); seed[mm] = r; }); setMonthly((p) => ({ ...seed, ...p }));
  };

  return (<div>
    <SectionTitle eyebrow={frDay(date) + " " + frDate(date)} title="Écran journée"
      right={<div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}><div style={{ width: 165 }}><Field label="Journée"><DateInput value={date} onChange={setDate} /></Field></div><Btn kind="ghost" size="sm" onClick={() => setDate(addDays(date, -1))}>◀</Btn><Btn kind="ghost" size="sm" onClick={() => setDate(config.dateHotel)}>Date hôtel</Btn><Btn kind="ghost" size="sm" onClick={() => setDate(addDays(date, 1))}>▶</Btn></div>} />

    {empty && (<Card style={{ padding: 18, marginBottom: 18, borderStyle: "dashed", background: C.rowAlt }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}><div><div style={{ fontWeight: 700, color: C.green, marginBottom: 3 }}>Aucun folio ni loyer saisi</div><div style={{ fontSize: 13, color: C.muted }}>Crée un séjour, ou charge un exemple pour voir l'écran vivre.</div></div><div style={{ display: "flex", gap: 8 }}><Btn kind="ghost" onClick={loadDemo}>Charger un exemple</Btn><Btn onClick={() => setTab("resa")}>Réserver</Btn></div></div></Card>)}

    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
      <Kpi label="# Disponibles" value={dispoParc} sub={`${units.length} logements − ${hsN} HS`} />
      <Kpi label="# Occupées" value={occ.length} />
      <Kpi label="Arrivées attendues" value={attendu.length} accent={attendu.length ? C.gold : C.green} />
      <Kpi label="Taux d'occupation" value={fPct(to)} accent={C.gold} />
      <Kpi label="Nombre de PDJ" value={fN(nbPDJ)} sub={`${fN(paxPresent)} présents (courte durée)`} />
      <Kpi label="Taux de captage" value={fPct(captage)} accent={C.green2} />
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
      {[{ t: "Présents (in-house)", rows: presents, tagged: true }, { t: "Arrivées du jour", rows: arrivees }, { t: "Départs du jour", rows: departs }].map((blk) => (
        <Card key={blk.t} style={{ overflow: "hidden" }}>
          <div style={{ background: C.green, color: "#fff", padding: "9px 14px", fontWeight: 700, fontSize: 13, display: "flex", justifyContent: "space-between" }}><span>{blk.t}</span><span style={{ color: C.gold2 }}>{blk.rows.length}</span></div>
          <div>{blk.rows.length === 0 && <div style={{ padding: 14, color: C.muted, fontSize: 13 }}>Aucun</div>}
            {blk.rows.map((r, i) => (<div key={i} style={{ padding: "9px 14px", borderBottom: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div><div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.id ? <ClientLink id={r.id}>{r.name}</ClientLink> : r.name}</div><div style={{ fontSize: 11.5, color: C.muted }}>{r.period}</div></div>
              {r.action ? r.action : (blk.tagged && <Tag color={r.color}>{r.tag}</Tag>)}
            </div>))}
          </div>
        </Card>
      ))}
    </div>
  </div>);
}

/* ============================================================
   Planning visuel
   ============================================================ */
function Planning({ units, folios, config }) {
  const { open } = useContext(FolioCtx);
  const [start, setStart] = useState(config.dateHotel);
  const [days, setDays] = useState(14);
  const dayW = 44, labelW = 180;
  const list = Array.from({ length: days }, (_, i) => addDays(start, i));
  const winEnd = addDays(start, days);
  const barColor = (f) => (f.closed ? C.muted : f.arrival <= config.dateHotel && f.departure > config.dateHotel ? C.green : f.resaStatus === "option" ? C.gold : C.green2);
  const cellBox = { boxSizing: "border-box" };
  return (<div>
    <SectionTitle eyebrow="Vue calendrier" title="Planning" right={
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
        <div style={{ width: 150 }}><Field label="À partir du"><DateInput value={start} onChange={setStart} /></Field></div>
        <div style={{ width: 120 }}><Select value={days} onChange={(v) => setDays(parseInt(v))} options={[{ v: 7, l: "7 jours" }, { v: 14, l: "14 jours" }, { v: 30, l: "30 jours" }]} /></div>
        <Btn kind="ghost" size="sm" onClick={() => setStart(addDays(start, -days))}>◀</Btn><Btn kind="ghost" size="sm" onClick={() => setStart(config.dateHotel)}>Auj.</Btn><Btn kind="ghost" size="sm" onClick={() => setStart(addDays(start, days))}>▶</Btn>
      </div>} />
    <Card style={{ overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: labelW + days * dayW }}>
          <div style={{ display: "flex", background: C.green }}>
            <div style={{ width: labelW, flexShrink: 0, padding: "8px 12px", color: "#fff", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, ...cellBox }}>Logement</div>
            {list.map((d) => { const wd = new Date(d + "T00:00:00").getDay(); const we = wd === 0 || wd === 6; const isT = d === config.dateHotel; return (<div key={d} style={{ width: dayW, flexShrink: 0, textAlign: "center", padding: "5px 0", color: isT ? C.gold2 : "#fff", background: isT ? "rgba(201,162,39,.20)" : "transparent", borderLeft: "1px solid rgba(255,255,255,.12)", ...cellBox }}><div style={{ fontSize: 10.5, textTransform: "capitalize", opacity: we ? 0.6 : 1 }}>{frDay(d)}</div><div style={{ fontSize: 13, fontWeight: 700 }}>{d.slice(8)}</div></div>); })}
          </div>
          {units.map((u, ri) => (<div key={u.id} style={{ display: "flex", borderBottom: `1px solid ${C.line}`, background: ri % 2 ? C.rowAlt : "#fff", height: 42 }}>
            <div style={{ width: labelW, flexShrink: 0, padding: "0 12px", display: "flex", flexDirection: "column", justifyContent: "center", ...cellBox }}><div style={{ fontSize: 13, fontWeight: 600 }}>{u.label}</div><div style={{ fontSize: 10.5, color: C.muted }}>{u.type} · {u.mode === "long" ? "longue durée" : "courte durée"}</div></div>
            <div style={{ position: "relative", width: days * dayW, flexShrink: 0 }}>
              {list.map((d, i) => { const wd = new Date(d + "T00:00:00").getDay(); const we = wd === 0 || wd === 6; return <div key={d} style={{ position: "absolute", left: i * dayW, top: 0, width: dayW, height: 42, borderLeft: `1px solid ${C.line}`, background: we ? "rgba(0,0,0,.02)" : "transparent", ...cellBox }} />; })}
              {u.hs && <div style={{ position: "absolute", left: 2, top: 7, height: 28, width: days * dayW - 4, borderRadius: 5, background: "repeating-linear-gradient(45deg,#F1E7D3,#F1E7D3 6px,#E8DCC2 6px,#E8DCC2 12px)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.warn, fontWeight: 700 }}>Hors service</div>}
              {!u.hs && u.mode === "long" && u.tenant && <div style={{ position: "absolute", left: 2, top: 7, height: 28, width: days * dayW - 4, borderRadius: 5, background: "#EAF2EC", border: `1px solid ${C.green2}55`, display: "flex", alignItems: "center", paddingLeft: 10, fontSize: 11.5, color: C.green2, fontWeight: 600, boxSizing: "border-box" }}>{u.tenant} · longue durée</div>}
              {!u.hs && u.mode === "court" && folios.filter((f) => f.unitId === u.id && active(f) && f.arrival < winEnd && start < f.departure).map((f) => {
                const s = f.arrival > start ? f.arrival : start; const e = f.departure < winEnd ? f.departure : winEnd; const off = dayDiff(start, s); const span = Math.max(1, dayDiff(s, e));
                return (<div key={f.id} onClick={() => open(f.id)} title={(f.guest || f.number) + " · " + frDate(f.arrival) + " → " + frDate(f.departure)} style={{ position: "absolute", left: off * dayW + 2, top: 7, width: span * dayW - 4, height: 28, borderRadius: 5, background: barColor(f), color: "#fff", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", paddingLeft: 8, overflow: "hidden", whiteSpace: "nowrap", cursor: "pointer", opacity: f.closed ? 0.55 : 1, boxSizing: "border-box" }}>{f.guest || f.number}</div>);
              })}
            </div>
          </div>))}
        </div>
      </div>
    </Card>
    <div style={{ display: "flex", gap: 18, marginTop: 12, fontSize: 12, color: C.muted, flexWrap: "wrap", alignItems: "center" }}>
      <span><span style={{ color: C.green }}>■</span> présent</span><span><span style={{ color: C.green2 }}>■</span> confirmée / longue durée</span><span><span style={{ color: C.gold }}>■</span> option</span><span><span style={{ color: C.muted }}>■</span> parti</span><span>· Clique une barre pour ouvrir le folio.</span>
    </div>
  </div>);
}

/* ============================================================
   Réservations
   ============================================================ */
function Reservations({ units, setUnits, folios, setFolios, updateFolio, config, createResa }) {
  const money = useMoney();
  const { open } = useContext(FolioCtx);
  const [scope, setScope] = useState("avenir");
  const [a, setA] = useState(config.dateHotel);
  const [b, setB] = useState(addDays(config.dateHotel, 1));
  const [typeFilter, setTypeFilter] = useState("Tous");
  const resaUnits = units.filter((u) => typeFilter === "Tous" || u.type === typeFilter).sort((x, y) => (x.roomNo || x.label).localeCompare(y.roomNo || y.label));
  const nights = Math.max(0, dayDiff(a, b));
  const free = (unitId) => nights > 0 && !folios.some((f) => f.unitId === unitId && active(f) && f.arrival < b && a < f.departure);
  const makeFolio = (u, arr, dep) => { const nights = Math.max(0, dayDiff(arr, dep)); const tf = u.tarifs ? tarifForStay(u.tarifs, nights) : null; return { unitId: u.id, tarifTier: tf ? tf.tier : "nuitée", elecIncluded: tf ? tf.elec : true, guest: "", nom: "", prenom: "", societe: "", reservataire: "", cardNumber: "", cardExpiry: "", cardHolder: "", segment: "Direct", pax: 1, arrival: arr, departure: dep, rate: u.rate, heb: 0, pdjParJour: 0, pdjPrix: 3000, debiteur: 0, dependances: 0, arrhes: 0, paid: 0, resaStatus: "confirmée", checkedIn: false, note: "", closed: false }; };
  const reserve = (u) => { const f = makeFolio(u, a, b); const nights = Math.max(0, dayDiff(a, b)); const tf = u.tarifs ? tarifForStay(u.tarifs, nights) : null; if (tf) f.rate = Math.round(tf.perNight); createResa(f); };
  const del = (id) => setFolios((p) => p.filter((f) => f.id !== id));
  const roomDirty = (unitId) => setUnits((p) => p.map((u) => (u.id === unitId ? { ...u, statutMenage: "sale" } : u)));
  const t = config.dateHotel;
  const list = folios.filter((f) => (scope === "avenir" ? f.departure >= t && active(f) && !f.closed : true)).sort((x, y) => (x.arrival < y.arrival ? -1 : 1));
  const unitOf = (f) => units.find((u) => u.id === f.unitId);
  const checkIn = (f) => { const u = unitOf(f); if (!clearForCheckin(u)) return; updateFolio(f.id, { checkedIn: true, resaStatus: f.resaStatus === "option" ? "confirmée" : f.resaStatus, arrival: f.arrival > t ? t : f.arrival }); };
  const checkOut = (f) => { if (!settledForCheckout(f)) return; updateFolio(f.id, { closed: true, checkoutDate: t }); roomDirty(f.unitId); };

  const conflictPairs = allConflicts(folios);
  return (<div>
    <SectionTitle eyebrow="Séjours" title="Réservations" right={<Btn onClick={() => { const u = resaUnits.find((x) => free(x.id)) || resaUnits[0]; if (u) reserve(u); }}>+ Réservation</Btn>} />
    {conflictPairs.length > 0 && (<Card style={{ padding: 14, marginBottom: 16, background: "#FBEDEA", border: `1px solid ${C.danger}` }}><div style={{ fontWeight: 800, color: C.danger, marginBottom: 6 }}>⚠ {conflictPairs.length} conflit(s) de réservation — logement attribué deux fois</div>{conflictPairs.map(([f, g], i) => { const u = units.find((x) => x.id === f.unitId); return (<div key={i} style={{ fontSize: 13, padding: "4px 0", borderTop: i ? `1px solid ${C.danger}22` : "none" }}>{u ? u.label : f.unitId} : <ClientLink id={f.id}>{f.number}</ClientLink> ({frDate(f.arrival)}→{frDate(f.departure)}) chevauche <ClientLink id={g.id}>{g.number}</ClientLink> ({frDate(g.arrival)}→{frDate(g.departure)})</div>); })}</Card>)}
    <Card style={{ padding: 16, marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <div style={{ fontWeight: 800, color: C.green }}>Disponibilité & réservation rapide</div>
        <div style={{ display: "flex", gap: 6 }}><span style={{ fontSize: 11.5, color: C.muted, fontWeight: 700, alignSelf: "center", marginRight: 2 }}>Type</span>{["Tous", "T1", "T2", "T3"].map((tf) => <Btn key={tf} size="sm" kind={typeFilter === tf ? "primary" : "ghost"} onClick={() => setTypeFilter(tf)}>{tf}</Btn>)}</div>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ width: 150 }}><Field label="Arrivée"><DateInput value={a} onChange={setA} /></Field></div>
        <div style={{ width: 150 }}><Field label="Départ"><DateInput value={b} onChange={setB} /></Field></div>
        <div style={{ fontSize: 13, color: nights > 0 ? C.muted : C.danger, paddingBottom: 8, fontWeight: 600 }}>{nights > 0 ? nights + " nuit(s)" : "dates invalides"}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 10 }}>
        {resaUnits.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>Aucun logement pour ce type.</div>}
        {resaUnits.map((u) => { const ok = free(u.id); return (<div key={u.id} style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, background: ok ? "#F5FAF6" : "#FBF3F1" }}>
          <div><div style={{ fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>{u.label} <Tag color={C.green2}>{u.type}{u.gamme ? " " + u.gamme : ""}</Tag></div><div style={{ fontSize: 11.5, color: C.muted }}>{money((u.tarifs ? u.tarifs.nuit : u.rate))} / nuit</div>{u.tarifs && <div style={{ fontSize: 10.5, color: C.muted }}>15 nuits {fN(u.tarifs.n15)} · 30 nuits {fN(u.tarifs.n30)}</div>}</div>
          {ok ? <Btn size="sm" onClick={() => reserve(u)}>Réserver</Btn> : <Tag color={C.danger}>Occupé</Tag>}
        </div>); })}
      </div>
    </Card>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <div style={{ fontWeight: 800, color: C.green }}>Réservations</div>
      <div style={{ display: "flex", gap: 6 }}><Btn size="sm" kind={scope === "avenir" ? "primary" : "ghost"} onClick={() => setScope("avenir")}>À venir</Btn><Btn size="sm" kind={scope === "toutes" ? "primary" : "ghost"} onClick={() => setScope("toutes")}>Toutes</Btn></div>
    </div>
    <Card style={{ overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
          <thead><tr><th style={th}>N°</th><th style={th}>Client</th><th style={th}>Logement</th><th style={th}>Séjour</th><th style={{ ...th, textAlign: "right" }}>Nuits</th><th style={{ ...th, textAlign: "right" }}>Arrhes</th><th style={{ ...th, textAlign: "right" }}>Solde</th><th style={{ ...th, textAlign: "center" }}>Statut</th><th style={{ ...th, textAlign: "center" }}>Actions</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={9} style={{ ...td, textAlign: "center", color: C.muted, padding: 24 }}>Aucune réservation.</td></tr>}
            {list.map((f, i) => { const c = folioCalc(f); const s = resaLifecycle(f, t); const u = unitOf(f); const cancelled = f.resaStatus === "annulée"; const inConflict = folioConflicts(f, folios).length > 0; return (<tr key={f.id} style={{ background: cancelled ? "#F4F1EC" : inConflict ? "#FBEDEA" : i % 2 ? C.rowAlt : "#fff", opacity: cancelled ? 0.7 : 1 }}>
              <td style={{ ...td, fontWeight: 700 }}>{f.number}</td>
              <td style={td}><ClientLink id={f.id}>{f.guest || "(sans nom)"}</ClientLink>{f.societe ? <span style={{ color: C.muted, fontSize: 11.5 }}> · {f.societe}</span> : ""}</td>
              <td style={td}>{u ? u.label : "?"}</td>
              <td style={{ ...td, whiteSpace: "nowrap" }}>{frDate(f.arrival)} → {frDate(f.departure)}</td>
              <td style={tdR}>{c.nights}</td><td style={tdR}>{money(f.arrhes)}</td>
              <td style={{ ...tdR, fontWeight: 700, color: c.solde > 0.5 ? C.danger : C.ok }}>{money(c.solde)}</td>
              <td style={{ ...td, textAlign: "center" }}><Tag color={s[1]}>{s[0]}</Tag>{folioConflicts(f, folios).length > 0 && <> <Tag color={C.danger}>Conflit</Tag></>}</td>
              <td style={{ ...td, textAlign: "center", whiteSpace: "nowrap" }}>
                {!cancelled && !f.closed && f.arrival <= t && !f.checkedIn && f.departure > t && <><Btn size="sm" disabled={!roomReady(unitOf(f))} title={roomReady(unitOf(f)) ? "" : "Logement non nettoyé — voir Gouvernante"} onClick={() => checkIn(f)}>Check-in</Btn>{" "}</>}
                {!cancelled && !f.closed && f.arrival <= t && (f.checkedIn || f.arrival < t) && <><Btn size="sm" kind="gold" disabled={!isSettled(f)} title={isSettled(f) ? "" : "Folio non soldé"} onClick={() => checkOut(f)}>Check-out</Btn>{" "}</>}
                <Btn size="sm" kind="ghost" onClick={() => open(f.id)}>Ouvrir</Btn>{" "}
                {cancelled ? <Btn size="sm" kind="ghost" onClick={() => updateFolio(f.id, { resaStatus: "confirmée" })}>Réactiver</Btn> : <Btn size="sm" kind="danger" onClick={() => updateFolio(f.id, { resaStatus: "annulée" })}>Annuler</Btn>}{" "}
                <button onClick={() => del(f.id)} style={{ border: "none", background: "transparent", color: C.danger, cursor: "pointer", fontSize: 16 }}>×</button>
              </td>
            </tr>); })}
          </tbody>
        </table>
      </div>
    </Card>
  </div>);
}

/* ============================================================
   Folios / séjours
   ============================================================ */
function Folios({ units, setUnits, folios, setFolios, updateFolio, config, createResa }) {
  const money = useMoney();
  const { open } = useContext(FolioCtx);
  const t = config.dateHotel;
  const [q, setQ] = useState("");
  const [dsej, setDsej] = useState("");
  const del = (id) => setFolios((p) => p.filter((f) => f.id !== id));
  const roomDirty = (unitId) => setUnits((p) => p.map((u) => (u.id === unitId ? { ...u, statutMenage: "sale" } : u)));
  const unitOf = (f) => units.find((u) => u.id === f.unitId);
  const checkIn = (f) => { const u = unitOf(f); if (!clearForCheckin(u)) return; updateFolio(f.id, { checkedIn: true, resaStatus: f.resaStatus === "option" ? "confirmée" : f.resaStatus, arrival: f.arrival > t ? t : f.arrival }); };
  const checkOut = (f) => { if (!settledForCheckout(f)) return; updateFolio(f.id, { closed: true, checkoutDate: t }); roomDirty(f.unitId); };
  const hay = (f) => [f.guest, f.nom, f.prenom, f.societe, f.reservataire, f.number].filter(Boolean).join(" ").toLowerCase();
  const filtered = folios.filter((f) => {
    if (q.trim() && !hay(f).includes(q.trim().toLowerCase())) return false;
    if (dsej && !(f.arrival <= dsej && dsej <= f.departure)) return false;
    return true;
  });
  const activeFilter = q.trim() || dsej;

  return (<div>
    <SectionTitle eyebrow="Séjours courte durée" title="Folios / séjours" />
    <Card style={{ padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 240px", minWidth: 200 }}><Field label="Nom / prénom / société"><TextInput value={q} placeholder="Rechercher un client…" onChange={setQ} /></Field></div>
        <div style={{ width: 170 }}><Field label="Date de séjour" hint="folio couvrant cette date"><DateInput value={dsej} onChange={setDsej} /></Field></div>
        {activeFilter ? <Btn kind="ghost" onClick={() => { setQ(""); setDsej(""); }}>Réinitialiser</Btn> : null}
        <div style={{ fontSize: 12.5, color: C.muted, paddingBottom: 9 }}>{filtered.length} résultat(s)</div>
      </div>
    </Card>
    <Card style={{ overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
          <thead><tr><th style={th}>N° Folio</th><th style={th}>Client</th><th style={th}>Logement</th><th style={th}>Séjour</th><th style={{ ...th, textAlign: "right" }}>Nuits</th><th style={{ ...th, textAlign: "right" }}>Total</th><th style={{ ...th, textAlign: "right" }}>Solde</th><th style={{ ...th, textAlign: "center" }}>Statut</th><th style={{ ...th, textAlign: "center" }}>Actions</th></tr></thead>
          <tbody>
            {folios.length === 0 && <tr><td colSpan={9} style={{ ...td, textAlign: "center", color: C.muted, padding: 24 }}>Aucun folio. Créez un séjour depuis l'onglet Réservations.</td></tr>}
            {folios.length > 0 && filtered.length === 0 && <tr><td colSpan={9} style={{ ...td, textAlign: "center", color: C.muted, padding: 24 }}>Aucun folio ne correspond à la recherche.</td></tr>}
            {filtered.map((f, i) => { const c = folioCalc(f); const s = resaLifecycle(f, t); const u = unitOf(f); const inConflict = folioConflicts(f, folios).length > 0; return (<tr key={f.id} style={{ background: inConflict ? "#FBEDEA" : i % 2 ? C.rowAlt : "#fff" }}>
              <td style={{ ...td, fontWeight: 700 }}>{f.number}</td>
              <td style={td}><ClientLink id={f.id}>{f.guest || "(sans nom)"}</ClientLink></td>
              <td style={td}>{u ? u.label : <span style={{ color: C.danger }}>?</span>}</td>
              <td style={{ ...td, whiteSpace: "nowrap" }}>{frDate(f.arrival)} → {frDate(f.departure)}</td>
              <td style={tdR}>{c.nights}</td><td style={tdR}>{money(c.total)}</td>
              <td style={{ ...tdR, fontWeight: 700, color: c.solde > 0.5 ? C.danger : C.ok }}>{money(c.solde)}</td>
              <td style={{ ...td, textAlign: "center" }}><Tag color={s[1]}>{s[0]}</Tag>{inConflict && <> <Tag color={C.danger}>Conflit</Tag></>}</td>
              <td style={{ ...td, textAlign: "center", whiteSpace: "nowrap" }}>
                {f.resaStatus !== "annulée" && !f.closed && f.arrival <= t && !f.checkedIn && f.departure > t && <><Btn size="sm" disabled={!roomReady(unitOf(f))} title={roomReady(unitOf(f)) ? "" : "Logement non nettoyé — voir Gouvernante"} onClick={() => checkIn(f)}>Check-in</Btn>{" "}</>}
                {f.resaStatus !== "annulée" && !f.closed && f.arrival <= t && (f.checkedIn || f.arrival < t) && <><Btn size="sm" kind="gold" disabled={!isSettled(f)} title={isSettled(f) ? "" : "Folio non soldé"} onClick={() => checkOut(f)}>Check-out</Btn>{" "}</>}
                <Btn size="sm" kind="ghost" onClick={() => open(f.id)}>Ouvrir</Btn>{" "}
                <button onClick={() => del(f.id)} style={{ border: "none", background: "transparent", color: C.danger, cursor: "pointer", fontSize: 16 }}>×</button>
              </td>
            </tr>); })}
          </tbody>
        </table>
      </div>
    </Card>
  </div>);
}

/* ============================================================
   Gouvernante (statut ménage — 2e axe)
   ============================================================ */
function Gouvernante({ units, setUnits, folios, monthly, config, applyPlan }) {
  const D = config.dateHotel;
  const set = (id, patch) => setUnits((p) => p.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  const toggleHS = (u) => set(u.id, u.hs ? { hs: false, statutMenage: "sale" } : { hs: true });
  const clean = (u) => set(u.id, { statutMenage: "propre", lastCleaned: config.dateHotel });
  const soil = (u) => set(u.id, { statutMenage: "sale" });
  const state = (u) => { const di = unitDayInfo(u, D, folios, monthly); const occupe = di.status === "occ"; const depart = folios.some((f) => f.unitId === u.id && f.departure === D && active(f) && !f.closed); const due = occupe && menageDue(u, folios, D); const menage = ((u.statutMenage || "propre") === "sale" || due) ? "sale" : "propre"; let statut, color, bg; if (u.hs) { statut = "Hors service"; color = C.warn; bg = "repeating-linear-gradient(45deg,#F5ECD8,#F5ECD8 7px,#ECDFC0 7px,#ECDFC0 14px)"; } else if (occupe) { statut = "Occupée " + (menage === "sale" ? "Sale" : "Propre"); color = menage === "sale" ? C.danger : C.green2; bg = menage === "sale" ? "#FBEDEA" : "#EAF4EC"; } else { statut = "Libre " + (menage === "sale" ? "Sale" : "Propre"); color = menage === "sale" ? C.danger : C.ok; bg = menage === "sale" ? "#FBEDEA" : "#F4FAF5"; } const tache = u.hs ? "" : depart ? "Départ" : due ? "Recouche · à rafraîchir" : occupe ? "Recouche" : ""; return { occupe, menage, due, statut, color, bg, tache }; };
  const aNettoyer = units.filter((u) => needsClean(u, folios, D)).length;
  const propres = units.filter((u) => !u.hs && !needsClean(u, folios, D)).length;
  const hsN = units.filter((u) => u.hs).length;
  const planUnits = units.filter((u) => u.floor != null);
  const others = units.filter((u) => u.floor == null);
  const floors = [...new Set(planUnits.map((u) => u.floor))].sort((a, b) => a - b);

  const RoomBox = ({ u }) => {
    const s = state(u); const menage = s.menage;
    return (<div style={{ width: 158, borderRadius: 10, border: `1.5px solid ${s.color}`, background: s.bg, padding: "9px 11px", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}><span style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>{u.roomNo || u.label}</span><span style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>{u.type}</span></div>
        <button onClick={() => toggleHS(u)} title={u.hs ? "Remettre en service (→ à nettoyer)" : "Mettre hors service"} style={{ border: `1px solid ${u.hs ? C.warn : C.line}`, background: u.hs ? C.warn : "#fff", color: u.hs ? "#fff" : C.muted, borderRadius: 5, fontSize: 10, fontWeight: 800, padding: "2px 6px", cursor: "pointer" }}>{u.hs ? "↺" : "HS"}</button>
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.statut}</div>
      <div style={{ minHeight: 16, marginTop: 2 }}>{s.tache && <span style={{ fontSize: 10.5, fontWeight: 700, color: s.tache === "Départ" ? C.warn : C.green2 }}>● {s.tache}</span>}</div>
      <button disabled={u.hs} onClick={() => (menage === "sale" ? clean(u) : soil(u))} style={{ width: "100%", marginTop: 4, border: "none", borderRadius: 6, cursor: u.hs ? "not-allowed" : "pointer", opacity: u.hs ? 0.4 : 1, fontWeight: 700, fontSize: 12, padding: "6px 0", background: menage === "sale" ? C.green : "#fff", color: menage === "sale" ? "#fff" : C.muted, borderTop: menage === "sale" ? "none" : `1px solid ${C.line}` }}>{menage === "sale" ? "Marquer propre" : "Marquer sale"}</button>
    </div>);
  };

  const FloorCard = ({ fl }) => {
    const fRooms = planUnits.filter((u) => u.floor === fl);
    const left = fRooms.filter((u) => u.planCol === 0).sort((a, b) => a.planRow - b.planRow);
    const right = fRooms.filter((u) => u.planCol === 1).sort((a, b) => a.planRow - b.planRow);
    const saleN = fRooms.filter((u) => needsClean(u, folios, D)).length;
    return (<Card style={{ padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontWeight: 800, color: C.green, fontSize: 15 }}>{fl}<sup>e</sup> étage</div>
        <div style={{ fontSize: 12, color: saleN ? C.danger : C.muted, fontWeight: 600 }}>{fRooms.length} logements{saleN ? ` · ${saleN} à nettoyer` : ""}</div>
      </div>
      <div style={{ display: "flex", gap: 26, alignItems: "stretch", justifyContent: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{left.map((u) => <RoomBox key={u.id} u={u} />)}</div>
        <div style={{ borderLeft: `2px dashed ${C.line}`, position: "relative", minWidth: 1 }}><span style={{ position: "absolute", top: "50%", left: -18, transform: "rotate(-90deg)", fontSize: 9.5, letterSpacing: 1.5, color: C.muted, textTransform: "uppercase", whiteSpace: "nowrap" }}>couloir</span></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{right.map((u) => <RoomBox key={u.id} u={u} />)}</div>
      </div>
    </Card>);
  };

  return (<div>
    <SectionTitle eyebrow="Étages · plan de l'immeuble" title="Gouvernante" right={planUnits.length > 0 && applyPlan ? <Btn kind="ghost" size="sm" onClick={applyPlan}>Recharger le plan</Btn> : null} />
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
      <Kpi label="À nettoyer" value={aNettoyer} accent={aNettoyer ? C.danger : C.ok} />
      <Kpi label="Propres" value={propres} accent={C.ok} />
      <Kpi label="Hors service" value={hsN} accent={hsN ? C.warn : C.green} />
    </div>

    {planUnits.length === 0 && (<Card style={{ padding: 18, marginBottom: 16, borderStyle: "dashed", background: C.rowAlt }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}><div><div style={{ fontWeight: 700, color: C.green, marginBottom: 3 }}>Plan de l'immeuble non chargé</div><div style={{ fontSize: 13, color: C.muted }}>Charge la disposition réelle (étages 2, 4, 5 et 6 — 19 logements) pour piloter le ménage et les mises hors service sur le plan.</div></div>{applyPlan && <Btn onClick={applyPlan}>Charger le plan Juweirat</Btn>}</div></Card>)}

    {floors.map((fl) => <FloorCard key={fl} fl={fl} />)}

    <div style={{ display: "flex", gap: 16, margin: "6px 2px 18px", fontSize: 12, color: C.muted, flexWrap: "wrap", alignItems: "center" }}>
      <span><span style={{ color: C.ok }}>■</span> Libre propre</span>
      <span><span style={{ color: C.danger }}>■</span> Sale (à nettoyer)</span>
      <span><span style={{ color: C.green2 }}>■</span> Occupée propre</span>
      <span><span style={{ color: C.warn }}>▧</span> Hors service</span>
      <span>· « HS » met le logement hors service ; le bouton bascule Propre/Sale.</span>
    </div>

    {others.length > 0 && (<>
      <div style={{ fontWeight: 800, color: C.green, marginBottom: 10 }}>Autres logements (hors plan)</div>
      <Card style={{ overflow: "hidden", marginBottom: 12 }}><div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
          <thead><tr><th style={th}>Logement</th><th style={th}>Statut chambre</th><th style={{ ...th, textAlign: "center" }}>Actions</th></tr></thead>
          <tbody>{others.map((u, i) => { const s = state(u); const menage = u.statutMenage || "propre"; return (<tr key={u.id} style={{ background: menage === "sale" && !u.hs ? "#FCF3F0" : i % 2 ? C.rowAlt : "#fff" }}>
            <td style={{ ...td, fontWeight: 600 }}>{u.label} <span style={{ color: C.muted, fontSize: 12 }}>· {u.type}</span></td>
            <td style={td}><Tag color={s.color}>{s.statut}</Tag></td>
            <td style={{ ...td, textAlign: "center", whiteSpace: "nowrap" }}>{!u.hs && <><Btn size="sm" onClick={() => (menage === "sale" ? clean(u) : soil(u))}>{menage === "sale" ? "Marquer propre" : "Marquer sale"}</Btn>{" "}</>}<Btn size="sm" kind={u.hs ? "ghost" : "danger"} onClick={() => toggleHS(u)}>{u.hs ? "Remettre en service" : "Hors service"}</Btn></td>
          </tr>); })}</tbody>
        </table>
      </div></Card>
      {applyPlan && <Btn kind="ghost" size="sm" onClick={applyPlan}>Remplacer par le plan réel Juweirat</Btn>}
    </>)}

    <div style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>Le statut ménage (Propre / Sale) est indépendant du statut réservation. Un check-out passe automatiquement le logement en « Libre Sale ». <b style={{ color: C.ink }}>Aucun check-in n'est possible tant qu'un logement n'a pas été remis « propre » ici.</b> Un logement occupé repasse automatiquement « à rafraîchir » tous les 3 jours.</div>
  </div>);
}

/* ============================================================
   Statistiques
   ============================================================ */
function Stats({ units, folios, monthly }) {
  const money = useMoney();
  const now = thisMonth();
  const [start, setStart] = useState(monthAdd(now, -5));
  const [end, setEnd] = useState(now);
  const s = useMemo(() => rangeStat(units, folios, monthly, monthList(start, end)), [units, folios, monthly, start, end]);
  const exportCSV = () => downloadCSV(`juweirat_stats_${start}_${end}.csv`, [["Immeuble Juweirat", frMonth(start) + " → " + frMonth(end)], [], ["Mois", "Occup. %", "Loyers encaissés", "Impayés", "Recouvr. %", "Nuits vendues", "CA nuitées", "Nb PDJ", "CA total"], ...s.rows.map((r) => [frMonth(r.ym), r.availNights ? ((r.occNights / r.availNights) * 100).toFixed(1).replace(".", ",") : "0", Math.round(r.rentPaid), Math.round(r.impaye), r.rentDue ? ((r.rentPaid / r.rentDue) * 100).toFixed(1).replace(".", ",") : "0", r.nightsSold, Math.round(r.courtRevenue), Math.round(r.pdjCount), Math.round(r.caTotal)]), [], ["TOTAL", s.to.toFixed(1).replace(".", ","), Math.round(s.rentPaid), Math.round(s.impaye), s.recouvrement.toFixed(1).replace(".", ","), s.nightsSold, Math.round(s.courtRevenue), Math.round(s.pdjCount), Math.round(s.caTotal)]]);
  return (<div>
    <SectionTitle eyebrow="Exploitation" title="Statistiques" right={<Btn kind="gold" size="sm" onClick={exportCSV}>Exporter CSV</Btn>} />
    <Card style={{ padding: 16, marginBottom: 18 }}><div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
      <div style={{ width: 160 }}><Field label="De"><MonthInput value={start} onChange={setStart} /></Field></div>
      <div style={{ width: 160 }}><Field label="À"><MonthInput value={end} onChange={setEnd} /></Field></div>
      <Btn kind="ghost" size="sm" onClick={() => { setStart(now); setEnd(now); }}>Ce mois</Btn><Btn kind="ghost" size="sm" onClick={() => { setStart(monthAdd(now, -11)); setEnd(now); }}>12 mois</Btn>
      <div style={{ marginLeft: "auto", fontSize: 12.5, color: C.muted }}>{s.rows.length} mois</div>
    </div></Card>
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
      <Kpi label="Occupation immeuble" value={fPct(s.to)} /><Kpi label="CA total période" value={money(s.caTotal)} accent={C.green2} />
      <Kpi label="Recouvrement loyers" value={fPct(s.recouvrement)} accent={s.recouvrement >= 95 ? C.ok : C.warn} /><Kpi label="Impayés cumulés" value={money(s.impaye)} accent={s.impaye > 0 ? C.danger : C.ok} />
    </div>
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
      <Kpi label="Loyers encaissés" value={money(s.rentPaid)} /><Kpi label="CA nuitées" value={money(s.courtRevenue)} />
      <Kpi label="RevPAR courte durée" value={money(s.revpar)} accent={C.gold} /><Kpi label="Prix moyen nuitée" value={money(s.adr)} />
      <Kpi label="Ind. fréquentation" value={fN(s.ifreq, 2)} /><Kpi label="Taux de captage" value={fPct(s.captage)} />
    </div>
    <Card style={{ overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead><tr><th style={th}>Mois</th><th style={{ ...th, textAlign: "right" }}>Occup.</th><th style={{ ...th, textAlign: "right" }}>Loyers encaissés</th><th style={{ ...th, textAlign: "right" }}>Impayés</th><th style={{ ...th, textAlign: "right" }}>Nuits vendues</th><th style={{ ...th, textAlign: "right" }}>CA nuitées</th><th style={{ ...th, textAlign: "right" }}>CA total</th></tr></thead>
          <tbody>{s.rows.map((r, i) => { const to = r.availNights ? (r.occNights / r.availNights) * 100 : 0; return (<tr key={r.ym} style={{ background: i % 2 ? C.rowAlt : "#fff" }}>
            <td style={{ ...td, textTransform: "capitalize" }}>{frMonth(r.ym)}</td><td style={tdR}>{fPct(to)}</td><td style={tdR}>{money(r.rentPaid)}</td>
            <td style={{ ...tdR, color: r.impaye > 0 ? C.danger : C.ink }}>{money(r.impaye)}</td><td style={tdR}>{fN(r.nightsSold)}</td><td style={tdR}>{money(r.courtRevenue)}</td><td style={{ ...tdR, fontWeight: 700 }}>{money(r.caTotal)}</td>
          </tr>); })}</tbody>
          <tfoot><tr style={{ background: C.green }}>
            <td style={{ ...td, color: "#fff", fontWeight: 800, borderBottom: "none" }}>TOTAL</td><td style={{ ...tdR, color: C.gold2, fontWeight: 800, borderBottom: "none" }}>{fPct(s.to)}</td>
            <td style={{ ...tdR, color: "#fff", fontWeight: 800, borderBottom: "none" }}>{money(s.rentPaid)}</td><td style={{ ...tdR, color: C.gold2, fontWeight: 800, borderBottom: "none" }}>{money(s.impaye)}</td>
            <td style={{ ...tdR, color: "#fff", fontWeight: 800, borderBottom: "none" }}>{fN(s.nightsSold)}</td><td style={{ ...tdR, color: "#fff", fontWeight: 800, borderBottom: "none" }}>{money(s.courtRevenue)}</td>
            <td style={{ ...tdR, color: C.gold2, fontWeight: 800, borderBottom: "none" }}>{money(s.caTotal)}</td>
          </tr></tfoot>
        </table>
      </div>
    </Card>
  </div>);
}

/* ============================================================
   Clôture journalière
   ============================================================ */
function Cloture({ config, setConfig, units, setUnits, folios, setFolios, updateFolio, monthly, postings, setPostings, clotures, setClotures }) {
  const money = useMoney();
  const [step, setStep] = useState(1);
  const D = config.dateHotel;
  const roomDirty = (unitId) => setUnits((p) => p.map((u) => (u.id === unitId ? { ...u, statutMenage: "sale" } : u)));
  const alreadyClosed = clotures.some((c) => c.dateHotel === D);

  const pendingArrivals = folios.filter((f) => f.arrival === D && !f.checkedIn && active(f) && !f.closed);
  const dueDepartures = folios.filter((f) => f.departure === D && !f.closed && active(f) && (f.checkedIn || f.arrival < D));
  const inHouse = folios.filter((f) => active(f) && !f.closed && f.arrival <= D && D < f.departure && (f.checkedIn || f.arrival < D));

  const checkIn = (f) => { const u = units.find((x) => x.id === f.unitId); if (!clearForCheckin(u)) return; updateFolio(f.id, { checkedIn: true, resaStatus: f.resaStatus === "option" ? "confirmée" : f.resaStatus }); };
  const noShow = (f) => updateFolio(f.id, { resaStatus: "no-show" });
  const checkOut = (f) => { if (!settledForCheckout(f)) return; updateFolio(f.id, { closed: true, checkoutDate: D }); roomDirty(f.unitId); };
  const encaisserSolde = (f) => { const c = folioCalc(f); updateFolio(f.id, { paid: num(f.paid) + c.solde }); };
  const prolong = (f) => updateFolio(f.id, { departure: addDays(f.departure, 1) });

  const previewLines = inHouse.flatMap((f) => { const arr = [{ folioId: f.id, unitId: f.unitId, guest: f.guest || f.number, famille: "Hébergement", montant: num(f.rate) }]; const pdj = num(f.pdjParJour) * num(f.pdjPrix); if (pdj > 0) arr.push({ folioId: f.id, unitId: f.unitId, guest: f.guest || f.number, famille: "Petit-déjeuner", montant: pdj }); return arr; });
  const totalPassage = previewLines.reduce((s, l) => s + l.montant, 0);
  const ind = dayIndicators(units, folios, monthly, D);

  const validate = async () => {
    const stamp = new Date().toISOString();
    const lines = previewLines.map((l, i) => ({ dateHotel: D, ...l, libelle: l.famille + " – " + frDate(D), horodatage: stamp }));
    try {
      const cloture = { dateHotel: D, executedAt: stamp, indicators: ind, nbArrivals: folios.filter((f) => f.arrival === D && active(f)).length, nbDeparts: folios.filter((f) => f.departure === D && f.closed).length, nbNoShow: folios.filter((f) => f.arrival === D && f.resaStatus === "no-show").length, nbLignes: lines.length, montant: totalPassage };
      
      await apiServices.executeCloture({ cloture, postings: lines });
      
      setPostings((p) => [...p, ...lines]);
      setClotures((p) => [...p, cloture]);
      setConfig((c) => ({ ...c, dateHotel: addDays(D, 1) }));
      setStep(5);
    } catch (e) { console.error(e); alert("Erreur d'API lors de la clôture."); }
  };

  const StepHead = ({ n, title, done, blocked }) => (<div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><div style={{ width: 26, height: 26, borderRadius: 13, background: done ? C.ok : blocked ? C.danger : C.green, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>{n}</div><div style={{ fontWeight: 800, color: C.green }}>{title}</div></div>);

  if (alreadyClosed && step !== 5) return (<div><SectionTitle eyebrow="Nuit d'audit" title="Clôture journalière" /><Card style={{ padding: 20 }}><div style={{ color: C.ok, fontWeight: 700 }}>La date hôtel {frDate(D)} a déjà été clôturée.</div><div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Aucune clôture ne peut être rejouée sur une date déjà figée (le passé est immuable).</div></Card><ClotureHistory clotures={clotures} money={money} /></div>);

  return (<div>
    <SectionTitle eyebrow="Nuit d'audit · point de non-retour" title="Clôture journalière" right={<Tag color={C.green2}>Date hôtel : {frDate(D)}</Tag>} />

    <Card style={{ padding: 18, marginBottom: 14 }}>
      <StepHead n={1} title="Contrôle des arrivées" done={pendingArrivals.length === 0} blocked={pendingArrivals.length > 0} />
      {pendingArrivals.length === 0 ? <div style={{ fontSize: 13, color: C.ok, paddingLeft: 36 }}>Toutes les arrivées prévues sont traitées.</div> :
        <div style={{ paddingLeft: 36 }}>
          <div style={{ fontSize: 13, color: C.danger, marginBottom: 8 }}>{pendingArrivals.length} arrivée(s) prévue(s) non traitée(s). Chaque dossier doit être arrivé ou passé en no-show.</div>
          {pendingArrivals.map((f) => (<div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.line}` }}><div style={{ fontSize: 13.5 }}><ClientLink id={f.id}>{f.number} · {f.guest || "(sans nom)"}</ClientLink> · {units.find((u) => u.id === f.unitId)?.label}</div><div style={{ whiteSpace: "nowrap" }}>{(() => { const rdy = roomReady(units.find((u) => u.id === f.unitId)); return <Btn size="sm" disabled={!rdy} title={rdy ? "" : "Logement non nettoyé — voir Gouvernante"} onClick={() => checkIn(f)}>Check-in</Btn>; })()}{" "}<Btn size="sm" kind="danger" onClick={() => noShow(f)}>No-show</Btn></div></div>))}
        </div>}
    </Card>

    <Card style={{ padding: 18, marginBottom: 14 }}>
      <StepHead n={2} title="Contrôle des départs" done={dueDepartures.length === 0} blocked={dueDepartures.length > 0} />
      {dueDepartures.length === 0 ? <div style={{ fontSize: 13, color: C.ok, paddingLeft: 36 }}>Aucun départ prévu resté en maison.</div> :
        <div style={{ paddingLeft: 36 }}>
          <div style={{ fontSize: 13, color: C.danger, marginBottom: 8 }}>{dueDepartures.length} départ(s) prévu(s) encore en maison. Départ ou prolongation requis.</div>
          {dueDepartures.map((f) => { const solde = folioCalc(f).solde; const ok = solde <= 0.5; return (<div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.line}`, gap: 8, flexWrap: "wrap" }}><div style={{ fontSize: 13.5 }}><ClientLink id={f.id}>{f.number} · {f.guest || "(sans nom)"}</ClientLink> · solde <b style={{ color: ok ? C.ok : C.danger }}>{money(solde)}</b></div><div style={{ whiteSpace: "nowrap" }}>{!ok && <><Btn size="sm" onClick={() => encaisserSolde(f)}>Encaisser le solde</Btn>{" "}</>}<Btn size="sm" kind="gold" disabled={!ok} title={ok ? "" : "Folio non soldé"} onClick={() => checkOut(f)}>Check-out</Btn>{" "}<Btn size="sm" kind="ghost" onClick={() => prolong(f)}>Prolonger +1</Btn></div></div>); })}
        </div>}
    </Card>

    <Card style={{ padding: 18, marginBottom: 14 }}>
      <StepHead n={3} title="Passage des prix (main courante)" />
      <div style={{ paddingLeft: 36, fontSize: 13, color: C.muted, marginBottom: 8 }}>Génération de la ligne hébergement (+ PDJ) pour chaque client en maison sur la date hôtel.</div>
      <div style={{ paddingLeft: 36, overflowX: "auto" }}>
        {previewLines.length === 0 ? <div style={{ fontSize: 13, color: C.muted }}>Aucun client en maison.</div> :
          <table style={{ borderCollapse: "collapse", minWidth: 480 }}><tbody>
            {previewLines.map((l, i) => (<tr key={i}><td style={{ ...td, borderBottom: "none", padding: "4px 12px 4px 0" }}>{l.guest}</td><td style={{ ...td, borderBottom: "none", padding: "4px 12px", color: C.muted }}>{l.famille}</td><td style={{ ...tdR, borderBottom: "none", padding: "4px 0", fontWeight: 600 }}>{money(l.montant)}</td></tr>))}
            <tr><td style={{ ...td, borderBottom: "none", fontWeight: 800, color: C.green }}>Total du jour</td><td /><td style={{ ...tdR, borderBottom: "none", fontWeight: 800, color: C.green }}>{money(totalPassage)}</td></tr>
          </tbody></table>}
      </div>
    </Card>

    <Card style={{ padding: 18, marginBottom: 14 }}>
      <StepHead n={4} title="Figement des indicateurs & validation" />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", paddingLeft: 36 }}>
        <Kpi label="Occupation" value={fPct(ind.occupation)} sub={`${ind.occ}/${ind.dispo}`} />
        <Kpi label="Prix moyen" value={money(ind.pm)} /><Kpi label="RevPAR" value={money(ind.revpar)} accent={C.gold} />
        <Kpi label="CA hébergement" value={money(ind.caHeb)} /><Kpi label="CA total jour" value={money(ind.caTotal)} accent={C.green2} />
      </div>
      <div style={{ paddingLeft: 36, marginTop: 16, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <Btn kind="gold" disabled={pendingArrivals.length > 0 || dueDepartures.length > 0} onClick={validate}>Valider la clôture · date hôtel → {frDate(addDays(D, 1))}</Btn>
        {(pendingArrivals.length > 0 || dueDepartures.length > 0) && <span style={{ fontSize: 12.5, color: C.danger }}>Traitez d'abord les arrivées et départs bloquants.</span>}
      </div>
      <div style={{ paddingLeft: 36, fontSize: 11.5, color: C.warn, marginTop: 8 }}>Action irréversible : la date hôtel avance et la journée est figée.</div>
    </Card>

    {step === 5 && <Card style={{ padding: 20, marginBottom: 14, background: "#F1F8F2", border: `1px solid ${C.ok}55` }}><div style={{ fontWeight: 800, color: C.ok, marginBottom: 4 }}>Clôture validée ✓</div><div style={{ fontSize: 13, color: C.muted }}>La date hôtel est désormais {frDate(config.dateHotel)}. Indicateurs figés et main courante archivée.</div></Card>}
    <ClotureHistory clotures={clotures} money={money} />
  </div>);
}
function ClotureHistory({ clotures, money }) {
  if (!clotures.length) return null;
  return (<Card style={{ overflow: "hidden", marginTop: 6 }}>
    <div style={{ background: C.green, color: "#fff", padding: "9px 14px", fontWeight: 700, fontSize: 13 }}>Historique des clôtures</div>
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
        <thead><tr><th style={th}>Date hôtel</th><th style={{ ...th, textAlign: "right" }}>Occupation</th><th style={{ ...th, textAlign: "right" }}>CA hébergement</th><th style={{ ...th, textAlign: "right" }}>CA total</th><th style={{ ...th, textAlign: "right" }}>Lignes MC</th></tr></thead>
        <tbody>{clotures.slice().reverse().map((c, i) => (<tr key={c.dateHotel} style={{ background: i % 2 ? C.rowAlt : "#fff" }}>
          <td style={td}>{frDate(c.dateHotel)}</td><td style={tdR}>{fPct(c.indicators.occupation)}</td><td style={tdR}>{money(c.indicators.caHeb)}</td><td style={{ ...tdR, fontWeight: 700 }}>{money(c.indicators.caTotal)}</td><td style={tdR}>{c.nbLignes}</td>
        </tr>))}</tbody>
      </table>
    </div>
  </Card>);
}

/* ============================================================
   Débiteurs & créances
   ============================================================ */
function Debiteurs({ units, monthly, debtors, setDebtors, updateMonthly }) {
  const money = useMoney();
  const arr = useMemo(() => arrears(units, monthly), [units, monthly]);
  const arrTotal = arr.reduce((s, a) => s + a.impaye, 0);
  const add = () => setDebtors((p) => [{ id: Date.now(), client: "", label: "", dueDate: addDays(today(), 30), amount: 0, paid: 0 }, ...p]);
  const upd = (id, patch) => setDebtors((p) => p.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const del = (id) => setDebtors((p) => p.filter((d) => d.id !== id));
  const t = today();
  const other = debtors.map((d) => { const rest = num(d.amount) - num(d.paid); const overdue = d.dueDate < t && rest > 0.5; return { ...d, rest, overdue, daysLate: overdue ? Math.round((new Date(t) - new Date(d.dueDate)) / 86400000) : 0 }; });
  const otherTotal = other.reduce((s, d) => s + Math.max(0, d.rest), 0);
  const exportCSV = () => downloadCSV(`juweirat_creances_${t}.csv`, [["ARRIÉRÉS DE LOYER"], ["Mois", "Logement", "Locataire", "Impayé"], ...arr.map((a) => [frMonth(a.ym), a.label, a.tenant, Math.round(a.impaye)]), [], ["AUTRES CRÉANCES"], ["Client", "Libellé", "Échéance", "Montant", "Réglé", "Reste"], ...other.map((d) => [d.client, d.label, d.dueDate, Math.round(d.amount), Math.round(d.paid), Math.round(d.rest)])]);
  return (<div>
    <SectionTitle eyebrow="Créances" title="Débiteurs & créances" right={<div style={{ display: "flex", gap: 8 }}><Btn kind="gold" size="sm" onClick={exportCSV}>Exporter</Btn><Btn onClick={add}>+ Autre créance</Btn></div>} />
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
      <Kpi label="Arriérés de loyer" value={money(arrTotal)} sub={`${arr.length} échéance(s)`} accent={arrTotal > 0 ? C.danger : C.ok} />
      <Kpi label="Autres créances" value={money(otherTotal)} accent={otherTotal > 0 ? C.danger : C.ok} />
      <Kpi label="Total à recouvrer" value={money(arrTotal + otherTotal)} accent={C.warn} />
    </div>
    <div style={{ fontWeight: 800, color: C.green, marginBottom: 10 }}>Arriérés de loyer</div>
    <Card style={{ overflow: "hidden", marginBottom: 24 }}><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
      <thead><tr><th style={th}>Mois</th><th style={th}>Logement</th><th style={th}>Locataire</th><th style={{ ...th, textAlign: "right" }}>Impayé</th><th style={{ ...th, textAlign: "center" }}>Action</th></tr></thead>
      <tbody>{arr.length === 0 && <tr><td colSpan={5} style={{ ...td, textAlign: "center", color: C.ok, padding: 20 }}>Aucun arriéré.</td></tr>}
        {arr.map((a, i) => (<tr key={a.ym + a.unitId} style={{ background: i % 2 ? C.rowAlt : "#fff" }}><td style={{ ...td, textTransform: "capitalize" }}>{frMonth(a.ym)}</td><td style={td}>{a.label}</td><td style={{ ...td, color: a.tenant ? C.ink : C.muted }}>{a.tenant || "—"}</td><td style={{ ...tdR, fontWeight: 700, color: C.danger }}>{money(a.impaye)}</td><td style={{ ...td, textAlign: "center" }}><Btn size="sm" kind="ghost" onClick={() => updateMonthly(a.ym, a.unitId, { rentPaid: a.due })}>Solder</Btn></td></tr>))}
      </tbody></table></div></Card>
    <div style={{ fontWeight: 800, color: C.green, marginBottom: 10 }}>Autres créances (factures diverses, charges, cautions…)</div>
    <Card style={{ overflow: "hidden" }}><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
      <thead><tr><th style={th}>Client</th><th style={th}>Libellé</th><th style={th}>Échéance</th><th style={{ ...th, textAlign: "right" }}>Montant</th><th style={{ ...th, textAlign: "right" }}>Réglé</th><th style={{ ...th, textAlign: "right" }}>Reste</th><th style={{ ...th, textAlign: "center" }}>Retard</th><th style={{ ...th, width: 90 }}></th></tr></thead>
      <tbody>{other.length === 0 && <tr><td colSpan={8} style={{ ...td, textAlign: "center", color: C.muted, padding: 20 }}>Aucune autre créance.</td></tr>}
        {other.map((d, i) => (<tr key={d.id} style={{ background: d.overdue ? "#FCF3F0" : i % 2 ? C.rowAlt : "#fff" }}>
          <td style={td}><TextInput value={d.client} placeholder="Nom" onChange={(v) => upd(d.id, { client: v })} /></td>
          <td style={td}><TextInput value={d.label} placeholder="Objet" onChange={(v) => upd(d.id, { label: v })} /></td>
          <td style={td}><DateInput value={d.dueDate} onChange={(v) => upd(d.id, { dueDate: v })} /></td>
          <td style={td}><div style={{ width: 148, marginLeft: "auto" }}><MoneyInput value={d.amount} onChange={(v) => upd(d.id, { amount: v })} /></div></td>
          <td style={td}><div style={{ width: 148, marginLeft: "auto" }}><MoneyInput value={d.paid} onChange={(v) => upd(d.id, { paid: v })} /></div></td>
          <td style={{ ...tdR, fontWeight: 700, color: d.rest > 0.5 ? C.danger : C.ok }}>{money(d.rest)}</td>
          <td style={{ ...td, textAlign: "center", color: d.overdue ? C.danger : C.muted, fontWeight: d.overdue ? 700 : 400, fontSize: 12.5 }}>{d.overdue ? "+" + d.daysLate + " j" : "—"}</td>
          <td style={{ ...td, textAlign: "center", whiteSpace: "nowrap" }}><Btn size="sm" kind="ghost" onClick={() => upd(d.id, { paid: d.amount })}>Solder</Btn>{" "}<button onClick={() => del(d.id)} style={{ border: "none", background: "transparent", color: C.danger, cursor: "pointer", fontSize: 16 }}>×</button></td>
        </tr>))}
      </tbody></table></div></Card>
  </div>);
}

/* ============================================================
   Paramètres
   ============================================================ */
function Params({ config, setConfig, units }) {
  const upd = (patch) => setConfig((c) => ({ ...c, ...patch }));
  const cLong = units.filter((u) => u.mode === "long").length;
  return (<div>
    <SectionTitle eyebrow="Configuration" title="Paramètres" />
    <Card style={{ padding: 18, marginBottom: 18 }}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, maxWidth: 640 }}>
      <Field label="Nom de l'immeuble"><TextInput value={config.buildingName} onChange={(v) => upd({ buildingName: v })} /></Field>
      <Field label="Propriétaire"><TextInput value={config.ownerName} onChange={(v) => upd({ ownerName: v })} /></Field>
      <Field label="Ville"><TextInput value={config.city} onChange={(v) => upd({ city: v })} /></Field>
      <Field label="Date hôtel" hint="avancée par la clôture, ajustable ici si besoin"><DateInput value={config.dateHotel} onChange={(v) => upd({ dateHotel: v })} /></Field>
      <Field label="Devise (code)"><TextInput value={(config.currency || DEFAULT_CONFIG.currency).code} onChange={(v) => upd({ currency: { ...(config.currency || DEFAULT_CONFIG.currency), code: v } })} /></Field>
      <Field label="Décimales" hint="0 pour le FCFA"><NumInput value={(config.currency || DEFAULT_CONFIG.currency).decimals} min={0} onChange={(v) => upd({ currency: { ...(config.currency || DEFAULT_CONFIG.currency), decimals: Math.max(0, Math.round(v)) } })} /></Field>
    </div></Card>
    <Card style={{ padding: 18 }}><div style={{ fontWeight: 800, color: C.green, marginBottom: 6 }}>Parc actuel</div><div style={{ fontSize: 13.5, color: C.muted }}>{units.length} logements · {cLong} longue durée · {units.length - cLong} courte durée.</div></Card>
  </div>);
}

/* ============================================================
   Factures émises
   ============================================================ */
function FactureModal({ facture, updateFacture, printFacture, config, onClose }) {
  const money = useMoney();
  const [snap, setSnap] = useState(() => ({ lines: [], arrhes: 0, paid: 0, payMode: "Espèces", recipient: "client", client: "", societe: "", reservataire: "", unitLabel: "", arrival: "", departure: "", nights: 0, pax: 0, ...(facture.snapshot || {}) }));
  const setS = (patch) => setSnap((s) => ({ ...s, ...patch }));
  const setLine = (i, patch) => setSnap((s) => ({ ...s, lines: s.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));
  const addLine = () => setSnap((s) => ({ ...s, lines: [...s.lines, { label: "Nouvelle prestation", montant: 0 }] }));
  const delLine = (i) => setSnap((s) => ({ ...s, lines: s.lines.filter((_, j) => j !== i) }));
  const total = snap.lines.reduce((s, l) => s + num(l.montant), 0);
  const solde = total - num(snap.paid) - num(snap.arrhes);
  const eyebrow = { fontSize: 11.5, fontWeight: 800, color: C.gold, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" };
  const save = (thenPrint) => {
    const nextSnap = { ...snap, total };
    const corrections = (facture.corrections || 0) + 1;
    updateFacture(facture.id, { snapshot: nextSnap, corrections, corrigeeLe: config.dateHotel });
    if (thenPrint) printFacture({ ...facture, snapshot: nextSnap, corrections, corrigeeLe: config.dateHotel }, true);
    onClose();
  };
  return (<Modal wide title={"Modifier la facture " + facture.number} onClose={onClose} footer={<><Btn kind="ghost" onClick={onClose}>Annuler</Btn><Btn onClick={() => save(false)}>Enregistrer</Btn><Btn kind="gold" onClick={() => save(true)}>Enregistrer & télécharger</Btn></>}>
    <div style={{ fontSize: 12.5, color: C.warn, background: "#FBF6EC", border: `1px solid ${C.gold}44`, borderRadius: 8, padding: "8px 12px", marginBottom: 16 }}>La correction d'une facture émise conserve le même numéro et porte la mention « facture rectifiée ». La séquence légale n'est jamais réattribuée.</div>
    <div style={eyebrow}>Destinataire & séjour</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <Field label="Destinataire"><Select value={snap.recipient} onChange={(v) => setS({ recipient: v })} options={[{ v: "client", l: "Client" }, { v: "societe", l: "Société" }]} /></Field>
      <Field label="Date de facture"><DateInput value={facture.date} onChange={(v) => updateFacture(facture.id, { date: v })} /></Field>
      <Field label="Client"><TextInput value={snap.client} onChange={(v) => setS({ client: v })} /></Field>
      <Field label="Société"><TextInput value={snap.societe} onChange={(v) => setS({ societe: v })} /></Field>
      <Field label="Réservataire"><TextInput value={snap.reservataire} onChange={(v) => setS({ reservataire: v })} /></Field>
      <Field label="Logement (libellé)"><TextInput value={snap.unitLabel} onChange={(v) => setS({ unitLabel: v })} /></Field>
      <Field label="Mode de règlement"><Select value={snap.payMode} onChange={(v) => setS({ payMode: v })} options={["Espèces", "Carte bancaire", "Virement", "Chèque", "Mobile Money", "Débiteur divers"]} /></Field>
      <Field label="Nuits / Pax" hint="informatif"><div style={{ display: "flex", gap: 8 }}><NumInput value={snap.nights} min={0} onChange={(v) => setS({ nights: v })} /><NumInput value={snap.pax} min={0} onChange={(v) => setS({ pax: v })} /></div></Field>
    </div>
    <div style={{ ...eyebrow, margin: "18px 0 8px" }}>Lignes de prestation</div>
    {snap.lines.map((l, i) => (<div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
      <div style={{ flex: 1 }}><TextInput value={l.label} onChange={(v) => setLine(i, { label: v })} /></div>
      <div style={{ width: 170 }}><MoneyInput value={l.montant} onChange={(v) => setLine(i, { montant: v })} /></div>
      <button onClick={() => delLine(i)} title="Supprimer la ligne" style={{ border: "none", background: "transparent", color: C.danger, cursor: "pointer", fontSize: 18 }}>×</button>
    </div>))}
    <Btn size="sm" kind="ghost" onClick={addLine}>+ Ajouter une ligne</Btn>
    <div style={{ ...eyebrow, margin: "18px 0 8px" }}>Règlement</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
      <Field label="Arrhes / acompte"><MoneyInput value={snap.arrhes} onChange={(v) => setS({ arrhes: v })} /></Field>
      <Field label="Réglé"><MoneyInput value={snap.paid} onChange={(v) => setS({ paid: v })} /></Field>
      <div style={{ alignSelf: "end", paddingBottom: 6 }}><div style={{ fontSize: 11.5, color: C.muted, fontWeight: 700, textTransform: "uppercase" }}>Total / Solde</div><div style={{ fontSize: 16, fontWeight: 800, color: C.green }}>{money(total)}</div><div style={{ fontSize: 13, fontWeight: 700, color: solde > 0.5 ? C.danger : C.ok }}>Solde {money(solde)}</div></div>
    </div>
  </Modal>);
}

/* ============================================================
   Factures émises
   ============================================================ */
function FacturesTab({ factures, folios, config, openFacture, cancelFacture, printFacture }) {
  const money = useMoney();
  const { open } = useContext(FolioCtx);
  const [q, setQ] = useState("");
  const [dfrom, setDfrom] = useState("");
  const [dto, setDto] = useState("");
  const folioOf = (x) => folios.find((y) => y.id === x.folioId);
  const nameHay = (x) => { const f = folioOf(x); return [x.snapshot?.client, x.snapshot?.societe, f && f.guest, f && f.nom, f && f.prenom, f && f.societe].filter(Boolean).join(" ").toLowerCase(); };
  const filtered = factures.filter((x) => {
    if (q.trim() && !nameHay(x).includes(q.trim().toLowerCase())) return false;
    if (dfrom && x.date < dfrom) return false;
    if (dto && x.date > dto) return false;
    return true;
  });
  const emises = factures.filter((x) => x.status !== "annulée");
  const total = emises.reduce((s, x) => s + num(x.snapshot?.total), 0);
  const destOf = (x) => (x.snapshot?.recipient === "societe" ? (x.snapshot?.societe || "Société") : (x.snapshot?.client || "Client"));
  const activeFilter = q.trim() || dfrom || dto;
  return (<div>
    <SectionTitle eyebrow="Facturation" title="Factures émises" />
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
      <Kpi label="Factures actives" value={emises.length} sub={factures.length > emises.length ? `${factures.length - emises.length} annulée(s)` : ""} />
      <Kpi label="Total facturé" value={money(total)} accent={C.green2} />
    </div>
    <Card style={{ padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 220px", minWidth: 200 }}><Field label="Nom / prénom / société"><TextInput value={q} placeholder="Rechercher un client…" onChange={setQ} /></Field></div>
        <div style={{ width: 160 }}><Field label="Du"><DateInput value={dfrom} onChange={setDfrom} /></Field></div>
        <div style={{ width: 160 }}><Field label="Au"><DateInput value={dto} onChange={setDto} /></Field></div>
        {activeFilter ? <Btn kind="ghost" onClick={() => { setQ(""); setDfrom(""); setDto(""); }}>Réinitialiser</Btn> : null}
        <div style={{ fontSize: 12.5, color: C.muted, paddingBottom: 9 }}>{filtered.length} résultat(s)</div>
      </div>
    </Card>
    <Card style={{ overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 940 }}>
          <thead><tr><th style={th}>N° Facture</th><th style={th}>Date</th><th style={th}>Destinataire</th><th style={th}>Folio</th><th style={{ ...th, textAlign: "right" }}>Total</th><th style={{ ...th, textAlign: "center" }}>Statut</th><th style={{ ...th, textAlign: "center" }}>Actions</th></tr></thead>
          <tbody>
            {factures.length === 0 && <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: C.muted, padding: 24 }}>Aucune facture émise. Éditez-en une depuis un folio client.</td></tr>}
            {factures.length > 0 && filtered.length === 0 && <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: C.muted, padding: 24 }}>Aucune facture ne correspond à la recherche.</td></tr>}
            {filtered.map((x, i) => { const f = folios.find((y) => y.id === x.folioId); const cancelled = x.status === "annulée"; return (<tr key={x.id} style={{ background: cancelled ? "#F4F1EC" : i % 2 ? C.rowAlt : "#fff", opacity: cancelled ? 0.7 : 1 }}>
              <td style={{ ...td, fontWeight: 700 }}>{x.number}</td>
              <td style={td}>{frDate(x.date)}</td>
              <td style={td}>{destOf(x)}<span style={{ color: C.muted, fontSize: 11.5 }}> · {x.snapshot?.recipient === "societe" ? "société" : "client"}</span></td>
              <td style={td}>{f ? <ClientLink id={f.id}>{f.number}</ClientLink> : <span style={{ color: C.muted }}>—</span>}</td>
              <td style={tdR}>{money(x.snapshot?.total)}</td>
              <td style={{ ...td, textAlign: "center" }}>{cancelled ? <Tag color={C.danger}>Annulée</Tag> : x.corrections ? <Tag color={C.warn}>Rectifiée</Tag> : <Tag color={C.ok}>Émise</Tag>}</td>
              <td style={{ ...td, textAlign: "center", whiteSpace: "nowrap" }}>
                {!cancelled && <><Btn size="sm" kind="ghost" onClick={() => openFacture(x.id)}>Modifier</Btn>{" "}</>}
                <Btn size="sm" kind="ghost" onClick={() => printFacture(x)}>Télécharger</Btn>{" "}
                {f && <><Btn size="sm" kind="ghost" onClick={() => open(f.id)}>Folio</Btn>{" "}</>}
                {!cancelled && <Btn size="sm" kind="danger" onClick={() => { if (window.confirm("Annuler la facture " + x.number + " ? Elle restera archivée (mention ANNULÉE) et le folio pourra être refacturé.")) cancelFacture(x); }}>Annuler</Btn>}
              </td>
            </tr>); })}
          </tbody>
        </table>
      </div>
    </Card>
    <div style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>« Modifier » corrige une facture émise (même numéro, mention « rectifiée »). « Annuler » l'archive et libère le folio pour une nouvelle facture. Toute réédition porte la mention « duplicata ».</div>
  </div>);
}

/* ============================================================
   Maintenance & problèmes techniques
   ============================================================ */
const MAINT_CATS = ["Plomberie", "Électricité", "Climatisation", "Mobilier / Literie", "Serrurerie", "Peinture / Murs", "Sanitaire", "Électroménager", "Internet / TV", "Autre"];
const MAINT_STATUS = { ouvert: ["Ouvert", C.warn], en_cours: ["En cours", C.blue], resolu: ["Résolu", C.ok], annule: ["Annulé", C.muted] };
const MAINT_PRIO = { basse: ["Basse", C.muted], normale: ["Normale", C.green2], haute: ["Haute", C.warn], urgente: ["Urgente", C.danger] };
const PRIO_ORDER = { urgente: 3, haute: 2, normale: 1, basse: 0 };

function MaintenanceModal({ draft, isNew, units, onSave, onDelete, onClose }) {
  const [t, setT] = useState(draft);
  const [putHSFlag, setPutHSFlag] = useState(false);
  const set = (patch) => setT((s) => ({ ...s, ...patch }));
  const eyebrow = { fontSize: 11.5, fontWeight: 800, color: C.gold, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" };
  const valid = t.title && t.title.trim();
  return (<Modal title={isNew ? "Signaler un problème" : "Fiche d'intervention"} onClose={onClose} footer={<>{!isNew && <Btn kind="danger" onClick={() => onDelete(t.id)}>Supprimer</Btn>}<Btn kind="ghost" onClick={onClose}>Annuler</Btn><Btn disabled={!valid} onClick={() => onSave(t, isNew && putHSFlag)}>Enregistrer</Btn></>}>
    <div style={eyebrow}>Localisation</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <Field label="Zone"><Select value={t.zone} onChange={(v) => set({ zone: v })} options={[{ v: "logement", l: "Logement" }, { v: "commun", l: "Parties communes" }]} /></Field>
      {t.zone === "logement" ? <Field label="Logement"><Select value={t.unitId} onChange={(v) => set({ unitId: v })} options={units.map((u) => ({ v: u.id, l: u.label + " · " + u.type }))} /></Field> : <Field label="Emplacement"><TextInput value={t.spot} placeholder="Ex. couloir 4e, ascenseur…" onChange={(v) => set({ spot: v })} /></Field>}
      <Field label="Catégorie"><Select value={t.category} onChange={(v) => set({ category: v })} options={MAINT_CATS} /></Field>
      <Field label="Priorité"><Select value={t.priority} onChange={(v) => set({ priority: v })} options={Object.keys(MAINT_PRIO).map((k) => ({ v: k, l: MAINT_PRIO[k][0] }))} /></Field>
    </div>
    <div style={{ ...eyebrow, margin: "18px 0 8px" }}>Description</div>
    <Field label="Intitulé du problème"><TextInput value={t.title} placeholder="Ex. Fuite sous l'évier" onChange={(v) => set({ title: v })} /></Field>
    <div style={{ marginTop: 12 }}><Field label="Détail"><textarea value={t.description || ""} onChange={(e) => set({ description: e.target.value })} style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} /></Field></div>
    <div style={{ ...eyebrow, margin: "18px 0 8px" }}>Traitement</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
      <Field label="Statut"><Select value={t.status} onChange={(v) => set({ status: v })} options={Object.keys(MAINT_STATUS).map((k) => ({ v: k, l: MAINT_STATUS[k][0] }))} /></Field>
      <Field label="Technicien / intervenant"><TextInput value={t.tech} placeholder="Nom" onChange={(v) => set({ tech: v })} /></Field>
      <Field label="Coût"><MoneyInput value={t.cost} onChange={(v) => set({ cost: v })} /></Field>
    </div>
    {isNew && t.zone === "logement" && <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 13, color: C.ink, cursor: "pointer" }}><input type="checkbox" checked={putHSFlag} onChange={(e) => setPutHSFlag(e.target.checked)} />Mettre le logement <b>hors service</b> immédiatement</label>}
  </Modal>);
}

function Maintenance({ tickets, setTickets, units, setUnits, config }) {
  const money = useMoney();
  const [edit, setEdit] = useState(null);
  const [fStatus, setFStatus] = useState("actifs");
  const [fUnit, setFUnit] = useState("tous");
  const blank = () => ({ id: Date.now(), createdAt: config.dateHotel, zone: "logement", unitId: units[0] ? units[0].id : "", spot: "", category: "Plomberie", priority: "normale", title: "", description: "", tech: "", cost: 0, status: "ouvert", resolvedAt: "", note: "" });
  const save = (tk, putHS) => { setTickets((p) => (p.some((x) => x.id === tk.id) ? p.map((x) => (x.id === tk.id ? tk : x)) : [tk, ...p])); if (putHS && tk.zone === "logement" && tk.unitId) setUnits((p) => p.map((u) => (u.id === tk.unitId ? { ...u, hs: true } : u))); setEdit(null); };
  const del = (id) => { setTickets((p) => p.filter((x) => x.id !== id)); setEdit(null); };
  const setStatus = (tk, status) => setTickets((p) => p.map((x) => (x.id === tk.id ? { ...x, status, resolvedAt: status === "resolu" ? config.dateHotel : "" } : x)));
  const putHS = (unitId) => setUnits((p) => p.map((u) => (u.id === unitId ? { ...u, hs: true } : u)));
  const backInService = (unitId) => setUnits((p) => p.map((u) => (u.id === unitId ? { ...u, hs: false, statutMenage: "sale" } : u)));
  const unitOf = (t) => units.find((u) => u.id === t.unitId);
  const isHS = (t) => { const u = unitOf(t); return u && u.hs; };
  const locLabel = (t) => (t.zone === "commun" ? (t.spot ? "Communs · " + t.spot : "Parties communes") : (unitOf(t) ? unitOf(t).label : "—"));

  const actifs = tickets.filter((t) => t.status === "ouvert" || t.status === "en_cours");
  const urgents = actifs.filter((t) => t.priority === "urgente");
  const enCours = tickets.filter((t) => t.status === "en_cours").length;
  const resolus = tickets.filter((t) => t.status === "resolu");
  const coutTotal = resolus.reduce((s, t) => s + num(t.cost), 0);

  const list = tickets
    .filter((t) => (fStatus === "actifs" ? t.status === "ouvert" || t.status === "en_cours" : fStatus === "resolus" ? t.status === "resolu" : true))
    .filter((t) => fUnit === "tous" || t.unitId === fUnit)
    .sort((a, b) => (PRIO_ORDER[b.priority] - PRIO_ORDER[a.priority]) || (b.id - a.id));

  return (<div>
    <SectionTitle eyebrow="Technique" title="Maintenance & problèmes" right={<Btn onClick={() => setEdit(blank())}>+ Signaler un problème</Btn>} />
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
      <Kpi label="Tickets actifs" value={actifs.length} accent={actifs.length ? C.warn : C.ok} />
      <Kpi label="En cours" value={enCours} accent={C.blue} />
      <Kpi label="Urgents ouverts" value={urgents.length} accent={urgents.length ? C.danger : C.green} />
      <Kpi label="Résolus" value={resolus.length} accent={C.ok} />
      <Kpi label="Coût cumulé (résolus)" value={money(coutTotal)} accent={C.green2} />
    </div>
    <Card style={{ padding: 14, marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6 }}>{[["actifs", "Actifs"], ["resolus", "Résolus"], ["tous", "Tous"]].map(([v, l]) => <Btn key={v} size="sm" kind={fStatus === v ? "primary" : "ghost"} onClick={() => setFStatus(v)}>{l}</Btn>)}</div>
        <div style={{ width: 200 }}><Field label="Logement"><Select value={fUnit} onChange={setFUnit} options={[{ v: "tous", l: "Tous les logements" }, ...units.map((u) => ({ v: u.id, l: u.label }))]} /></Field></div>
        <div style={{ fontSize: 12.5, color: C.muted, paddingBottom: 9 }}>{list.length} ticket(s)</div>
      </div>
    </Card>
    <Card style={{ overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1040 }}>
          <thead><tr><th style={th}>Priorité</th><th style={th}>Localisation</th><th style={th}>Catégorie</th><th style={th}>Problème</th><th style={th}>Technicien</th><th style={{ ...th, textAlign: "right" }}>Coût</th><th style={{ ...th, textAlign: "center" }}>Statut</th><th style={{ ...th, textAlign: "center" }}>Actions</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={8} style={{ ...td, textAlign: "center", color: C.muted, padding: 24 }}>Aucun ticket. Signale un problème pour le suivre ici.</td></tr>}
            {list.map((t, i) => { const p = MAINT_PRIO[t.priority] || MAINT_PRIO.normale; const st = MAINT_STATUS[t.status] || MAINT_STATUS.ouvert; const resolved = t.status === "resolu" || t.status === "annule"; return (<tr key={t.id} style={{ background: t.priority === "urgente" && !resolved ? "#FBEDEA" : i % 2 ? C.rowAlt : "#fff", opacity: resolved ? 0.75 : 1 }}>
              <td style={td}><Tag color={p[1]}>{p[0]}</Tag></td>
              <td style={td}>{locLabel(t)}{isHS(t) && <span style={{ color: C.warn, fontSize: 11, fontWeight: 700 }}> · HS</span>}</td>
              <td style={td}>{t.category}</td>
              <td style={td}><div style={{ fontWeight: 600 }}>{t.title}</div>{t.description && <div style={{ fontSize: 11.5, color: C.muted, maxWidth: 260, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.description}</div>}<div style={{ fontSize: 10.5, color: C.muted }}>Signalé le {frDate(t.createdAt)}{t.resolvedAt ? " · résolu le " + frDate(t.resolvedAt) : ""}</div></td>
              <td style={td}>{t.tech || <span style={{ color: C.muted }}>—</span>}</td>
              <td style={tdR}>{num(t.cost) ? money(t.cost) : "—"}</td>
              <td style={{ ...td, textAlign: "center" }}><Tag color={st[1]}>{st[0]}</Tag></td>
              <td style={{ ...td, textAlign: "center", whiteSpace: "nowrap" }}>
                {t.status === "ouvert" && <><Btn size="sm" onClick={() => setStatus(t, "en_cours")}>Prendre en charge</Btn>{" "}</>}
                {(t.status === "ouvert" || t.status === "en_cours") && <><Btn size="sm" kind="gold" onClick={() => setStatus(t, "resolu")}>Résoudre</Btn>{" "}</>}
                {t.status === "resolu" && <><Btn size="sm" kind="ghost" onClick={() => setStatus(t, "ouvert")}>Rouvrir</Btn>{" "}</>}
                {t.zone === "logement" && t.unitId && (isHS(t) ? <><Btn size="sm" kind="ghost" onClick={() => backInService(t.unitId)}>Réactiver</Btn>{" "}</> : <><Btn size="sm" kind="danger" onClick={() => putHS(t.unitId)}>Mettre HS</Btn>{" "}</>)}
                <Btn size="sm" kind="ghost" onClick={() => setEdit(t)}>Éditer</Btn>
              </td>
            </tr>); })}
          </tbody>
        </table>
      </div>
    </Card>
    <div style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>« Mettre HS » sort le logement du parc (aucune arrivée possible). À la réactivation, il repasse automatiquement en « à nettoyer ». Priorités et coûts alimentent le suivi technique.</div>
    {edit && <MaintenanceModal draft={edit} isNew={!tickets.some((x) => x.id === edit.id)} units={units} onSave={save} onDelete={del} onClose={() => setEdit(null)} />}
  </div>);
}

/* ============================================================
   Édition — calendrier des évènements par chambre
   ============================================================ */
function Edition({ units, folios, tickets, config }) {
  const money = useMoney();
  const now = thisMonth();
  const [from, setFrom] = useState(now + "-01");
  const [to, setTo] = useState(now + "-" + String(daysInMonth(now)).padStart(2, "0"));
  const [fRoom, setFRoom] = useState("tous");
  const span = Math.max(0, dayDiff(from, to) + 1);
  const winEnd = addDays(to, 1);
  const validPeriod = to >= from;
  const unitsView = fRoom === "tous" ? units : units.filter((u) => u.id === fRoom);
  const inRoom = (uid) => fRoom === "tous" || uid === fRoom;

  const events = useMemo(() => {
    const ev = [];
    folios.forEach((f) => { if (f.resaStatus === "annulée") return; if (f.arrival < winEnd && from < f.departure) { const life = resaLifecycle(f, config.dateHotel); ev.push({ unitId: f.unitId, kind: "sejour", type: "Séjour", ref: f.number, label: f.guest || "(sans nom)", start: f.arrival, end: f.departure, statut: life[0], color: f.closed ? C.muted : f.resaStatus === "no-show" ? C.danger : f.resaStatus === "option" ? C.gold : C.green2, fid: f.id }); } });
    tickets.forEach((t) => { const end = t.resolvedAt || to; if (t.createdAt <= to && end >= from) ev.push({ unitId: t.unitId, zone: t.zone, spot: t.spot, kind: "maint", type: "Maintenance", ref: t.category, label: t.title, start: t.createdAt, end: t.resolvedAt || "", statut: (MAINT_STATUS[t.status] || [])[0], color: C.warn, priority: t.priority }); });
    cleaningEvents(folios, from, to).forEach((e) => ev.push(e));
    return fRoom === "tous" ? ev : ev.filter((e) => e.unitId === fRoom);
  }, [folios, tickets, from, to, winEnd, config.dateHotel, fRoom]);

  const sejN = events.filter((e) => e.kind === "sejour").length;
  const arrN = folios.filter((f) => f.resaStatus !== "annulée" && inRoom(f.unitId) && f.arrival >= from && f.arrival <= to).length;
  const depN = folios.filter((f) => f.resaStatus !== "annulée" && inRoom(f.unitId) && f.departure >= from && f.departure <= to).length;
  const maintN = events.filter((e) => e.kind === "maint").length;
  const menageN = events.filter((e) => e.kind === "menage").length;
  const caByUnit = useMemo(() => { const m = {}; const d0 = from, d1 = addDays(to, 1); unitsView.forEach((u) => { let heb = 0, pdj = 0, extra = 0, nights = 0, stays = 0, losTot = 0; folios.forEach((f) => { if (f.unitId !== u.id || f.resaStatus === "annulée" || f.resaStatus === "no-show") return; const c = folioCalc(f); const on = overlapNights(f.arrival, f.departure, d0, d1); if (on > 0) { const pn = c.nights ? c.heb / c.nights : 0; heb += pn * on; pdj += num(f.pdjParJour) * num(f.pdjPrix) * on; nights += on; } if (f.arrival < d1 && f.departure > d0) { stays++; losTot += Math.max(0, dayDiff(f.arrival, f.departure)); } if (f.arrival >= d0 && f.arrival < d1) extra += c.deb + c.dep; }); const total = heb + pdj + extra; m[u.id] = { heb, pdj, extra, nights, total, stays, losTot, pm: nights ? heb / nights : 0, los: stays ? losTot / stays : 0 }; }); return m; }, [units, folios, from, to, fRoom]);
  const caTotal = Object.keys(caByUnit).reduce((sm, k) => sm + caByUnit[k].total, 0);
  const agg = Object.keys(caByUnit).reduce((a, k) => { const x = caByUnit[k]; a.heb += x.heb; a.nights += x.nights; a.stays += x.stays; a.losTot += x.losTot; return a; }, { heb: 0, nights: 0, stays: 0, losTot: 0 });
  const pmGlobal = agg.nights ? agg.heb / agg.nights : 0;
  const losGlobal = agg.stays ? agg.losTot / agg.stays : 0;

  const unitLabel = (id) => { const u = units.find((x) => x.id === id); return u ? u.label + " · " + u.type : null; };
  const byUnit = unitsView.map((u) => ({ u, evs: events.filter((e) => e.unitId === u.id).sort((a, b) => (a.start < b.start ? -1 : 1)) }));
  const communs = fRoom === "tous" ? events.filter((e) => e.kind === "maint" && (!e.unitId || e.zone === "commun")).sort((a, b) => (a.start < b.start ? -1 : 1)) : [];

  const list = Array.from({ length: Math.min(span, 92) }, (_, i) => addDays(from, i));
  const tooLong = span > 92;
  const dayW = 38, labelW = 150, cellBox = { boxSizing: "border-box" };

  const exportCSV = () => downloadCSV(`edition_evenements_${from}_${to}.csv`, [["Édition — évènements des chambres", frDate(from) + " → " + frDate(to)], [], ["Logement", "Type", "Référence", "Détail", "Début", "Fin", "Statut"], ...events.slice().sort((a, b) => (a.start < b.start ? -1 : 1)).map((e) => [e.unitId ? (unitLabel(e.unitId) || e.unitId) : "Parties communes" + (e.spot ? " · " + e.spot : ""), e.type, e.ref, e.label, frDate(e.start), e.end ? frDate(e.end) : "", e.statut || ""]), [], ["Synthèse par chambre"], ["Chambre", "Séjours", "Nuits", "Durée moy. (nuits)", "Prix moyen", "Hébergement", "PDJ", "Extras", "CA total"], ...unitsView.filter((u) => caByUnit[u.id] && (caByUnit[u.id].total > 0 || caByUnit[u.id].stays > 0)).map((u) => { const x = caByUnit[u.id]; return [u.label + " · " + u.type, x.stays, x.nights, x.los.toFixed(1).replace(".", ","), Math.round(x.pm), Math.round(x.heb), Math.round(x.pdj), Math.round(x.extra), Math.round(x.total)]; }), ["TOTAL", agg.stays, agg.nights, losGlobal.toFixed(1).replace(".", ","), Math.round(pmGlobal), "", "", "", Math.round(caTotal)]]);

  const printHTML = () => {
    const rowsFor = (evs) => evs.map((e) => '<tr><td>' + e.type + '</td><td>' + (e.ref || "") + '</td><td>' + e.label + '</td><td>' + frDate(e.start) + (e.end ? ' → ' + frDate(e.end) : '') + '</td><td>' + (e.statut || "") + '</td></tr>').join("");
    const cur = config.currency || DEFAULT_CONFIG.currency; const fmC = (n) => (cur.decimals ? num(n).toLocaleString('fr-FR', { minimumFractionDigits: cur.decimals, maximumFractionDigits: cur.decimals }) : Math.round(num(n)).toLocaleString('fr-FR')) + ' ' + cur.code;
    const blocks = byUnit.filter((b) => b.evs.length).map((b) => { const x = caByUnit[b.u.id] || {}; return '<h3>' + b.u.label + ' · ' + b.u.type + '</h3><div class="muted">CA période : ' + fmC(x.total || 0) + ' · prix moyen : ' + fmC(x.pm || 0) + ' · durée moyenne : ' + ((x.los || 0).toFixed(1)) + ' nuit(s) · ' + (x.nights || 0) + ' nuitée(s)</div><table><thead><tr><th>Type</th><th>Réf.</th><th>Détail</th><th>Période</th><th>Statut</th></tr></thead><tbody>' + rowsFor(b.evs) + '</tbody></table>'; }).join("");
    const communBlock = communs.length ? '<h3>Parties communes</h3><table><thead><tr><th>Type</th><th>Réf.</th><th>Détail</th><th>Période</th><th>Statut</th></tr></thead><tbody>' + rowsFor(communs) + '</tbody></table>' : "";
    const html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Édition ' + from + ' ' + to + '</title>' +
'<style>body{font-family:Segoe UI,system-ui,Arial,sans-serif;color:#2A2622;margin:0;padding:34px}h1{color:#1B4332;font-size:20px;margin:0}h3{color:#1B4332;margin:22px 0 6px;border-bottom:2px solid #B08D57;padding-bottom:3px}.muted{color:#8A8172;font-size:12.5px}table{width:100%;border-collapse:collapse;margin-top:4px}th{background:#1B4332;color:#fff;text-align:left;padding:7px 10px;font-size:11.5px;text-transform:uppercase}td{padding:6px 10px;border-bottom:1px solid #E4DCCB;font-size:13px}@media print{body{padding:0}}</style></head><body>' +
'<h1>' + config.buildingName + ' — Évènements des chambres</h1><div class="muted">Période : ' + frDate(from) + ' → ' + frDate(to) + ' · édité le ' + frDate(config.dateHotel) + '</div>' + '<div style="font-weight:800;color:#1B4332;margin-top:6px">CA total période : ' + fmC(caTotal) + '</div>' +
(blocks || '<p class="muted">Aucun évènement sur la période.</p>') + communBlock + '</body></html>';
    downloadText('edition_' + from + '_' + to + '.html', html);
  };

  const quick = (f, t2) => { setFrom(f); setTo(t2); };
  return (<div>
    <SectionTitle eyebrow="Édition · rapport" title="Évènements des chambres" right={<div style={{ display: "flex", gap: 8 }}><Btn kind="ghost" size="sm" onClick={exportCSV}>Exporter CSV</Btn><Btn kind="gold" size="sm" onClick={printHTML}>Imprimer / PDF</Btn></div>} />

    <Card style={{ padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ width: 160 }}><Field label="Du"><DateInput value={from} onChange={setFrom} /></Field></div>
        <div style={{ width: 160 }}><Field label="Au"><DateInput value={to} onChange={setTo} /></Field></div>
        <Btn kind="ghost" size="sm" onClick={() => quick(now + "-01", now + "-" + String(daysInMonth(now)).padStart(2, "0"))}>Ce mois</Btn>
        <Btn kind="ghost" size="sm" onClick={() => quick(config.dateHotel, addDays(config.dateHotel, 6))}>7 jours</Btn>
        <Btn kind="ghost" size="sm" onClick={() => quick(config.dateHotel, addDays(config.dateHotel, 29))}>30 jours</Btn>
        <div style={{ width: 190 }}><Field label="Chambre"><Select value={fRoom} onChange={setFRoom} options={[{ v: "tous", l: "Toutes les chambres" }, ...units.map((u) => ({ v: u.id, l: u.label + " · " + u.type }))]} /></Field></div>
        <div style={{ fontSize: 12.5, color: validPeriod ? C.muted : C.danger, paddingBottom: 9 }}>{validPeriod ? `${span} jour(s) · ${events.length} évènement(s)` : "période invalide"}</div>
      </div>
    </Card>

    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
      <Kpi label="Séjours" value={sejN} accent={C.green2} /><Kpi label="Arrivées" value={arrN} /><Kpi label="Départs" value={depN} /><Kpi label="Interventions" value={maintN} accent={maintN ? C.warn : C.green} /><Kpi label="Ménages" value={menageN} accent={C.blue} /><Kpi label="Prix moyen" value={money(pmGlobal)} accent={C.green2} /><Kpi label="Durée moy. séjour" value={(losGlobal ? losGlobal.toFixed(1).replace(".", ",") + " nuit(s)" : "—")} /><Kpi label="CA période" value={money(caTotal)} accent={C.gold} />
    </div>

    {validPeriod && !tooLong && (<Card style={{ overflow: "hidden", marginBottom: 18 }}>
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: labelW + list.length * dayW }}>
          <div style={{ display: "flex", background: C.green }}>
            <div style={{ width: labelW, flexShrink: 0, padding: "8px 12px", color: "#fff", fontWeight: 700, fontSize: 12, textTransform: "uppercase", ...cellBox }}>Logement</div>
            {list.map((d) => { const wd = new Date(d + "T00:00:00").getDay(); const we = wd === 0 || wd === 6; const isT = d === config.dateHotel; return (<div key={d} style={{ width: dayW, flexShrink: 0, textAlign: "center", padding: "5px 0", color: isT ? C.gold2 : "#fff", background: isT ? "rgba(201,162,39,.20)" : "transparent", borderLeft: "1px solid rgba(255,255,255,.12)", ...cellBox }}><div style={{ fontSize: 10, textTransform: "capitalize", opacity: we ? 0.6 : 1 }}>{frDay(d)}</div><div style={{ fontSize: 12.5, fontWeight: 700 }}>{d.slice(8)}</div></div>); })}
          </div>
          {byUnit.map(({ u, evs }, ri) => (<div key={u.id} style={{ display: "flex", borderBottom: `1px solid ${C.line}`, background: ri % 2 ? C.rowAlt : "#fff", height: 48 }}>
            <div style={{ width: labelW, flexShrink: 0, padding: "0 12px", display: "flex", flexDirection: "column", justifyContent: "center", ...cellBox }}><div style={{ fontSize: 13, fontWeight: 600 }}>{u.label}</div><div style={{ fontSize: 10.5, color: C.muted }}>{u.type}{u.hs ? " · HS" : ""}</div>{caByUnit[u.id] && caByUnit[u.id].total > 0 && <div style={{ fontSize: 10.5, color: C.green2, fontWeight: 700 }}>CA {money(caByUnit[u.id].total)}</div>}</div>
            <div style={{ position: "relative", width: list.length * dayW, flexShrink: 0 }}>
              {list.map((d, i) => { const wd = new Date(d + "T00:00:00").getDay(); const we = wd === 0 || wd === 6; return <div key={d} style={{ position: "absolute", left: i * dayW, top: 0, width: dayW, height: 48, borderLeft: `1px solid ${C.line}`, background: we ? "rgba(0,0,0,.02)" : "transparent", ...cellBox }} />; })}
              {evs.filter((e) => e.kind === "sejour").map((e) => { const s = e.start > from ? e.start : from; const en = e.end < winEnd ? e.end : winEnd; const off = dayDiff(from, s); const w = Math.max(1, dayDiff(s, en)); return (<div key={"s" + e.fid} title={e.label + " · " + frDate(e.start) + "→" + frDate(e.end)} style={{ position: "absolute", left: off * dayW + 2, top: 6, width: w * dayW - 4, height: 22, borderRadius: 5, background: e.color, color: "#fff", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", paddingLeft: 7, overflow: "hidden", whiteSpace: "nowrap", ...cellBox }}>{e.label}</div>); })}
              {evs.filter((e) => e.kind === "menage" && e.midstay).map((e, k) => { const off = dayDiff(from, e.start); if (off < 0 || off >= list.length) return null; return <div key={"c" + k} title={"Ménage · " + frDate(e.start)} style={{ position: "absolute", left: off * dayW + dayW / 2 - 1, top: 6, width: 2, height: 22, background: "#fff", opacity: 0.9, ...cellBox }} />; })}
              {evs.filter((e) => e.kind === "menage" && !e.midstay).map((e, k) => { const off = dayDiff(from, e.start); if (off < 0 || off >= list.length) return null; return <div key={"cd" + k} title={"Ménage après départ · " + frDate(e.start)} style={{ position: "absolute", left: off * dayW + dayW / 2 - 4, top: 34, width: 8, height: 8, borderRadius: 4, background: C.blue, ...cellBox }} />; })}
              {evs.filter((e) => e.kind === "maint").map((e, k) => { const eEnd = e.end || to; const s = e.start > from ? e.start : from; const en = (eEnd < to ? eEnd : to); const off = dayDiff(from, s); const w = Math.max(1, dayDiff(s, en) + 1); return (<div key={"m" + k} title={"Maintenance · " + e.label + " (" + (e.statut || "") + ")"} style={{ position: "absolute", left: off * dayW + 2, top: 32, width: w * dayW - 4, height: 10, borderRadius: 3, background: "repeating-linear-gradient(45deg," + C.warn + "," + C.warn + " 5px,#D89A3A 5px,#D89A3A 10px)", ...cellBox }} />); })}
            </div>
          </div>))}
        </div>
      </div>
    </Card>)}
    {tooLong && <Card style={{ padding: 14, marginBottom: 18, background: C.rowAlt, fontSize: 13, color: C.muted }}>Période trop longue pour le calendrier ({span} jours). Réduis-la à 92 jours max pour l'afficher — l'export CSV et l'impression restent disponibles.</Card>}

    <div style={{ display: "flex", gap: 18, marginBottom: 18, fontSize: 12, color: C.muted, flexWrap: "wrap", alignItems: "center" }}>
      <span><span style={{ color: C.green2 }}>■</span> séjour</span><span><span style={{ color: C.gold }}>■</span> option</span><span><span style={{ color: C.muted }}>■</span> parti</span><span><span style={{ color: C.warn }}>▤</span> maintenance</span><span><span style={{ color: C.blue }}>│</span> ménage 3 j</span>
    </div>

    <div style={{ fontWeight: 800, color: C.green, marginBottom: 10 }}>Synthèse par chambre</div>
    <Card style={{ overflow: "hidden", marginBottom: 18 }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
          <thead><tr><th style={th}>Chambre</th><th style={th}>Type</th><th style={{ ...th, textAlign: "right" }}>Séjours</th><th style={{ ...th, textAlign: "right" }}>Nuits</th><th style={{ ...th, textAlign: "right" }}>Durée moy.</th><th style={{ ...th, textAlign: "right" }}>Prix moyen</th><th style={{ ...th, textAlign: "right" }}>CA période</th></tr></thead>
          <tbody>
            {unitsView.filter((u) => caByUnit[u.id] && (caByUnit[u.id].total > 0 || caByUnit[u.id].stays > 0)).length === 0 && <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: C.muted, padding: 18 }}>Aucune activité sur la période.</td></tr>}
            {unitsView.filter((u) => caByUnit[u.id] && (caByUnit[u.id].total > 0 || caByUnit[u.id].stays > 0)).map((u, i) => { const x = caByUnit[u.id]; return (<tr key={u.id} style={{ background: i % 2 ? C.rowAlt : "#fff" }}>
              <td style={{ ...td, fontWeight: 600 }}>{u.label}</td>
              <td style={td}>{u.type}</td>
              <td style={tdR}>{x.stays}</td>
              <td style={tdR}>{x.nights}</td>
              <td style={tdR}>{x.los ? x.los.toFixed(1).replace(".", ",") + " n" : "—"}</td>
              <td style={tdR}>{x.pm ? money(x.pm) : "—"}</td>
              <td style={{ ...tdR, fontWeight: 700, color: C.green }}>{money(x.total)}</td>
            </tr>); })}
          </tbody>
          <tfoot><tr style={{ background: C.green }}>
            <td style={{ ...td, color: "#fff", fontWeight: 800, borderBottom: "none" }} colSpan={2}>TOTAL</td>
            <td style={{ ...tdR, color: "#fff", fontWeight: 800, borderBottom: "none" }}>{agg.stays}</td>
            <td style={{ ...tdR, color: "#fff", fontWeight: 800, borderBottom: "none" }}>{agg.nights}</td>
            <td style={{ ...tdR, color: C.gold2, fontWeight: 800, borderBottom: "none" }}>{losGlobal ? losGlobal.toFixed(1).replace(".", ",") + " n" : "—"}</td>
            <td style={{ ...tdR, color: C.gold2, fontWeight: 800, borderBottom: "none" }}>{money(pmGlobal)}</td>
            <td style={{ ...tdR, color: C.gold2, fontWeight: 800, borderBottom: "none" }}>{money(caTotal)}</td>
          </tr></tfoot>
        </table>
      </div>
    </Card>
    <div style={{ fontWeight: 800, color: C.green, marginBottom: 10 }}>Détail par logement</div>
    <Card style={{ overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
          <thead><tr><th style={th}>Logement</th><th style={th}>Type</th><th style={th}>Détail</th><th style={th}>Période</th><th style={{ ...th, textAlign: "center" }}>Statut</th><th style={{ ...th, textAlign: "right" }}>CA période</th></tr></thead>
          <tbody>
            {events.length === 0 && <tr><td colSpan={6} style={{ ...td, textAlign: "center", color: C.muted, padding: 20 }}>Aucun évènement sur la période.</td></tr>}
            {byUnit.filter((b) => b.evs.length).map((b) => b.evs.map((e, k) => (<tr key={b.u.id + "-" + k} style={{ background: k % 2 ? C.rowAlt : "#fff" }}>
              {k === 0 ? <td style={{ ...td, fontWeight: 600, verticalAlign: "top" }} rowSpan={b.evs.length}>{b.u.label}<div style={{ fontSize: 11, color: C.muted }}>{b.u.type}</div></td> : null}
              <td style={td}><Tag color={e.color}>{e.type}</Tag></td>
              <td style={td}><div style={{ fontWeight: 600 }}>{e.label}</div><div style={{ fontSize: 11.5, color: C.muted }}>{e.ref}</div></td>
              <td style={{ ...td, whiteSpace: "nowrap" }}>{frDate(e.start)}{e.end ? " → " + frDate(e.end) : ""}</td>
              <td style={{ ...td, textAlign: "center", fontSize: 12.5, color: C.muted }}>{e.statut || "—"}</td>
              {k === 0 ? <td style={{ ...tdR, fontWeight: 700, verticalAlign: "top", color: (caByUnit[b.u.id] && caByUnit[b.u.id].total > 0) ? C.green : C.muted }} rowSpan={b.evs.length}>{caByUnit[b.u.id] ? money(caByUnit[b.u.id].total) : money(0)}{caByUnit[b.u.id] && caByUnit[b.u.id].nights > 0 ? <div style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}>{caByUnit[b.u.id].nights} nuit(s)</div> : null}</td> : null}
            </tr>))) }
            {communs.map((e, k) => (<tr key={"c" + k} style={{ background: "#FBF6EC" }}>
              <td style={{ ...td, fontWeight: 600 }}>Parties communes<div style={{ fontSize: 11, color: C.muted }}>{e.spot || "—"}</div></td>
              <td style={td}><Tag color={C.warn}>Maintenance</Tag></td>
              <td style={td}><div style={{ fontWeight: 600 }}>{e.label}</div><div style={{ fontSize: 11.5, color: C.muted }}>{e.ref}</div></td>
              <td style={{ ...td, whiteSpace: "nowrap" }}>{frDate(e.start)}{e.end ? " → " + frDate(e.end) : ""}</td>
              <td style={{ ...td, textAlign: "center", fontSize: 12.5, color: C.muted }}>{e.statut || "—"}</td>
              <td style={tdR}>—</td>
            </tr>))}
          </tbody>
        </table>
      </div>
    </Card>
  </div>);
}

/* ============================================================
   APP
   ============================================================ */
export default function JuweiratPMS() {
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("journee");
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [units, setUnits] = useState(genUnits());
  const [folios, setFolios] = useState([]);
  const [monthly, setMonthly] = useState({});
  const [debtors, setDebtors] = useState([]);
  const [postings, setPostings] = useState([]);
  const [clotures, setClotures] = useState([]);
  const [factures, setFactures] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [openFolioId, setOpenFolioId] = useState(null);
  const [openFactureId, setOpenFactureId] = useState(null);

  useEffect(() => { (async () => {
    const cfg = await loadKey(KEYS.config, DEFAULT_CONFIG); if (!cfg.dateHotel) cfg.dateHotel = today();
    setConfig(cfg);
    const savedU = await loadKey(KEYS.units, genUnits());
    if (savedU.some((u) => u.floor != null)) { const mapped = savedU.map((u) => { const tar = tarifsForRoom(u.roomNo || u.id, u.type); return { statutMenage: "propre", ...u, mode: "court", gamme: u.gamme || (TARIFS[u.roomNo || u.id] && TARIFS[u.roomNo || u.id].gamme) || "standard", tarifs: u.tarifs || { nuit: tar.nuit, n15: tar.n15, n30: tar.n30 }, rate: u.tarifs ? u.rate : tar.nuit }; }); const have = new Set(mapped.map((u) => u.id)); const missing = genUnits().filter((g) => !have.has(g.id)); setUnits([...mapped, ...missing]); } else setUnits(genUnits());
    setFolios(await loadKey(KEYS.folios, []));
    setMonthly(await loadKey(KEYS.monthly, {}));
    setDebtors(await loadKey(KEYS.debtors, []));
    setPostings(await loadKey(KEYS.postings, []));
    setClotures(await loadKey(KEYS.clotures, []));
    setFactures(await loadKey(KEYS.factures, []));
    setTickets(await loadKey(KEYS.maintenance, []));
    setLoaded(true);
  })(); }, []);
  useEffect(() => { if (loaded) saveKey(KEYS.config, config); }, [config, loaded]);
  useEffect(() => { if (loaded) saveKey(KEYS.units, units); }, [units, loaded]);
  useEffect(() => { if (loaded) saveKey(KEYS.folios, folios); }, [folios, loaded]);
  useEffect(() => { if (loaded) saveKey(KEYS.monthly, monthly); }, [monthly, loaded]);
  useEffect(() => { if (loaded) saveKey(KEYS.debtors, debtors); }, [debtors, loaded]);
  useEffect(() => { if (loaded) saveKey(KEYS.postings, postings); }, [postings, loaded]);
  useEffect(() => { if (loaded) saveKey(KEYS.clotures, clotures); }, [clotures, loaded]);
  useEffect(() => { if (loaded) saveKey(KEYS.factures, factures); }, [factures, loaded]);
  useEffect(() => { if (loaded) saveKey(KEYS.maintenance, tickets); }, [tickets, loaded]);

  const updateMonthly = (ym, id, patch) => setMonthly((p) => ({ ...p, [ym]: { ...(p[ym] || {}), [id]: { ...((p[ym] || {})[id] || {}), ...patch } } }));
  const updateFolio = async (id, patch) => {
    // Optimistic UI update
    setFolios((p) => p.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    
    // API Call to sync with .NET backend if it's a status change
    try {
      if (patch.checkedIn === true || patch.resaStatus === "confirmée" || patch.closed === true || patch.resaStatus === "no-show") {
        const statusMap = {
          "confirmée": "Confirmed",
          "en cours": "CheckedIn",
          "cloturé": "Completed",
          "no-show": "Cancelled"
        };
        let apiStatus = patch.closed ? "Completed" : patch.checkedIn ? "CheckedIn" : statusMap[patch.resaStatus];
        if (apiStatus) await apiServices.updateReservationStatus(id, apiStatus);
      }
    } catch(e) { console.error("Erreur API updateFolio", e); }
  };
  const openFolio = (id) => setOpenFolioId(id);
  const openFacture = (id) => setOpenFactureId(id);
  const createResa = async (partial) => {
    try {
      const f = { ...partial, number: "TMP", id: 0 };
      const createdFolio = await apiServices.createReservation(f);
      setFolios((p) => [createdFolio, ...p]);
      setOpenFolioId(createdFolio.id);
      return createdFolio;
    } catch(e) {
      console.error("Erreur de création réservation API", e);
      alert("Erreur de communication avec le serveur backend.");
    }
  };
  const factureSnapshot = (folio, recipient) => {
    const c = folioCalc(folio); const unit = units.find((u) => u.id === folio.unitId);
    const cur = config.currency || DEFAULT_CONFIG.currency; const fm = (n) => (cur.decimals ? num(n).toLocaleString("fr-FR", { minimumFractionDigits: cur.decimals, maximumFractionDigits: cur.decimals }) : Math.round(num(n)).toLocaleString("fr-FR")) + " " + cur.code;
    const lines = [];
    if (c.heb > 0) lines.push({ label: "Hébergement — " + c.nights + " nuit(s) × " + fm(folio.rate) + (folio.tarifTier && folio.tarifTier !== "nuitée" ? " · forfait " + folio.tarifTier : "") + (folio.elecIncluded === false ? " (hors électricité)" : ""), montant: c.heb });
    if (c.pdjTot > 0) lines.push({ label: "Petit-déjeuner", montant: c.pdjTot });
    if (c.deb > 0) lines.push({ label: "Débiteur divers", montant: c.deb });
    if (c.dep > 0) lines.push({ label: "Dépendances", montant: c.dep });
    return { lines, total: c.total, arrhes: num(folio.arrhes), paid: num(folio.paid), payMode: folio.payMode || "Espèces", recipient, client: folio.guest || "", societe: folio.societe || "", reservataire: folio.reservataire || "", unitLabel: unit ? unit.label + " (" + unit.type + ")" : folio.unitId, arrival: folio.arrival, departure: folio.departure, nights: c.nights, pax: num(folio.pax) };
  };
  const updateFacture = async (id, patch) => {
    setFactures((p) => p.map((x) => x.id === id ? { ...x, ...patch } : x));
    try {
      const fac = factures.find((x) => x.id === id);
      if (fac) await apiServices.saveFacture({ ...fac, ...patch });
    } catch(e) { console.error("Erreur API Facture", e); }
  };
  const printFacture = (fac, force) => { const dup = force !== undefined ? force : ((fac.printCount || 0) >= 1); downloadText(fac.number + ".html", buildFactureHTML(fac, config, dup)); setFactures((p) => p.map((x) => x.id === fac.id ? { ...x, printCount: (x.printCount || 0) + 1 } : x)); };
  const emitFacture = async (folio, recipient = "client") => {
    let fac = factures.find((x) => x.id === folio.factureId && x.status !== "annulée");
    if (!fac) {
      updateFolio(folio.id, { factureId: fac.id });
    }
    printFacture(fac);
    return fac;
  };

  const cancelFacture = (fac) => { updateFacture(fac.id, { status: "annulée" }); const f = folios.find((y) => y.id === fac.folioId); if (f && f.factureId === fac.id) updateFolio(f.id, { factureId: null }); };
  const applyPlan = () => { if (window.confirm("Charger le plan réel de l'immeuble Juweirat (étages 2, 4, 5 et 6 — 19 logements) ? La liste des logements sera remplacée ; les réservations liées aux anciens logements devront être réaffectées.")) setUnits(genUnits()); };
  const transferDebiteur = (folio) => {
    const c = folioCalc(folio); if (c.solde <= 0.5) return;
    setDebtors((p) => [{ id: Date.now(), client: folio.societe || folio.guest || "", label: "Solde folio " + folio.number, dueDate: addDays(config.dateHotel, 30), amount: c.solde, paid: 0 }, ...p]);
    updateFolio(folio.id, { paid: num(folio.paid) + c.solde, transferredDebiteur: true });
    window.alert("Solde transféré en débiteur. Le folio est soldé, le check-out est désormais possible.");
  };

  const nav = [
    { id: "journee", label: "Écran journée", icon: "◆" },
    { id: "planning", label: "Planning", icon: "▦" },
    { id: "resa", label: "Réservations", icon: "◷" },
    { id: "folios", label: "Folios", icon: "≡" },
    { id: "gouvernante", label: "Gouvernante", icon: "❖" },
    { id: "maintenance", label: "Maintenance", icon: "⚒" },
    { id: "stats", label: "Statistiques", icon: "▚" },
    { id: "edition", label: "Édition", icon: "⎙" },
    { id: "debiteurs", label: "Débiteurs", icon: "☰" },
    { id: "factures", label: "Factures", icon: "▣" },
    { id: "cloture", label: "Clôture", icon: "✓" },
    { id: "config", label: "Paramètres", icon: "⚙" },
  ];
  if (!loaded) return <div style={{ minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontFamily: "system-ui" }}>Chargement…</div>;

  return (
    <MoneyCtx.Provider value={config.currency || DEFAULT_CONFIG.currency}>
     <FolioCtx.Provider value={{ open: openFolio }}>
      <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: C.ink, background: C.cream, minHeight: 640, display: "flex", flexDirection: "column" }}>
        <header style={{ background: C.green, color: "#fff", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, padding: "12px 20px 0", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}><span style={{ fontSize: 11, letterSpacing: 2, color: C.gold2, fontWeight: 800 }}>PMS</span><span style={{ fontSize: 19, fontWeight: 800 }}>{config.buildingName}</span></div>
            <span style={{ fontSize: 11.5, color: "rgba(255,255,255,.6)" }}>{config.city} · {units.length} logements · Propr. {config.ownerName}</span>
          </div>
          <nav style={{ display: "flex", gap: 2, padding: "10px 12px 0", overflowX: "auto" }}>
            {nav.map((n) => { const a = tab === n.id; return (<button key={n.id} onClick={() => setTab(n.id)} title={n.label} style={{ display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", padding: "10px 14px", border: "none", cursor: "pointer", background: a ? "rgba(201,162,39,.16)" : "transparent", color: a ? "#fff" : "rgba(255,255,255,.72)", borderBottom: a ? `3px solid ${C.gold2}` : "3px solid transparent", borderTopLeftRadius: 7, borderTopRightRadius: 7, fontSize: 13.5, fontWeight: a ? 700 : 500 }}><span style={{ color: C.gold2 }}>{n.icon}</span>{n.label}</button>); })}
          </nav>
        </header>
        <main style={{ flex: 1, padding: "26px clamp(16px,3vw,34px)", overflow: "auto", minWidth: 0 }}>
          <Bandeau config={config} units={units} folios={folios} monthly={monthly} tickets={tickets} />
          {tab === "journee" && <Journee {...{ units, setUnits, folios, setFolios, monthly, setMonthly, config, setTab }} />}
          {tab === "planning" && <Planning {...{ units, folios, updateFolio, config }} />}
          {tab === "resa" && <Reservations {...{ units, setUnits, folios, setFolios, updateFolio, config, createResa }} />}
          {tab === "folios" && <Folios {...{ units, setUnits, folios, setFolios, updateFolio, config, createResa }} />}
          {tab === "gouvernante" && <Gouvernante {...{ units, setUnits, folios, monthly, config, applyPlan }} />}
          {tab === "maintenance" && <Maintenance {...{ tickets, setTickets, units, setUnits, config }} />}
          {tab === "stats" && <Stats {...{ units, folios, monthly }} />}
          {tab === "edition" && <Edition {...{ units, folios, tickets, config }} />}
          {tab === "debiteurs" && <Debiteurs {...{ units, monthly, debtors, setDebtors, updateMonthly }} />}
          {tab === "cloture" && <Cloture {...{ config, setConfig, units, setUnits, folios, setFolios, updateFolio, monthly, postings, setPostings, clotures, setClotures }} />}
          {tab === "factures" && <FacturesTab {...{ factures, folios, config, openFacture, cancelFacture, printFacture }} />}
          {tab === "config" && <Params {...{ config, setConfig, units }} />}
        </main>
      </div>
      {openFolioId != null && (() => { const f = folios.find((x) => x.id === openFolioId); return f ? <FolioModal folio={f} units={units} folios={folios} updateFolio={updateFolio} config={config} factures={factures} emitFacture={emitFacture} transferDebiteur={transferDebiteur} onClose={() => setOpenFolioId(null)} /> : null; })()}
      {openFactureId != null && (() => { const x = factures.find((y) => y.id === openFactureId); return x ? <FactureModal facture={x} updateFacture={updateFacture} printFacture={printFacture} config={config} onClose={() => setOpenFactureId(null)} /> : null; })()}
     </FolioCtx.Provider>
    </MoneyCtx.Provider>
  );
}


