'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import TicketCard from '@/components/TicketCard';
import { Ticket } from '@/lib/tickets';

export default function TicketsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

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

    const fetchTickets = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch('/api/tickets', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setTickets(data.tickets || []);
      } catch (error) {
        console.error('Błąd pobierania ticketów:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [user]);

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Ładowanie...</div>
      </div>
    );
  }

  // Filter tickets
  let filteredTickets = tickets;

  if (riskFilter !== 'all') {
    filteredTickets = filteredTickets.filter((t) => t.riskLevel === riskFilter);
  }

  if (searchTerm) {
    filteredTickets = filteredTickets.filter(
      (t) =>
        t.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.groupName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Sort by risk level and days open
  filteredTickets = filteredTickets.sort((a, b) => {
    const riskOrder = { critical: 3, high_risk: 2, low_risk: 1 };
    const riskDiff = riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
    if (riskDiff !== 0) return riskDiff;
    return b.daysOpen - a.daysOpen;
  });

  const stats = {
    total: tickets.length,
    critical: tickets.filter((t) => t.riskLevel === 'critical').length,
    highRisk: tickets.filter((t) => t.riskLevel === 'high_risk').length,
    lowRisk: tickets.filter((t) => t.riskLevel === 'low_risk').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tickety</h1>
          <p className="text-gray-600 mt-2">
            Zarządzanie alertami o niskim wykorzystaniu grup
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <p className="text-gray-600 text-sm font-medium mb-1">Razem</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-red-50 rounded-lg border border-red-200 p-4 shadow-sm">
            <p className="text-red-600 text-sm font-medium mb-1">Krytyczne</p>
            <p className="text-3xl font-bold text-red-700">{stats.critical}</p>
          </div>
          <div className="bg-orange-50 rounded-lg border border-orange-200 p-4 shadow-sm">
            <p className="text-orange-600 text-sm font-medium mb-1">Wysokie ryzyko</p>
            <p className="text-3xl font-bold text-orange-700">{stats.highRisk}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4 shadow-sm">
            <p className="text-yellow-600 text-sm font-medium mb-1">Niskie ryzyko</p>
            <p className="text-3xl font-bold text-yellow-700">{stats.lowRisk}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Szukaj firmy lub grupy..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
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

        {/* Tickets grid */}
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
  );
}
