'use client';

import { useEffect, useState } from 'react';
import { getUser } from '@/lib/auth';

interface Props {
  title: string;
}

export default function Header({ title }: Props) {
  const [user, setUser] = useState<{ fullName: string; role: string } | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const initials = user?.fullName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '';

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-0.5 h-5 bg-green rounded-full shrink-0" />
        <h1 className="text-sm font-semibold text-charcoal tracking-wide">{title}</h1>
      </div>

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
    </header>
  );
}
