'use client';

import { DailyUsage } from '@/lib/data';

interface EngagementStatsProps {
  dailyUsage: DailyUsage[];
  title?: string;
}

export default function EngagementStats({ dailyUsage, title }: EngagementStatsProps) {
  const now = new Date();

  // Get last 7 days
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const last7Days = dailyUsage.filter(du => {
    const duDate = new Date(du.date);
    return duDate >= sevenDaysAgo && duDate <= now;
  });

  const avg7Days = last7Days.length > 0
    ? last7Days.reduce((sum, du) => sum + du.minutes, 0) / 7
    : 0;

  // Get last 30 days
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const last30Days = dailyUsage.filter(du => {
    const duDate = new Date(du.date);
    return duDate >= thirtyDaysAgo && duDate <= now;
  });

  const avg30Days = last30Days.length > 0
    ? last30Days.reduce((sum, du) => sum + du.minutes, 0) / 30
    : 0;

  // Count zero usage days in last 30 days
  const zeroDaysCount = last30Days.filter(du => du.minutes === 0).length;

  // Find most active day of week
  const dayUsage: { [key: number]: number } = {};
  const dayCounts: { [key: number]: number } = {};
  const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

  for (const usage of dailyUsage) {
    const date = new Date(usage.date);
    const dayOfWeek = date.getDay();
    dayUsage[dayOfWeek] = (dayUsage[dayOfWeek] || 0) + usage.minutes;
    dayCounts[dayOfWeek] = (dayCounts[dayOfWeek] || 0) + 1;
  }

  let mostActiveDay = 0;
  let maxAverage = 0;
  for (let i = 0; i < 7; i++) {
    const avg = (dayUsage[i] || 0) / (dayCounts[i] || 1);
    if (avg > maxAverage) {
      maxAverage = avg;
      mostActiveDay = i;
    }
  }

  // Determine engagement trend
  const engagementTrend = avg7Days > avg30Days
    ? { text: 'Wzrastające', color: 'text-green-600', bgColor: 'bg-green-50' }
    : avg7Days < avg30Days * 0.8
    ? { text: 'Malejące', color: 'text-red-600', bgColor: 'bg-red-50' }
    : { text: 'Stabilne', color: 'text-gray-600', bgColor: 'bg-gray-50' };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      {title && <h3 className="text-lg font-bold mb-4">{title}</h3>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Engagement Trend */}
        <div className={`${engagementTrend.bgColor} border border-gray-200 rounded-lg p-4`}>
          <p className="text-sm text-gray-600 mb-2">Zaangażowanie grupy</p>
          <p className={`${engagementTrend.color} text-2xl font-bold`}>
            {engagementTrend.text}
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Ostatnie 7 dni vs 30 dni
          </p>
        </div>

        {/* Daily Usage Comparison */}
        <div className="bg-blue-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-2">Średnie dzienne użycie</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-blue-600">
              {Math.round(avg7Days)} min
            </p>
            <p className="text-xs text-gray-600">
              vs {Math.round(avg30Days)} min (średnia)
            </p>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            {avg7Days > avg30Days ? '+' : ''}{Math.round(((avg7Days - avg30Days) / avg30Days) * 100)}% zmiana
          </p>
        </div>

        {/* Zero Usage Days */}
        <div className={zeroDaysCount > 5 ? 'bg-orange-50' : 'bg-white'} >
          <div className={`${zeroDaysCount > 5 ? 'border-orange-200' : 'border-gray-200'} border rounded-lg p-4`}>
            <p className="text-sm text-gray-600 mb-2">Dni bez użycia (ostatnie 30 dni)</p>
            <p className={`text-2xl font-bold ${zeroDaysCount > 5 ? 'text-orange-600' : 'text-gray-700'}`}>
              {zeroDaysCount}
            </p>
            <p className="text-xs text-gray-600 mt-2">
              {zeroDaysCount > 10 ? 'Uwaga: wysoki wskaźnik bezczynności' : 'Normalny poziom'}
            </p>
          </div>
        </div>

        {/* Most Active Day */}
        <div className="bg-purple-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-2">Najaktywniejszy dzień tygodnia</p>
          <p className="text-2xl font-bold text-purple-600">
            {dayNames[mostActiveDay]}
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Średnia: {Math.round(maxAverage)} min
          </p>
        </div>
      </div>
    </div>
  );
}
