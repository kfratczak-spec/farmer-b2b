'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface LoginUser {
  fullName: string;
  role: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [users, setUsers] = useState<LoginUser[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    fetch('/api/auth')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.users) {
          setUsers(data.users);
        }
      })
      .catch(() => setError('Nie udało się pobrać listy użytkowników'))
      .finally(() => setLoadingUsers(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!selectedUser) {
      setError('Wybierz użytkownika');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: selectedUser, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Błąd logowania');
        setLoading(false);
        return;
      }

      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);
      router.push('/dashboard');
    } catch (err) {
      setError('Błąd połączenia');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">Farmer B2B</h1>
        <p className="text-gray-600 text-center mb-8">Tutlo - System zarządzania grupami</p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Użytkownik
            </label>
            {loadingUsers ? (
              <div className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-400">
                Ładowanie...
              </div>
            ) : (
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                required
              >
                <option value="">Wybierz użytkownika...</option>
                {users.map((user) => (
                  <option key={user.fullName} value={user.fullName}>
                    {user.fullName} {user.role === 'head_of_sales' ? '(Admin)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hasło
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Hasło"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || loadingUsers}
            className="w-full btn-primary disabled:opacity-50"
          >
            {loading ? 'Logowanie...' : 'Zaloguj się'}
          </button>
        </form>

        <div className="mt-6 p-3 bg-blue-50 rounded-lg text-sm text-gray-600 text-center">
          Hasło otrzymasz od administratora systemu
        </div>
      </div>
    </div>
  );
}
