'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, LayoutGrid, BedDouble, Users, CalendarCheck,
  CreditCard, LogOut, CalendarDays, Building2,
  ClipboardList, Wrench, Receipt, FileText, Settings,
  BarChart2, Printer, Mail, ShoppingCart, Package, Briefcase,
} from 'lucide-react';
import { clearAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard',    label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/categories',   label: 'Catégories',      icon: LayoutGrid      },
  { href: '/rooms',        label: 'Chambres',         icon: BedDouble       },
  { href: '/clients',      label: 'Clients',          icon: Users           },
  { href: '/reservations', label: 'Réservations',     icon: CalendarCheck   },
  { href: '/payments',         label: 'Paiements',        icon: CreditCard   },
  { href: '/ventes-directes',  label: 'Vente Directe',    icon: ShoppingCart },
  { href: '/prestations',      label: 'Prestations',      icon: Package      },
  { href: '/companies',        label: 'Compagnies',       icon: Briefcase    },
  { href: '/messages',         label: 'Messages Contact', icon: Mail         },
];

const pmsItems = [
  { href: '/pms/journee',      label: 'Journée',         icon: CalendarDays   },
  { href: '/pms/folios',       label: 'Folios',           icon: ClipboardList  },
  { href: '/pms/gouvernante',  label: 'Gouvernante',      icon: Building2      },
  { href: '/pms/cloture',      label: 'Clôture',          icon: Receipt        },
  { href: '/pms/debiteurs',    label: 'Débiteurs',        icon: CreditCard     },
  { href: '/pms/maintenance',  label: 'Maintenance',      icon: Wrench         },
  { href: '/pms/personnel',    label: 'Personnel',        icon: Users          },
  { href: '/pms/statistiques', label: 'Statistiques',     icon: BarChart2      },
  { href: '/pms/edition',      label: 'Édition',          icon: Printer        },
  { href: '/pms/config',       label: 'Config PMS',       icon: Settings       },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  function logout() {
    clearAuth();
    router.push('/login');
  }

  return (
    <aside className="w-60 h-full bg-charcoal flex flex-col shrink-0 print:hidden" data-no-print>
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/8">
        <Image
          src="/img/logo.png"
          alt="Juweirat"
          width={130}
          height={52}
          className="h-9 w-auto object-contain"
        />
        <p className="text-white/25 text-[9px] tracking-[0.3em] mt-2 uppercase font-medium">
          Administration
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-green text-charcoal'
                  : 'text-white/55 hover:bg-white/8 hover:text-white'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}

        {/* PMS section */}
        <div className="pt-4 pb-1">
          <p className="px-3 text-[10px] text-white/25 uppercase tracking-[0.2em] font-medium">PMS</p>
        </div>
        {pmsItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-green text-charcoal'
                  : 'text-white/55 hover:bg-white/8 hover:text-white'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5 pt-3 border-t border-white/8">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/35 hover:bg-white/8 hover:text-white/80 transition-all"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
