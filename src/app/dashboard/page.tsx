'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import GroupCard from '@/components/GroupCard';
import TicketCard from '@/components/TicketCard';
import StatsCard from '@/components/StatsCard';
import { Group } from '@/lib/data';
import { Ticket } from '@/lib/tickets';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');

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

    const fetchData = async () => {
      const token = localStorage.getItem('token');
      try {
        const [groupsRes, ticketsRes] = await Promise.all([
          fetch('/api/groups', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/tickets', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const groupsData = await groupsRes.json();
        const ticketsData = await ticketsRes.json();

        setGroups(groupsData.groups || []);
        setTickets(ticketsData.tickets || []);
      } catch (error) {
        console.error('Błąd pobierania danych:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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

  // Filter tickets
  let filteredTickets = tickets;
  if (riskFilter !== 'all') {
    filteredTickets = filteredTickets.filter((t) => t.riskLevel === riskFilter);
  }
  filteredTickets = filteredTickets.filter(
    (t) =>
      t.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.groupName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const avgUtilization =
    groups.length > 0
      ? Math.round(
          (groups.reduce((sum, g) => sum + (g.usedMinutes / g.totalMinutes) * 100, 0) /
            groups.length) *
            10
        ) / 10
      : 0;

  const criticalCount = tickets.filter((t) => t.riskLevel === 'critical').length;
  const highRiskCount = tickets.filter((t) => t.riskLevel === 'high_risk').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Witaj, {user.firstName}! 👋
          </h1>
          <p className="text-gray-600 mt-2">
            {user.role === 'head_of_sales'
              ? 'Przegląd wszystkich grup i ticketów'
              : 'Twoje grupy i tickety'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatsCard label="Grupy aktywne" value={groups.length} />
          <StatsCard label="Średnie wykorzystanie" value={`${avgUtilization}%`} />
          <StatsCard
            label="Tickety krytyczne"
            value={criticalCount}
            changeType={criticalCount > 0 ? 'negative' : 'positive'}
          />
          <StatsCard
            label="Wysokie ryzyko"
            value={highRiskCount}
            changeType={highRiskCount > 0 ? 'negative' : 'positive'}
          />
        </div>

        {/* Groups section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Grupy</h2>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Szukaj grupy lub firmy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

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

        {/* Tickets section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Tickety</h2>
          </div>

          <div className="mb-4 flex gap-2">
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Wszystkie priorytety</option>
              <option value="critical">Krytyczne</option>
              <option value="high_risk">Wysokie ryzyko</option>
              <option value="low_risk">Niskie ryzyko</option>
            </select>
          </div>

          {filteredTickets.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-600">
              {tickets.length === 0 ? 'Brak ticketów' : 'Nie znaleziono ticketów'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
