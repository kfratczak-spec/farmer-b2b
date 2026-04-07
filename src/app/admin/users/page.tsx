'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

interface AppUser {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'salesperson';
  status: 'active' | 'inactive';
  createdAt: string;
  createdBy: string;
  lastLoginAt?: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string; isAdmin: boolean } | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add user form
  const [showForm, setShowForm] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'salesperson'>('salesperson');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      router.push('/login');
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      if (!parsed.isAdmin && parsed.role !== 'head_of_sales') {
        router.push('/dashboard');
        return;
      }
      setUser(parsed);
      fetchUsers();
    } catch {
      router.push('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getToken = () => localStorage.getItem('token') || '';

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        setError('Błąd pobierania użytkowników');
        return;
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users);
      } else {
        setError(data.error || 'Błąd pobierania użytkowników');
      }
    } catch {
      setError('Błąd połączenia');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          action: 'add',
          fullName: newFullName,
          email: newEmail,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Dodano użytkownika: ${newFullName}`);
        setNewFullName('');
        setNewEmail('');
        setNewRole('salesperson');
        setShowForm(false);
        fetchUsers();
      } else {
        setError(data.error || 'Błąd dodawania');
      }
    } catch {
      setError('Błąd połączenia');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    setError('');
    setSuccess('');
    const action = currentStatus === 'active' ? 'dezaktywować' : 'aktywować';
    if (!confirm(`Czy na pewno chcesz ${action} tego użytkownika?`)) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ action: 'toggleStatus', userId }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Status zmieniony: ${data.user.fullName} jest teraz ${data.user.status === 'active' ? 'aktywny' : 'nieaktywny'}`);
        fetchUsers();
      } else {
        setError(data.error);
      }
    } catch {
      setError('Błąd połączenia');
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ action: 'updateRole', userId, role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Rola zmieniona: ${data.user.fullName} jest teraz ${data.user.role === 'admin' ? 'Administratorem' : 'Handlowcem'}`);
        fetchUsers();
      } else {
        setError(data.error);
      }
    } catch {
      setError('Błąd połączenia');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Zarządzanie użytkownikami</h1>
            <p className="text-gray-500 mt-1">
              {users.filter(u => u.status === 'active').length} aktywnych, {users.filter(u => u.status === 'inactive').length} nieaktywnych
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? 'Anuluj' : '+ Dodaj użytkownika'}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Nowy użytkownik</h2>
            <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Imię i nazwisko
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="np. Anna Kowalska"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="anna@tutlo.pl"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rola
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'admin' | 'salesperson')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="salesperson">Handlowiec</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary disabled:opacity-50"
              >
                {submitting ? 'Dodawanie...' : 'Dodaj'}
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Ładowanie...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Użytkownik</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rola</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ostatnie logowanie</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Akcje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className={u.status === 'inactive' ? 'bg-gray-50 opacity-60' : ''}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{u.fullName}</div>
                      <div className="text-xs text-gray-400">Dodany: {u.createdAt}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {u.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
                      >
                        <option value="admin">Administrator</option>
                        <option value="salesperson">Handlowiec</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          u.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {u.status === 'active' ? 'Aktywny' : 'Nieaktywny'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {u.lastLoginAt || 'Nigdy'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleToggleStatus(u.id, u.status)}
                        className={`text-sm px-3 py-1 rounded ${
                          u.status === 'active'
                            ? 'text-red-600 hover:bg-red-50 border border-red-200'
                            : 'text-green-600 hover:bg-green-50 border border-green-200'
                        }`}
                      >
                        {u.status === 'active' ? 'Dezaktywuj' : 'Aktywuj'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
