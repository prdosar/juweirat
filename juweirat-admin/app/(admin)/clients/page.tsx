'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { clients } from '@/lib/api';
import type { ClientDto } from '@/lib/types';
import { Plus, Search, Phone, Mail } from 'lucide-react';

export default function ClientsPage() {
  const [list, setList]       = useState<ClientDto[]>([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback((q: string) => {
    setLoading(true);
    clients.getAll(q || undefined).then(setList).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(''); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Clients" />
      <div className="flex-1 p-6 space-y-4">

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Nom, email, téléphone…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40 bg-white"
            />
          </div>
          <Link
            href="/clients/new"
            className="flex items-center gap-2 bg-charcoal text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-charcoal-800 transition-colors ml-auto"
          >
            <Plus size={15} /> Nouveau client
          </Link>
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 border-2 border-green/30 border-t-green rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {list.map(client => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-green/20 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-charcoal flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-white">
                      {client.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-charcoal truncate group-hover:text-green-dark transition-colors">{client.fullName}</p>
                    {client.nationality && (
                      <p className="text-xs text-gray-400 mt-0.5">{client.nationality}</p>
                    )}
                    <div className="mt-2 space-y-1">
                      {client.email && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Mail size={11} className="text-gray-400" /> {client.email}
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Phone size={11} className="text-gray-400" /> {client.phone}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-lg font-bold text-charcoal">{client.totalReservations}</span>
                    <p className="text-[10px] text-gray-400 mt-0.5">résas</p>
                  </div>
                </div>
              </Link>
            ))}
            {list.length === 0 && (
              <div className="col-span-3 py-16 text-center text-gray-400 text-sm">
                Aucun client trouvé
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
