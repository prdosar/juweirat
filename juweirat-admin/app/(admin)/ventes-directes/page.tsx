'use client';

import { useEffect, useRef, useState } from 'react';
import Header from '@/components/Header';
import { clients, prestations, ventesDirectes } from '@/lib/api';
import type { ClientDto, FolioActifDto, PrestationAnnexeDto, VenteDirecteDto } from '@/lib/types';
import { Search, CheckCircle2, BedDouble, ShoppingBag, Banknote, CreditCard, Smartphone, Building, Printer } from 'lucide-react';
import { printVenteDirecte } from '@/lib/printReceipt';

const PAY_METHODS = [
  { value: 'Espèces',       icon: Banknote,    label: 'Espèces'       },
  { value: 'Carte bancaire', icon: CreditCard,  label: 'Carte'         },
  { value: 'Mobile Money',  icon: Smartphone,  label: 'Mobile Money'  },
  { value: 'Virement',      icon: Building,    label: 'Virement'      },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });
}

export default function VentesDirectesPage() {
  // ── Catalogue & historique ─────────────────────────────────────────────────
  const [prestationList, setPrestationList] = useState<PrestationAnnexeDto[]>([]);
  const [history, setHistory]               = useState<VenteDirecteDto[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // ── Sélection prestation ───────────────────────────────────────────────────
  const [selectedPrestation, setSelectedPrestation] = useState<PrestationAnnexeDto | null>(null);
  const [quantite, setQuantite]                     = useState(1);

  // ── Client ────────────────────────────────────────────────────────────────
  const [clientSearch, setClientSearch]   = useState('');
  const [clientList, setClientList]       = useState<ClientDto[]>([]);
  const [showDrop, setShowDrop]           = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientDto | null>(null);
  const [clientNomLibre, setClientNomLibre] = useState('');
  const dropRef = useRef<HTMLDivElement>(null);

  // ── Folio actif (sur chambre) ──────────────────────────────────────────────
  const [folioActif, setFolioActif]   = useState<FolioActifDto | null>(null);
  const [checkingFolio, setCheckingFolio] = useState(false);

  // ── Mode & paiement ────────────────────────────────────────────────────────
  const [mode, setMode]                   = useState<'Encaissement' | 'SurChambre'>('Encaissement');
  const [paymentMethod, setPaymentMethod] = useState('Espèces');
  const [notes, setNotes]                 = useState('');

  // ── Soumission ─────────────────────────────────────────────────────────────
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [lastVente, setLastVente] = useState<VenteDirecteDto | null>(null);

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const data = await ventesDirectes.getAll(todayIso());
      setHistory(data);
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    prestations.getAll(true).then(setPrestationList);
    loadHistory();
  }, []);

  // Client search debounce
  useEffect(() => {
    if (!clientSearch.trim()) { setClientList([]); return; }
    const t = setTimeout(() => {
      clients.getAll(clientSearch).then(data => setClientList(data.slice(0, 6)));
    }, 250);
    return () => clearTimeout(t);
  }, [clientSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Check folio actif when client selected
  async function selectClient(c: ClientDto) {
    setSelectedClient(c);
    setClientSearch(c.fullName);
    setShowDrop(false);
    setClientNomLibre('');
    setFolioActif(null);
    setMode('Encaissement');
    setCheckingFolio(true);
    try {
      const folio = await ventesDirectes.getFolioActif(c.id);
      setFolioActif(folio);
    } catch {
      setFolioActif(null);
    } finally {
      setCheckingFolio(false);
    }
  }

  function clearClient() {
    setSelectedClient(null);
    setClientSearch('');
    setClientList([]);
    setFolioActif(null);
    setMode('Encaissement');
  }

  const total = selectedPrestation ? selectedPrestation.prixSeule * quantite : 0;

  function reset() {
    setSelectedPrestation(null);
    setQuantite(1);
    setNotes('');
    setError('');
    // keep client + mode between sales (quicker for multiple sales to same client)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPrestation) { setError('Veuillez sélectionner une prestation.'); return; }
    if (mode === 'SurChambre' && !folioActif) { setError('Aucun folio actif trouvé pour ce client.'); return; }

    setSaving(true);
    setError('');
    setLastVente(null);
    try {
      const vente = await ventesDirectes.create({
        prestationId:  selectedPrestation.id,
        quantite,
        clientId:      selectedClient?.id,
        clientNom:     !selectedClient && clientNomLibre.trim() ? clientNomLibre.trim() : undefined,
        folioId:       mode === 'SurChambre' ? folioActif?.folioId : undefined,
        mode,
        paymentMethod: mode === 'Encaissement' ? paymentMethod : undefined,
        notes:         notes.trim() || undefined,
      });
      setLastVente(vente);
      reset();
      await loadHistory();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  const todayTotal = history.filter(v => v.mode === 'Encaissement').reduce((s, v) => s + v.total, 0);
  const todaySurChambre = history.filter(v => v.mode === 'SurChambre').reduce((s, v) => s + v.total, 0);

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Vente Directe de Prestation" />

      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full">

          {/* ── Formulaire POS (col 1-3) ─────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
            )}

            {/* Succès + impression */}
            {lastVente && (
              <div className="bg-green/10 border border-green/30 rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-green-dark text-sm font-medium">
                  <CheckCircle2 size={18} className="shrink-0" />
                  <span>
                    <strong>{lastVente.prestationNameFr}</strong> × {lastVente.quantite} —{' '}
                    <strong>{lastVente.total.toLocaleString('fr')} FCFA</strong> enregistrée
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => printVenteDirecte(lastVente)}
                  className="flex items-center gap-1.5 bg-charcoal text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-charcoal/90 transition-colors shrink-0"
                >
                  <Printer size={14} /> Imprimer le reçu
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* ── Sélection prestation ─────────────────────────────────────── */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <ShoppingBag size={14} /> Prestation
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {prestationList.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setSelectedPrestation(p); setQuantite(1); setError(''); setLastVente(null); }}
                      className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all ${
                        selectedPrestation?.id === p.id
                          ? 'border-gold bg-gold/5'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <span className="text-sm font-bold text-charcoal leading-tight">{p.nameFr}</span>
                      <span className="text-xs text-gold font-semibold mt-1">{p.prixSeule.toLocaleString('fr')} FCFA</span>
                      <span className="text-[10px] text-gray-400 mt-0.5">
                        {p.mode === 'ParPersonneParNuit' ? '/pers./nuit'
                         : p.mode === 'ParPersonne' ? '/personne'
                         : 'forfait'}
                      </span>
                    </button>
                  ))}
                  {prestationList.length === 0 && (
                    <p className="col-span-3 text-sm text-gray-400 italic">
                      Aucune prestation active. Configurez-en depuis <strong>Prestations Annexes</strong>.
                    </p>
                  )}
                </div>

                {selectedPrestation && (
                  <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Quantité</label>
                      <input
                        type="number" min="1" max="999"
                        value={quantite}
                        onChange={e => setQuantite(Math.max(1, Number(e.target.value)))}
                        className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-center focus:ring-2 focus:ring-gold/20 focus:border-gold"
                      />
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-xs text-gray-400">Sous-total</p>
                      <p className="text-2xl font-black text-gold">{total.toLocaleString('fr')} <span className="text-sm font-bold">FCFA</span></p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Client (optionnel) ───────────────────────────────────────── */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Client <span className="text-gray-300 font-normal normal-case tracking-normal">(optionnel)</span>
                </h2>

                {!selectedClient ? (
                  <div className="space-y-3">
                    {/* Recherche client existant */}
                    <div ref={dropRef} className="relative">
                      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={clientSearch}
                        onChange={e => { setClientSearch(e.target.value); setShowDrop(true); }}
                        onFocus={() => setShowDrop(true)}
                        placeholder="Rechercher un client existant…"
                        className="w-full border border-gray-200 rounded-lg pl-9 pr-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green/20 focus:border-green"
                      />
                      {showDrop && clientList.length > 0 && (
                        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto divide-y divide-gray-50">
                          {clientList.map(c => (
                            <button key={c.id} type="button" onMouseDown={() => selectClient(c)}
                              className="w-full text-left px-4 py-2.5 hover:bg-green/5 text-sm flex justify-between">
                              <span className="font-medium text-charcoal">{c.fullName}</span>
                              <span className="text-xs text-gray-400">{c.phone || c.email}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* OU nom libre */}
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-gray-100" />
                      <span className="text-xs text-gray-400">ou</span>
                      <div className="h-px flex-1 bg-gray-100" />
                    </div>
                    <input
                      value={clientNomLibre}
                      onChange={e => { setClientNomLibre(e.target.value); setClientSearch(''); }}
                      placeholder="Entrer un nom (walk-in)…"
                      className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green/20 focus:border-green"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-green-dark bg-green/10 px-3 py-2 rounded-lg">
                      <CheckCircle2 size={15} />
                      {selectedClient.fullName}
                      {selectedClient.phone && <span className="text-xs text-gray-400 ml-1">{selectedClient.phone}</span>}
                    </div>
                    <button type="button" onClick={clearClient}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                      Changer
                    </button>
                  </div>
                )}

                {/* Indicateur folio actif */}
                {checkingFolio && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <div className="w-3 h-3 border border-gray-300 border-t-green rounded-full animate-spin" />
                    Vérification chambre en cours…
                  </div>
                )}
                {folioActif && !checkingFolio && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
                      <BedDouble size={14} />
                      Client actuellement en chambre {folioActif.roomNumber} — Folio {folioActif.folioNumber}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setMode('Encaissement')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                          mode === 'Encaissement' ? 'border-green bg-green/10 text-green-dark' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}>
                        Encaisser maintenant
                      </button>
                      <button type="button" onClick={() => setMode('SurChambre')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                          mode === 'SurChambre' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}>
                        Facturer sur la chambre
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Mode paiement (Encaissement uniquement) ──────────────────── */}
              {mode === 'Encaissement' && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mode de paiement</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PAY_METHODS.map(({ value, icon: Icon, label }) => (
                      <button key={value} type="button" onClick={() => setPaymentMethod(value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-bold transition-all ${
                          paymentMethod === value
                            ? 'border-green bg-green/5 text-green-dark'
                            : 'border-gray-100 text-gray-500 hover:border-gray-200'
                        }`}>
                        <Icon size={18} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Notes ────────────────────────────────────────────────────── */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <input
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Note (optionnel)…"
                  className="w-full text-sm text-gray-600 placeholder-gray-300 bg-transparent focus:outline-none"
                />
              </div>

              {/* ── Bouton valider ────────────────────────────────────────────── */}
              <button
                type="submit"
                disabled={saving || !selectedPrestation}
                className="w-full bg-gold text-white font-black py-4 rounded-xl text-base hover:bg-gold/90 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                {saving ? 'Enregistrement…' : (
                  mode === 'SurChambre'
                    ? `Facturer sur chambre ${folioActif?.roomNumber} — ${total.toLocaleString('fr')} FCFA`
                    : `Encaisser ${total.toLocaleString('fr')} FCFA`
                )}
              </button>

            </form>
          </div>

          {/* ── Historique du jour (col 4-5) ──────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ventes du jour</h2>

              {/* Totaux rapides */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-green/5 rounded-lg p-3">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Encaissé</p>
                  <p className="text-base font-black text-green-dark">{todayTotal.toLocaleString('fr')}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Sur chambre</p>
                  <p className="text-base font-black text-blue-700">{todaySurChambre.toLocaleString('fr')}</p>
                </div>
              </div>

              {/* Liste */}
              {loadingHistory ? (
                <div className="flex justify-center py-6">
                  <div className="w-5 h-5 border-2 border-green/30 border-t-green rounded-full animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Aucune vente aujourd'hui</p>
              ) : (
                <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto">
                  {history.map(v => (
                    <div key={v.id} className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        v.mode === 'SurChambre' ? 'bg-blue-400' : 'bg-green'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-sm font-semibold text-charcoal truncate">{v.prestationNameFr}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-sm font-bold text-charcoal">{v.total.toLocaleString('fr')}</span>
                            <button
                              onClick={() => printVenteDirecte(v)}
                              title="Imprimer le reçu"
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-charcoal hover:bg-gray-200 rounded transition-all"
                            >
                              <Printer size={13} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                          <span>{fmtTime(v.createdAt)}</span>
                          {v.clientNom && <span>· {v.clientNom}</span>}
                          {v.mode === 'SurChambre' && v.roomNumber && (
                            <span className="text-blue-500">· Ch. {v.roomNumber}</span>
                          )}
                          {v.mode === 'Encaissement' && v.paymentMethod && (
                            <span>· {v.paymentMethod}</span>
                          )}
                          <span>× {v.quantite}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
