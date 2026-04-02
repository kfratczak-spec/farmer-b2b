'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import ScoringCard from '@/components/ScoringCard';
import ScoringRanking from '@/components/ScoringRanking';
import StatsCard from '@/components/StatsCard';
import { SalespersonScore } from '@/lib/scoring';
import { Activity } from '@/lib/activities';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ScoringResponse {
  success: boolean;
  scores: SalespersonScore[];
  teamAverage: number;
}

interface ActivityData {
  activities: Activity[];
  stats: {
    thisWeek: number;
    thisMonth: number;
    byType: {
      phone: number;
      email: number;
      meeting: number;
    };
  };
}

const ACTIVITY_COLORS = {
  phone: '#3b82f6',
  email: '#10b981',
  meeting: '#f59e0b',
};

export default function ActivityDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  const handleDownloadReport = async () => {
    setDownloadingReport(true);
    try {
      const token = localStorage.getItem('token');
      const reportType = user?.role === 'head_of_sales' ? 'full' : 'personal';
      const response = await fetch(`/api/reports?type=${reportType}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to download report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `raport-farmer-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Błąd pobierania raportu:', error);
      alert('Nie udało się pobrać raportu');
    } finally {
      setDownloadingReport(false);
    }
  };
  const [scores, setScores] = useState<SalespersonScore[]>([]);
  const [teamAverage, setTeamAverage] = useState(0);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityStats, setActivityStats] = useState({
    thisWeek: 0,
    thisMonth: 0,
    byType: { phone: 0, email: 0, meeting: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [downloadingReport, setDownloadingReport] = useState(false);

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
        const [scoringRes, activitiesRes] = await Promise.all([
          fetch('/api/scoring', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/activities', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const scoringData = (await scoringRes.json()) as ScoringResponse;
        const activitiesData = (await activitiesRes.json()) as ActivityData;

        setScores(scoringData.scores || []);
        setTeamAverage(scoringData.teamAverage || 0);
        setActivities((activitiesData.activities || []).slice(0, 20));

        // Calculate stats
        const allActivities = activitiesData.activities || [];
        const now = new Date();
        let thisWeek = 0;
        let thisMonth = 0;
        const byType = { phone: 0, email: 0, meeting: 0 };

        allActivities.forEach((activity) => {
          const actDate = new Date(activity.createdAt);
          const diffMs = now.getTime() - actDate.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);

          if (diffDays <= 7) thisWeek++;
          if (diffDays <= 30) thisMonth++;

          byType[activity.type]++;
        });

        setActivityStats({ thisWeek, thisMonth, byType });
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

  const isHeadOfSales = user.role === 'head_of_sales';

  // Prepare data for pie chart
  const pieData = [
    { name: 'Telefon', value: activityStats.byType.phone },
    { name: 'Email', value: activityStats.byType.email },
    { name: 'Spotkanie', value: activityStats.byType.meeting },
  ].filter(d => d.value > 0);

  // Get top performer
  const topPerformer = scores.length > 0 ? scores[0] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome section */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isHeadOfSales ? 'Panel Aktywności Zespołu' : 'Panel Aktywności'}
              </h1>
              <p className="text-gray-600 mt-2">
                {isHeadOfSales
                  ? 'Przegląd wydajności i aktywności całego zespołu sprzedażowego'
                  : 'Twoje wyniki i aktywności'}
              </p>
            </div>
            <button
              onClick={handleDownloadReport}
              disabled={downloadingReport}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>{downloadingReport ? 'Generowanie...' : 'Pobierz raport'}</span>
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatsCard label="Aktywności w tym tygodniu" value={activityStats.thisWeek} />
          <StatsCard label="Aktywności w tym miesiącu" value={activityStats.thisMonth} />
          {isHeadOfSales && <StatsCard label="Średnia zespołu" value={teamAverage} />}
        </div>

        {/* Top performer or personal score */}
        {isHeadOfSales ? (
          <>
            {/* Team ranking */}
            <div className="mb-8">
              <ScoringRanking scores={scores} teamAverage={teamAverage} />
            </div>

            {/* Top performer highlight */}
            {topPerformer && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Najlepszy wykonawca</h2>
                <div className="max-w-md">
                  <ScoringCard score={topPerformer} />
                </div>
              </div>
            )}

            {/* All salespeople scores */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Szczegółowe wyniki wszystkich</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scores.map((score) => (
                  <ScoringCard key={score.salesPersonName} score={score} />
                ))}
              </div>
            </div>
          </>
        ) : (
          // Personal score card for salesperson
          <>
            {scores.length > 0 ? (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Twój wynik</h2>
                <div className="max-w-md">
                  <ScoringCard score={scores[0]} />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-600 mb-8">
                Brak danych do wyświetlenia
              </div>
            )}
          </>
        )}

        {/* Activity breakdown */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Rozkład aktywności</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pie chart */}
            {pieData.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Po typie</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={ACTIVITY_COLORS[entry.name.toLowerCase().split(' ')[0] as keyof typeof ACTIVITY_COLORS] || '#8884d8'}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Stats by type */}
            <div className="space-y-3">
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ACTIVITY_COLORS.phone }}></div>
                    <span className="text-sm font-medium text-gray-700">Telefon</span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{activityStats.byType.phone}</span>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ACTIVITY_COLORS.email }}></div>
                    <span className="text-sm font-medium text-gray-700">Email</span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{activityStats.byType.email}</span>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ACTIVITY_COLORS.meeting }}></div>
                    <span className="text-sm font-medium text-gray-700">Spotkanie</span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{activityStats.byType.meeting}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent activities */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ostatnie aktywności</h2>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {activities.length === 0 ? (
              <div className="p-8 text-center text-gray-600">Brak aktywności</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Typ</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Sprzedawca</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Ticket</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Notatka</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {activities.map((activity) => (
                      <tr key={activity.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                              activity.type === 'phone'
                                ? 'bg-blue-100 text-blue-800'
                                : activity.type === 'email'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {activity.type === 'phone' ? 'Telefon' : activity.type === 'email' ? 'Email' : 'Spotkanie'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {activity.salesPersonName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{activity.ticketId}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{activity.note}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(activity.createdAt).toLocaleDateString('pl-PL')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
