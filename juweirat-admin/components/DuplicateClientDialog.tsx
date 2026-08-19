'use client';

import type { ClientDto } from '@/lib/types';

interface Props {
  duplicates: ClientDto[];
  firstName: string;
  lastName:  string;
  saving?:   boolean;
  onCancel:  () => void;
  onConfirm: () => void;
}

/**
 * Alerte de confirmation lorsqu'on tente de créer un client dont le nom exact
 * existe déjà dans la base. L'utilisateur doit explicitement cliquer sur
 * « Créer quand même » pour passer outre.
 */
export default function DuplicateClientDialog({
  duplicates, firstName, lastName, saving, onCancel, onConfirm,
}: Props) {
  if (duplicates.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
            <span className="text-amber-600 font-bold">⚠</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-charcoal">Homonyme détecté</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {duplicates.length === 1 ? 'Un client' : `${duplicates.length} clients`} porte{duplicates.length > 1 ? 'nt' : ''} déjà ce nom
            </p>
          </div>
        </div>

        <div className="p-5 space-y-3 text-sm">
          <p className="text-charcoal">
            Un client nommé <b>{firstName.trim()} {lastName.trim()}</b> existe déjà dans la base.
            Voulez-vous vraiment en créer un second ?
          </p>
          <div className="border border-gray-100 rounded-lg divide-y divide-gray-50 max-h-40 overflow-auto">
            {duplicates.map(d => (
              <div key={d.id} className="flex items-center justify-between gap-2 p-2.5 text-xs">
                <div className="min-w-0">
                  <div className="font-semibold text-charcoal">{d.fullName}</div>
                  <div className="text-gray-400 truncate">
                    {d.email ?? d.phone ?? `#${d.id}`}
                    {d.companyName && ` · 🏢 ${d.companyName}`}
                  </div>
                </div>
                <span className="text-gray-400 shrink-0">
                  {d.totalReservations} résa{d.totalReservations > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <button type="button" onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-500 hover:text-charcoal transition-colors">
            Annuler
          </button>
          <button type="button" disabled={saving} onClick={onConfirm}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-60">
            {saving ? 'Création…' : 'Créer quand même'}
          </button>
        </div>
      </div>
    </div>
  );
}
