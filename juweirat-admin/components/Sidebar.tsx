'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, LayoutGrid, BedDouble, Users, CalendarCheck,
  CreditCard, LogOut, CalendarDays, Building2, ClipboardList, Wrench,
  Receipt, Settings, BarChart2, Printer, Mail, ShoppingCart, Package,
  Briefcase, ShieldCheck, BookOpen, Wallet, BookText, Scale, Percent,
  FilePlus, Hotel, ClipboardCheck, ChevronDown, Sparkles, TrendingDown,
} from 'lucide-react';
import { clearAuth, getUser } from '@/lib/auth';
import { useEffect, useMemo, useState } from 'react';

type IconType = React.ComponentType<{ size?: number; className?: string }>;
type Leaf  = { href: string; label: string; icon: IconType };
type Group = { key: string; label: string; icon: IconType; children: Leaf[] };
type Item  = Leaf | Group;

function isGroup(i: Item): i is Group {
  return (i as Group).children !== undefined;
}

// ── Menu par rôle ─────────────────────────────────────────────────────────────
const CORE: Item[] = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { key: 'hebergement', label: 'Hébergement', icon: Hotel, children: [
    { href: '/categories', label: 'Catégories', icon: LayoutGrid },
    { href: '/rooms',      label: 'Chambres',   icon: BedDouble  },
  ]},
  { key: 'clients', label: 'Clients', icon: Users, children: [
    { href: '/clients',   label: 'Particuliers', icon: Users     },
    { href: '/companies', label: 'Compagnies',   icon: Briefcase },
  ]},
  { href: '/reservations', label: 'Réservations', icon: CalendarCheck },
  { href: '/prestations',  label: 'Prestations',  icon: Package       },
  { key: 'caisse', label: 'Caisse', icon: Wallet, children: [
    { href: '/caisse/session',  label: 'Ma caisse',     icon: Wallet       },
    { href: '/ventes-directes', label: 'Vente directe', icon: ShoppingCart },
    { href: '/payments',        label: 'Paiements',     icon: CreditCard   },
  ]},
  { key: 'pms', label: 'PMS', icon: ClipboardCheck, children: [
    { href: '/pms/journee',      label: 'Journée',      icon: CalendarDays  },
    { href: '/pms/folios',       label: 'Folios',       icon: ClipboardList },
    { href: '/pms/gouvernante',  label: 'Gouvernante',  icon: Building2     },
    { href: '/pms/debiteurs',    label: 'Débiteurs',    icon: CreditCard    },
    { href: '/pms/maintenance',  label: 'Maintenance',  icon: Wrench        },
    { href: '/pms/personnel',    label: 'Personnel',    icon: Users         },
    { href: '/pms/cloture',      label: 'Clôture',      icon: Receipt       },
    { href: '/pms/statistiques', label: 'Statistiques', icon: BarChart2     },
    { href: '/pms/edition',      label: 'Édition',      icon: Printer       },
  ]},
  { href: '/messages', label: 'Messages', icon: Mail },
  { href: '/chat',     label: 'Agent',    icon: Sparkles },
];

const ACCOUNTING: Group = {
  key: 'comptabilite', label: 'Comptabilité', icon: BookOpen, children: [
    { href: '/comptabilite/journal',          label: 'Journal de caisse',   icon: BookOpen     },
    { href: '/comptabilite/grand-livre',      label: 'Grand livre',         icon: BookText     },
    { href: '/comptabilite/balance',          label: 'Balance',             icon: Scale        },
    { href: '/comptabilite/tva',              label: 'État TVA',            icon: Percent      },
    { href: '/comptabilite/od',              label: 'Opérations diverses', icon: FilePlus     },
    { href: '/comptabilite/charges',          label: 'Charges',             icon: TrendingDown },
    { href: '/comptabilite/immobilisations',  label: 'Immobilisations',     icon: Package      },
    { href: '/comptabilite/fournisseurs',     label: 'Fournisseurs',        icon: Building2    },
  ],
};

const ADMIN: Group = {
  key: 'administration', label: 'Administration', icon: ShieldCheck, children: [
    { href: '/users',      label: 'Utilisateurs', icon: ShieldCheck },
    { href: '/pms/config', label: 'Config PMS',   icon: Settings    },
  ],
};

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}

function groupContainsActive(pathname: string, g: Group): boolean {
  return g.children.some(c => isActive(pathname, c.href));
}

const OPEN_STORAGE_KEY = 'juweirat_sidebar_open';

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  const [isAdmin, setIsAdmin]           = useState(false);
  const [isAccountant, setIsAccountant] = useState(false);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const u = getUser();
    setIsAdmin(u?.role === 'admin');
    setIsAccountant(u?.role === 'admin' || u?.role === 'comptable');
  }, [pathname]);

  // Charge l'état déplié/replié persisté au premier rendu client.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(OPEN_STORAGE_KEY);
      if (raw) setOpenMap(JSON.parse(raw));
    } catch { /* stockage indispo : on ignore */ }
  }, []);

  const items = useMemo<Item[]>(() => {
    const list: Item[] = [...CORE];
    if (isAccountant) list.push(ACCOUNTING);
    if (isAdmin)      list.push(ADMIN);
    return list;
  }, [isAccountant, isAdmin]);

  // Ouvre automatiquement le groupe qui contient la route active,
  // sans jamais refermer un groupe que l'utilisateur a explicitement ouvert.
  useEffect(() => {
    setOpenMap(prev => {
      let changed = false;
      const next  = { ...prev };
      for (const it of items) {
        if (isGroup(it) && groupContainsActive(pathname, it) && !next[it.key]) {
          next[it.key] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [pathname, items]);

  function toggleGroup(key: string) {
    setOpenMap(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem(OPEN_STORAGE_KEY, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  }

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
        {items.map(item => {
          if (!isGroup(item)) {
            return <LeafLink key={item.href} item={item} pathname={pathname} />;
          }
          return (
            <GroupNode
              key={item.key}
              group={item}
              open={!!openMap[item.key]}
              onToggle={() => toggleGroup(item.key)}
              pathname={pathname}
            />
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

function LeafLink({ item, pathname, nested = false }: {
  item: Leaf; pathname: string; nested?: boolean;
}) {
  const active = isActive(pathname, item.href);
  const Icon   = item.icon;
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-all ${
        nested ? 'pl-9 pr-3 py-2 text-[13px]' : 'px-3 py-2.5'
      } ${
        active
          ? 'bg-green text-charcoal'
          : 'text-white/55 hover:bg-white/8 hover:text-white'
      }`}
    >
      <Icon size={nested ? 14 : 16} />
      {item.label}
    </Link>
  );
}

function GroupNode({ group, open, onToggle, pathname }: {
  group: Group; open: boolean; onToggle: () => void; pathname: string;
}) {
  const Icon        = group.icon;
  const hasActive   = groupContainsActive(pathname, group);
  const showAsOpen  = open || hasActive;

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={showAsOpen}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
          hasActive
            ? 'text-white'
            : 'text-white/55 hover:bg-white/8 hover:text-white'
        }`}
      >
        <Icon size={16} />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          size={14}
          className={`transition-transform text-white/40 ${showAsOpen ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>
      {showAsOpen && (
        <div className="mt-0.5 space-y-0.5">
          {group.children.map(child => (
            <LeafLink key={child.href} item={child} pathname={pathname} nested />
          ))}
        </div>
      )}
    </div>
  );
}
