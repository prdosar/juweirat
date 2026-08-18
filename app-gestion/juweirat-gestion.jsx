import React, { useState, useEffect, useMemo, createContext, useContext } from "react";

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
  "21": { type: "T1", gamme: "standard", nuit: 30000, n15: 200000, n30: 300000 },
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

async function loadKey(key, fb) { try { if (window.storage) { const r = await window.storage.get(key); if (r && r.value != null) return JSON.parse(r.value); } } catch (e) {} return fb; }
async function saveKey(key, v) { try { if (window.storage) await window.storage.set(key, JSON.stringify(v)); } catch (e) {} }

const num = (v) => (typeof v === "number" && isFinite(v) ? v : 0);
const fN = (n, d = 0) => num(n).toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const fPct = (n) => num(n).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " %";

const MoneyCtx = createContext(DEFAULT_CONFIG.currency);
function useMoney() { const c = useContext(MoneyCtx); return (n) => (c.decimals ? num(n).toLocaleString("fr-FR", { minimumFractionDigits: c.decimals, maximumFractionDigits: c.decimals }) : Math.round(num(n)).toLocaleString("fr-FR")) + " " + c.code; }

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

function triggerEmailNotification(type, payload, config) {
  const timestamp = new Date().toISOString();
  let subject = "";
  let recipient = payload.email || "client";
  let content = "";
  if (type === "confirmation") {
    subject = "Votre réservation est confirmée — " + (payload.number || "");
    content = `Réservation confirmée pour ${payload.guest || "le client"} au logement ${payload.unitLabel || payload.unitId} du ${frDate(payload.arrival)} au ${frDate(payload.departure)} (${payload.nights || 0} nuit(s)).`;
  } else if (type === "annulation") {
    subject = "Votre réservation a été annulée — " + (payload.number || "");
    content = `La réservation ${payload.number || ""} pour le séjour du ${frDate(payload.arrival)} au ${frDate(payload.departure)} a bien été annulée.`;
  } else if (type === "noshow") {
    subject = "Absence constatée — facturation d'une nuitée — " + (payload.number || "");
    content = `Suite à l'absence constatée pour le séjour ${payload.number || ""}, une nuitée est facturée conformément aux conditions.`;
  } else if (type === "cloture") {
    recipient = "tidjanisaka@gmail.com";
    subject = "Feuille de journée du " + frDate(payload.dateHotel);
    content = `Feuille de journée du ${frDate(payload.dateHotel)} : ${payload.nbArrivals || 0} arrivée(s), ${payload.nbDeparts || 0} départ(s), ${payload.nbNoShow || 0} no-show(s), CA passage: ${payload.montant || 0}.`;
  }
  console.log(`[Email Automatique - ${type}] Destinataire: ${recipient} | Objet: ${subject}`, payload);
  try {
    if (typeof fetch !== "undefined") {
      fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, recipient, subject, content, payload, timestamp, building: config?.buildingName })
      }).catch(() => {});
    }
  } catch (e) {}
}

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
  const cur = config.currency;
  const fm = (n) => (cur.decimals ? num(n).toLocaleString('fr-FR', { minimumFractionDigits: cur.decimals, maximumFractionDigits: cur.decimals }) : Math.round(num(n)).toLocaleString('fr-FR')) + ' ' + cur.code;
  const s = fac.snapshot || {};
  const cancelled = fac.status === 'annulée' || fac.status === 'Annulee';
  const destSociete = s.recipient === 'societe' && s.societe;
  const destNom = destSociete ? s.societe : (s.client || 'Client');
  const total = num(s.total) || (s.lines || []).reduce((acc, l) => acc + num(l.montant), 0);
  const paid = num(s.paid);
  const arrhes = num(s.arrhes);
  const solde = Math.max(0, total - paid - arrhes);
  const avoir = Math.max(0, paid + arrhes - total);
  const isSettled = solde <= 0.5;

  const rowsHTML = (s.lines || []).map((r, i) =>
    '<tr style="background:' + (i % 2 === 1 ? '#FAF8F5' : '#FFFFFF') + '">' +
      '<td style="padding:6px 10px;border-bottom:1px solid #EAE5DC;font-size:11.5px;color:#2A2622;">' + r.label + '</td>' +
      '<td style="padding:6px 10px;border-bottom:1px solid #EAE5DC;font-size:11.5px;text-align:right;font-variant-numeric:tabular-nums;font-weight:600;color:#1B4332;">' + fm(r.montant) + '</td>' +
    '</tr>'
  ).join('');

  let statusBadge = '';
  if (cancelled) {
    statusBadge = '<span style="display:inline-block;padding:2px 8px;border-radius:3px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#9B2C2C;background:#FFF5F5;border:1px solid #E53E3E;margin-top:4px;">FACTURE ANNULÉE</span>';
  } else if (duplicata) {
    statusBadge = '<span style="display:inline-block;padding:2px 8px;border-radius:3px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#9B2C2C;background:#FFF5F5;border:1px solid #FEB2B2;margin-top:4px;">DUPLICATA</span>';
  } else if (fac.corrections) {
    statusBadge = '<span style="display:inline-block;padding:2px 8px;border-radius:3px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#B5761F;background:#FFFDF5;border:1px solid #F6E05E;margin-top:4px;">FACTURE RECTIFIÉE</span>';
  }

  const logoSrc = 'data:image/png;base64,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';

  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Facture ' + fac.number + ' — ' + config.buildingName + '</title>' +
'<style>' +
'@page { size: A4 portrait; margin: 8mm 10mm; }' +
'* { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
'html, body { background: #FFFFFF; color: #1F2421; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11.5px; line-height: 1.35; }' +
'body { padding: 16px 20px; }' +
'.invoice-card { max-width: 740px; margin: 0 auto; background: #fff; page-break-inside: avoid; page-break-after: avoid; }' +
'@media print { html, body { margin: 0 !important; padding: 0 !important; height: 100% !important; max-height: 100% !important; overflow: hidden !important; background: #fff !important; } body { padding: 0 !important; } .invoice-card { max-width: 100% !important; margin: 0 !important; padding: 0 !important; } .no-print { display: none !important; } }' +
'</style></head><body>' +
'<div class="invoice-card"' + (cancelled ? ' style="opacity:0.75"' : '') + '>' +
  '<header style="display:flex;justify-content:space-between;align-items:center;border-bottom:2.5px solid #B08D57;padding-bottom:10px;margin-bottom:10px;">' +
    '<div style="display:flex;align-items:center;gap:12px;">' +
      '<img src="' + logoSrc + '" alt="Logo Juweirat" style="height:46px;max-width:130px;object-fit:contain;" />' +
      '<div>' +
        '<div style="font-size:15px;font-weight:900;color:#1B4332;letter-spacing:-0.2px;text-transform:uppercase;">' + config.buildingName + '</div>' +
        '<div style="font-size:10px;color:#716B61;font-weight:500;margin-top:1px;">SCI JUWEIRAT · Résidence Hôtelière</div>' +
        '<div style="font-size:9.5px;color:#8A8172;">Quartier Gbossimé, Lomé — TOGO</div>' +
      '</div>' +
    '</div>' +
    '<div style="text-align:right;">' +
      '<div style="display:inline-block;background:#1B4332;color:#FFFFFF;font-weight:800;font-size:12.5px;letter-spacing:0.5px;padding:3.5px 10px;border-radius:4px;">FACTURE N° ' + fac.number + '</div>' +
      '<div style="font-size:10.5px;color:#554F47;margin-top:3px;">Date d’émission : <strong>' + frDate(fac.date) + '</strong></div>' +
      (fac.corrections ? '<div style="font-size:9.5px;color:#B5761F;">Rectifiée le : ' + frDate(fac.corrigeeLe || fac.date) + '</div>' : '') +
      '<div>' + statusBadge + '</div>' +
    '</div>' +
  '</header>' +
  '<section style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">' +
    '<div style="background:#FAF8F5;border:1px solid #E5DFD5;border-radius:6px;padding:8px 10px;">' +
      '<div style="font-size:9px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:#B08D57;margin-bottom:3px;">Facturé à / Destinataire</div>' +
      '<div style="font-size:13px;font-weight:800;color:#1B4332;">' + destNom + '</div>' +
      (!destSociete && s.reservataire ? '<div style="font-size:10.5px;color:#6B6458;margin-top:2px;">Réservataire : ' + s.reservataire + '</div>' : '') +
      (s.phone || s.email ? '<div style="font-size:10px;color:#8A8172;margin-top:2px;">' + [s.phone, s.email].filter(Boolean).join(' · ') + '</div>' : '') +
    '</div>' +
    '<div style="background:#FAF8F5;border:1px solid #E5DFD5;border-radius:6px;padding:8px 10px;">' +
      '<div style="font-size:9px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:#B08D57;margin-bottom:3px;">Détails du Séjour</div>' +
      '<div style="font-size:12.5px;font-weight:700;color:#1B4332;">' + (s.unitLabel || 'Hébergement Juweirat') + '</div>' +
      '<div style="font-size:10.5px;color:#5C564D;margin-top:2px;">Du <strong>' + frDate(s.arrival) + '</strong> au <strong>' + frDate(s.departure) + '</strong> (' + num(s.nights) + ' nuit' + (num(s.nights) > 1 ? 's' : '') + ')</div>' +
      '<div style="font-size:10px;color:#8A8172;margin-top:1px;">Occupants : ' + num(s.pax) + ' personne' + (num(s.pax) > 1 ? 's' : '') + '</div>' +
    '</div>' +
  '</section>' +
  '<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">' +
    '<thead><tr>' +
      '<th style="background:#1B4332;color:#FFFFFF;font-size:10px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;padding:6px 10px;text-align:left;border-top-left-radius:4px;">Désignation des prestations</th>' +
      '<th style="background:#1B4332;color:#FFFFFF;font-size:10px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;padding:6px 10px;text-align:right;border-top-right-radius:4px;width:150px;">Montant (' + cur.code + ')</th>' +
    '</tr></thead>' +
    '<tbody>' + rowsHTML + '</tbody>' +
  '</table>' +
  '<section style="display:flex;justify-content:space-between;align-items:stretch;gap:12px;margin-bottom:8px;">' +
    '<div style="flex:1;background:#FAF8F5;border:1px solid #E5DFD5;border-radius:6px;padding:8px 10px;display:flex;flex-direction:column;justify-content:space-between;">' +
      '<div>' +
        '<div style="font-size:9px;font-weight:800;color:#B08D57;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:3px;">Mode & Statut de Règlement</div>' +
        '<div style="font-size:11px;color:#4A443B;">Mode de paiement : <strong>' + (s.payMode || 'Espèces') + '</strong></div>' +
        '<div style="font-size:10.5px;color:#716B61;margin-top:2px;">Réf. Transaction / Reçu : Facture ' + fac.number + '</div>' +
      '</div>' +
      '<div style="margin-top:6px;">' +
        (isSettled
          ? '<span style="display:inline-block;background:#DEF7EC;color:#03543F;border:1px solid #BCF0DA;padding:3px 8px;border-radius:4px;font-weight:800;font-size:10.5px;">✓ FACTURE SOLDÉE / ACQUITTÉE</span>'
          : '<span style="display:inline-block;background:#FDE8E8;color:#9B1C1C;border:1px solid #FBD5D5;padding:3px 8px;border-radius:4px;font-weight:800;font-size:10.5px;">⚠ SOLDE RESTANT DÛ : ' + fm(solde) + '</span>'
        ) +
      '</div>' +
    '</div>' +
    '<div style="width:270px;background:#FAF8F5;border:1px solid #E5DFD5;border-radius:6px;padding:6px 10px;">' +
      '<table style="width:100%;border-collapse:collapse;font-size:11px;">' +
        '<tr><td style="padding:3px 0;color:#554F47;">Total Prestations</td><td style="padding:3px 0;text-align:right;font-variant-numeric:tabular-nums;font-weight:700;color:#1B4332;">' + fm(total) + '</td></tr>' +
        (arrhes > 0 ? '<tr><td style="padding:3px 0;color:#554F47;">Arrhes / Acompte</td><td style="padding:3px 0;text-align:right;font-variant-numeric:tabular-nums;font-weight:600;color:#2D6A4F;">- ' + fm(arrhes) + '</td></tr>' : '') +
        '<tr><td style="padding:3px 0;color:#554F47;">Montant Réglé</td><td style="padding:3px 0;text-align:right;font-variant-numeric:tabular-nums;font-weight:600;color:#2D6A4F;">- ' + fm(paid) + '</td></tr>' +
        '<tr style="border-top:1.5px solid #1B4332;border-bottom:1.5px solid #1B4332;background:#F4EFE6;">' +
          '<td style="padding:5px 4px;font-size:12px;font-weight:900;color:#1B4332;text-transform:uppercase;">Net à Payer (Solde)</td>' +
          '<td style="padding:5px 4px;text-align:right;font-size:13px;font-variant-numeric:tabular-nums;font-weight:900;color:' + (solde > 0.5 ? '#9B1C1C' : '#15803D') + ';">' + fm(solde) + '</td>' +
        '</tr>' +
        (avoir > 0.5 ? '<tr><td style="padding:3px 0;color:#1E429F;font-weight:600;">Avoir / Trop-perçu</td><td style="padding:3px 0;text-align:right;font-variant-numeric:tabular-nums;font-weight:700;color:#1E429F;">' + fm(avoir) + '</td></tr>' : '') +
      '</table>' +
    '</div>' +
  '</section>' +
  '<footer style="border-top:1px solid #E5DFD5;padding-top:8px;display:flex;justify-content:space-between;align-items:flex-end;font-size:9.5px;color:#7A746B;">' +
    '<div>' +
      '<div style="font-weight:700;color:#4A443B;">' + config.buildingName + ' — SCI JUWEIRAT</div>' +
      '<div>Quartier GBOSSIME, Lomé, TOGO · Tél : (+228) 90 00 00 00 · contact@juweirat.com</div>' +
      '<div style="margin-top:2px;color:#8A8172;">Éditée le ' + frDate(fac.date) + ' · Document officiel PMS Juweirat</div>' +
    '</div>' +
    '<div style="text-align:center;border:1px dashed #C4BCAF;border-radius:4px;padding:4px 10px;background:#FAFAFA;width:130px;">' +
      '<div style="font-size:8.5px;text-transform:uppercase;color:#8A8172;letter-spacing:0.5px;">Cachet & Signature</div>' +
      '<div style="font-size:10px;font-weight:700;color:#1B4332;margin-top:1px;">Pour Acquit</div>' +
    '</div>' +
  '</footer>' +
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
      <Field label="Email"><TextInput value={folio.email} placeholder="client@exemple.com" onChange={(v) => set({ email: v })} /></Field>
      <Field label="Téléphone"><TextInput value={folio.phone} placeholder="+228 90 00 00 00" onChange={(v) => set({ phone: v })} /></Field>
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
    if (cu[0]) nf.push({ id: Date.now() + 1, number: "FL-DEMO-001", unitId: cu[0].id, guest: "Kodjo A.", nom: "A.", prenom: "Kodjo", email: "kodjo.a@example.com", phone: "+228 90 11 22 33", societe: "", reservataire: "", cardNumber: "", cardExpiry: "", cardHolder: "", segment: "Direct", pax: 2, arrival: addDays(D, -2), departure: addDays(D, 2), rate: cu[0].rate, heb: 0, pdjParJour: 2, pdjPrix: 3000, debiteur: 0, dependances: 15000, arrhes: 20000, paid: 40000, resaStatus: "confirmée", checkedIn: true, note: "", closed: false });
    if (cu[1]) nf.push({ id: Date.now() + 2, number: "FL-DEMO-002", unitId: cu[1].id, guest: "M. Sena", nom: "Sena", prenom: "M.", email: "sena@yas-holding.com", phone: "+228 91 22 33 44", societe: "YAS", reservataire: "", cardNumber: "", cardExpiry: "", cardHolder: "", segment: "OTA", pax: 2, arrival: D, departure: addDays(D, 3), rate: cu[1].rate, heb: 0, pdjParJour: 2, pdjPrix: 3000, debiteur: 0, dependances: 0, arrhes: 0, paid: 0, resaStatus: "confirmée", checkedIn: false, note: "", closed: false });
    if (cu[2]) nf.push({ id: Date.now() + 3, number: "FL-DEMO-003", unitId: cu[2].id, guest: "Ayaba K.", nom: "K.", prenom: "Ayaba", email: "ayaba.k@societe.tg", phone: "+228 92 33 44 55", societe: "", reservataire: "", cardNumber: "", cardExpiry: "", cardHolder: "", segment: "Société", pax: 1, arrival: addDays(D, -3), departure: D, rate: cu[2].rate, heb: 0, pdjParJour: 1, pdjPrix: 3000, debiteur: 5000, dependances: 0, arrhes: 0, paid: 60000, resaStatus: "confirmée", checkedIn: true, note: "", closed: false });
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
  const makeFolio = (u, arr, dep) => { const nights = Math.max(0, dayDiff(arr, dep)); const tf = u.tarifs ? tarifForStay(u.tarifs, nights) : null; return { unitId: u.id, tarifTier: tf ? tf.tier : "nuitée", elecIncluded: tf ? tf.elec : true, guest: "", nom: "", prenom: "", email: "", phone: "", societe: "", reservataire: "", cardNumber: "", cardExpiry: "", cardHolder: "", segment: "Direct", pax: 1, arrival: arr, departure: dep, rate: u.rate, heb: 0, pdjParJour: 0, pdjPrix: 3000, debiteur: 0, dependances: 0, arrhes: 0, paid: 0, resaStatus: "confirmée", checkedIn: false, note: "", closed: false }; };
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

  const validate = () => {
    const stamp = new Date().toISOString();
    const lines = previewLines.map((l, i) => ({ id: Date.now() + i, dateHotel: D, ...l, libelle: l.famille + " · " + frDate(D), horodatage: stamp }));
    const nbArr = folios.filter((f) => f.arrival === D && active(f)).length;
    const nbDep = folios.filter((f) => f.departure === D && f.closed).length;
    const nbNs = folios.filter((f) => f.arrival === D && f.resaStatus === "no-show").length;
    setPostings((p) => [...p, ...lines]);
    setClotures((p) => [...p, { dateHotel: D, executedAt: stamp, indicators: ind, nbArrivals: nbArr, nbDeparts: nbDep, nbNoShow: nbNs, nbLignes: lines.length, montant: totalPassage }]);
    triggerEmailNotification("cloture", { dateHotel: D, indicators: ind, nbArrivals: nbArr, nbDeparts: nbDep, nbNoShow: nbNs, nbLignes: lines.length, montant: totalPassage }, config);
    setConfig((c) => ({ ...c, dateHotel: addDays(D, 1) }));
    setStep(5);
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
  const [showSoldes, setShowSoldes] = useState(false);
  const arr = useMemo(() => arrears(units, monthly), [units, monthly]);
  const arrTotal = arr.reduce((s, a) => s + a.impaye, 0);
  const add = () => setDebtors((p) => [{ id: Date.now(), client: "", label: "", dueDate: addDays(today(), 30), amount: 0, paid: 0 }, ...p]);
  const upd = (id, patch) => setDebtors((p) => p.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const del = (id) => setDebtors((p) => p.filter((d) => d.id !== id));
  const t = today();
  const allOther = debtors.map((d) => { const rest = num(d.amount) - num(d.paid); const overdue = d.dueDate < t && rest > 0.5; return { ...d, rest, overdue, daysLate: overdue ? Math.round((new Date(t) - new Date(d.dueDate)) / 86400000) : 0, isSolded: rest <= 0.5 && num(d.amount) > 0 }; });
  const other = showSoldes ? allOther : allOther.filter((d) => !d.isSolded);
  const otherTotal = allOther.filter((d) => !d.isSolded).reduce((s, d) => s + Math.max(0, d.rest), 0);
  const nbSoldes = allOther.filter((d) => d.isSolded).length;
  const exportCSV = () => downloadCSV(`juweirat_creances_${t}.csv`, [["ARRIÉRÉS DE LOYER"], ["Mois", "Logement", "Locataire", "Impayé"], ...arr.map((a) => [frMonth(a.ym), a.label, a.tenant, Math.round(a.impaye)]), [], ["AUTRES CRÉANCES"], ["Client", "Libellé", "Échéance", "Montant", "Réglé", "Reste", "Statut"], ...allOther.map((d) => [d.client, d.label, d.dueDate, Math.round(d.amount), Math.round(d.paid), Math.round(d.rest), d.isSolded ? "Soldé" : d.overdue ? "En retard" : "En cours"])]);
  return (<div>
    <SectionTitle eyebrow="Créances" title="Débiteurs & créances" right={<div style={{ display: "flex", gap: 8, alignItems: "center" }}>{nbSoldes > 0 && <Btn size="sm" kind={showSoldes ? "primary" : "ghost"} onClick={() => setShowSoldes((x) => !x)}>{showSoldes ? "Masquer soldés" : `Voir soldés (${nbSoldes})`}</Btn>}<Btn kind="gold" size="sm" onClick={exportCSV}>Exporter</Btn><Btn onClick={add}>+ Autre créance</Btn></div>} />
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
        {other.map((d, i) => (<tr key={d.id} style={{ background: d.isSolded ? "#F0F7F2" : d.overdue ? "#FCF3F0" : i % 2 ? C.rowAlt : "#fff" }}>
          <td style={td}><TextInput value={d.client} placeholder="Nom" onChange={(v) => upd(d.id, { client: v })} /></td>
          <td style={td}><TextInput value={d.label} placeholder="Objet" onChange={(v) => upd(d.id, { label: v })} /></td>
          <td style={td}><DateInput value={d.dueDate} onChange={(v) => upd(d.id, { dueDate: v })} /></td>
          <td style={td}><div style={{ width: 148, marginLeft: "auto" }}><MoneyInput value={d.amount} onChange={(v) => upd(d.id, { amount: v })} /></div></td>
          <td style={td}><div style={{ width: 148, marginLeft: "auto" }}><MoneyInput value={d.paid} onChange={(v) => upd(d.id, { paid: v })} /></div></td>
          <td style={{ ...tdR, fontWeight: 700, color: d.rest > 0.5 ? C.danger : C.ok }}>{money(d.rest)}</td>
          <td style={{ ...td, textAlign: "center", color: d.isSolded ? C.ok : d.overdue ? C.danger : C.muted, fontWeight: d.overdue || d.isSolded ? 700 : 400, fontSize: 12.5 }}>{d.isSolded ? "Soldé" : d.overdue ? "+" + d.daysLate + " j" : "—"}</td>
          <td style={{ ...td, textAlign: "center", whiteSpace: "nowrap" }}>{!d.isSolded && <Btn size="sm" kind="ghost" onClick={() => upd(d.id, { paid: d.amount })}>Solder</Btn>}{" "}<button onClick={() => del(d.id)} style={{ border: "none", background: "transparent", color: C.danger, cursor: "pointer", fontSize: 16 }}>×</button></td>
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
      <Field label="Devise (code)"><TextInput value={config.currency.code} onChange={(v) => upd({ currency: { ...config.currency, code: v } })} /></Field>
      <Field label="Décimales" hint="0 pour le FCFA"><NumInput value={config.currency.decimals} min={0} onChange={(v) => upd({ currency: { ...config.currency, decimals: Math.max(0, Math.round(v)) } })} /></Field>
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
function Edition({ units, folios, tickets, debtors = [], monthly = {}, config }) {
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
  const t = config.dateHotel;

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

  const dList = (debtors || []).map((d) => {
    const rest = num(d.amount) - num(d.paid);
    const overdue = d.dueDate < t && rest > 0.5;
    const inPeriod = d.dueDate >= from && d.dueDate <= to;
    return {
      ...d,
      rest,
      overdue,
      inPeriod,
      daysLate: overdue ? Math.round((new Date(t) - new Date(d.dueDate)) / 86400000) : 0,
      isSolded: rest <= 0.5 && num(d.amount) > 0
    };
  });
  const periodDebtors = dList.filter((d) => d.inPeriod || (d.rest > 0.5 && d.dueDate <= to));
  const totDebAmount = periodDebtors.reduce((s, d) => s + num(d.amount), 0);
  const totDebPaid = periodDebtors.reduce((s, d) => s + num(d.paid), 0);
  const totDebRest = periodDebtors.reduce((s, d) => s + Math.max(0, d.rest), 0);

  const unitLabel = (id) => { const u = units.find((x) => x.id === id); return u ? u.label + " · " + u.type : null; };
  const byUnit = unitsView.map((u) => ({ u, evs: events.filter((e) => e.unitId === u.id).sort((a, b) => (a.start < b.start ? -1 : 1)) }));
  const communs = fRoom === "tous" ? events.filter((e) => e.kind === "maint" && (!e.unitId || e.zone === "commun")).sort((a, b) => (a.start < b.start ? -1 : 1)) : [];

  const list = Array.from({ length: Math.min(span, 92) }, (_, i) => addDays(from, i));
  const tooLong = span > 92;
  const dayW = 38, labelW = 150, cellBox = { boxSizing: "border-box" };

  const exportCSV = () => downloadCSV(`edition_evenements_${from}_${to}.csv`, [
    ["Édition — évènements des chambres & créances", frDate(from) + " → " + frDate(to)],
    [],
    ["Logement", "Type", "Référence", "Détail", "Début", "Fin", "Statut"],
    ...events.slice().sort((a, b) => (a.start < b.start ? -1 : 1)).map((e) => [e.unitId ? (unitLabel(e.unitId) || e.unitId) : "Parties communes" + (e.spot ? " · " + e.spot : ""), e.type, e.ref, e.label, frDate(e.start), e.end ? frDate(e.end) : "", e.statut || ""]),
    [],
    ["Synthèse par chambre"],
    ["Chambre", "Séjours", "Nuits", "Durée moy. (nuits)", "Prix moyen", "Hébergement", "PDJ", "Extras", "CA total"],
    ...units.map((u) => { const x = caByUnit[u.id] || { stays: 0, nights: 0, los: 0, pm: 0, heb: 0, pdj: 0, extra: 0, total: 0 }; return [u.label + " · " + u.type, x.stays, x.nights, x.los.toFixed(1).replace(".", ","), Math.round(x.pm), Math.round(x.heb), Math.round(x.pdj), Math.round(x.extra), Math.round(x.total)]; }),
    ["TOTAL", agg.stays, agg.nights, losGlobal.toFixed(1).replace(".", ","), Math.round(pmGlobal), "", "", "", Math.round(caTotal)],
    [],
    ["SUIVI DES DÉBITEURS & CRÉANCES DIVERSES"],
    ["Client", "Libellé", "Échéance", "Montant dû", "Réglé", "Reste à recouvrer", "Retard (j)", "Statut"],
    ...periodDebtors.map((d) => [d.client, d.label, frDate(d.dueDate), Math.round(d.amount), Math.round(d.paid), Math.round(d.rest), d.overdue ? d.daysLate : 0, d.isSolded ? "Soldé" : d.overdue ? "En retard" : "En cours"]),
    ["TOTAL CRÉANCES", "", "", Math.round(totDebAmount), Math.round(totDebPaid), Math.round(totDebRest), "", ""]
  ]);

  const printHTML = () => {
    const rowsFor = (evs) => evs.map((e) => '<tr><td>' + e.type + '</td><td>' + (e.ref || "") + '</td><td>' + e.label + '</td><td>' + frDate(e.start) + (e.end ? ' → ' + frDate(e.end) : '') + '</td><td>' + (e.statut || "") + '</td></tr>').join("");
    const fmC = (n) => (config.currency.decimals ? num(n).toLocaleString('fr-FR', { minimumFractionDigits: config.currency.decimals, maximumFractionDigits: config.currency.decimals }) : Math.round(num(n)).toLocaleString('fr-FR')) + ' ' + config.currency.code;
    const blocks = byUnit.filter((b) => b.evs.length).map((b) => { const x = caByUnit[b.u.id] || {}; return '<h3>' + b.u.label + ' · ' + b.u.type + '</h3><div class="muted">CA période : ' + fmC(x.total || 0) + ' · prix moyen : ' + fmC(x.pm || 0) + ' · durée moyenne : ' + ((x.los || 0).toFixed(1)) + ' nuit(s) · ' + (x.nights || 0) + ' nuitée(s)</div><table><thead><tr><th>Type</th><th>Réf.</th><th>Détail</th><th>Période</th><th>Statut</th></tr></thead><tbody>' + rowsFor(b.evs) + '</tbody></table>'; }).join("");
    const communBlock = communs.length ? '<h3>Parties communes</h3><table><thead><tr><th>Type</th><th>Réf.</th><th>Détail</th><th>Période</th><th>Statut</th></tr></thead><tbody>' + rowsFor(communs) + '</tbody></table>' : "";
    const debtorRows = periodDebtors.map((d) => '<tr><td>' + (d.client || "—") + '</td><td>' + (d.label || "—") + '</td><td>' + frDate(d.dueDate) + '</td><td style="text-align:right">' + fmC(d.amount) + '</td><td style="text-align:right">' + fmC(d.paid) + '</td><td style="text-align:right;font-weight:bold;color:' + (d.rest > 0.5 ? '#B91C1C' : '#15803D') + '">' + fmC(d.rest) + '</td><td>' + (d.isSolded ? 'Soldé' : (d.overdue ? '+' + d.daysLate + ' j retard' : 'En cours')) + '</td></tr>').join("");
    const debtorBlock = '<h3>Suivi des débiteurs et créances diverses</h3>' + (periodDebtors.length ? '<table><thead><tr><th>Client</th><th>Libellé</th><th>Échéance</th><th style="text-align:right">Montant</th><th style="text-align:right">Réglé</th><th style="text-align:right">Reste</th><th>Statut</th></tr></thead><tbody>' + debtorRows + '</tbody><tfoot><tr style="background:#1B4332;color:#fff;font-weight:bold"><td colspan="3">TOTAL CRÉANCES</td><td style="text-align:right">' + fmC(totDebAmount) + '</td><td style="text-align:right">' + fmC(totDebPaid) + '</td><td style="text-align:right">' + fmC(totDebRest) + '</td><td></td></tr></tfoot></table>' : '<p class="muted">Aucune créance sur la période.</p>');
    const html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Édition ' + from + ' ' + to + '</title>' +
'<style>body{font-family:Segoe UI,system-ui,Arial,sans-serif;color:#2A2622;margin:0;padding:34px}h1{color:#1B4332;font-size:20px;margin:0}h3{color:#1B4332;margin:22px 0 6px;border-bottom:2px solid #B08D57;padding-bottom:3px}.muted{color:#8A8172;font-size:12.5px}table{width:100%;border-collapse:collapse;margin-top:4px;margin-bottom:16px}th{background:#1B4332;color:#fff;text-align:left;padding:7px 10px;font-size:11.5px;text-transform:uppercase}td{padding:6px 10px;border-bottom:1px solid #E4DCCB;font-size:13px}@media print{body{padding:0}}</style></head><body>' +
'<h1>' + config.buildingName + ' — Rapport d\'édition consolidé</h1><div class="muted">Période : ' + frDate(from) + ' → ' + frDate(to) + ' · édité le ' + frDate(config.dateHotel) + '</div>' + '<div style="font-weight:800;color:#1B4332;margin-top:6px">CA total période : ' + fmC(caTotal) + ' · Reste créances : ' + fmC(totDebRest) + '</div>' +
(blocks || '<p class="muted">Aucun évènement sur la période.</p>') + communBlock + debtorBlock + '</body></html>';
    downloadText('edition_' + from + '_' + to + '.html', html);
  };

  const quick = (f, t2) => { setFrom(f); setTo(t2); };
  return (<div>
    <SectionTitle eyebrow="Édition · rapport" title="Évènements des chambres & créances" right={<div style={{ display: "flex", gap: 8 }}><Btn kind="ghost" size="sm" onClick={exportCSV}>Exporter CSV</Btn><Btn kind="gold" size="sm" onClick={printHTML}>Imprimer / PDF</Btn></div>} />

    <Card style={{ padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ width: 160 }}><Field label="Du"><DateInput value={from} onChange={setFrom} /></Field></div>
        <div style={{ width: 160 }}><Field label="Au"><DateInput value={to} onChange={setTo} /></Field></div>
        <Btn kind="ghost" size="sm" onClick={() => quick(now + "-01", now + "-" + String(daysInMonth(now)).padStart(2, "0"))}>Ce mois</Btn>
        <Btn kind="ghost" size="sm" onClick={() => quick(config.dateHotel, addDays(config.dateHotel, 6))}>7 jours</Btn>
        <Btn kind="ghost" size="sm" onClick={() => quick(config.dateHotel, addDays(config.dateHotel, 29))}>30 jours</Btn>
        <div style={{ width: 220 }}><Field label="Chambre"><Select value={fRoom} onChange={setFRoom} options={[{ v: "tous", l: `Toutes les chambres (${units.length})` }, ...units.map((u) => ({ v: u.id, l: u.label + " · " + u.type }))]} /></Field></div>
        <div style={{ fontSize: 12.5, color: validPeriod ? C.muted : C.danger, paddingBottom: 9 }}>{validPeriod ? `${span} jour(s) · ${events.length} évènement(s)` : "période invalide"}</div>
      </div>
    </Card>

    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
      <Kpi label="Séjours" value={sejN} accent={C.green2} /><Kpi label="Arrivées" value={arrN} /><Kpi label="Départs" value={depN} /><Kpi label="Interventions" value={maintN} accent={maintN ? C.warn : C.green} /><Kpi label="Ménages" value={menageN} accent={C.blue} /><Kpi label="Prix moyen" value={money(pmGlobal)} accent={C.green2} /><Kpi label="CA période" value={money(caTotal)} accent={C.gold} /><Kpi label="Créances période" value={money(totDebRest)} accent={totDebRest > 0 ? C.danger : C.ok} sub={totDebAmount > 0 ? `${periodDebtors.length} créance(s)` : ""} />
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

    <div style={{ fontWeight: 800, color: C.green, marginBottom: 10 }}>Suivi des débiteurs & créances diverses sur la période</div>
    <Card style={{ overflow: "hidden", marginBottom: 18 }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
          <thead><tr><th style={th}>Client</th><th style={th}>Libellé / Objet</th><th style={th}>Échéance</th><th style={{ ...th, textAlign: "right" }}>Montant dû</th><th style={{ ...th, textAlign: "right" }}>Réglé</th><th style={{ ...th, textAlign: "right" }}>Reste</th><th style={{ ...th, textAlign: "center" }}>Statut / Retard</th></tr></thead>
          <tbody>
            {periodDebtors.length === 0 && <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: C.muted, padding: 20 }}>Aucune créance sur cette période.</td></tr>}
            {periodDebtors.map((d, i) => (
              <tr key={d.id} style={{ background: d.isSolded ? "#F0F7F2" : d.overdue ? "#FCF3F0" : i % 2 ? C.rowAlt : "#fff" }}>
                <td style={{ ...td, fontWeight: 600 }}>{d.client || "—"}</td>
                <td style={td}>{d.label || "—"}</td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>{frDate(d.dueDate)}</td>
                <td style={tdR}>{money(d.amount)}</td>
                <td style={tdR}>{money(d.paid)}</td>
                <td style={{ ...tdR, fontWeight: 700, color: d.rest > 0.5 ? C.danger : C.ok }}>{money(d.rest)}</td>
                <td style={{ ...td, textAlign: "center" }}><Tag color={d.isSolded ? C.ok : d.overdue ? C.danger : C.warn}>{d.isSolded ? "Soldé" : d.overdue ? `+${d.daysLate} j retard` : "En cours"}</Tag></td>
              </tr>
            ))}
          </tbody>
          {periodDebtors.length > 0 && (
            <tfoot><tr style={{ background: C.green }}>
              <td style={{ ...td, color: "#fff", fontWeight: 800, borderBottom: "none" }} colSpan={3}>TOTAL CRÉANCES PÉRIODE</td>
              <td style={{ ...tdR, color: "#fff", fontWeight: 800, borderBottom: "none" }}>{money(totDebAmount)}</td>
              <td style={{ ...tdR, color: "#fff", fontWeight: 800, borderBottom: "none" }}>{money(totDebPaid)}</td>
              <td style={{ ...tdR, color: C.gold2, fontWeight: 800, borderBottom: "none" }}>{money(totDebRest)}</td>
              <td style={{ ...td, borderBottom: "none" }}></td>
            </tr></tfoot>
          )}
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
export default function App() {
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
  const updateFolio = (id, patch) => {
    setFolios((p) => {
      const old = p.find((f) => f.id === id);
      if (old && patch.resaStatus && patch.resaStatus !== old.resaStatus) {
        const merged = { ...old, ...patch };
        const u = units.find((x) => x.id === merged.unitId);
        const c = folioCalc(merged);
        const pld = { ...merged, unitLabel: u ? u.label + " (" + u.type + ")" : merged.unitId, nights: c.nights, total: c.total };
        if (patch.resaStatus === "confirmée" && merged.email) {
          triggerEmailNotification("confirmation", pld, config);
        } else if (patch.resaStatus === "annulée" && merged.email) {
          triggerEmailNotification("annulation", pld, config);
        } else if (patch.resaStatus === "no-show" && merged.email) {
          triggerEmailNotification("noshow", pld, config);
        }
      }
      return p.map((f) => (f.id === id ? { ...f, ...patch } : f));
    });
  };
  const openFolio = (id) => setOpenFolioId(id);
  const openFacture = (id) => setOpenFactureId(id);
  const createResa = (partial) => {
    const seq = (config.resaSeq || 0) + 1;
    const number = "FL-" + new Date().getFullYear() + "-" + String(seq).padStart(4, "0");
    const f = { id: Date.now(), number, email: "", phone: "", ...partial };
    setFolios((p) => [f, ...p]);
    setConfig((cc) => ({ ...cc, resaSeq: (cc.resaSeq || 0) + 1 }));
    setOpenFolioId(f.id);
    if ((f.resaStatus === "confirmée" || !f.resaStatus) && f.email) {
      const u = units.find((x) => x.id === f.unitId);
      const c = folioCalc(f);
      triggerEmailNotification("confirmation", { ...f, unitLabel: u ? u.label + " (" + u.type + ")" : f.unitId, nights: c.nights, total: c.total }, config);
    }
    return f;
  };
  const factureSnapshot = (folio, recipient) => {
    const c = folioCalc(folio); const unit = units.find((u) => u.id === folio.unitId);
    const cur = config.currency; const fm = (n) => (cur.decimals ? num(n).toLocaleString("fr-FR", { minimumFractionDigits: cur.decimals, maximumFractionDigits: cur.decimals }) : Math.round(num(n)).toLocaleString("fr-FR")) + " " + cur.code;
    const lines = [];
    if (c.heb > 0) lines.push({ label: "Hébergement — " + c.nights + " nuit(s) × " + fm(folio.rate) + (folio.tarifTier && folio.tarifTier !== "nuitée" ? " · forfait " + folio.tarifTier : "") + (folio.elecIncluded === false ? " (hors électricité)" : ""), montant: c.heb });
    if (c.pdjTot > 0) lines.push({ label: "Petit-déjeuner", montant: c.pdjTot });
    if (c.deb > 0) lines.push({ label: "Débiteur divers", montant: c.deb });
    if (c.dep > 0) lines.push({ label: "Dépendances", montant: c.dep });
    return { lines, total: c.total, arrhes: num(folio.arrhes), paid: num(folio.paid), payMode: folio.payMode || "Espèces", recipient, client: folio.guest || "", societe: folio.societe || "", reservataire: folio.reservataire || "", unitLabel: unit ? unit.label + " (" + unit.type + ")" : folio.unitId, arrival: folio.arrival, departure: folio.departure, nights: c.nights, pax: num(folio.pax) };
  };
  const printFacture = (fac, force) => {
    const dup = force !== undefined ? force : ((fac.printCount || 0) >= 1);
    const html = buildFactureHTML(fac, config, dup);
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow && iframe.contentWindow.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        iframe.contentWindow.focus();
        setTimeout(() => {
          iframe.contentWindow.print();
          setTimeout(() => {
            try { document.body.removeChild(iframe); } catch(e) {}
          }, 2000);
        }, 250);
      } else {
        downloadText(fac.number + ".html", html);
      }
    } catch(e) {
      downloadText(fac.number + ".html", html);
    }
    setFactures((p) => p.map((x) => x.id === fac.id ? { ...x, printCount: (x.printCount || 0) + 1 } : x));
  };
  const emitFacture = (folio, recipient) => {
    let fac = factures.find((x) => x.id === folio.factureId && x.status !== "annulée");
    if (!fac) {
      const c = folioCalc(folio);
      if (c.solde > 0.5) {
        const cur = config.currency;
        const curFmt = (n) => (cur.decimals ? num(n).toLocaleString("fr-FR", { minimumFractionDigits: cur.decimals, maximumFractionDigits: cur.decimals }) : Math.round(num(n)).toLocaleString("fr-FR")) + " " + cur.code;
        window.alert("Facturation impossible : le folio présente un solde restant de " + curFmt(c.solde) + ". Veuillez d'abord encaisser le solde ou le transférer en débiteur avant d'éditer la facture.");
        return null;
      }
      fac = { id: Date.now(), number: "FAC-" + new Date().getFullYear() + "-" + String((config.factureSeq || 0) + 1).padStart(4, "0"), folioId: folio.id, date: config.dateHotel, status: "émise", printCount: 0, corrections: 0, snapshot: factureSnapshot(folio, recipient) };
      setFactures((p) => [fac, ...p]);
      setConfig((cc) => ({ ...cc, factureSeq: (cc.factureSeq || 0) + 1 }));
      updateFolio(folio.id, { factureId: fac.id, closed: true, facture: true, checkoutDate: folio.checkoutDate || config.dateHotel });
      setUnits((p) => p.map((u) => (u.id === folio.unitId ? { ...u, statutMenage: "sale" } : u)));
    }
    printFacture(fac);
    return fac;
  };
  const updateFacture = (id, patch) => setFactures((p) => p.map((x) => x.id === id ? { ...x, ...patch } : x));
  const cancelFacture = (fac) => { updateFacture(fac.id, { status: "annulée" }); const f = folios.find((y) => y.id === fac.folioId); if (f && f.factureId === fac.id) updateFolio(f.id, { factureId: null, closed: false, facture: false }); };
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
    <MoneyCtx.Provider value={config.currency}>
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
          {tab === "edition" && <Edition {...{ units, folios, tickets, debtors, monthly, config }} />}
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
