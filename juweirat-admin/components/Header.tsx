'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Calendar, CalendarClock, Inbox, ClipboardCheck, Globe } from 'lucide-react';
import { getUser } from '@/lib/auth';
import { notifications, type NotificationSummary } from '@/lib/api';

interface Props {
  title: string;
}

// Rafraîchit la cloche toutes les 60 s tant que l'onglet est visible.
const REFRESH_MS = 60_000;

function fmtDateFr(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function Header({ title }: Props) {
  const [user, setUser]         = useState<{ fullName: string; role: string } | null>(null);
  const [summary, setSummary]   = useState<NotificationSummary | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setUser(getUser()); }, []);

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await notifications.getSummary());
    } catch {
      // silencieux — la cloche restera vide, on ne veut pas bloquer les pages.
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadSummary();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') loadSummary();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [user, loadSummary]);

  // Fermer le popover au clic à côté.
  useEffect(() => {
    if (!popoverOpen) return;
    function onDoc(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setPopoverOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [popoverOpen]);

  const initials = user?.fullName
    .split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? '';

  const totalCount = summary
    ? summary.pendingReservationsCount
      + summary.websiteReservationsTodayCount
      + summary.unreadMessagesCount
      + summary.daysNotClosedCount
    : 0;

  const dateLabel = summary ? fmtDateFr(summary.systemDate) : '—';
  const isMisaligned = summary && summary.daysNotClosedCount > 0;

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0 sticky top-0 z-10">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-0.5 h-5 bg-green rounded-full shrink-0" />
        <h1 className="text-sm font-semibold text-charcoal tracking-wide truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Journée système (masquée sur mobile) */}
        <div
          className={`hidden sm:flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg ${
            isMisaligned
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-gray-50 text-charcoal border border-gray-100'
          }`}
          title={
            isMisaligned
              ? `${summary!.daysNotClosedCount} clôture(s) en attente — jour réel : ${fmtDateFr(summary!.todayDate)}`
              : 'Date PMS courante'
          }
        >
          {isMisaligned ? <CalendarClock size={13} /> : <Calendar size={13} />}
          Journée du <b className="ml-0.5">{dateLabel}</b>
        </div>

        {/* Cloche */}
        {user && (
          <div className="relative" ref={popRef}>
            <button
              type="button"
              onClick={() => setPopoverOpen(o => !o)}
              className="relative w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-charcoal transition-colors"
              aria-label="Notifications"
            >
              <Bell size={16} />
              {totalCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {totalCount > 99 ? '99+' : totalCount}
                </span>
              )}
            </button>

            {popoverOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-20">
                <div className="px-4 py-2.5 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Notifications</span>
                  <span className="text-[10px] text-gray-400">Journée du {dateLabel}</span>
                </div>

                {!summary ? (
                  <div className="px-4 py-6 text-xs text-gray-400 text-center">Chargement…</div>
                ) : totalCount === 0 ? (
                  <div className="px-4 py-8 text-xs text-gray-400 text-center">
                    Rien à traiter pour le moment.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {summary.pendingReservationsCount > 0 && (
                      <NotifRow
                        Icon={ClipboardCheck}
                        color="text-green-dark bg-green/15"
                        count={summary.pendingReservationsCount}
                        label="Réservation(s) en attente"
                        hint="Statut Pending — à confirmer ou annuler"
                        href="/reservations?status=Pending"
                        onNavigate={() => setPopoverOpen(false)}
                      />
                    )}
                    {summary.websiteReservationsTodayCount > 0 && (
                      <NotifRow
                        Icon={Globe}
                        color="text-blue-700 bg-blue-100"
                        count={summary.websiteReservationsTodayCount}
                        label="Résa(s) reçues du site aujourd'hui"
                        hint={`Créées le ${dateLabel} depuis juweirat.com`}
                        href="/reservations?source=website"
                        onNavigate={() => setPopoverOpen(false)}
                      />
                    )}
                    {summary.unreadMessagesCount > 0 && (
                      <NotifRow
                        Icon={Inbox}
                        color="text-amber-700 bg-amber-100"
                        count={summary.unreadMessagesCount}
                        label="Message(s) non lu(s)"
                        hint="Formulaire de contact du site"
                        href="/messages"
                        onNavigate={() => setPopoverOpen(false)}
                      />
                    )}
                    {summary.daysNotClosedCount > 0 && (
                      <NotifRow
                        Icon={CalendarClock}
                        color="text-red-700 bg-red-100"
                        count={summary.daysNotClosedCount}
                        label={`Journée(s) à clôturer`}
                        hint={`Le PMS est encore au ${dateLabel} (jour réel : ${fmtDateFr(summary.todayDate)})`}
                        href="/pms/cloture"
                        onNavigate={() => setPopoverOpen(false)}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Profil */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-charcoal leading-none">{user.fullName}</p>
              <p className="text-[11px] text-green-dark mt-0.5 font-medium">{user.role}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-charcoal flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-white tracking-wide">{initials}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function NotifRow({
  Icon, color, count, label, hint, href, onNavigate,
}: {
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  count: number;
  label: string;
  hint: string;
  href: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50/70 transition-colors"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-charcoal">
          <span className="tabular-nums">{count}</span> {label}
        </p>
        <p className="text-[11px] text-gray-500 mt-0.5">{hint}</p>
      </div>
    </Link>
  );
}
