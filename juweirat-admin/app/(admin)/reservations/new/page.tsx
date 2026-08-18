'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { categories, clients, rooms, reservations, prestations } from '@/lib/api';
import type { ClientDto, PrestationAnnexeDto, RoomCategoryDto, RoomDto } from '@/lib/types';
import { ArrowLeft, Save, Search, Zap, Calendar, Users, Home, CheckCircle2, Shield, Banknote, CreditCard, Package, Briefcase } from 'lucide-react';
import Link from 'next/link';

const SOURCES    = ['Direct', 'Téléphone', 'Walk-in', 'Booking.com', 'Expedia', 'Airbnb'];
const CURRENCIES = ['XOF', 'EUR', 'USD'];
const KWH_PRICE = 230;

function nightsBetween(from: string, to: string): number {
  if (!from || !to) return 0;
  const diff = (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000;
  return diff > 0 ? Math.round(diff) : 0;
}

function tierFor(n: number, cat: RoomCategoryDto): { label: string; ratePerNight: number; elecIncluded: boolean } {
  if (n >= 30) return { label: 'Forfait mensuel (30j+)',  ratePerNight: cat.tarifN30,   elecIncluded: false };
  if (n >= 15) return { label: 'Forfait 15 jours (15-29j)', ratePerNight: cat.tarifN15,   elecIncluded: false };
  return              { label: 'Nuitée standard (1-14j)',  ratePerNight: cat.tarifNuit,  elecIncluded: true  };
}

const GAMME_LABELS: Record<string, string> = {
  standard:   'Standard',
  supérieure: 'Supérieure',
  privilège:  'Privilège',
  suite:      'Suite',
};

export default function NewReservationPage() {
  const router = useRouter();

  const [categoryList, setCategoryList]     = useState<RoomCategoryDto[]>([]);
  const [roomList, setRoomList]             = useState<RoomDto[]>([]);
  const [clientList, setClientList]         = useState<ClientDto[]>([]);
  const [prestationList, setPrestationList] = useState<PrestationAnnexeDto[]>([]);
  // selectedPrestations: Map<prestationId, quantiteOverride | null>
  const [selectedPrestations, setSelectedPrestations] = useState<Map<number, number | null>>(new Map());
  const [clientSearch, setClientSearch] = useState('');
  const [showDrop, setShowDrop]         = useState(false);
  const [kwh, setKwh]                   = useState('');
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');
  const dropRef = useRef<HTMLDivElement>(null);

  // Form State
  const [form, setForm] = useState({
    clientId:        0,
    clientLabel:     '',
    categoryId:      0,
    roomId:          0,  // 0 = auto-assign
    checkInDate:     '',
    checkOutDate:    '',
    adults:          1,
    children:        0,
    currency:        'XOF',
    source:          'Direct',
    specialRequests: '',
    internalNotes:   '',
    // Garantie
    garantieType:    '' as '' | 'Cash' | 'Carte',
    garantieMontantCash: '',
    carteNumero:     '',
    carteNom:        '',
    carteExpiration: '',
  });

  useEffect(() => { categories.getAll().then(setCategoryList); }, []);
  useEffect(() => { rooms.getAll().then(setRoomList); }, []);
  useEffect(() => { prestations.getAll(true).then(setPrestationList); }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      clients.getAll(clientSearch || undefined).then(setClientList);
    }, 250);
    return () => clearTimeout(t);
  }, [clientSearch]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setShowDrop(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function set(field: string, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  const [selectedClientCompany, setSelectedClientCompany] = useState<{ id: number; name: string } | null>(null);

  function selectClient(c: ClientDto) {
    setForm(prev => ({ ...prev, clientId: c.id, clientLabel: c.fullName }));
    setClientSearch(c.fullName);
    setShowDrop(false);
    setSelectedClientCompany(c.companyId && c.companyName ? { id: c.companyId, name: c.companyName } : null);
  }

  // Calculations
  const nights      = nightsBetween(form.checkInDate, form.checkOutDate);
  const totalPax    = Math.max(1, Number(form.adults) + Number(form.children));

  const selectedCat = categoryList.find(c => c.id === form.categoryId) ?? null;
  const tier        = selectedCat && nights > 0 ? tierFor(nights, selectedCat) : null;
  const hebergement = tier ? tier.ratePerNight * nights : 0;
  const elecCost    = tier && !tier.elecIncluded ? (Number(kwh) || 0) * KWH_PRICE : 0;

  function quantiteFor(p: PrestationAnnexeDto): number {
    const override = selectedPrestations.get(p.id);
    if (override != null) return override;
    if (p.mode === 'ParPersonneParNuit') return totalPax * Math.max(1, nights);
    if (p.mode === 'ParPersonne')        return totalPax;
    return 1; // Forfait
  }

  const totalPrestationsEstime = [...selectedPrestations.keys()].reduce((acc, pid) => {
    const p = prestationList.find(x => x.id === pid);
    if (!p) return acc;
    return acc + p.prixInclus * quantiteFor(p);
  }, 0);

  const totalEstime = hebergement + totalPrestationsEstime + elecCost;

  // Available rooms for category
  const categoryRooms = roomList.filter(r => r.categoryId === form.categoryId && r.status === 'Available');

  const filteredClients = clientList
    .filter(c =>
      !clientSearch ||
      c.fullName.toLowerCase().includes(clientSearch.toLowerCase()) ||
      (c.phone ?? '').includes(clientSearch) ||
      (c.email ?? '').toLowerCase().includes(clientSearch.toLowerCase())
    )
    .slice(0, 8);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nights <= 0)           { setError("Veuillez sélectionner des dates de séjour valides (Départ après Arrivée)."); return; }
    if (!form.categoryId)      { setError('Veuillez sélectionner une catégorie de logement.'); return; }
    if (!form.clientId)        { setError('Veuillez sélectionner ou renseigner un client.'); return; }
    if (Number(form.adults) < 1) { setError('Le nombre d\'adultes doit être au moins 1.'); return; }
    if (!form.garantieType)    { setError('Veuillez renseigner une garantie (dépôt en espèces ou carte bancaire).'); return; }
    if (form.garantieType === 'Cash' && !form.garantieMontantCash) {
      setError('Veuillez indiquer le montant du dépôt en espèces.'); return;
    }
    if (form.garantieType === 'Carte') {
      if (form.carteNumero.replace(/\s/g, '').length < 4) { setError('Numéro de carte invalide.'); return; }
      if (!form.carteNom.trim())                           { setError('Veuillez indiquer le nom sur la carte.'); return; }
      if (!/^\d{2}\/\d{4}$/.test(form.carteExpiration))   { setError('Date d\'expiration invalide (format MM/AAAA).'); return; }
    }
    
    setError('');
    setSaving(true);
    try {
      const carteSuffix = form.garantieType === 'Carte'
        ? form.carteNumero.replace(/\s/g, '').slice(-4)
        : null;

      const prestationsPayload = [...selectedPrestations.keys()].map(pid => {
        const p = prestationList.find(x => x.id === pid)!;
        return { prestationId: pid, quantite: quantiteFor(p) };
      });

      const body = {
        categoryId:          form.categoryId,
        clientId:            form.clientId,
        roomId:              form.roomId > 0 ? form.roomId : null,
        checkInDate:         form.checkInDate,
        checkOutDate:        form.checkOutDate,
        adults:              Number(form.adults),
        children:            Number(form.children),
        currency:            form.currency,
        source:              form.source || null,
        specialRequests:     form.specialRequests || null,
        internalNotes:       form.internalNotes || null,
        garantieType:        form.garantieType || null,
        garantieMontantCash: form.garantieType === 'Cash' ? Number(form.garantieMontantCash) : null,
        carteNom:            form.garantieType === 'Carte' ? form.carteNom.trim() : null,
        carteSuffix,
        carteExpiration:     form.garantieType === 'Carte' ? form.carteExpiration : null,
        prestations:         prestationsPayload.length > 0 ? prestationsPayload : null,
      };
      const created = await reservations.create(body);
      router.push(`/reservations/${created.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Création de Réservation PMS" />
      <div className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">
        
        <div className="flex items-center justify-between">
          <Link href="/reservations" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-charcoal font-medium">
            <ArrowLeft size={16} /> Retour aux réservations
          </Link>
          <div className="text-xs font-bold text-gold uppercase tracking-wider">
            Tunnel Guidé en 5 Étapes
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── ÉTAPE 1 : PÉRIODE DU SÉJOUR ── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-green text-white text-xs font-bold flex items-center justify-center">1</span>
                <h2 className="text-sm font-bold text-charcoal uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={16} className="text-gold" />
                  Période du Séjour
                </h2>
              </div>
              {nights > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-green/10 text-green font-bold text-xs">
                  {nights} Nuitée{nights > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Date d'arrivée *</label>
                <input
                  required
                  type="date"
                  value={form.checkInDate}
                  onChange={e => { set('checkInDate', e.target.value); setKwh(''); }}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm bg-white font-medium focus:ring-2 focus:ring-green/20 focus:border-green"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Date de départ *</label>
                <input
                  required
                  type="date"
                  value={form.checkOutDate}
                  min={form.checkInDate || undefined}
                  onChange={e => { set('checkOutDate', e.target.value); setKwh(''); }}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm bg-white font-medium focus:ring-2 focus:ring-green/20 focus:border-green"
                />
              </div>
            </div>
          </div>

          {/* ── ÉTAPE 2 : NOMBRE D'OCCUPANTS ── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-green text-white text-xs font-bold flex items-center justify-center">2</span>
                <h2 className="text-sm font-bold text-charcoal uppercase tracking-wider flex items-center gap-2">
                  <Users size={16} className="text-gold" />
                  Nombre d'Occupants
                </h2>
              </div>
              <span className="text-xs text-gray-400 font-medium">Total : {totalPax} personne{totalPax > 1 ? 's' : ''}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Nombre d'adultes *</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={form.adults}
                  onChange={e => set('adults', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm bg-white font-medium focus:ring-2 focus:ring-green/20 focus:border-green"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Nombre d'enfants</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={form.children}
                  onChange={e => set('children', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm bg-white font-medium focus:ring-2 focus:ring-green/20 focus:border-green"
                />
              </div>
            </div>
          </div>

          {/* ── ÉTAPE 3 : PRESTATIONS ANNEXES ── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-green text-white text-xs font-bold flex items-center justify-center">3</span>
                <h2 className="text-sm font-bold text-charcoal uppercase tracking-wider flex items-center gap-2">
                  <Package size={16} className="text-gold" />
                  Prestations Annexes
                </h2>
              </div>
              {selectedPrestations.size > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-gold/15 text-gold font-bold text-xs">
                  {selectedPrestations.size} prestation{selectedPrestations.size > 1 ? 's' : ''} sélectionnée{selectedPrestations.size > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {prestationList.length === 0 ? (
              <p className="text-sm text-gray-400 italic">
                Aucune prestation disponible. Configurez-en depuis <strong>Prestations Annexes</strong> dans le menu.
              </p>
            ) : (
              <div className="space-y-2">
                {prestationList.map(p => {
                  const selected  = selectedPrestations.has(p.id);
                  const qte       = selected ? quantiteFor(p) : 0;
                  const ligneTotal = selected ? p.prixInclus * qte : 0;

                  const modeDesc = p.mode === 'ParPersonneParNuit'
                    ? `${totalPax} pers. × ${Math.max(1, nights)} nuit${nights > 1 ? 's' : ''} = ${qte} unité${qte > 1 ? 's' : ''}`
                    : p.mode === 'ParPersonne'
                    ? `${totalPax} personne${totalPax > 1 ? 's' : ''}`
                    : 'Forfait';

                  return (
                    <label key={p.id} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      selected ? 'border-gold bg-gold/5' : 'border-gray-100 hover:border-gray-200'
                    }`}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={e => {
                          const next = new Map(selectedPrestations);
                          if (e.target.checked) next.set(p.id, null);
                          else next.delete(p.id);
                          setSelectedPrestations(next);
                        }}
                        className="w-4 h-4 rounded text-gold focus:ring-gold border-gray-300 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-charcoal text-sm">{p.nameFr}</span>
                          <span className="text-sm font-bold text-gold shrink-0">
                            {p.prixInclus.toLocaleString('fr')} FCFA
                            <span className="text-xs font-normal text-gray-400 ml-1">
                              {p.mode === 'ParPersonneParNuit' ? '/pers./nuit'
                               : p.mode === 'ParPersonne' ? '/pers.'
                               : ' forfait'}
                            </span>
                          </span>
                        </div>
                        {selected && (
                          <div className="mt-1.5 flex items-center justify-between text-xs text-gray-500">
                            <span>{modeDesc}</span>
                            <span className="font-semibold text-charcoal">{ligneTotal.toLocaleString('fr')} FCFA</span>
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}

                {selectedPrestations.size > 0 && (
                  <div className="flex items-center justify-between text-xs pt-3 border-t border-gray-100">
                    <span className="text-gray-500 font-medium">Total prestations annexes :</span>
                    <span className="text-sm font-black text-gold">{totalPrestationsEstime.toLocaleString('fr')} FCFA</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── ÉTAPE 4 : GARANTIE ── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-green text-white text-xs font-bold flex items-center justify-center">4</span>
                <h2 className="text-sm font-bold text-charcoal uppercase tracking-wider flex items-center gap-2">
                  <Shield size={16} className="text-gold" />
                  Garantie de la réservation
                </h2>
              </div>
              {form.garantieType && (
                <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs">
                  {form.garantieType === 'Cash' ? 'Dépôt espèces' : 'Carte bancaire'}
                </span>
              )}
            </div>

            {/* Choix du type de garantie */}
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                form.garantieType === 'Cash'
                  ? 'border-green bg-green/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="garantieType"
                  value="Cash"
                  checked={form.garantieType === 'Cash'}
                  onChange={() => set('garantieType', 'Cash')}
                  className="sr-only"
                />
                <Banknote size={22} className={form.garantieType === 'Cash' ? 'text-green' : 'text-gray-400'} />
                <div>
                  <span className="font-bold text-charcoal text-sm block">Dépôt en espèces</span>
                  <span className="text-xs text-gray-500">Montant versé à l'accueil</span>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                form.garantieType === 'Carte'
                  ? 'border-green bg-green/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="garantieType"
                  value="Carte"
                  checked={form.garantieType === 'Carte'}
                  onChange={() => set('garantieType', 'Carte')}
                  className="sr-only"
                />
                <CreditCard size={22} className={form.garantieType === 'Carte' ? 'text-green' : 'text-gray-400'} />
                <div>
                  <span className="font-bold text-charcoal text-sm block">Carte bancaire</span>
                  <span className="text-xs text-gray-500">Empreinte de garantie</span>
                </div>
              </label>
            </div>

            {/* Champs dépôt espèces */}
            {form.garantieType === 'Cash' && (
              <div className="bg-green/5 border border-green/20 rounded-xl p-4 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Montant du dépôt *</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="500"
                      required
                      value={form.garantieMontantCash}
                      onChange={e => set('garantieMontantCash', e.target.value)}
                      placeholder="Ex : 50 000"
                      className="w-48 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm bg-white font-medium focus:ring-2 focus:ring-green/20 focus:border-green"
                    />
                    <span className="text-sm font-bold text-gray-500">FCFA</span>
                  </div>
                </div>
                {form.garantieMontantCash && (
                  <p className="text-xs text-green-dark font-medium">
                    Dépôt enregistré : {Number(form.garantieMontantCash).toLocaleString('fr')} FCFA
                  </p>
                )}
              </div>
            )}

            {/* Champs carte bancaire */}
            {form.garantieType === 'Carte' && (
              <div className="bg-blue-50/60 border border-blue-200/60 rounded-xl p-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Numéro de carte *</label>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    value={form.carteNumero}
                    onChange={e => {
                      const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
                      const formatted = raw.replace(/(.{4})/g, '$1 ').trim();
                      set('carteNumero', formatted);
                    }}
                    placeholder="XXXX XXXX XXXX XXXX"
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm bg-white font-mono tracking-widest focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                  />
                  <p className="text-xs text-gray-400">Seuls les 4 derniers chiffres seront conservés.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Nom sur la carte *</label>
                    <input
                      type="text"
                      required
                      value={form.carteNom}
                      onChange={e => set('carteNom', e.target.value.toUpperCase())}
                      placeholder="NOM PRÉNOM"
                      className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm bg-white font-medium uppercase tracking-wide focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Date d'expiration *</label>
                    <input
                      type="text"
                      required
                      maxLength={7}
                      value={form.carteExpiration}
                      onChange={e => {
                        let v = e.target.value.replace(/\D/g, '');
                        if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2, 6);
                        set('carteExpiration', v);
                      }}
                      placeholder="MM/AAAA"
                      className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm bg-white font-mono tracking-wider focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                    />
                  </div>
                </div>

                {form.carteNumero.replace(/\s/g, '').length === 16 && (
                  <div className="flex items-center gap-2 text-xs text-blue-700 font-medium bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <CreditCard size={14} />
                    Carte enregistrée : •••• •••• •••• {form.carteNumero.replace(/\s/g, '').slice(-4)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── ÉTAPE 5 : LOGEMENT, CLIENT & DÉTAILS ── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-green text-white text-xs font-bold flex items-center justify-center">5</span>
                <h2 className="text-sm font-bold text-charcoal uppercase tracking-wider flex items-center gap-2">
                  <Home size={16} className="text-gold" />
                  Logement & Client
                </h2>
              </div>
            </div>

            {/* Catégorie & Logement */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Catégorie de logement *</label>
                <select
                  required
                  value={form.categoryId}
                  onChange={e => { set('categoryId', Number(e.target.value)); set('roomId', 0); setKwh(''); }}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm bg-white font-medium focus:ring-2 focus:ring-green/20 focus:border-green"
                >
                  <option value={0}>— Sélectionner une catégorie —</option>
                  {categoryList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.pmsType} {GAMME_LABELS[c.pmsGamme] ?? c.pmsGamme} — {c.nameFr} ({c.tarifNuit.toLocaleString('fr')} XOF/nuit)
                    </option>
                  ))}
                </select>
              </div>

              {form.categoryId > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Logement spécifique <span className="text-gray-400 font-normal">(Optionnel)</span>
                  </label>
                  <select
                    value={form.roomId}
                    onChange={e => set('roomId', Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm bg-white font-medium focus:ring-2 focus:ring-green/20 focus:border-green"
                  >
                    <option value={0}>— Attribution automatique au check-in —</option>
                    {categoryRooms.map(r => (
                      <option key={r.id} value={r.id}>
                        Apt. {r.roomNumber} — {r.nameFr} (Étage {r.floor})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Client Search */}
            <div className="space-y-1.5" ref={dropRef}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Client titulaire du séjour *</label>
                <Link href="/clients/new" target="_blank" className="text-xs text-gold font-bold hover:underline">
                  + Créer un nouveau client
                </Link>
              </div>
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  value={clientSearch}
                  onChange={e => {
                    setClientSearch(e.target.value);
                    setShowDrop(true);
                    if (form.clientId) { setForm(prev => ({ ...prev, clientId: 0, clientLabel: '' })); setSelectedClientCompany(null); }
                  }}
                  onFocus={() => setShowDrop(true)}
                  placeholder="Rechercher par nom, téléphone ou email…"
                  className="w-full border border-gray-200 rounded-lg pl-10 pr-3.5 py-2.5 text-sm bg-white font-medium focus:ring-2 focus:ring-green/20 focus:border-green"
                  autoComplete="off"
                />
                {showDrop && filteredClients.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-y-auto divide-y divide-gray-50">
                    {filteredClients.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => selectClient(c)}
                        className="w-full text-left px-4 py-2.5 hover:bg-green/5 text-sm flex items-center justify-between transition-colors"
                      >
                        <span className="font-bold text-charcoal">{c.fullName}</span>
                        <span className="text-xs text-gray-400">{c.phone || c.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {form.clientId > 0 && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs text-green font-bold bg-green/10 px-3 py-1 rounded-md">
                    <CheckCircle2 size={13} /> {form.clientLabel}
                  </div>
                  {selectedClientCompany && (
                    <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold bg-blue-50 border border-blue-200 px-3 py-1 rounded-md">
                      <Briefcase size={12} />
                      Tarif entreprise : {selectedClientCompany.name}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Source & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Canal d'origine</label>
                <select value={form.source} onChange={e => set('source', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm bg-white focus:ring-2 focus:ring-green/20 focus:border-green">
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Devise</label>
                <select value={form.currency} onChange={e => set('currency', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm bg-white focus:ring-2 focus:ring-green/20 focus:border-green">
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Demandes spéciales & Notes</label>
              <textarea
                rows={2}
                value={form.specialRequests}
                onChange={e => set('specialRequests', e.target.value)}
                placeholder="Ex : Arrivée tardive, lit supplémentaire, étage élevé…"
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm bg-white resize-none focus:ring-2 focus:ring-green/20 focus:border-green"
              />
            </div>
          </div>

          {/* ── RÉCAPITULATIF FINANCIER & DEVIS ESTIMÉ ── */}
          {selectedCat && nights > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Devis Financier Estimé</h3>

              <div className="space-y-2 text-sm divide-y divide-gray-100">
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-gray-600">Hébergement ({tier?.label} · {nights} nuit{nights > 1 ? 's' : ''})</span>
                  <span className="font-bold text-charcoal">{hebergement.toLocaleString('fr')} FCFA</span>
                </div>

                {[...selectedPrestations.keys()].map(pid => {
                  const p = prestationList.find(x => x.id === pid);
                  if (!p) return null;
                  const qte = quantiteFor(p);
                  return (
                    <div key={pid} className="flex justify-between items-center py-1.5 text-gold">
                      <span>{p.nameFr} ({qte} unité{qte > 1 ? 's' : ''} @ {p.prixInclus.toLocaleString('fr')} FCFA)</span>
                      <span className="font-bold">+{(p.prixInclus * qte).toLocaleString('fr')} FCFA</span>
                    </div>
                  );
                })}

                {tier && !tier.elecIncluded && (
                  <div className="py-2 space-y-2">
                    <div className="flex items-center justify-between text-amber-700">
                      <span className="flex items-center gap-1.5 text-xs font-bold">
                        <Zap size={14} /> Électricité (Hors forfait mensuel @ {KWH_PRICE} FCFA/kWh)
                      </span>
                      <span className="font-bold">+{elecCost.toLocaleString('fr')} FCFA</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min="0" step="1" value={kwh}
                        onChange={e => setKwh(e.target.value)}
                        placeholder="Estimation kWh..." className="w-40 border border-gray-200 rounded px-2.5 py-1 text-xs"
                      />
                      <span className="text-xs text-gray-400">kWh estimés</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-3 text-base">
                  <span className="font-extrabold text-charcoal uppercase text-xs tracking-wider">Total Devis Estimé</span>
                  <span className="font-black text-gold text-lg">{totalEstime.toLocaleString('fr')} FCFA</span>
                </div>
              </div>
            </div>
          )}

          {/* ── BOUTONS D'ACTION ── */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-gold text-white font-bold px-7 py-3 rounded-lg hover:bg-gold/90 disabled:opacity-60 transition-colors shadow-sm text-sm"
            >
              <Save size={16} />
              {saving ? 'Création en cours…' : 'Confirmer et Créer la Réservation'}
            </button>
            <Link href="/reservations" className="px-5 py-3 text-sm text-gray-500 hover:text-charcoal transition-colors">
              Annuler
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
