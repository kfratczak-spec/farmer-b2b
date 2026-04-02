'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import UtilizationChart from '@/components/UtilizationChart';
import WeeklyTempoChart from '@/components/WeeklyTempoChart';
import EngagementStats from '@/components/EngagementStats';
import KeyDatesTimeline from '@/components/KeyDatesTimeline';
import RenewalProbabilityCard from '@/components/RenewalProbabilityCard';
import ActivityForm from '@/components/ActivityForm';
import ActivityList from '@/components/ActivityList';
import { Group } from '@/lib/data';
import { Ticket } from '@/lib/tickets';
import { Activity } from '@/lib/activities';
import { ForecastStats, calculateForecastStats } from '@/lib/forecast';

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [user, setUser] = useState<any>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [forecast, setForecast] = useState<ForecastStats | null>(null);
  const [activitiesByTicket, setActivitiesByTicket] = useState<
    Record<string, Activity[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [closingTicket, setClosingTicket] = useState<string | null>(null);

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
        const allTickets = [...(data.tickets || []), ...(data.closedTickets || [])];
        const groupTickets = allTickets.filter((t: Ticket) => t.groupId === params.id);
        setTickets(groupTickets);

        // Fetch activities for all tickets in this group
        const ticketActivities: Record<string, Activity[]> = {};
        for (const ticket of groupTickets) {
          try {
            const activitiesRes = await fetch(
              `/api/activities?ticketId=${ticket.id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const activitiesData = await activitiesRes.json();
            ticketActivities[ticket.id] = activitiesData.activities || [];
          } catch (err) {
            console.error('Błąd pobierania aktywności:', err);
            ticketActivities[ticket.id] = [];
          }
        }
        setActivitiesByTicket(ticketActivities);
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
  const daysRemaining = forecast.daysRemaining;

  // Colors based on daily utilization
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

  // Separate open and closed tickets
  const openTickets = tickets.filter(t => t.status === 'open');
  const closedTickets = tickets.filter(t => t.status === 'closed');

  const handleCloseTicket = async (ticketId: string, reason: 'upsell_won' | 'upsell_lost' | 'manual') => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setClosingTicket(ticketId);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/close`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        // Remove the closed ticket from the open tickets list
        setTickets((prev) => [
          ...prev.filter((t) => t.id !== ticketId),
          // In a real app, this would fetch the closed ticket data properly
          {
            ...prev.find((t) => t.id === ticketId),
            status: 'closed',
            closedAt: new Date().toISOString().split('T')[0],
            closedReason: reason === 'upsell_won' ? 'manual_upsell_won' : reason === 'upsell_lost' ? 'manual_upsell_lost' : 'manual',
          } as any,
        ]);
      }
    } catch (error) {
      console.error('Błąd zamykania ticketu:', error);
    } finally {
      setClosingTicket(null);
    }
  };

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

        {/* Main stats grid */}
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

        {/* Renewal probability card */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <RenewalProbabilityCard
            probability={forecast.renewalProbability}
            classification={forecast.renewalProbabilityClass}
          />
        </div>

        {/* Main utilization chart */}
        <div className="mb-8">
          <UtilizationChart
            data={forecast.dataPoints}
            title="Przebieg wykorzystania minut"
          />
        </div>

        {/* Weekly tempo chart */}
        <div className="mb-8">
          <WeeklyTempoChart
            dailyUsage={group.dailyUsage}
            title="Tempo tygodniowe"
          />
        </div>

        {/* Two-column info section */}
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

        {/* Engagement stats */}
        <div className="mb-8">
          <EngagementStats
            dailyUsage={group.dailyUsage}
            title="Statystyki zaangażowania"
          />
        </div>

        {/* Key dates timeline */}
        <div className="mb-8">
          <KeyDatesTimeline
            startDate={group.startDate}
            endDate={group.endDate}
            dailyUsage={group.dailyUsage}
            title="Oś czasu ważnych dat"
          />
        </div>

        {/* Tickets section */}
        {(openTickets.length > 0 || closedTickets.length > 0) && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-6">Tickety grupy</h3>

            {/* Open tickets */}
            {openTickets.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-red-600 mb-4">Otwarte tickety ({openTickets.length})</h4>
                <div className="space-y-3">
                  {openTickets.map((ticket) => {
                    // Risk badge styling
                    let riskBadgeBg = 'bg-yellow-100';
                    let riskBadgeText = 'text-yellow-800';
                    let riskBadgeLabel = 'Niskie ryzyko';

                    if (ticket.riskLevel === 'critical') {
                      riskBadgeBg = 'bg-red-100';
                      riskBadgeText = 'text-red-800';
                      riskBadgeLabel = 'Krytyczne';
                    } else if (ticket.riskLevel === 'high_risk') {
                      riskBadgeBg = 'bg-orange-100';
                      riskBadgeText = 'text-orange-800';
                      riskBadgeLabel = 'Wysokie ryzyko';
                    }

                    // Type badge styling
                    let typeBadgeBg = 'bg-gray-100';
                    let typeBadgeText = 'text-gray-800';
                    let borderColor = 'border-l-gray-500';

                    if (ticket.type === 'onboarding') {
                      typeBadgeBg = 'bg-blue-100';
                      typeBadgeText = 'text-blue-800';
                      borderColor = 'border-l-4 border-blue-500';
                    } else if (ticket.type === 'activity') {
                      typeBadgeBg = 'bg-red-100';
                      typeBadgeText = 'text-red-800';
                      borderColor = 'border-l-4 border-red-500';
                    } else if (ticket.type === 'upsell') {
                      typeBadgeBg = 'bg-green-100';
                      typeBadgeText = 'text-green-800';
                      borderColor = 'border-l-4 border-green-500';
                    }

                    return (
                      <div key={ticket.id} className="space-y-3">
                        <Link href={`/tickets?highlight=${ticket.id}`}>
                          <div className={`${borderColor} bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer`}>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">{ticket.description}</p>
                                <p className="text-sm text-gray-600 mt-1">
                                  Otwarte od: {ticket.createdAt} ({ticket.daysOpen} dni)
                                </p>
                                <div className="flex gap-4 mt-2 text-xs text-gray-600">
                                  <span>Użycie: {ticket.utilizationPercent}%</span>
                                  <span>Oczekiwane: {ticket.expectedUtilizationPercent}%</span>
                                </div>
                              </div>
                              <div className="flex flex-col gap-2 ml-4">
                                <span className={`${typeBadgeBg} ${typeBadgeText} px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap`}>
                                  {ticket.typeLabel}
                                </span>
                                <span className={`${riskBadgeBg} ${riskBadgeText} px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap`}>
                                  {riskBadgeLabel}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>

                        {/* Close buttons for upsell tickets */}
                        {ticket.type === 'upsell' && (
                          <div className="flex gap-2 pl-4">
                            <button
                              onClick={() => handleCloseTicket(ticket.id, 'upsell_won')}
                              disabled={closingTicket === ticket.id}
                              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                            >
                              {closingTicket === ticket.id ? 'Zamykanie...' : 'Upsell zrealizowany'}
                            </button>
                            <button
                              onClick={() => handleCloseTicket(ticket.id, 'upsell_lost')}
                              disabled={closingTicket === ticket.id}
                              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                            >
                              {closingTicket === ticket.id ? 'Zamykanie...' : 'Klient odmówił'}
                            </button>
                          </div>
                        )}

                        {/* Activity Form and List for this ticket */}
                        <div className="pl-4 space-y-3 border-l-2 border-gray-200">
                          <ActivityForm
                            ticketId={ticket.id}
                            groupId={ticket.groupId}
                            onActivityAdded={async () => {
                              // Refresh activities for this ticket
                              const token = localStorage.getItem('token');
                              try {
                                const res = await fetch(
                                  `/api/activities?ticketId=${ticket.id}`,
                                  { headers: { Authorization: `Bearer ${token}` } }
                                );
                                const data = await res.json();
                                setActivitiesByTicket((prev) => ({
                                  ...prev,
                                  [ticket.id]: data.activities || [],
                                }));
                              } catch (error) {
                                console.error('Błąd pobierania aktywności:', error);
                              }
                            }}
                          />
                          <ActivityList
                            activities={activitiesByTicket[ticket.id] || []}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Closed tickets */}
            {closedTickets.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-600 mb-4">Historia zamkniętych ticketów ({closedTickets.length})</h4>
                <div className="space-y-2">
                  {closedTickets.map((ticket: any) => {
                    // Get close reason label in Polish
                    const reasonLabels: Record<string, string> = {
                      'auto_utilization_improved': 'Zamknięty automatycznie — wykorzystanie wróciło do normy',
                      'auto_onboarding_completed': 'Zamknięty automatycznie — onboarding zakończony',
                      'manual_upsell_won': 'Zamknięty — upsell zrealizowany',
                      'manual_upsell_lost': 'Zamknięty — klient odmówił',
                      'manual': 'Zamknięty ręcznie',
                    };
                    const reasonLabel = reasonLabels[ticket.closedReason] || 'Zamknięty';

                    return (
                      <Link
                        key={ticket.id}
                        href={`/tickets?highlight=${ticket.id}`}
                      >
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer opacity-75">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-gray-600 line-through">{ticket.description}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {reasonLabel}
                              </p>
                              <p className="text-xs text-gray-500">
                                Zamknięty: {ticket.closedAt}
                              </p>
                            </div>
                            <span className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs font-medium whitespace-nowrap ml-2">
                              Zamknięty
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
