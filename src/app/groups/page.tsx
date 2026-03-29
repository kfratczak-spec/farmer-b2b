'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import GroupCard from '@/components/GroupCard';
import { Group } from '@/lib/data';

export default function GroupsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [utilizationFilter, setUtilizationFilter] = useState<string>('all');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(stored));
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const fetchGroups = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch('/api/groups', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setGroups(data.groups || []);
      } catch (error) {
        console.error('Błąd pobierania grup:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [user]);

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Ładowanie...</div>
      </div>
    );
  }

  // Filter groups
  let filteredGroups = groups;

  if (searchTerm) {
    filteredGroups = filteredGroups.filter(
      (g) =>
        g.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  if (utilizationFilter !== 'all') {
    filteredGroups = filteredGroups.filter((g) => {
      const util = (g.usedMinutes / g.totalMinutes) * 100;
      if (utilizationFilter === 'high') return util >= 80;
      if (utilizationFilter === 'medium') return util >= 60 && util < 80;
      if (utilizationFilter === 'low') return util < 60;
      return true;
    });
  }

  // Sort by utilization
  filteredGroups = filteredGroups.sort((a, b) => {
    const utilA = (a.usedMinutes / a.totalMinutes) * 100;
    const utilB = (b.usedMinutes / b.totalMinutes) * 100;
    return utilB - utilA;
  });

  const stats = {
    total: groups.length,
    avgUtilization: groups.length
      ? Math.round(
          (groups.reduce((sum, g) => sum + (g.usedMinutes / g.totalMinutes) * 100, 0) /
            groups.length) *
            10
        ) / 10
      : 0,
    highUtil: groups.filter((g) => (g.usedMinutes / g.totalMinutes) * 100 >= 80).length,
    lowUtil: groups.filter((g) => (g.usedMinutes / g.totalMinutes) * 100 < 60).length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Grupy szkoleniowe</h1>
          <p className="text-gray-600 mt-2">
            Przegląd wszystkich grupach uczestników kursów
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <p className="text-gray-600 text-sm font-medium mb-1">Razem grup</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <p className="text-gray-600 text-sm font-medium mb-1">Śr. wykorzystanie</p>
            <p className="text-3xl font-bold text-gray-900">{stats.avgUtilization}%</p>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-4 shadow-sm">
            <p className="text-green-600 text-sm font-medium mb-1">Wysokie (80%+)</p>
            <p className="text-3xl font-bold text-green-700">{stats.highUtil}</p>
          </div>
          <div className="bg-red-50 rounded-lg border border-red-200 p-4 shadow-sm">
            <p className="text-red-600 text-sm font-medium mb-1">Niskie (&lt;60%)</p>
            <p className="text-3xl font-bold text-red-700">{stats.lowUtil}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Szukaj grupy lub firmy..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={utilizationFilter}
            onChange={(e) => setUtilizationFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Wszystkie poziomy</option>
            <option value="high">Wysokie (80%+)</option>
            <option value="medium">Średnie (60-80%)</option>
            <option value="low">Niskie (&lt;60%)</option>
          </select>
        </div>

        {/* Groups grid */}
        {filteredGroups.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-600">
            {groups.length === 0 ? 'Brak dostępnych grup' : 'Nie znaleziono grup'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
