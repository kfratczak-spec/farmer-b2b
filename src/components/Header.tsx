'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isAdmin?: boolean;
}

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    router.push('/login');
  };

  if (!user) return null;

  const displayName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
  const isAdmin = user.isAdmin || user.role === 'head_of_sales';

  return (
    <header className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-2xl font-bold">
            Farmer B2B
          </Link>
          <nav className="flex gap-6">
            <Link
              href="/dashboard"
              className="hover:text-blue-100 transition-colors"
            >
              Panel
            </Link>
            <Link
              href="/groups"
              className="hover:text-blue-100 transition-colors"
            >
              Grupy
            </Link>
            <Link
              href="/tickets"
              className="hover:text-blue-100 transition-colors"
            >
              Tickety
            </Link>
            <Link
              href="/activity-dashboard"
              className="hover:text-blue-100 transition-colors"
            >
              Aktywności
            </Link>
            {isAdmin && (
              <Link
                href="/admin/users"
                className="hover:text-blue-100 transition-colors border-l border-blue-400 pl-6"
              >
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-medium">{displayName}</p>
            <p className="text-sm text-blue-100">
              {isAdmin ? 'Administrator' : 'Handlowiec'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="btn-secondary text-sm"
          >
            Wyloguj
          </button>
        </div>
      </div>
    </header>
  );
}
