'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, BedDouble, Users, CalendarCheck,
  CreditCard, LogOut, Settings,
} from 'lucide-react';
import { clearAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard',    label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/rooms',        label: 'Chambres',         icon: BedDouble       },
  { href: '/clients',      label: 'Clients',          icon: Users           },
  { href: '/reservations', label: 'Réservations',     icon: CalendarCheck   },
  { href: '/payments',     label: 'Paiements',        icon: CreditCard      },
];

export default function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();

  function logout() {
    clearAuth();
    router.push('/login');
  }

  return (
    <aside className="w-64 h-full bg-charcoal flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10 flex flex-col items-start">
        <Image
          src="/img/logo.png"
          alt="Juweirat"
          width={140}
          height={55}
          className="h-10 w-auto object-contain"
        />
        <p className="text-white/40 text-[10px] tracking-widest mt-1.5 uppercase">Administration</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-green text-charcoal'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Settings size={18} />
          Paramètres
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:bg-red-900/40 hover:text-red-300 transition-colors"
        >
          <LogOut size={18} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
