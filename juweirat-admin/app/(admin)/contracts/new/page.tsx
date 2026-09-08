'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { companies, companyContracts, rooms } from '@/lib/api';
import type { CompanyDto, RoomDto } from '@/lib/types';
import { ArrowLeft, FileSignature, Save, AlertTriangle } from 'lucide-react';

export default function NewContractPage() {
  const router = useRouter();

  const [companyList, setCompanyList] = useState<CompanyDto[]>([]);
  const [roomList,    setRoomList]    = useState<RoomDto[]>([]);

  const [form, setForm] = useState({
    companyId:   '' as number | '',
    roomId:      '' as number | '',
    startDate:   todayIso(),
    endDate:     addYearsIso(todayIso(), 1),
    monthlyRate: 500000,
    tvaExonere:  true,
    notes:       '',
  });

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    companies.getAll().then(setCompanyList).catch(() => setCompanyList([]));
    rooms.getAll().then(setRoomList).catch(() => setRoomList([]));
  }, []);

  const selectedRoom = useMemo(
    () => roomList.find(r => r.id === form.roomId) ?? null,
    [roomList, form.roomId],
  );

  // Signal (avertissement) : la chambre choisie a déjà un contrat actif visible ;
  // le backend refusera si les périodes se chevauchent. On informe l'utilisateur
  // dès la sélection.
  const roomContractWarning = useMemo(() => {
    if (!selectedRoom?.currentContract) return null;
    return `Cette chambre est déjà sous contrat ${selectedRoom.currentContract.reference} (${selectedRoom.currentContract.companyName}) jusqu'au ${formatDate(selectedRoom.currentContract.endDate)}.`;
  }, [selectedRoom]);

  const canSubmit =
    form.companyId !== '' &&
    form.roomId !== '' &&
    form.startDate !== '' &&
    form.endDate !== '' &&
    form.endDate > form.startDate &&
    form.monthlyRate >= 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      setError('Champs requis manquants ou dates invalides.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const dto = await companyContracts.create({
        companyId:   Number(form.companyId),
        roomId:      Number(form.roomId),
        startDate:   form.startDate,
        endDate:     form.endDate,
        monthlyRate: form.monthlyRate,
        tvaExonere:  form.tvaExonere,
        notes:       form.notes || undefined,
      });
      router.push(`/contracts/${dto.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg === 'Failed to fetch' ? "Impossible de joindre l'API. Vérifiez que le backend est démarré." : msg);
      setSaving(false);
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40';
  const labelCls = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5';

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Nouveau contrat compagnie" />
      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/contracts"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-charcoal mb-4 transition-colors"
          >
            <ArrowLeft size={14} /> Retour aux contrats
          </Link>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
              <div className="w-9 h-9 rounded-lg bg-green/15 flex items-center justify-center">
                <FileSignature size={16} className="text-green-dark" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-charcoal">Nouveau contrat</h2>
                <p className="text-xs text-gray-400">Louer une chambre à une compagnie sur une longue période</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className={labelCls}>Compagnie *</label>
                <select
                  value={form.companyId}
                  onChange={e => setForm(f => ({ ...f, companyId: e.target.value ? Number(e.target.value) : '' }))}
                  className={inputCls}
                  autoFocus
                >
                  <option value="">— Sélectionner —</option>
                  {companyList.filter(c => c.isActive).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Chambre *</label>
                <select
                  value={form.roomId}
                  onChange={e => setForm(f => ({ ...f, roomId: e.target.value ? Number(e.target.value) : '' }))}
                  className={inputCls}
                >
                  <option value="">— Sélectionner —</option>
                  {roomList.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.roomNumber} · {r.nameFr}
                    </option>
                  ))}
                </select>
                {roomContractWarning && (
                  <p className="mt-2 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-md px-2.5 py-1.5 flex items-start gap-1.5">
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                    <span>{roomContractWarning}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Date de début *</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Date de fin *</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Loyer mensuel (FCFA) *</label>
                <input
                  type="number"
                  min={0}
                  step={5000}
                  value={form.monthlyRate}
                  onChange={e => setForm(f => ({ ...f, monthlyRate: Number(e.target.value) }))}
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Ce montant sera facturé chaque mois à la compagnie, indépendamment des occupants.
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm text-charcoal">
                <input
                  type="checkbox"
                  checked={form.tvaExonere}
                  onChange={e => setForm(f => ({ ...f, tvaExonere: e.target.checked }))}
                  className="rounded border-gray-300 text-green-dark focus:ring-green/30"
                />
                Exonération TVA sur les factures mensuelles
              </label>

              <div>
                <label className={labelCls}>Notes internes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="N° de contrat papier, référence négociation, conditions particulières…"
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Link
                  href="/contracts"
                  className="px-4 py-2 text-sm text-gray-500 hover:text-charcoal transition-colors"
                >
                  Annuler
                </Link>
                <button
                  type="submit"
                  disabled={saving || !canSubmit}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-charcoal text-white text-sm font-medium rounded-lg hover:bg-charcoal-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save size={14} />
                  {saving ? 'Création…' : 'Créer le contrat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addYearsIso(iso: string, years: number): string {
  const d = new Date(iso);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
