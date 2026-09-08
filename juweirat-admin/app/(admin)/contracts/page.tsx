'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { companies, companyContracts } from '@/lib/api';
import type { CompanyContractDto, CompanyDto, PagedResult } from '@/lib/types';
import {
  Plus, Search, FileSignature, Eye, ChevronLeft, ChevronRight,
  Building2, BedDouble, CalendarDays, Users, XCircle, CheckCircle2,
} from 'lucide-react';

const PAGE_SIZE_DEFAULT = 10;
const STATUS_FILTERS: Array<{ value: '' | 'Active' | 'Ended' | 'Cancelled'; label: string }> = [
  { value: '',          label: 'Tous statuts' },
  { value: 'Active',    label: 'Actifs' },
  { value: 'Ended',     label: 'Terminés' },
  { value: 'Cancelled', label: 'Annulés' },
];

export default function ContractsPage() {
  const router = useRouter();

  const [page, setPage]                 = useState<PagedResult<CompanyContractDto> | null>(null);
  const [pageNumber, setPageNumber]     = useState(1);
  const [pageSize, setPageSize]         = useState(PAGE_SIZE_DEFAULT);
  const [statusFilter, setStatusFilter] = useState<'' | 'Active' | 'Ended' | 'Cancelled'>('');
  const [companyId, setCompanyId]       = useState<number | ''>('');
  const [activeOnly, setActiveOnly]     = useState(false);

  const [loading, setLoading]           = useState(true);
  const [loadError, setLoadError]       = useState('');
  const [companyList, setCompanyList]   = useState<CompanyDto[]>([]);
  const [rowError, setRowError]         = useState('');

  // Charger la liste des compagnies pour le filtre dropdown.
  useEffect(() => {
    companies.getAll().then(setCompanyList).catch(() => setCompanyList([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await companyContracts.getPaged({
        pageNumber, pageSize,
        sortBy: 'StartDate',
        isDescending: true,
        companyId: companyId || undefined,
        status: statusFilter || undefined,
        activeOn: activeOnly || undefined,
      });
      setPage(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLoadError(msg === 'Failed to fetch' ? "Impossible de joindre l'API. Vérifiez que le backend est démarré." : msg);
      setPage(null);
    } finally {
      setLoading(false);
    }
  }, [pageNumber, pageSize, statusFilter, companyId, activeOnly]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  // Reset page à 1 quand un filtre change.
  useEffect(() => { setPageNumber(1); }, [statusFilter, companyId, activeOnly, pageSize]);

  const items      = page?.items ?? [];
  const totalPages = page?.totalPages ?? 0;
  const totalCount = page?.totalCount ?? 0;

  const rangeLabel = useMemo(() => {
    if (!page || totalCount === 0) return '0 résultat';
    const from = (page.pageNumber - 1) * page.pageSize + 1;
    const to   = Math.min(page.pageNumber * page.pageSize, page.totalCount);
    return `${from}–${to} sur ${page.totalCount}`;
  }, [page, totalCount]);

  async function handleEnd(c: CompanyContractDto) {
    if (!confirm(`Terminer le contrat ${c.reference} aujourd'hui ?`)) return;
    setRowError('');
    try {
      await companyContracts.end(c.id);
      await load();
    } catch (err) {
      setRowError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleCancel(c: CompanyContractDto) {
    if (!confirm(`Annuler le contrat ${c.reference} ? Cette action n'est possible que si aucun occupant n'y a séjourné.`)) return;
    setRowError('');
    try {
      await companyContracts.cancel(c.id);
      await load();
    } catch (err) {
      setRowError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Contrats compagnies" />
      <div className="flex-1 p-6 space-y-4">

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={companyId}
            onChange={e => setCompanyId(e.target.value ? Number(e.target.value) : '')}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40 min-w-[220px]"
          >
            <option value="">Toutes compagnies</option>
            {companyList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40"
          >
            {STATUS_FILTERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-600 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={e => setActiveOnly(e.target.checked)}
              className="rounded border-gray-300 text-green-dark focus:ring-green/30"
            />
            Actifs aujourd'hui uniquement
          </label>

          <Link
            href="/contracts/new"
            className="flex items-center gap-2 bg-charcoal text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-charcoal-800 transition-colors ml-auto"
          >
            <Plus size={15} /> Nouveau contrat
          </Link>
        </div>

        {(loadError || rowError) && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {loadError || rowError}
          </div>
        )}

        {/* Table */}
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
                    <th className="px-5 py-3.5 text-left font-medium">Référence</th>
                    <th className="px-5 py-3.5 text-left font-medium">Compagnie</th>
                    <th className="px-5 py-3.5 text-left font-medium">Chambre</th>
                    <th className="px-5 py-3.5 text-left font-medium">Période</th>
                    <th className="px-5 py-3.5 text-right font-medium">Loyer / mois</th>
                    <th className="px-5 py-3.5 text-right font-medium">Occupants</th>
                    <th className="px-5 py-3.5 text-left font-medium">Statut</th>
                    <th className="px-5 py-3.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <FileSignature size={14} className="text-gray-400 shrink-0" />
                          <span className="font-mono text-xs font-semibold text-charcoal">{c.reference}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-charcoal">{c.companyName}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-charcoal">
                          <BedDouble size={13} className="text-gray-400" />
                          <span className="font-semibold">{c.roomNumber}</span>
                          {c.roomNameFr && <span className="text-gray-400 text-xs">· {c.roomNameFr}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-charcoal">
                        <div className="flex items-center gap-1.5 text-xs">
                          <CalendarDays size={13} className="text-gray-400" />
                          <span>{formatDate(c.startDate)} → {formatDate(c.endDate)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-charcoal">
                        {formatMoney(c.monthlyRate)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1 text-gray-500">
                          <Users size={13} />
                          <span>{c.occupantCount}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => router.push(`/contracts/${c.id}`)}
                            title="Détails"
                            className="p-1.5 text-gray-400 hover:text-charcoal hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                          {c.status === 'Active' && (
                            <>
                              <button
                                onClick={() => handleEnd(c)}
                                title="Terminer aujourd'hui"
                                className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              >
                                <CheckCircle2 size={15} />
                              </button>
                              <button
                                onClick={() => handleCancel(c)}
                                title="Annuler"
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <XCircle size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-gray-400 text-sm">
                        <div className="flex flex-col items-center gap-2">
                          <Building2 size={24} className="text-gray-300" />
                          Aucun contrat trouvé.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && page && totalCount > 0 && (
            <div className="flex items-center justify-between gap-4 px-5 py-3 border-t border-gray-100 text-xs text-gray-500 flex-wrap">
              <div className="flex items-center gap-3">
                <span>{rangeLabel}</span>
                <label className="flex items-center gap-1.5">
                  <span className="text-gray-400">Par page :</span>
                  <select
                    value={pageSize}
                    onChange={e => setPageSize(Number(e.target.value))}
                    className="border border-gray-200 rounded px-1.5 py-0.5 bg-white text-charcoal focus:outline-none focus:ring-1 focus:ring-green/30"
                  >
                    {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled={!page.hasPreviousPage}
                  onClick={() => setPageNumber(n => Math.max(1, n - 1))}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="px-2 font-medium text-charcoal">
                  Page {page.pageNumber} / {totalPages}
                </span>
                <button
                  disabled={!page.hasNextPage}
                  onClick={() => setPageNumber(n => Math.min(totalPages, n + 1))}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Active:    'bg-green/20 text-green-dark',
    Ended:     'bg-charcoal/10 text-charcoal/70',
    Cancelled: 'bg-red-100 text-red-700',
  };
  const label: Record<string, string> = {
    Active: 'Actif', Ended: 'Terminé', Cancelled: 'Annulé',
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {label[status] ?? status}
    </span>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n) + ' F';
}
