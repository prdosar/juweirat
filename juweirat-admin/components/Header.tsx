'use client';

import { useEffect, useState } from 'react';
import { getUser } from '@/lib/auth';
import { UserCircle } from 'lucide-react';

interface Props {
  title: string;
}

export default function Header({ title }: Props) {
  const [user, setUser] = useState<{ fullName: string; role: string } | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold text-charcoal">{title}</h1>
      {user && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <UserCircle size={20} className="text-charcoal" />
          <span className="font-medium">{user.fullName}</span>
          <span className="text-gray-400">·</span>
          <span className="text-xs bg-green/20 text-green-dark font-medium px-2 py-0.5 rounded-full">
            {user.role}
          </span>
        </div>
      )}
    </header>
  );
}
