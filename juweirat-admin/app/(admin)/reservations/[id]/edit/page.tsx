'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { categories, clients, companies, rooms, reservations, prestations } from '@/lib/api';
import type {
  ClientDto, CompanyTarifDto, PrestationAnnexeDto,
  ReservationDto, RoomCategoryDto, RoomDto, TarifPreviewDto,
} from '@/lib/types';

/* ────────────────────────── Design tokens ─────────────────────────
   Copie fidèle du wizard d'ajout pour rester visuellement cohérent. */
const C = {
  page:        '#f3f5f3',
  card:        '#ffffff',
  ink:         '#14181a',
  ink2:        '#5c6660',
  ink3:        '#6b7570',
  ink4:        '#8b958f',
  ink5:        '#98a29c',
  mute:        '#a3aca7',
  fieldBorder: '#dfe4e0',
  cardBorder:  '#e5e9e6',
  sep:         '#eef1ef',
  sep2:        '#e8ebe9',
  neutral:     '#f1f4f2',
  neutral2:    '#edf0ee',
  accent:      '#15803d',
  accentHover: '#116830',
  accentSoft:  '#f2f8f4',
  accentTint:  '#eef5f0',
  ctaBg:       '#22a15a',
  ctaHover:    '#2cb968',
  ctaText:     '#062d17',
  danger:      '#c13c3c',
  warn:        '#b46a00',
  warnSoft:    '#fff8ec',
  warnBorder:  '#f5c882',
  dark:        '#14181a',
  darkSep:     '#2a2f31',
  darkLabel:   '#8c9691',
  darkFg:      '#eef2ef',
  balance:     '#7fc79b',
};

const STEP_LABELS = ['Client', 'Séjour', 'Occupants', 'Logement', 'Garantie'];
const STEP_TITLES = [
  'Client titulaire (verrouillé)',
  'Période du séjour',
  "Nombre d'occupants",
  'Logement & prestations',
  'Garantie & tarif',
];

const SOURCES    = ['Direct', 'Téléphone', 'Agence', 'Site web', 'OTA'];
const CURRENCIES = ['XOF', 'EUR', 'USD'];

const GAMME_LABELS: Record<string, string> = {
  standard:   'Standard',
  supérieure: 'Supérieure',
  privilège:  'Privilège',
  suite:      'Suite',
};

/* ────────────────────────── Utils ───────────────────────── */
function parseIsoLocal(v: string): Date | null {
  const parts = String(v || '').split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}
function toIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fmtDateShort(v: string): string {
  const d = parseIsoLocal(v);
  return d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—';
}
function fcfa(n: number): string {
  return `${Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ')} F`;
}
function nightsBetween(from: string, to: string): number {
  const a = parseIsoLocal(from);
  const b = parseIsoLocal(to);
  if (!a || !b) return 0;
  const n = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  return n > 0 ? n : 0;
}
function tierFor(n: number, cat: RoomCategoryDto): { label: string; rate: number; elecIncluded: boolean } {
  if (n >= 30) return { label: 'Forfait mensuel',     rate: cat.tarifN30,  elecIncluded: false };
  if (n >= 15) return { label: 'Forfait 15 jours',    rate: cat.tarifN15,  elecIncluded: false };
  return              { label: 'Nuitée standard',     rate: cat.tarifNuit, elecIncluded: true  };
}
function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '·';
}

/* ────────────────────────── Component ───────────────────────── */
// Suspense pour rester conforme à Next.js 16 (useParams/useRouter côté client),
// même wrap pattern que la page /reservations/new.
export default function EditReservationPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, fontSize: 13, color: '#6b7570' }}>Chargement du wizard…</div>}>
      <EditReservationPageInner />
    </Suspense>
  );
}

function EditReservationPageInner() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params?.id ?? 0);

  // ── Chargement initial ──
  const [resa, setResa] = useState<ReservationDto | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  // ── Data ──
  const [categoryList, setCategoryList]     = useState<RoomCategoryDto[]>([]);
  const [roomList, setRoomList]             = useState<RoomDto[]>([]);
  const [prestationList, setPrestationList] = useState<PrestationAnnexeDto[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientDto | null>(null);

  // Catégories dispo sur la période choisie (mêmes règles que le wizard d'ajout,
  // sauf que la résa en cours ne doit pas se "bloquer elle-même" — on garde
  // toujours la catégorie initiale dispo dans le set).
  const [availableCategoryIds, setAvailableCategoryIds] = useState<Set<number> | null>(null);

  // ── Wizard state ──
  const [step, setStep] = useState(0);

  // Step 2 — dates
  const [checkIn,  setCheckIn]  = useState('');
  const [checkOut, setCheckOut] = useState('');

  // Step 3 — guests
  const [adults, setAdults] = useState(1);
  const [kids,   setKids]   = useState(0);

  // Step 4 — logement + prestations
  const [categoryId, setCategoryId] = useState(0);
  const [roomId, setRoomId]         = useState(0);
  type PrestationSelection = { quantity: number | null; prixUnitaire: number | null };
  const [selectedPrestations, setSelectedPrestations] = useState<Map<number, PrestationSelection>>(new Map());
  const [internalNotes, setInternalNotes]     = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // Step 5 — garantie & tarif
  const [garantieType, setGarantieType] = useState<'' | 'Carte' | 'Cash' | 'Societe'>('');
  const [carteNumero,     setCarteNumero]        = useState('');
  const [carteNom,        setCarteNom]           = useState('');
  const [carteExpiration, setCarteExpiration]    = useState('');
  // Suffixe de la carte enregistrée à la création : on l'affiche masqué et on
  // ne renvoie un nouveau suffixe au backend que si l'opérateur bascule sur
  // "Remplacer la carte" et saisit un nouveau numéro.
  const [existingCarteSuffix, setExistingCarteSuffix] = useState('');
  const [replaceCard,     setReplaceCard]        = useState(false);
  const [cashMontant,     setCashMontant]        = useState('');
  const [source,   setSource]   = useState<string>(SOURCES[0]);
  const [currency, setCurrency] = useState<string>(CURRENCIES[0]);
  const [tvaExonere, setTvaExonere] = useState(false);
  const [discount, setDiscount] = useState('0');
  const [acceptRefund, setAcceptRefund] = useState(false);

  // Motif de modification — obligatoire côté API (toute modif crée une entrée changelog).
  const [reason, setReason] = useState('');

  // Submit state — déclaré tôt pour rester lisible même si les handlers sont plus bas.
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  // ── Fetch + hydrate initial ──
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      reservations.getById(id),
      categories.getAll(),
      rooms.getAll(),
      prestations.getAll(true),
    ])
      .then(([r, cats, rms, prs]) => {
        if (cancelled) return;
        setResa(r);
        setCategoryList(cats);
        setRoomList(rms);
        setPrestationList(prs);

        setCheckIn(r.checkInDate);
        setCheckOut(r.checkOutDate);
        setAdults(r.adults);
        setKids(r.children);
        setCategoryId(r.categoryId);
        setRoomId(r.roomId ?? 0);
        setInternalNotes(r.internalNotes ?? '');
        setSpecialRequests(r.specialRequests ?? '');
        setSource(r.source ?? SOURCES[0]);
        setCurrency(r.currency ?? CURRENCIES[0]);
        setTvaExonere(r.tvaExonere ?? false);
        setDiscount(String(r.discount ?? 0));

        const gt = r.garantieType;
        if (gt === 'Carte' || gt === 'Cash' || gt === 'Societe') setGarantieType(gt);
        else setGarantieType('');

        setCarteNom(r.carteNom ?? '');
        setCarteExpiration(r.carteExpiration ?? '');
        setExistingCarteSuffix(r.carteSuffix ?? '');
        setCashMontant(r.garantieMontantCash != null ? String(Math.round(r.garantieMontantCash)) : '');

        const m = new Map<number, PrestationSelection>();
        for (const p of r.prestations) {
          m.set(p.prestationId, {
            quantity:     p.quantite,
            prixUnitaire: p.prixUnitaireSnapshot,
          });
        }
        setSelectedPrestations(m);
      })
      .catch(e => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Erreur de chargement');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  // Client titulaire — chargé séparément pour récupérer le rattachement compagnie
  // (companyId / companyName) qui n'est pas dans le DTO résa.
  useEffect(() => {
    if (!resa?.clientId) return;
    let cancelled = false;
    clients.getById(resa.clientId)
      .then(c => { if (!cancelled) setSelectedClient(c); })
      .catch(() => { if (!cancelled) setSelectedClient(null); });
    return () => { cancelled = true; };
  }, [resa?.clientId]);

  // Tarifs compagnie pour afficher "🏢 Tarif entreprise" sur les cartes catégorie.
  const [companyTarifs, setCompanyTarifs] = useState<CompanyTarifDto[]>([]);
  useEffect(() => {
    setCompanyTarifs([]);
    if (!selectedClient?.companyId) return;
    let cancelled = false;
    companies.getById(selectedClient.companyId)
      .then(detail => { if (!cancelled) setCompanyTarifs(detail.tarifs ?? []); })
      .catch(() => { if (!cancelled) setCompanyTarifs([]); });
    return () => { cancelled = true; };
  }, [selectedClient?.companyId]);

  function effectiveNightRate(cat: RoomCategoryDto): { rate: number; source: 'company' | 'category' } {
    const t = companyTarifs.find(x => x.categoryId === cat.id);
    if (t && t.tarifNuit > 0) return { rate: t.tarifNuit, source: 'company' };
    return { rate: cat.tarifNuit, source: 'category' };
  }

  // ── Derived ──
  const nights   = nightsBetween(checkIn, checkOut);
  const totalPax = Math.max(1, adults + kids);
  const selectedCat = categoryList.find(c => c.id === categoryId) ?? null;

  const [tarifPreview, setTarifPreview] = useState<TarifPreviewDto | null>(null);
  useEffect(() => {
    setTarifPreview(null);
    if (!resa?.clientId || !categoryId || nights <= 0) return;
    let cancelled = false;
    reservations.getTarifPreview(resa.clientId, categoryId, nights)
      .then(res => { if (!cancelled) setTarifPreview(res); })
      .catch(() => { if (!cancelled) setTarifPreview(null); });
    return () => { cancelled = true; };
  }, [resa?.clientId, categoryId, nights]);

  // Disponibilité catégories pour la nouvelle période.
  // Cas particulier édition : la catégorie/chambre déjà réservée par la résa
  // en cours ne doit pas apparaître comme "complète" à cause d'elle-même.
  // L'API dispo ignore la résa en question via le paramètre excludeReservationId.
  useEffect(() => {
    if (!checkIn || !checkOut || nights <= 0) { setAvailableCategoryIds(null); return; }
    let cancelled = false;
    categories.getAvailable(checkIn, checkOut, Math.max(1, adults))
      .then(list => {
        if (cancelled) return;
        const set = new Set(list.map(c => c.id));
        if (resa?.categoryId) set.add(resa.categoryId); // fallback: la résa en cours reste sélectionnable
        setAvailableCategoryIds(set);
      })
      .catch(() => { if (!cancelled) setAvailableCategoryIds(null); });
    return () => { cancelled = true; };
  }, [checkIn, checkOut, nights, adults, resa?.categoryId]);

  useEffect(() => {
    if (availableCategoryIds !== null && categoryId > 0 && !availableCategoryIds.has(categoryId)) {
      setCategoryId(0);
      setRoomId(0);
    }
  }, [availableCategoryIds, categoryId]);

  const tier = selectedCat && nights > 0 ? tierFor(nights, selectedCat) : null;
  const effectivePricePerNight = tarifPreview?.pricePerNight ?? (tier ? tier.rate : 0);
  const hebergement = effectivePricePerNight * nights;

  const categoryRooms = useMemo(
    () => roomList.filter(r => r.categoryId === categoryId && r.status === 'Available'),
    [roomList, categoryId],
  );

  function quantityFor(p: PrestationAnnexeDto): number {
    const override = selectedPrestations.get(p.id)?.quantity ?? null;
    if (override != null) return override;
    if (p.mode === 'ParPersonneParNuit') return totalPax * Math.max(1, nights);
    if (p.mode === 'ParPersonne')        return totalPax;
    return 1;
  }
  function priceFor(p: PrestationAnnexeDto): number {
    if (!p.prixFlexible) return p.prixInclus;
    return selectedPrestations.get(p.id)?.prixUnitaire ?? 0;
  }
  const extrasTotal = [...selectedPrestations.keys()].reduce((acc, pid) => {
    const p = prestationList.find(x => x.id === pid);
    return p ? acc + priceFor(p) * quantityFor(p) : acc;
  }, 0);

  const discountNum = Math.max(0, Number(String(discount).replace(/[^\d]/g, '')) || 0);
  const ht          = Math.max(0, hebergement + extrasTotal - discountNum);
  const tva         = tvaExonere ? 0 : Math.round(ht * 0.18);
  const total       = ht + tva;

  // Déjà encaissé : on l'affiche en pied de récap comme aide à la décision.
  // Si le nouveau total est inférieur, on active la case "Créer un avoir".
  const paid    = resa?.amountPaid ?? 0;
  const overpaid = total < paid && paid > 0;
  useEffect(() => { if (!overpaid && acceptRefund) setAcceptRefund(false); }, [overpaid, acceptRefund]);

  const summaryRoomLabel = selectedCat
    ? `${selectedCat.pmsType} ${GAMME_LABELS[selectedCat.pmsGamme] ?? selectedCat.pmsGamme}`
    : '—';

  function applyDuration(n: number) {
    const anchor = parseIsoLocal(checkIn) ?? new Date();
    if (!checkIn) setCheckIn(toIso(anchor));
    setCheckOut(toIso(new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + n)));
  }

  /* ────────────────────────── Validation ────────────────────────── */
  function validateStep(current: number): string {
    if (current === 0) {
      // Client verrouillé : rien à valider.
    }
    if (current === 1) {
      if (!checkIn || !checkOut) return "Renseignez les dates d'arrivée et de départ.";
      if (nights <= 0)           return 'La date de départ doit être postérieure à la date d\'arrivée.';
    }
    if (current === 2) {
      if (adults < 1) return 'Au moins un adulte est requis.';
    }
    if (current === 3) {
      if (!categoryId) return 'Sélectionnez une catégorie de logement.';
      if (availableCategoryIds !== null && !availableCategoryIds.has(categoryId)) {
        return 'La catégorie sélectionnée est complète sur ces dates. Choisissez d\'autres dates ou une autre catégorie.';
      }
      for (const pid of selectedPrestations.keys()) {
        const p = prestationList.find(x => x.id === pid);
        if (p?.prixFlexible) {
          const prix = selectedPrestations.get(pid)?.prixUnitaire ?? 0;
          if (prix <= 0) return `Saisissez le prix unitaire pour la prestation « ${p.nameFr} ».`;
        }
      }
    }
    if (current === 4) {
      if (!garantieType) return 'Choisissez un mode de garantie (carte, cash ou société).';
      if (garantieType === 'Carte') {
        // En édition, la carte existante peut être conservée telle quelle
        // (numéro non-persistant côté back — seul le suffixe est stocké).
        if (replaceCard && carteNumero.replace(/\s/g, '').length < 4) return 'Numéro de carte invalide.';
        if (!carteNom.trim())                                          return 'Nom sur la carte requis.';
        if (!/^\d{2}\/\d{4}$/.test(carteExpiration))                   return 'Date d\'expiration invalide (MM/AAAA).';
      }
      if (garantieType === 'Cash') {
        const m = Number(String(cashMontant).replace(/[^\d]/g, '')) || 0;
        if (m <= 0) return 'Saisissez le montant du dépôt en espèces.';
      }
      if (garantieType === 'Societe' && !selectedClient?.companyId) {
        return 'La garantie société n\'est disponible que si le client est rattaché à une entreprise.';
      }
      if (overpaid && !acceptRefund) {
        return `Le nouveau total (${fcfa(total)}) est inférieur au déjà encaissé (${fcfa(paid)}). Cochez « Créer un avoir » pour continuer.`;
      }
      if (reason.trim().length < 3) {
        return 'Le motif de la modification est obligatoire (min. 3 caractères).';
      }
    }
    return '';
  }

  function goToStep(target: number) {
    setError('');
    if (target <= step) { setStep(target); return; }
    for (let i = step; i < target; i++) {
      const msg = validateStep(i);
      if (msg) { setError(msg); return; }
    }
    setStep(target);
  }
  function goNext() { goToStep(Math.min(4, step + 1)); }
  function goPrev() { setError(''); setStep(s => Math.max(0, s - 1)); }

  /* ────────────────────────── Submit ────────────────────────── */
  async function handleConfirm() {
    setError('');
    for (let i = 0; i <= 4; i++) {
      const msg = validateStep(i);
      if (msg) { setStep(i); setError(msg); return; }
    }
    if (!resa) return;

    setSaving(true);
    try {
      // Suffixe carte : si on remplace la carte, on prend les 4 derniers chiffres saisis.
      // Sinon on ne renvoie pas le champ pour conserver l'existant.
      const carteSuffixNew = garantieType === 'Carte' && replaceCard
        ? carteNumero.replace(/\s/g, '').slice(-4)
        : undefined;
      const cashMontantNum = garantieType === 'Cash'
        ? (Number(String(cashMontant).replace(/[^\d]/g, '')) || 0)
        : 0;

      const prestationsPayload = [...selectedPrestations.keys()].map(pid => {
        const p = prestationList.find(x => x.id === pid)!;
        return {
          prestationId: pid,
          quantite:     quantityFor(p),
          prixUnitaire: p.prixFlexible ? priceFor(p) : undefined,
        };
      });

      await reservations.update(resa.id, {
        reason: reason.trim(),
        source,
        specialRequests,
        internalNotes,
        adults,
        children: kids,
        garantieType,
        garantieMontantCash: cashMontantNum,
        carteNom:            garantieType === 'Carte' ? carteNom.trim() : '',
        // Ne pas envoyer carteSuffix si on garde la carte existante.
        ...(carteSuffixNew !== undefined ? { carteSuffix: carteSuffixNew } : {}),
        carteExpiration:     garantieType === 'Carte' ? carteExpiration : '',
        categoryId,
        roomId:              roomId > 0 ? roomId : null,
        checkInDate:         checkIn,
        checkOutDate:        checkOut,
        prestations:         prestationsPayload,
        acceptRefundImbalance: overpaid && acceptRefund,
        tvaExonere,
        discount:            discountNum,
      });
      router.push(`/reservations/${resa.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  /* ────────────────────────── Shared styles ────────────────────────── */
  const fieldInput: React.CSSProperties = {
    width: '100%', padding: '12px 14px', border: `1px solid ${C.fieldBorder}`,
    borderRadius: 10, background: C.card, fontSize: 13, color: C.ink, outline: 'none',
  };
  const fieldLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: '.08em',
    textTransform: 'uppercase', color: C.ink3,
  };
  const cardStyle: React.CSSProperties = {
    background: C.card, border: `1px solid ${C.cardBorder}`,
    borderRadius: 16, padding: '26px 28px', boxShadow: '0 1px 2px rgba(20,24,26,.03)',
  };
  const cardHeader: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 18,
    borderBottom: `1px solid ${C.sep}`, marginBottom: 22,
  };
  const chip = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
    background: active ? C.accent : C.card,
    color: active ? '#fff' : C.ink2,
    border: `1px solid ${active ? C.accent : C.fieldBorder}`,
    transition: 'all .15s',
  });

  /* ────────────────────────── États de chargement / erreur ────────────────────────── */
  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', fontSize: 13, color: C.ink3 }}>
        Chargement de la réservation…
      </div>
    );
  }
  if (loadError || !resa) {
    return (
      <div style={{ padding: 48 }}>
        <div style={{
          maxWidth: 520, margin: '0 auto', padding: '18px 22px',
          background: '#fdecec', border: '1px solid #f1c9c9', color: C.danger,
          borderRadius: 12, fontSize: 13,
        }}>
          {loadError || 'Réservation introuvable.'}
        </div>
        <div style={{ marginTop: 18, textAlign: 'center' }}>
          <Link href="/reservations" style={{ color: C.accent, fontSize: 13 }}>← Retour aux réservations</Link>
        </div>
      </div>
    );
  }

  /* ────────────────────────── Render ────────────────────────── */
  return (
    <div style={{ minHeight: '100%', color: C.ink, fontFamily: 'inherit' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 30,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24,
        padding: '16px 36px', background: C.card, borderBottom: `1px solid ${C.cardBorder}`,
      }}>
        <Link href={`/reservations/${resa.id}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontSize: 13, color: C.ink2, textDecoration: 'none',
        }}>← Retour à la fiche</Link>
        <span style={{
          fontSize: 12, fontWeight: 700, letterSpacing: '.1em',
          textTransform: 'uppercase', color: C.ink,
        }}>Édition guidée en 5 étapes</span>
      </header>

      {/* Body */}
      <div style={{
        maxWidth: 1440, margin: '0 auto', padding: '28px 36px 64px',
        display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 28, alignItems: 'start',
      }}>
        {/* Main column */}
        <main style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 600, letterSpacing: '-.01em' }}>
              Modifier la réservation{' '}
              <span style={{ fontFamily: 'monospace', color: C.accent, fontSize: 15 }}>{resa.reference}</span>
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: C.ink3 }}>
              Étape {step + 1} sur 5 — {STEP_TITLES[step]}
            </p>
          </div>

          {/* Stepper */}
          <nav style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2,
            background: C.card, border: `1px solid ${C.cardBorder}`,
            borderRadius: 14, padding: 8,
          }}>
            {STEP_LABELS.map((label, i) => {
              const done = i < step;
              const on   = i === step;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => goToStep(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '10px 14px', border: 'none', borderRadius: 10,
                    cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 12,
                    fontWeight: on ? 700 : 400,
                    color: on ? C.ink : done ? C.ink2 : C.mute,
                    background: on ? C.accentTint : 'transparent',
                  }}
                >
                  <span style={{
                    flex: '0 0 auto', width: 22, height: 22, borderRadius: 999,
                    display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700,
                    background: on || done ? C.accent : C.neutral2,
                    color:      on || done ? '#fff'     : C.mute,
                  }}>{done ? '✓' : String(i + 1)}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>

          {error && (
            <div style={{
              background: '#fdecec', color: C.danger, border: '1px solid #f1c9c9',
              borderRadius: 12, padding: '12px 16px', fontSize: 13,
            }}>{error}</div>
          )}

          {/* ── STEP 1 ── Client (verrouillé) ── */}
          {step === 0 && (
            <section style={cardStyle}>
              <div style={cardHeader}>
                <span style={{
                  width: 24, height: 24, borderRadius: 999, background: C.accent, color: '#fff',
                  display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700,
                }}>1</span>
                <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase' }}>
                  Client titulaire du séjour
                </h2>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: C.ink5 }}>🔒 Verrouillé</span>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px 18px', borderRadius: 12,
                background: selectedClient?.companyId ? '#eef6ff' : C.accentSoft,
                border: `1px solid ${selectedClient?.companyId ? '#bfdcff' : C.accent}`,
              }}>
                <span style={{
                  width: 40, height: 40, borderRadius: 999,
                  display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700,
                  background: selectedClient?.companyId ? '#1e6bd6' : C.accent, color: '#fff',
                }}>{initials(selectedClient?.fullName ?? resa.clientFullName)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>
                    {selectedClient?.fullName ?? resa.clientFullName}
                  </div>
                  <div style={{ fontSize: 11, color: C.ink4, marginTop: 3 }}>
                    {[resa.clientEmail, resa.clientPhone].filter(Boolean).join(' · ') || '—'}
                  </div>
                  {selectedClient?.companyId && selectedClient.companyName ? (
                    <div style={{ fontSize: 11, color: '#1e6bd6', fontWeight: 600, marginTop: 4 }}>
                      🏢 {selectedClient.companyName} — tarif entreprise appliqué (si défini pour la catégorie)
                    </div>
                  ) : null}
                </div>
              </div>

              <p style={{ margin: '18px 0 0', fontSize: 12, color: C.ink4 }}>
                Le client titulaire d'une réservation ne peut pas être modifié après création. Pour
                transférer un séjour à une autre personne, annulez cette réservation et créez-en une
                nouvelle.
              </p>
            </section>
          )}

          {/* ── STEP 2 ── Dates ── */}
          {step === 1 && (
            <section style={cardStyle}>
              <div style={cardHeader}>
                <span style={{ width: 24, height: 24, borderRadius: 999, background: C.accent, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>2</span>
                <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase' }}>
                  Période du séjour
                </h2>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: C.ink5 }}>
                  {nights > 0 ? `${nights} nuit${nights > 1 ? 's' : ''}` : '—'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <span style={fieldLabel}>Date d'arrivée *</span>
                  <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} style={fieldInput} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <span style={fieldLabel}>Date de départ *</span>
                  <input type="date" value={checkOut} min={checkIn || undefined} onChange={e => setCheckOut(e.target.value)} style={fieldInput} />
                </label>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                {[1, 2, 3, 7].map(n => (
                  <button key={n} type="button" onClick={() => applyDuration(n)} style={chip(nights === n)}>
                    {n} nuit{n > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ── STEP 3 ── Guests ── */}
          {step === 2 && (
            <section style={cardStyle}>
              <div style={cardHeader}>
                <span style={{ width: 24, height: 24, borderRadius: 999, background: C.accent, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>3</span>
                <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase' }}>
                  Nombre d'occupants
                </h2>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: C.ink5 }}>
                  Total : {totalPax} personne{totalPax > 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Stepper label="Nombre d'adultes *" value={adults} onChange={setAdults} min={1} />
                <Stepper label="Nombre d'enfants"    value={kids}   onChange={setKids}   min={0} />
              </div>
            </section>
          )}

          {/* ── STEP 4 ── Logement & prestations ── */}
          {step === 3 && (
            <section style={cardStyle}>
              <div style={cardHeader}>
                <span style={{ width: 24, height: 24, borderRadius: 999, background: C.accent, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>4</span>
                <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase' }}>
                  Logement &amp; prestations
                </h2>
              </div>

              <span style={{ ...fieldLabel, display: 'block', marginBottom: 10 }}>Catégorie de logement *</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {categoryList.length === 0 && (
                  <p style={{ margin: 0, fontSize: 11, color: C.ink4 }}>Aucune catégorie configurée.</p>
                )}
                {categoryList.map(cat => {
                  const on = cat.id === categoryId;
                  const detail = `${cat.pmsType} ${GAMME_LABELS[cat.pmsGamme] ?? cat.pmsGamme} · ${cat.capacityAdults} adulte${cat.capacityAdults > 1 ? 's' : ''}`;
                  const priced = effectiveNightRate(cat);
                  const isCompanyRate = priced.source === 'company';
                  const savings = isCompanyRate ? cat.tarifNuit - priced.rate : 0;
                  const soldOut = availableCategoryIds !== null && !availableCategoryIds.has(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => { if (soldOut) return; setCategoryId(cat.id); setRoomId(0); }}
                      disabled={soldOut}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: 16, padding: '15px 18px', borderRadius: 12,
                        cursor: soldOut ? 'not-allowed' : 'pointer',
                        opacity: soldOut ? 0.55 : 1,
                        background: on ? C.accentSoft : C.card,
                        border: `1px solid ${on ? C.accent : soldOut ? '#f1c9c9' : C.sep2}`,
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{cat.nameFr}</span>
                          {isCompanyRate && (
                            <span style={{
                              fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 999,
                              background: '#eef6ff', color: '#1e6bd6',
                              whiteSpace: 'nowrap',
                            }}>🏢 Tarif entreprise</span>
                          )}
                          {soldOut && (
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 999,
                              background: '#fdecec', color: C.danger,
                              whiteSpace: 'nowrap',
                            }}>Complet sur ces dates</span>
                          )}
                        </span>
                        <span style={{ fontSize: 11, color: C.ink4 }}>{detail}</span>
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                        <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                          {isCompanyRate && (
                            <span style={{ fontSize: 11, color: C.ink4, textDecoration: 'line-through' }}>
                              {fcfa(cat.tarifNuit)}
                            </span>
                          )}
                          <span style={{
                            fontSize: 13, fontWeight: 600,
                            color: isCompanyRate ? '#1e6bd6' : C.ink,
                          }}>{fcfa(priced.rate)}</span>
                        </span>
                        <span style={{ fontSize: 11, color: C.ink4 }}>
                          par nuit{savings > 0 && ` · − ${fcfa(savings)}`}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {categoryId > 0 && categoryRooms.length > 0 && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 22 }}>
                  <span style={fieldLabel}>Logement spécifique (optionnel)</span>
                  <select value={roomId} onChange={e => setRoomId(Number(e.target.value))} style={fieldInput}>
                    <option value={0}>— Attribution automatique au check-in —</option>
                    {categoryRooms.map(r => (
                      <option key={r.id} value={r.id}>
                        Apt. {r.roomNumber} — {r.nameFr} (Étage {r.floor})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <span style={{ ...fieldLabel, display: 'block', margin: '22px 0 10px' }}>Prestations annexes</span>
              {prestationList.length === 0 ? (
                <p style={{ margin: 0, fontSize: 11, color: C.ink4 }}>
                  Aucune prestation configurée.
                </p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {prestationList.map(p => {
                    const on = selectedPrestations.has(p.id);
                    const label = p.prixFlexible
                      ? `${p.nameFr} · prix libre`
                      : `${p.nameFr} · ${p.prixInclus.toLocaleString('fr-FR')} F${p.mode === 'ParPersonneParNuit' ? ' /pers./nuit' : p.mode === 'ParPersonne' ? ' /pers.' : ''}`;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          const next = new Map(selectedPrestations);
                          if (on) next.delete(p.id);
                          else    next.set(p.id, { quantity: null, prixUnitaire: null });
                          setSelectedPrestations(next);
                        }}
                        style={chip(on)}
                      >{label}</button>
                    );
                  })}
                </div>
              )}

              {[...selectedPrestations.keys()]
                .map(pid => prestationList.find(p => p.id === pid))
                .filter((p): p is PrestationAnnexeDto => !!p && p.prixFlexible)
                .length > 0 && (
                <div style={{
                  marginTop: 14, padding: '12px 14px',
                  background: C.warnSoft, border: `1px solid ${C.warnBorder}`,
                  borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#7a4f00', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                    Prestations à prix flexible — saisir le prix unitaire
                  </span>
                  {[...selectedPrestations.keys()].map(pid => {
                    const p = prestationList.find(x => x.id === pid);
                    if (!p || !p.prixFlexible) return null;
                    const val = selectedPrestations.get(pid)?.prixUnitaire ?? null;
                    return (
                      <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ flex: 1, fontSize: 13, color: C.ink }}>{p.nameFr}</span>
                        <input
                          type="number" min={0} step={100}
                          value={val ?? ''}
                          onChange={e => {
                            const next = new Map(selectedPrestations);
                            const raw  = e.target.value;
                            next.set(pid, {
                              quantity:     selectedPrestations.get(pid)?.quantity ?? null,
                              prixUnitaire: raw === '' ? null : Number(raw),
                            });
                            setSelectedPrestations(next);
                          }}
                          placeholder="Ex : 2 500"
                          style={{
                            width: 140, padding: '8px 12px', border: '1px solid #d4a04c',
                            borderRadius: 8, background: '#fff', fontSize: 13,
                            textAlign: 'right', color: C.ink, outline: 'none',
                          }}
                        />
                        <span style={{ fontSize: 11, color: C.ink4 }}>F / unité</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <label style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 22 }}>
                <span style={fieldLabel}>Demandes spéciales du client</span>
                <textarea
                  rows={2}
                  value={specialRequests}
                  onChange={e => setSpecialRequests(e.target.value)}
                  placeholder="Lit bébé, chambre calme, transfert…"
                  style={{ ...fieldInput, resize: 'vertical' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 14 }}>
                <span style={fieldLabel}>Note interne</span>
                <textarea
                  rows={3}
                  value={internalNotes}
                  onChange={e => setInternalNotes(e.target.value)}
                  placeholder="Arrivée tardive, préférences, transfert aéroport…"
                  style={{ ...fieldInput, resize: 'vertical' }}
                />
              </label>
            </section>
          )}

          {/* ── STEP 5 ── Garantie & tarif ── */}
          {step === 4 && (
            <section style={cardStyle}>
              <div style={cardHeader}>
                <span style={{ width: 24, height: 24, borderRadius: 999, background: C.accent, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>5</span>
                <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase' }}>
                  Garantie &amp; tarif
                </h2>
              </div>

              <span style={{ ...fieldLabel, display: 'block', marginBottom: 10 }}>Garantie de la réservation</span>
              <div style={{ display: 'grid', gridTemplateColumns: selectedClient?.companyId ? '1fr 1fr 1fr' : '1fr 1fr', gap: 12 }}>
                {[
                  { id: 'Carte'   as const, name: 'Carte bancaire',   detail: 'Empreinte de garantie',                       show: true },
                  { id: 'Cash'    as const, name: 'Dépôt cash',       detail: 'Espèces conservées en caisse',                show: true },
                  { id: 'Societe' as const, name: 'Garantie société', detail: selectedClient?.companyName
                                                                        ? `Facturée à ${selectedClient.companyName}`
                                                                        : 'Client rattaché à une société',                    show: !!selectedClient?.companyId },
                ].filter(g => g.show).map(g => {
                  const on = garantieType === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGarantieType(g.id)}
                      style={{
                        display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start',
                        padding: '15px 18px', borderRadius: 12, cursor: 'pointer',
                        background: on ? C.accentSoft : C.card,
                        border: `1px solid ${on ? C.accent : C.sep2}`,
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{g.name}</span>
                      <span style={{ fontSize: 11, color: C.ink4 }}>{g.detail}</span>
                    </button>
                  );
                })}
              </div>

              {garantieType === 'Carte' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
                  {/* Carte existante : garder ou remplacer.
                      Le back ne stocke que le suffixe → si on ne remplace pas,
                      on n'envoie pas carteSuffix pour conserver l'existant. */}
                  {existingCarteSuffix && !replaceCard ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: 14, padding: '13px 16px', borderRadius: 10,
                      background: '#f6f9f7', border: `1px solid ${C.sep2}`,
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 12, color: C.ink3 }}>Carte enregistrée</span>
                        <span style={{ fontSize: 14, fontFamily: 'monospace', letterSpacing: '.12em', color: C.ink }}>
                          •••• •••• •••• {existingCarteSuffix}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setReplaceCard(true); setCarteNumero(''); }}
                        style={{
                          padding: '8px 14px', border: `1px solid ${C.fieldBorder}`,
                          borderRadius: 8, background: C.card, cursor: 'pointer',
                          fontSize: 12, color: C.ink2,
                        }}
                      >Remplacer la carte</button>
                    </div>
                  ) : (
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      <span style={fieldLabel}>Numéro de carte *</span>
                      <input maxLength={19} value={carteNumero} onChange={e => {
                        const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
                        setCarteNumero(raw.replace(/(.{4})/g, '$1 ').trim());
                      }} placeholder="XXXX XXXX XXXX XXXX" style={{ ...fieldInput, fontFamily: 'monospace', letterSpacing: '.15em' }} />
                      <span style={{ fontSize: 11, color: C.ink4 }}>Seuls les 4 derniers chiffres sont conservés.</span>
                      {existingCarteSuffix && replaceCard && (
                        <button
                          type="button"
                          onClick={() => { setReplaceCard(false); setCarteNumero(''); }}
                          style={{
                            alignSelf: 'flex-start', background: 'none', border: 'none',
                            color: C.ink3, fontSize: 11, cursor: 'pointer', padding: 0,
                            textDecoration: 'underline',
                          }}
                        >← Conserver la carte enregistrée (•••• {existingCarteSuffix})</button>
                      )}
                    </label>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      <span style={fieldLabel}>Nom sur la carte *</span>
                      <input value={carteNom} onChange={e => setCarteNom(e.target.value.toUpperCase())} placeholder="NOM PRÉNOM" style={fieldInput} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      <span style={fieldLabel}>Date d'expiration *</span>
                      <input maxLength={7} value={carteExpiration} onChange={e => {
                        let v = e.target.value.replace(/\D/g, '');
                        if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2, 6);
                        setCarteExpiration(v);
                      }} placeholder="MM/AAAA" style={{ ...fieldInput, fontFamily: 'monospace' }} />
                    </label>
                  </div>
                </div>
              )}

              {garantieType === 'Cash' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <span style={fieldLabel}>Montant garanti (FCFA) *</span>
                    <input
                      inputMode="numeric"
                      value={cashMontant}
                      onChange={e => setCashMontant(e.target.value.replace(/[^\d]/g, ''))}
                      placeholder="ex. 50 000"
                      style={{ ...fieldInput, fontFamily: 'monospace' }}
                    />
                    <span style={{ fontSize: 11, color: C.ink4 }}>
                      Espèces conservées en caisse jusqu'au check-out. Restitué au départ après vérification de l'appartement.
                    </span>
                  </label>
                </div>
              )}

              {garantieType === 'Societe' && selectedClient?.companyId && (
                <div style={{
                  marginTop: 18, padding: '14px 16px',
                  background: '#eef6ff', border: '1px solid #bfdcff',
                  borderRadius: 10, color: '#1e4d8f', fontSize: 13, lineHeight: 1.55,
                }}>
                  🏢 <b>{selectedClient.companyName}</b> se porte garante.<br />
                  Le solde du séjour sera facturé au compte société. Aucun encaissement direct auprès du client n'est nécessaire.
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 22 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <span style={fieldLabel}>Canal d'origine</span>
                  <select value={source} onChange={e => setSource(e.target.value)} style={fieldInput}>
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <span style={fieldLabel}>Devise (informative)</span>
                  <select value={currency} onChange={e => setCurrency(e.target.value)} style={fieldInput} disabled>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <span style={fieldLabel}>Remise</span>
                  <input inputMode="numeric" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" style={fieldInput} />
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <span style={fieldLabel}>Déjà encaissé</span>
                  <div style={{
                    padding: '12px 14px', border: `1px solid ${C.sep}`,
                    borderRadius: 10, background: C.neutral, fontSize: 13, color: C.ink,
                    fontFamily: 'monospace',
                  }}>{fcfa(paid)}</div>
                </div>
              </div>

              <label style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 20,
                padding: '13px 14px', border: `1px solid ${C.sep}`,
                borderRadius: 10, background: '#f8faf9', cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={tvaExonere}
                  onChange={e => setTvaExonere(e.target.checked)}
                  style={{ marginTop: 2, accentColor: C.accent }}
                />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.ink }}>Exonération de TVA</span>
                  <span style={{ fontSize: 11, color: C.ink4 }}>
                    Si coché, les factures liées à ce séjour ne feront pas apparaître de TVA. Sinon la facture est décomposée en HT + TVA 18% + TTC.
                  </span>
                </span>
              </label>

              {overpaid && (
                <label style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 14,
                  padding: '13px 14px', border: `1px solid ${C.warnBorder}`,
                  borderRadius: 10, background: C.warnSoft, cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={acceptRefund}
                    onChange={e => setAcceptRefund(e.target.checked)}
                    style={{ marginTop: 2, accentColor: C.warn }}
                  />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#7a4f00' }}>
                      Confirmer la création d'un avoir client
                    </span>
                    <span style={{ fontSize: 11, color: C.ink3 }}>
                      Le nouveau total ({fcfa(total)}) est inférieur au déjà encaissé ({fcfa(paid)}).
                      Un avoir de {fcfa(paid - total)} sera dû au client.
                    </span>
                  </span>
                </label>
              )}

              {/* Motif obligatoire — enregistré dans l'historique de la réservation.
                  Le back rejette la requête si vide. Message d'aide contextuel selon
                  ce qui a changé pour aider l'opérateur à formuler. */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 22 }}>
                <span style={fieldLabel}>
                  Motif de la modification *
                </span>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder={
                    categoryId !== resa.categoryId
                      ? 'Ex : Client demande un surclassement / catégorie initiale indisponible…'
                      : (checkIn !== resa.checkInDate || checkOut !== resa.checkOutDate)
                        ? 'Ex : Prolongation du séjour à la demande du client'
                        : 'Ex : Correction erreur de saisie, mise à jour infos garantie…'
                  }
                  style={{ ...fieldInput, resize: 'vertical' }}
                />
                <span style={{ fontSize: 11, color: C.ink4 }}>
                  Ce motif est conservé dans l'historique de la réservation aux côtés du diff
                  automatique des champs modifiés.
                </span>
              </label>
            </section>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <button
              type="button"
              onClick={goPrev}
              style={{
                padding: '12px 20px', borderRadius: 10,
                border: `1px solid ${C.fieldBorder}`, background: C.card,
                color: C.ink2, cursor: 'pointer', fontSize: 13,
                visibility: step === 0 ? 'hidden' : 'visible',
              }}
            >← Précédent</button>
            <button
              type="button"
              disabled={saving}
              onClick={step === 4 ? handleConfirm : goNext}
              style={{
                padding: '12px 22px', borderRadius: 10, border: 'none',
                background: saving ? '#8dbfa0' : C.accent, color: '#fff',
                fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: 13,
              }}
            >{step === 4 ? (saving ? 'Enregistrement…' : 'Enregistrer les modifications') : 'Continuer'}</button>
          </div>
        </main>

        {/* Summary sidebar */}
        <aside style={{ position: 'sticky', top: 84, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{
            background: C.dark, color: C.darkFg, borderRadius: 16,
            padding: 24, display: 'flex', flexDirection: 'column', gap: 18,
          }}>
            <div>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '.1em',
                textTransform: 'uppercase', color: C.darkLabel, marginBottom: 8,
              }}>Récapitulatif</div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>
                {selectedClient?.fullName ?? resa.clientFullName}
              </div>
              <div style={{ fontSize: 11, color: C.darkLabel, marginTop: 4 }}>
                {totalPax} personne{totalPax > 1 ? 's' : ''} · {nights > 0 ? `${nights} nuit${nights > 1 ? 's' : ''}` : '—'}
              </div>
            </div>

            <div style={{ height: 1, background: C.darkSep }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <Row label="Dates" value={checkIn && checkOut ? `${fmtDateShort(checkIn)} → ${fmtDateShort(checkOut)}` : '—'} />
              <Row label="Logement" value={summaryRoomLabel} />
              <Row label="Hébergement HT" value={hebergement ? fcfa(hebergement) : '—'} />
              {tarifPreview && (
                <div style={{
                  fontSize: 11, padding: '4px 8px', borderRadius: 8,
                  background: tarifPreview.source === 'company' ? 'rgba(30,107,214,.25)' : 'rgba(255,255,255,.05)',
                  color: tarifPreview.source === 'company' ? '#a7d0ff' : C.darkLabel,
                  border: tarifPreview.source === 'company' ? '1px solid rgba(30,107,214,.5)' : '1px solid transparent',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {tarifPreview.source === 'company'
                    ? <>🏢 Tarif entreprise <b style={{ color: '#eaf3ff' }}>{tarifPreview.companyName}</b> · {fcfa(tarifPreview.pricePerNight)}/nuit HT</>
                    : tarifPreview.source === 'category'
                      ? <>Tarif catégorie standard · {fcfa(tarifPreview.pricePerNight)}/nuit HT</>
                      : <>Tarif par défaut · {fcfa(tarifPreview.pricePerNight)}/nuit HT</>}
                </div>
              )}
              <Row label="Prestations HT" value={extrasTotal ? fcfa(extrasTotal) : '—'} />
              <Row label="Remise" value={discountNum ? `− ${fcfa(discountNum)}` : '—'} />
            </div>

            <div style={{ height: 1, background: C.darkSep }} />

            {total > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                <Row label="Sous-total HT" value={fcfa(ht)} />
                {tvaExonere
                  ? <Row label="TVA" value="Exonérée" />
                  : <Row label="TVA (18 %)" value={`+ ${fcfa(tva)}`} />}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12,
              paddingTop: 6, borderTop: `1px solid ${C.darkSep}`,
            }}>
              <span style={{ fontSize: 12, color: C.darkLabel, fontWeight: 700 }}>
                {tvaExonere ? 'TOTAL' : 'TOTAL TTC'}
              </span>
              <span style={{ fontSize: 22, fontWeight: 800 }}>{fcfa(total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11, color: C.darkLabel }}>
              <span>Déjà encaissé</span>
              <span style={{ color: C.balance }}>{fcfa(paid)}</span>
            </div>
            {overpaid && (
              <div style={{
                fontSize: 11, padding: '8px 10px', borderRadius: 8,
                background: 'rgba(180,106,0,.15)', color: '#f0c26b',
                border: '1px solid rgba(180,106,0,.4)',
              }}>
                ⚠ Nouveau total &lt; déjà encaissé — avoir client de {fcfa(paid - total)}.
              </div>
            )}

            <button
              type="button"
              disabled={saving}
              onClick={handleConfirm}
              style={{
                padding: 13, border: 'none', borderRadius: 10,
                background: saving ? '#5b8a6d' : C.ctaBg,
                color: C.ctaText, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13,
              }}
            >{saving ? 'Enregistrement…' : 'Enregistrer les modifications'}</button>
          </div>
          <div style={{
            background: C.card, border: `1px solid ${C.cardBorder}`,
            borderRadius: 14, padding: '16px 18px', fontSize: 12, color: C.ink3,
          }}>
            Toute modification est enregistrée en une seule fois à la validation finale. Un séjour terminé,
            annulé ou en cours de check-in ne peut plus être édité — utilisez le PMS.
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ─────────────────────── Sub-components ─────────────────────── */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: C.darkLabel }}>{label}</span>
      <span style={{ textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function Stepper({ label, value, onChange, min }: {
  label: string; value: number; onChange: (n: number) => void; min: number;
}) {
  const btn: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 8,
    border: `1px solid ${C.fieldBorder}`, background: C.card,
    cursor: 'pointer', color: C.ink2, fontSize: 14, fontWeight: 500,
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: C.ink3 }}>
        {label}
      </span>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, padding: '8px 10px 8px 14px',
        border: `1px solid ${C.fieldBorder}`, borderRadius: 10, background: C.card,
      }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>{value}</span>
        <span style={{ display: 'flex', gap: 6 }}>
          <button type="button" style={btn} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
          <button type="button" style={btn} onClick={() => onChange(value + 1)}>+</button>
        </span>
      </div>
    </div>
  );
}
