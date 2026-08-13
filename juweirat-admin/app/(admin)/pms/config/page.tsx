'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { pmsConfig } from '@/lib/pms';
import type { HotelConfigDto } from '@/lib/pmsTypes';

export default function PmsConfigPage() {
  const [config, setConfig]   = useState<HotelConfigDto | null>(null);
  const [form, setForm]       = useState({ buildingName: '', ownerName: '', city: '', currencyCode: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    pmsConfig.get().then(c => {
      setConfig(c);
      setForm({ buildingName: c.buildingName, ownerName: c.ownerName, city: c.city, currencyCode: c.currencyCode });
      setLoading(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(''); setSaved(false);
    try {
      const updated = await pmsConfig.update(form);
      setConfig(updated); setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  }

  if (loading) return (
    <div className="flex flex-col h-full">
      <Header title="Config PMS" />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-green/30 border-t-green rounded-full animate-spin" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Config PMS" />
      <div className="flex-1 p-6 max-w-xl space-y-5">

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}
        {saved  && <div className="bg-green/10 border border-green/25 text-green-dark text-sm px-4 py-3 rounded-lg">Configuration enregistrée.</div>}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Informations hôtel</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nom de l'établissement</label>
              <input value={form.buildingName} onChange={e => setForm(f => ({ ...f, buildingName: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green/30" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Propriétaire / Exploitant</label>
              <input value={form.ownerName} onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green/30" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ville</label>
              <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green/30" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Devise</label>
              <input value={form.currencyCode} onChange={e => setForm(f => ({ ...f, currencyCode: e.target.value }))}
                placeholder="FCFA"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green/30" />
            </div>
            <button type="submit" disabled={busy}
              className="bg-charcoal text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50">
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </form>
        </div>

        {/* Read-only counters */}
        {config && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Séquences & date hôtel</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Date hôtel courante</span>
                <span className="font-mono font-semibold text-charcoal">{config.dateHotel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Prochain n° folio</span>
                <span className="font-mono text-charcoal">FL-{new Date(config.dateHotel).getFullYear()}-{String(config.resaSeq + 1).padStart(4, '0')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Prochain n° facture</span>
                <span className="font-mono text-charcoal">FAC-{new Date(config.dateHotel).getFullYear()}-{String(config.factureSeq + 1).padStart(4, '0')}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400">La date hôtel avance automatiquement lors de la clôture journalière.</p>
          </div>
        )}
      </div>
    </div>
  );
}
