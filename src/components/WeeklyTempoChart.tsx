'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { DailyUsage } from '@/lib/data';

interface WeeklyData {
  week: string;
  totalMinutes: number;
  isAboveAverage: boolean;
}

interface WeeklyTempoChartProps {
  dailyUsage: DailyUsage[];
  title?: string;
}

export default function WeeklyTempoChart({ dailyUsage, title }: WeeklyTempoChartProps) {
  // Group daily usage by week
  const weeklyMap: { [key: string]: number } = {};

  for (const usage of dailyUsage) {
    const date = new Date(usage.date);
    // Get ISO week number
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(weekStart.setDate(diff));
    const weekKey = monday.toISOString().split('T')[0];

    weeklyMap[weekKey] = (weeklyMap[weekKey] || 0) + usage.minutes;
  }

  // Get last 12 weeks
  const now = new Date();
  const weeks: WeeklyData[] = [];
  let totalUsage = 0;
  let count = 0;

  for (let i = 0; i < 12; i++) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - i * 7);
    weekStart.setHours(0, 0, 0, 0);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);

    const weekKey = weekStart.toISOString().split('T')[0];
    const minutesForWeek = weeklyMap[weekKey] || 0;

    if (minutesForWeek > 0) {
      totalUsage += minutesForWeek;
      count++;
    }

    const weekLabel = `${weekStart.getDate()}.${(weekStart.getMonth() + 1).toString().padStart(2, '0')}`;
    weeks.unshift({ week: weekLabel, totalMinutes: minutesForWeek, isAboveAverage: false });
  }

  // Calculate average and mark above average
  const average = count > 0 ? totalUsage / count : 0;
  weeks.forEach(w => {
    w.isAboveAverage = w.totalMinutes > average;
  });

  // Calculate trend
  const firstHalf = weeks.slice(0, 6);
  const secondHalf = weeks.slice(6);
  const avgFirst = firstHalf.length > 0
    ? firstHalf.reduce((sum, w) => sum + w.totalMinutes, 0) / firstHalf.length
    : 0;
  const avgSecond = secondHalf.length > 0
    ? secondHalf.reduce((sum, w) => sum + w.totalMinutes, 0) / secondHalf.length
    : 0;

  const isImproving = avgSecond > avgFirst;
  const trendArrow = isImproving ? '↑' : avgSecond < avgFirst ? '↓' : '→';
  const trendColor = isImproving ? 'text-green-600' : avgSecond < avgFirst ? 'text-red-600' : 'text-gray-600';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        {title && <h3 className="text-lg font-bold">{title}</h3>}
        <div className={`text-2xl font-bold ${trendColor}`}>
          {trendArrow}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={weeks} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="week"
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
          />
          <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value) => `${value} min`}
            labelFormatter={(label) => `Tydzień: ${label}`}
          />
          <Bar dataKey="totalMinutes" name="Minuty tygodniowo" radius={[8, 8, 0, 0]}>
            {weeks.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isAboveAverage ? '#10b981' : '#ef4444'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 flex justify-between text-sm text-gray-600">
        <div>
          Średnia: <span className="font-semibold">{Math.round(average)} min/tydz</span>
        </div>
        <div>
          Trend: <span className={`font-semibold ${trendColor}`}>
            {isImproving ? 'Wzrastający' : avgSecond < avgFirst ? 'Malejący' : 'Stabilny'}
          </span>
        </div>
      </div>
    </div>
  );
}
