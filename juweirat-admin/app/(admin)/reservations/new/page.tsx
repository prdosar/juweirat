'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { categories, clients, rooms, reservations } from '@/lib/api';
import type { ClientDto, RoomCategoryDto, RoomDto } from '@/lib/types';
import { ArrowLeft, Save, Search, Zap, Coffee, Calendar, Users, Home, UserCheck, CheckCircle2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const SOURCES    = ['Direct', 'Téléphone', 'Walk-in', 'Booking.com', 'Expedia', 'Airbnb'];
const CURRENCIES = ['XOF', 'EUR', 'USD'];
const KWH_PRICE  = 230;
const DEFAULT_PDJ_PRICE = 3500;

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

  const [categoryList, setCategoryList] = useState<RoomCategoryDto[]>([]);
  const [roomList, setRoomList]         = useState<RoomDto[]>([]);
  const [clientList, setClientList]     = useState<ClientDto[]>([]);
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
    includePdj:      false,
    pdjUnitPrice:    DEFAULT_PDJ_PRICE,
    currency:        'XOF',
    source:          'Direct',
    specialRequests: '',
    internalNotes:   '',
  });

  useEffect(() => { categories.getAll().then(setCategoryList); }, []);
  useEffect(() => { rooms.getAll().then(setRoomList); }, []);

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

  function selectClient(c: ClientDto) {
    setForm(prev => ({ ...prev, clientId: c.id, clientLabel: c.fullName }));
    setClientSearch(c.fullName);
    setShowDrop(false);
  }

  // Calculations
  const nights          = nightsBetween(form.checkInDate, form.checkOutDate);
  const totalPax        = Math.max(1, Number(form.adults) + Number(form.children));
  const pdjQty          = form.includePdj ? totalPax * Math.max(1, nights) : 0;
  const totalPdjCost    = form.includePdj ? pdjQty * Number(form.pdjUnitPrice || 0) : 0;

  const selectedCat     = categoryList.find(c => c.id === form.categoryId) ?? null;
  const tier            = selectedCat && nights > 0 ? tierFor(nights, selectedCat) : null;
  const hebergement     = tier ? tier.ratePerNight * nights : 0;
  const elecCost        = tier && !tier.elecIncluded ? (Number(kwh) || 0) * KWH_PRICE : 0;
  const totalEstime     = hebergement + totalPdjCost + elecCost;

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
    if (nights <= 0)      { setError("Veuillez sélectionner des dates de séjour valides (Départ après Arrivée)."); return; }
    if (!form.categoryId) { setError('Veuillez sélectionner une catégorie de logement.'); return; }
    if (!form.clientId)   { setError('Veuillez sélectionner ou renseigner un client.'); return; }
    
    setError('');
    setSaving(true);
    try {
      // Build special requests summary with breakfast note if chosen
      let enrichedRequests = form.specialRequests || '';
      if (form.includePdj) {
        const pdjNote = `[Petit Déjeuner Inclus : ${totalPax} pers. × ${nights} nuits = ${pdjQty} PDJ @ ${Number(form.pdjUnitPrice).toLocaleString('fr')} FCFA = ${totalPdjCost.toLocaleString('fr')} FCFA]`;
        enrichedRequests = enrichedRequests ? `${enrichedRequests} | ${pdjNote}` : pdjNote;
      }

      const body = {
        categoryId:      form.categoryId,
        clientId:        form.clientId,
        roomId:          form.roomId > 0 ? form.roomId : null,
        checkInDate:     form.checkInDate,
        checkOutDate:    form.checkOutDate,
        adults:          Number(form.adults),
        children:        Number(form.children),
        currency:        form.currency,
        source:          form.source || null,
        specialRequests: enrichedRequests || null,
        internalNotes:   form.internalNotes || null,
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
    <div className="flex flex-col min-h-full">
      <Header title="Création de Réservation PMS" />
      <div className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">
        
        <div className="flex items-center justify-between">
          <Link href="/reservations" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-charcoal font-medium">
            <ArrowLeft size={16} /> Retour aux réservations
          </Link>
          <div className="text-xs font-bold text-gold uppercase tracking-wider">
            Tunnel Guidé en 4 Étapes
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

          {/* ── ÉTAPE 3 : PETIT DÉJEUNER AUTOMATISÉ ── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-green text-white text-xs font-bold flex items-center justify-center">3</span>
                <h2 className="text-sm font-bold text-charcoal uppercase tracking-wider flex items-center gap-2">
                  <Coffee size={16} className="text-gold" />
                  Restauration & Petit Déjeuner
                </h2>
              </div>
              {form.includePdj && (
                <span className="px-2.5 py-1 rounded-full bg-gold/15 text-gold font-bold text-xs">
                  {pdjQty} Petit{pdjQty > 1 ? 's' : ''} déj. inclus
                </span>
              )}
            </div>

            <div className="space-y-4">
              <label className="flex items-start gap-3 p-3.5 rounded-lg border border-gray-200 bg-surface/40 hover:bg-surface cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={form.includePdj}
                  onChange={e => set('includePdj', e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-green focus:ring-green border-gray-300"
                />
                <div>
                  <span className="font-bold text-charcoal text-sm block">Ajouter la formule Petit Déjeuner</span>
                  <span className="text-xs text-gray-500">
                    Calculé automatiquement pour chaque personne hébergée ({totalPax} pers.) sur l'ensemble du séjour ({nights || 1} nuit{nights > 1 ? 's' : ''}).
                  </span>
                </div>
              </label>

              {form.includePdj && (
                <div className="bg-gold/5 border border-gold/20 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded-lg border border-gold/20">
                      <div className="text-[10px] font-bold text-gray-400 uppercase">Personnes hébergées</div>
                      <div className="text-sm font-extrabold text-charcoal mt-0.5">{totalPax} pers.</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gold/20">
                      <div className="text-[10px] font-bold text-gray-400 uppercase">Quantité Totale</div>
                      <div className="text-sm font-extrabold text-green-dark mt-0.5">
                        {totalPax} pers × {nights || 1} n = <span className="text-gold">{pdjQty} PDJ</span>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gold/20">
                      <div className="text-[10px] font-bold text-gray-400 uppercase">Prix unitaire (ajustable)</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <input
                          type="number"
                          min="0"
                          step="500"
                          value={form.pdjUnitPrice}
                          onChange={e => set('pdjUnitPrice', e.target.value)}
                          className="w-24 border border-gray-200 rounded px-2 py-0.5 text-xs font-bold text-charcoal focus:ring-1 focus:ring-green"
                        />
                        <span className="text-xs font-bold text-gray-500">FCFA</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-gold/20">
                    <span className="text-gray-600 font-medium">Montant total Petit Déjeuner :</span>
                    <span className="text-sm font-black text-gold">{totalPdjCost.toLocaleString('fr')} FCFA</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── ÉTAPE 4 : LOGEMENT, CLIENT & DÉTAILS ── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-green text-white text-xs font-bold flex items-center justify-center">4</span>
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
                    if (form.clientId) setForm(prev => ({ ...prev, clientId: 0, clientLabel: '' }));
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
                <div className="flex items-center gap-1.5 text-xs text-green font-bold bg-green/10 px-3 py-1 rounded-md w-fit">
                  <CheckCircle2 size={13} /> {form.clientLabel}
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

                {form.includePdj && (
                  <div className="flex justify-between items-center py-1.5 text-gold">
                    <span>Petit Déjeuner ({pdjQty} repas @ {Number(form.pdjUnitPrice).toLocaleString('fr')} FCFA)</span>
                    <span className="font-bold">+{totalPdjCost.toLocaleString('fr')} FCFA</span>
                  </div>
                )}

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
