'use client';

import { DailyUsage } from '@/lib/data';

interface KeyDatesTimelineProps {
  startDate: string;
  endDate: string;
  dailyUsage: DailyUsage[];
  title?: string;
}

export default function KeyDatesTimeline({
  startDate,
  endDate,
  dailyUsage,
  title,
}: KeyDatesTimelineProps) {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = now.getTime() - start.getTime();
  const progressPercent = Math.min((elapsedMs / totalMs) * 100, 100);

  // Calculate milestone dates
  const duration = totalMs / (1000 * 60 * 60 * 24);
  const milestones = [
    { percent: 0.25, label: '25%', daysFromStart: (duration * 0.25) },
    { percent: 0.5, label: '50%', daysFromStart: (duration * 0.5) },
    { percent: 0.75, label: '75%', daysFromStart: (duration * 0.75) },
  ];

  // Calculate days remaining
  const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // Find when utilization started dropping (if applicable)
  let droppingDate = null;
  if (dailyUsage.length > 30) {
    const last30 = dailyUsage.slice(-30);
    const prev30Start = dailyUsage.length >= 60 ? dailyUsage.slice(-60, -30) : [];

    if (last30.length > 0 && prev30Start.length > 0) {
      const avgLast30 = last30.reduce((sum, du) => sum + du.minutes, 0) / last30.length;
      const avgPrev30 = prev30Start.reduce((sum, du) => sum + du.minutes, 0) / prev30Start.length;

      if (avgLast30 < avgPrev30 * 0.8) {
        // Find approximate date when drop started
        const dropThreshold = avgPrev30 * 0.9;
        for (let i = dailyUsage.length - 30; i < dailyUsage.length; i++) {
          if (dailyUsage[i].minutes < dropThreshold) {
            droppingDate = dailyUsage[i].date;
            break;
          }
        }
      }
    }
  }

  // Get time-remaining color
  let remainingColor = 'text-green-600';
  let remainingBg = 'bg-green-50';
  if (daysRemaining < 30) {
    remainingColor = 'text-red-600';
    remainingBg = 'bg-red-50';
  } else if (daysRemaining < 60) {
    remainingColor = 'text-orange-600';
    remainingBg = 'bg-orange-50';
  } else if (daysRemaining < 90) {
    remainingColor = 'text-yellow-600';
    remainingBg = 'bg-yellow-50';
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      {title && <h3 className="text-lg font-bold mb-6">{title}</h3>}

      {/* Timeline bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Początek: {formatDate(startDate)}</span>
          <span>Koniec: {formatDate(endDate)}</span>
        </div>

        <div className="relative bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Today marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-600 rounded-full border-2 border-white -ml-2"
            style={{ left: `${progressPercent}%` }}
            title={`Dzisiaj: ${progressPercent.toFixed(0)}%`}
          />

          {/* Milestone markers */}
          {milestones.map((milestone) => (
            <div
              key={milestone.label}
              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-400 rounded-full -ml-1"
              style={{ left: `${milestone.percent * 100}%` }}
              title={`${milestone.label} czasu`}
            />
          ))}
        </div>

        <div className="flex justify-between text-xs text-gray-500 mt-2">
          {milestones.map((milestone) => (
            <span key={milestone.label}>{milestone.label}</span>
          ))}
        </div>
      </div>

      {/* Key dates grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Start date */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-2">Data początkowa</p>
          <p className="font-semibold text-gray-900">{formatDate(startDate)}</p>
          <p className="text-xs text-gray-600 mt-1">
            Łącznie dni: {Math.round(duration)}
          </p>
        </div>

        {/* Days remaining */}
        <div className={`${remainingBg} border border-gray-200 rounded-lg p-4`}>
          <p className="text-sm text-gray-600 mb-2">Dni do końca</p>
          <p className={`${remainingColor} text-3xl font-bold`}>
            {daysRemaining}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {daysRemaining < 30 ? 'Krytyczne!' : daysRemaining < 60 ? 'Zostało mało czasu' : 'Wystarczająco czasu'}
          </p>
        </div>

        {/* End date */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-2">Data końcowa</p>
          <p className="font-semibold text-gray-900">{formatDate(endDate)}</p>
          <p className="text-xs text-gray-600 mt-1">
            Postęp: {Math.round(progressPercent)}%
          </p>
        </div>
      </div>

      {/* Alerts */}
      <div className="space-y-2">
        {daysRemaining < 30 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <span className="text-red-600 font-bold text-lg">!</span>
            <div>
              <p className="text-sm font-semibold text-red-900">Krytyczne: Mniej niż 30 dni</p>
              <p className="text-xs text-red-700">Umowa wygasa wkrótce. Rozważ wznowienie lub rozszerzenie.</p>
            </div>
          </div>
        )}

        {daysRemaining >= 30 && daysRemaining < 60 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
            <span className="text-orange-600 font-bold text-lg">!</span>
            <div>
              <p className="text-sm font-semibold text-orange-900">Ostrzeżenie: Mniej niż 60 dni</p>
              <p className="text-xs text-orange-700">Warto rozpocząć rozmowy o wznowieniu umowy.</p>
            </div>
          </div>
        )}

        {daysRemaining >= 60 && daysRemaining < 90 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
            <span className="text-yellow-600 font-bold text-lg">!</span>
            <div>
              <p className="text-sm font-semibold text-yellow-900">Info: Mniej niż 90 dni</p>
              <p className="text-xs text-yellow-700">Zaplanuj spotkanie z klientem w sprawie odnowienia.</p>
            </div>
          </div>
        )}

        {droppingDate && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-start gap-2">
            <span className="text-purple-600 font-bold text-lg">↓</span>
            <div>
              <p className="text-sm font-semibold text-purple-900">Analiza: Spadek użytkowania</p>
              <p className="text-xs text-purple-700">
                Użytkowanie spadło około {formatDate(droppingDate)}. Może wskazywać na problemy.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
