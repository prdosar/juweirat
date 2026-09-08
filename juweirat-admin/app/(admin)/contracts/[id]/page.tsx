'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { companyContracts, contractInvoices as contractInvoicesApi } from '@/lib/api';
import type { CompanyContractDetailDto, ContractInvoiceDto, ContractOccupantDto } from '@/lib/types';
import {
  ArrowLeft, FileSignature, Building2, BedDouble, CalendarDays,
  Users, Plus, CheckCircle2, XCircle, Pencil, Save, X, Receipt,
  Loader2, AlertCircle,
} from 'lucide-react';

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const contractId = Number(id);
  const router = useRouter();

  const [contract, setContract] = useState<CompanyContractDetailDto | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState('');
  const [editing, setEditing]   = useState(false);
  const [busy,    setBusy]      = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const dto = await companyContracts.getById(contractId);
      setContract(dto);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setContract(null);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => { void load(); }, [load]);

  async function handleEnd() {
    if (!contract) return;
    if (!confirm(`Terminer le contrat ${contract.reference} aujourd'hui ?`)) return;
    setBusy(true);
    try {
      await companyContracts.end(contract.id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!contract) return;
    if (!confirm(`Annuler le contrat ${contract.reference} ?`)) return;
    setBusy(true);
    try {
      await companyContracts.cancel(contract.id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Contrat" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-green/30 border-t-green rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Contrat" />
        <div className="flex-1 p-6">
          <Link href="/contracts" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-charcoal mb-4">
            <ArrowLeft size={14} /> Retour
          </Link>
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error || 'Contrat introuvable.'}
          </div>
        </div>
      </div>
    );
  }

  const isActive = contract.status === 'Active';

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title={`Contrat ${contract.reference}`} />
      <div className="flex-1 p-6 space-y-4 max-w-5xl">
        <Link href="/contracts" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-charcoal transition-colors">
          <ArrowLeft size={14} /> Retour aux contrats
        </Link>

        {/* Bandeau infos */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-100">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-lg bg-green/15 flex items-center justify-center">
                <FileSignature size={18} className="text-green-dark" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-charcoal">{contract.reference}</h2>
                  <StatusBadge status={contract.status} />
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  Créé le {formatDate(contract.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isActive && !editing && (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-charcoal bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <Pencil size={13} /> Éditer
                  </button>
                  <button
                    onClick={handleEnd}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors disabled:opacity-40"
                  >
                    <CheckCircle2 size={13} /> Terminer
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-40"
                  >
                    <XCircle size={13} /> Annuler
                  </button>
                </>
              )}
            </div>
          </div>

          {editing ? (
            <EditForm contract={contract} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await load(); }} />
          ) : (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <InfoRow icon={Building2} label="Compagnie" value={contract.companyName} link={`/companies/${contract.companyId}`} />
              <InfoRow icon={BedDouble} label="Chambre" value={`${contract.roomNumber}${contract.roomNameFr ? ' · ' + contract.roomNameFr : ''}`} link={`/rooms`} />
              <InfoRow icon={CalendarDays} label="Période" value={`${formatDate(contract.startDate)} → ${formatDate(contract.endDate)}`} />
              <InfoRow icon={Receipt} label="Loyer mensuel" value={`${formatMoney(contract.monthlyRate)}${contract.tvaExonere ? ' · TVA exonérée' : ''}`} />
              {contract.notes && (
                <div className="md:col-span-2">
                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Notes</div>
                  <p className="text-sm text-charcoal bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap">{contract.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Occupants */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-gray-500" />
              <h3 className="text-sm font-bold text-charcoal">Occupants ({contract.occupants.length})</h3>
            </div>
            {isActive && (
              <Link
                href={`/reservations/new?companyContractId=${contract.id}`}
                className="inline-flex items-center gap-1.5 bg-charcoal text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-charcoal-800 transition-colors"
              >
                <Plus size={13} /> Nouvel occupant
              </Link>
            )}
          </div>

          {contract.occupants.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400">
              Aucun occupant enregistré sur ce contrat.
            </div>
          ) : (
            <div className="p-4">
              <OccupantsTimeline
                occupants={contract.occupants}
                start={contract.startDate}
                end={contract.endDate}
              />
              <div className="mt-4 divide-y divide-gray-50">
                {contract.occupants.map(o => (
                  <div key={o.reservationId} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-charcoal truncate">{o.clientFullName}</span>
                        <span className="text-[11px] font-mono text-gray-400">{o.reference}</span>
                        <OccupantStatusBadge status={o.status} />
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {formatDate(o.checkInDate)} → {formatDate(o.checkOutDate)} · {o.nights} nuit{o.nights > 1 ? 's' : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/reservations/${o.reservationId}`)}
                      className="text-xs text-charcoal/70 hover:text-charcoal font-medium px-2.5 py-1 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      Voir résa
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Factures mensuelles */}
        <InvoicesSection contractId={contract.id} contract={contract} />
      </div>
    </div>
  );
}

/* ─────────────────────────── Factures mensuelles ─────────────────────────── */

const MONTHS_FR = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function InvoicesSection({ contractId, contract }: {
  contractId: number;
  contract: CompanyContractDetailDto;
}) {
  const [invoices, setInvoices] = useState<ContractInvoiceDto[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState('');
  const [busy,    setBusy]      = useState(false);
  const [payTarget, setPayTarget] = useState<ContractInvoiceDto | null>(null);

  // Sélecteur mois/année pour la génération. Par défaut : mois courant.
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setInvoices(await companyContracts.invoices.list(contractId));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => { void load(); }, [load]);

  async function handleGenerate() {
    setBusy(true);
    setError('');
    try {
      await companyContracts.invoices.generate(contractId, year, month);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel(inv: ContractInvoiceDto) {
    if (!confirm(`Annuler la facture ${inv.number} ?`)) return;
    setBusy(true);
    setError('');
    try {
      await contractInvoicesApi.cancel(inv.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  // Années sélectionnables : de l'année de début du contrat à l'année de fin.
  const startYear = new Date(contract.startDate).getFullYear();
  const endYear   = new Date(contract.endDate).getFullYear();
  const yearOptions: number[] = [];
  for (let y = startYear; y <= endYear; y++) yearOptions.push(y);

  const totalIssued = invoices
    .filter(i => i.status === 'Issued')
    .reduce((s, i) => s + i.totalTtc, 0);
  const totalPaid = invoices
    .filter(i => i.status === 'Paid')
    .reduce((s, i) => s + i.totalTtc, 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-100 flex-wrap">
        <div className="flex items-center gap-2">
          <Receipt size={16} className="text-gray-500" />
          <h3 className="text-sm font-bold text-charcoal">Factures mensuelles ({invoices.length})</h3>
        </div>
        {contract.status !== 'Cancelled' && (
          <div className="flex items-center gap-2">
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              disabled={busy}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40"
            >
              {MONTHS_FR.slice(1).map((label, i) => (
                <option key={i + 1} value={i + 1}>{label}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              disabled={busy}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40"
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button
              onClick={handleGenerate}
              disabled={busy}
              className="inline-flex items-center gap-1.5 bg-charcoal text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-charcoal-800 transition-colors disabled:opacity-40"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Générer facture
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-5 h-5 border-2 border-green/30 border-t-green rounded-full animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-gray-400">
          Aucune facture générée. Sélectionnez un mois et cliquez sur « Générer facture ».
        </div>
      ) : (
        <>
          {/* Récap */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 px-6 pt-4">
            <StatCard label="Émises non payées" value={totalIssued} highlight={totalIssued > 0 ? 'orange' : 'neutral'} />
            <StatCard label="Encaissées" value={totalPaid} highlight={totalPaid > 0 ? 'green' : 'neutral'} />
            <StatCard label="Total facturé" value={totalIssued + totalPaid} highlight="neutral" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm mt-3">
              <thead className="border-b border-gray-100">
                <tr className="text-[11px] text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-3 text-left font-medium">Facture</th>
                  <th className="px-6 py-3 text-left font-medium">Période</th>
                  <th className="px-6 py-3 text-right font-medium">HT</th>
                  <th className="px-6 py-3 text-right font-medium">TVA</th>
                  <th className="px-6 py-3 text-right font-medium">TTC</th>
                  <th className="px-6 py-3 text-left font-medium">Statut</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-3">
                      <div className="font-mono text-xs font-semibold text-charcoal">{inv.number}</div>
                      {inv.notes && <div className="text-[10px] text-gray-400 mt-0.5">{inv.notes}</div>}
                    </td>
                    <td className="px-6 py-3 text-charcoal text-xs">
                      {MONTHS_FR[inv.month]} {inv.year}
                    </td>
                    <td className="px-6 py-3 text-right text-charcoal">{formatMoney(inv.totalHt)}</td>
                    <td className="px-6 py-3 text-right text-gray-500 text-xs">
                      {inv.tvaExonere ? <span className="italic">exonérée</span> : formatMoney(inv.tva)}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-charcoal">{formatMoney(inv.totalTtc)}</td>
                    <td className="px-6 py-3"><InvoiceStatusBadge status={inv.status} /></td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {inv.status === 'Issued' && (
                          <>
                            <button
                              onClick={() => setPayTarget(inv)}
                              disabled={busy}
                              title="Marquer payée"
                              className="p-1.5 text-gray-400 hover:text-green-dark hover:bg-green/10 rounded-lg transition-colors disabled:opacity-40"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                            <button
                              onClick={() => handleCancel(inv)}
                              disabled={busy}
                              title="Annuler"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                            >
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                        {inv.status === 'Paid' && inv.paymentMethod && (
                          <span className="text-[10px] text-gray-500 font-medium">
                            {inv.paymentMethod}
                            {inv.paymentRef && <span className="text-gray-400"> · {inv.paymentRef}</span>}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {payTarget && (
        <PayInvoiceModal
          invoice={payTarget}
          onClose={() => setPayTarget(null)}
          onPaid={async () => { setPayTarget(null); await load(); }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: {
  label: string;
  value: number;
  highlight: 'green' | 'orange' | 'neutral';
}) {
  const color = highlight === 'green'  ? 'text-green-dark' :
                highlight === 'orange' ? 'text-orange-700' : 'text-charcoal';
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`text-base font-bold ${color} mt-0.5`}>{formatMoney(value)}</div>
    </div>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Issued:    'bg-orange-100 text-orange-700',
    Paid:      'bg-green/20 text-green-dark',
    Cancelled: 'bg-red-100 text-red-700',
  };
  const label: Record<string, string> = {
    Issued: 'À encaisser', Paid: 'Payée', Cancelled: 'Annulée',
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {label[status] ?? status}
    </span>
  );
}

function PayInvoiceModal({ invoice, onClose, onPaid }: {
  invoice: ContractInvoiceDto;
  onClose: () => void;
  onPaid: () => void | Promise<void>;
}) {
  const [method, setMethod] = useState<'Virement' | 'Chèque' | 'Cash'>('Virement');
  const [ref,    setRef]    = useState('');
  const [paidOn, setPaidOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await contractInvoicesApi.pay(invoice.id, {
        paymentMethod: method,
        paymentRef:    ref.trim() || undefined,
        paidOn,
      });
      await onPaid();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40';
  const labelCls = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-charcoal">Encaisser la facture</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {invoice.number} · {formatMoney(invoice.totalTtc)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-charcoal">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
          )}
          <div>
            <label className={labelCls}>Mode de paiement</label>
            <select value={method} onChange={e => setMethod(e.target.value as typeof method)} className={inputCls}>
              <option value="Virement">Virement</option>
              <option value="Chèque">Chèque</option>
              <option value="Cash">Espèces</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Référence (n° chèque, ref virement…)</label>
            <input type="text" value={ref} onChange={e => setRef(e.target.value)} className={inputCls} placeholder="optionnel" />
          </div>
          <div>
            <label className={labelCls}>Date d&apos;encaissement</label>
            <input type="date" value={paidOn} onChange={e => setPaidOn(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="text-sm text-gray-500 hover:text-charcoal px-3 py-1.5">
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 bg-charcoal text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-charcoal-800 transition-colors disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Confirmer
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─────────────────────────── Sous-composants ─────────────────────────── */

function InfoRow({ icon: Icon, label, value, link }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  link?: string;
}) {
  const content = <span className="text-sm font-semibold text-charcoal">{value}</span>;
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
        <Icon size={12} /> {label}
      </div>
      {link ? (
        <Link href={link} className="hover:underline decoration-green-dark decoration-2 underline-offset-2">
          {content}
        </Link>
      ) : content}
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

function OccupantStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Confirmed:  'bg-blue-100 text-blue-700',
    CheckedIn:  'bg-amber-100 text-amber-800',
    CheckedOut: 'bg-gray-100 text-gray-600',
    Pending:    'bg-gray-100 text-gray-500',
    Cancelled:  'bg-red-100 text-red-700',
    NoShow:     'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}

// Timeline horizontale visualisant les segments d'occupation vs les trous de vacance.
function OccupantsTimeline({ occupants, start, end }: {
  occupants: ContractOccupantDto[];
  start: string;
  end: string;
}) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const total = e - s;
  if (total <= 0) return null;

  const segments = occupants
    .filter(o => o.status !== 'Cancelled' && o.status !== 'NoShow')
    .map(o => {
      const os = Math.max(new Date(o.checkInDate).getTime(), s);
      const oe = Math.min(new Date(o.checkOutDate).getTime(), e);
      return {
        occupant: o,
        leftPct:  ((os - s) / total) * 100,
        widthPct: Math.max(0.5, ((oe - os) / total) * 100),
      };
    });

  const todayPct = (() => {
    const t = Date.now();
    if (t < s || t > e) return null;
    return ((t - s) / total) * 100;
  })();

  return (
    <div>
      <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
        {segments.map((seg, i) => (
          <div
            key={i}
            className={`absolute top-0 h-full ${seg.occupant.status === 'CheckedIn' ? 'bg-amber-400' : 'bg-green'}`}
            style={{ left: `${seg.leftPct}%`, width: `${seg.widthPct}%` }}
            title={`${seg.occupant.clientFullName} (${seg.occupant.checkInDate} → ${seg.occupant.checkOutDate})`}
          />
        ))}
        {todayPct !== null && (
          <div className="absolute top-0 h-full w-px bg-red-500" style={{ left: `${todayPct}%` }} title="Aujourd'hui" />
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1 font-mono">
        <span>{formatDate(start)}</span>
        <span>{formatDate(end)}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────── Édition en ligne ─────────────────────────── */

function EditForm({ contract, onCancel, onSaved }: {
  contract: CompanyContractDetailDto;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [form, setForm] = useState({
    endDate:     contract.endDate,
    monthlyRate: contract.monthlyRate,
    tvaExonere:  contract.tvaExonere,
    notes:       contract.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await companyContracts.update(contract.id, {
        endDate:     form.endDate,
        monthlyRate: form.monthlyRate,
        tvaExonere:  form.tvaExonere,
        notes:       form.notes,
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green/40';
  const labelCls = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5';

  return (
    <form onSubmit={handleSave} className="p-6 space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Date de fin</label>
          <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Loyer mensuel (FCFA)</label>
          <input type="number" min={0} step={5000} value={form.monthlyRate} onChange={e => setForm(f => ({ ...f, monthlyRate: Number(e.target.value) }))} className={inputCls} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-charcoal">
        <input type="checkbox" checked={form.tvaExonere} onChange={e => setForm(f => ({ ...f, tvaExonere: e.target.checked }))} className="rounded border-gray-300 text-green-dark focus:ring-green/30" />
        Exonération TVA
      </label>
      <div>
        <label className={labelCls}>Notes</label>
        <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={`${inputCls} resize-none`} />
      </div>
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-charcoal transition-colors">
          <X size={14} /> Annuler
        </button>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-charcoal text-white text-sm font-medium rounded-lg hover:bg-charcoal-800 transition-colors disabled:opacity-40">
          <Save size={14} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n) + ' F';
}
