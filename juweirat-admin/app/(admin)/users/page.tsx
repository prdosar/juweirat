'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { users } from '@/lib/api';
import { getUser } from '@/lib/auth';
import type { UserDto, UserRole } from '@/lib/types';
import { Plus, PencilLine, X, ShieldCheck, User as UserIcon, Calculator } from 'lucide-react';

const ROLE_LABELS: Record<UserRole, string> = {
  admin:       'Administrateur',
  utilisateur: 'Utilisateur',
  comptable:   'Comptable',
};

const ROLE_STYLE: Record<UserRole, string> = {
  admin:       'bg-red-100 text-red-700 border border-red-200',
  utilisateur: 'bg-blue-100 text-blue-700 border border-blue-200',
  comptable:   'bg-amber-100 text-amber-700 border border-amber-200',
};

const ROLE_ICON: Record<UserRole, React.ComponentType<{ size?: number }>> = {
  admin:       ShieldCheck,
  utilisateur: UserIcon,
  comptable:   Calculator,
};

export default function UsersPage() {
  const router = useRouter();
  const [items, setItems] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [modalTarget, setModalTarget] = useState<UserDto | 'new' | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const list = await users.getAll(true);
      setItems(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // 403 côté serveur → renvoie "HTTP 403" via l'API helper
      if (msg.includes('403')) {
        setAccessDenied(true);
      } else {
        setLoadError(msg === 'Failed to fetch' ? "Impossible de joindre l'API." : msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Garde-fou côté client — évite l'appel API pour un rôle non-admin.
    const u = getUser();
    if (!u || u.role !== 'admin') {
      setAccessDenied(true);
      setLoading(false);
      return;
    }
    load();
  }, [load]);

  if (accessDenied) {
    return (
      <div className="flex flex-col min-h-full">
        <Header title="Utilisateurs" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <ShieldCheck size={22} className="text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-charcoal">Accès refusé</h2>
            <p className="text-sm text-gray-500">
              La gestion des utilisateurs est réservée aux administrateurs.
            </p>
            <button onClick={() => router.push('/dashboard')}
              className="mt-2 px-4 py-2 bg-charcoal text-white text-sm font-medium rounded-lg hover:bg-charcoal-800">
              Retour au tableau de bord
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Utilisateurs" />
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-charcoal">Gestion des utilisateurs</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Créez et modifiez les comptes qui accèdent au back-office.
            </p>
          </div>
          <button onClick={() => setModalTarget('new')}
            className="inline-flex items-center gap-2 bg-charcoal text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-charcoal-800">
            <Plus size={15} /> Nouvel utilisateur
          </button>
        </div>

        {loadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {loadError}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-5 h-5 border-2 border-green/30 border-t-green rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr className="text-[11px] text-gray-400 uppercase tracking-wider">
                    <th className="px-5 py-3.5 text-left font-medium">Utilisateur</th>
                    <th className="px-5 py-3.5 text-left font-medium">Email</th>
                    <th className="px-5 py-3.5 text-left font-medium">Rôle</th>
                    <th className="px-5 py-3.5 text-left font-medium">Statut</th>
                    <th className="px-5 py-3.5 text-left font-medium">Dernière connexion</th>
                    <th className="px-5 py-3.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map(u => {
                    const Icon = ROLE_ICON[u.role] ?? UserIcon;
                    return (
                      <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-charcoal text-white flex items-center justify-center shrink-0">
                              <span className="text-[11px] font-bold">
                                {u.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                              </span>
                            </div>
                            <div className="font-semibold text-charcoal">{u.fullName}</div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500">{u.email}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${ROLE_STYLE[u.role]}`}>
                            <Icon size={11} /> {ROLE_LABELS[u.role] ?? u.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {u.isActive ? (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green/20 text-green-dark border border-green/30">Actif</span>
                          ) : (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-charcoal/10 text-charcoal/60 border border-charcoal/10">Inactif</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 text-xs">
                          {u.lastLoginAt
                            ? new Date(u.lastLoginAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : <span className="text-gray-300">Jamais</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-end">
                            <button onClick={() => setModalTarget(u)} title="Modifier"
                              className="p-1.5 text-gray-400 hover:text-charcoal hover:bg-gray-100 rounded-lg transition-colors">
                              <PencilLine size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-gray-400 text-sm">
                        Aucun utilisateur.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalTarget && (
        <UserModal
          initial={modalTarget === 'new' ? null : modalTarget}
          onClose={() => setModalTarget(null)}
          onSaved={async () => { setModalTarget(null); await load(); }}
        />
      )}
    </div>
  );
}

function UserModal({
  initial, onClose, onSaved,
}: {
  initial: UserDto | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const isEdit = initial !== null;
  const [form, setForm] = useState({
    firstName: initial?.firstName ?? '',
    lastName:  initial?.lastName  ?? '',
    email:     initial?.email     ?? '',
    password:  '',
    role:      (initial?.role ?? 'utilisateur') as UserRole,
    isActive:  initial?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onEsc); document.body.style.overflow = ''; };
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim()) { setError('Prénom requis.'); return; }
    if (!form.lastName.trim())  { setError('Nom requis.'); return; }
    if (!form.email.trim())     { setError('Email requis.'); return; }
    if (!isEdit && form.password.length < 6) { setError('Mot de passe minimum 6 caractères.'); return; }
    if (isEdit && form.password.length > 0 && form.password.length < 6) { setError('Nouveau mot de passe minimum 6 caractères.'); return; }

    setSaving(true); setError('');
    try {
      if (isEdit && initial) {
        await users.update(initial.id, {
          firstName: form.firstName.trim(),
          lastName:  form.lastName.trim(),
          email:     form.email.trim(),
          role:      form.role,
          isActive:  form.isActive,
          ...(form.password ? { password: form.password } : {}),
        });
      } else {
        await users.create({
          firstName: form.firstName.trim(),
          lastName:  form.lastName.trim(),
          email:     form.email.trim(),
          password:  form.password,
          role:      form.role,
        });
      }
      await onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg === 'Failed to fetch' ? "Impossible de joindre l'API." : msg);
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40';
  const labelCls = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-charcoal">
              {isEdit ? `Modifier — ${initial?.fullName}` : 'Nouvel utilisateur'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {isEdit ? 'Modifier le compte utilisateur' : 'Créer un nouveau compte utilisateur'}
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-charcoal flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-auto">
          <div className="p-5 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">{error}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Prénom *</label>
                <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  placeholder="Marie" className={inputCls} autoFocus />
              </div>
              <div>
                <label className={labelCls}>Nom *</label>
                <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  placeholder="Dupont" className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Email *</label>
              <input type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="marie.dupont@juweirat.com" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>
                {isEdit ? 'Nouveau mot de passe (laisser vide pour conserver)' : 'Mot de passe * (minimum 6 caractères)'}
              </label>
              <input type="password" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder={isEdit ? '••••••••' : 'Minimum 6 caractères'}
                className={inputCls}
                autoComplete="new-password" />
            </div>

            <div>
              <label className={labelCls}>Rôle *</label>
              <select value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                className={inputCls}>
                <option value="utilisateur">Utilisateur — accès général au back-office</option>
                <option value="comptable">Comptable — accès général (permissions affinées ultérieurement)</option>
                <option value="admin">Administrateur — gestion complète y compris les utilisateurs</option>
              </select>
            </div>

            {isEdit && (
              <label className="flex items-center gap-2 pt-1">
                <input type="checkbox" checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  className="accent-green" />
                <span className="text-sm text-charcoal">Compte actif</span>
              </label>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-500 hover:text-charcoal">Annuler</button>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-charcoal text-white text-sm font-medium rounded-lg hover:bg-charcoal-800 disabled:opacity-60">
              {saving ? 'Enregistrement…' : (isEdit ? 'Mettre à jour' : 'Créer l\'utilisateur')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
