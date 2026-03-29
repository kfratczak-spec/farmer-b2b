'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import UtilizationChart from '@/components/UtilizationChart';
import { Group } from '@/lib/data';
import { Ticket } from '@/lib/tickets';
import { ForecastStats, calculateForecastStats } from '@/lib/forecast';

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [user, setUser] = useState<any>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [forecast, setForecast] = useState<ForecastStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(stored));
  }, [router]);

  useEffect(() => {
    if (!user || !params.id) return;

    const fetchData = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`/api/groups/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          router.push('/groups');
          return;
        }

        const data = await res.json();
        setGroup(data.group);
        setForecast(calculateForecastStats(data.group));
      } catch (error) {
        console.error('Błąd pobierania grupy:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, params.id, router]);

  useEffect(() => {
    if (!user) return;

    const fetchTickets = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch('/api/tickets', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const groupTickets = (data.tickets || []).filter((t: Ticket) => t.groupId === params.id);
        setTickets(groupTickets);
      } catch (error) {
        console.error('Błąd pobierania ticketów:', error);
      }
    };

    fetchTickets();
  }, [user, params.id]);

  if (!user || loading || !group || !forecast) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Ładowanie...</div>
      </div>
    );
  }

  const totalPercent = forecast.currentUtilization * 100;
  const todayPercent = forecast.todayUtilization * 100;
  const startDate = new Date(group.startDate);
  const endDate = new Date(group.endDate);
  const daysRemaining = forecast.daysRemaining;

  // Kolory bazują na "% na dziś"
  let todayColor = 'text-green-600';
  let todayBgColor = 'bg-green-50';
  if (todayPercent < 40) {
    todayColor = 'text-red-600';
    todayBgColor = 'bg-red-50';
  } else if (todayPercent < 60) {
    todayColor = 'text-orange-600';
    todayBgColor = 'bg-orange-50';
  } else if (todayPercent < 80) {
    todayColor = 'text-yellow-600';
    todayBgColor = 'bg-yellow-50';
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="mb-6 text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Wróć
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{group.companyName}</h1>
          <p className="text-gray-600 mt-2">{group.name}</p>
        </div>

        {/* Main stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className={`${todayBgColor} border border-gray-200 rounded-lg p-6 shadow-sm`}>
            <p className="text-gray-600 text-sm font-medium mb-2">Wykorzystanie na dziś</p>
            <p className={`${todayColor} text-4xl font-bold`}>
              {todayPercent.toFixed(0)}%
            </p>
            <p className="text-sm text-gray-600 mt-2">
              vs oczekiwane tempo
            </p>
          </div>

          <div className="bg-blue-50 border border-gray-200 rounded-lg p-6 shadow-sm">
            <p className="text-gray-600 text-sm font-medium mb-2">Wykorzystanie całości</p>
            <p className="text-blue-600 text-4xl font-bold">
              {totalPercent.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600 mt-2">
              {group.usedMinutes.toLocaleString()} / {group.totalMinutes.toLocaleString()} min
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <p className="text-gray-600 text-sm font-medium mb-2">Oczekiwane na dziś</p>
            <p className="text-gray-700 text-4xl font-bold">
              {(forecast.expectedUtilization * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Liniowo do 75% na koniec
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <p className="text-gray-600 text-sm font-medium mb-2">Prognoza na koniec</p>
            <p className="text-purple-600 text-4xl font-bold">
              {(forecast.forecastedUtilization * 100).toFixed(0)}%
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Bazując na ostatnich 14 dniach
            </p>
          </div>
        </div>

        {/* Key info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-4">Informacje o grupie</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Początek umowy</p>
                <p className="font-semibold">{group.startDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Koniec umowy</p>
                <p className="font-semibold">{group.endDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Dni do końca</p>
                <p className="font-semibold">{daysRemaining}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Średnie dzienne użycie</p>
                <p className="font-semibold">
                  {forecast.dailyUsageRate.toFixed(0)} min/dzień
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-4">Kierownik HR</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Nazwa</p>
                <p className="font-semibold">{group.hrManager.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold text-blue-600">{group.hrManager.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Telefon</p>
                <p className="font-semibold">{group.hrManager.phone}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="mb-8">
          <UtilizationChart
            data={forecast.dataPoints}
            title="Przebieg wykorzystania minut"
          />
        </div>

        {/* Tickets */}
        {tickets.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-4">Tickety grupy</h3>
            <div className="space-y-3">
              {tickets.map((ticket) => {
                let badgeClass = 'badge-low-risk';
                if (ticket.riskLevel === 'critical') {
                  badgeClass = 'badge-critical';
                } else if (ticket.riskLevel === 'high_risk') {
                  badgeClass = 'badge-high-risk';
                }

                return (
                  <div key={ticket.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{ticket.description}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Otwarte od: {ticket.createdAt}
                        </p>
                      </div>
                      <span className={badgeClass}>
                        {ticket.riskLevel === 'critical'
                          ? 'Krytyczne'
                          : ticket.riskLevel === 'high_risk'
                          ? 'Wysokie ryzyko'
                          : 'Niskie ryzyko'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
