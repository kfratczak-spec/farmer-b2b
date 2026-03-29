import Link from 'next/link';
import { Group } from '@/lib/data';
import { calculateForecastStats } from '@/lib/forecast';

interface GroupCardProps {
  group: Group;
}

export default function GroupCard({ group }: GroupCardProps) {
  const stats = calculateForecastStats(group);
  const totalPercent = stats.currentUtilization * 100;
  const todayPercent = stats.todayUtilization * 100;
  const daysRemaining = stats.daysRemaining;

  // Kolory bazują na "% na dziś" — bo to mówi czy grupa jest na dobrej drodze
  let bgColor = 'bg-red-50';
  let barColor = 'bg-red-500';
  let todayLabel = 'text-red-700';

  if (todayPercent >= 80) {
    bgColor = 'bg-green-50';
    barColor = 'bg-green-500';
    todayLabel = 'text-green-700';
  } else if (todayPercent >= 60) {
    bgColor = 'bg-yellow-50';
    barColor = 'bg-yellow-500';
    todayLabel = 'text-yellow-700';
  } else if (todayPercent >= 40) {
    bgColor = 'bg-orange-50';
    barColor = 'bg-orange-500';
    todayLabel = 'text-orange-700';
  }

  return (
    <Link href={`/groups/${group.id}`}>
      <div className={`${bgColor} border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer`}>
        <h3 className="font-bold text-lg mb-2">{group.companyName}</h3>
        <p className="text-sm text-gray-600 mb-3">{group.name}</p>

        {/* % na dziś — główny wskaźnik */}
        <div className="mb-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">Wykorzystanie na dziś</span>
            <span className={`text-sm font-bold ${todayLabel}`}>{todayPercent.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`${barColor} h-2.5 rounded-full transition-all`}
              style={{ width: `${Math.min(todayPercent, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* % całości — dodatkowy wskaźnik */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-500">Wykorzystanie całości</span>
            <span className="text-xs font-semibold text-gray-600">{totalPercent.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-400 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(totalPercent, 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-gray-600">Użyte minuty</p>
            <p className="font-semibold">{group.usedMinutes.toLocaleString()} / {group.totalMinutes.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-600">Prognoza na koniec</p>
            <p className="font-semibold">{(stats.forecastedUtilization * 100).toFixed(0)}%</p>
          </div>
          <div>
            <p className="text-gray-600">Koniec</p>
            <p className="font-semibold">{group.endDate}</p>
          </div>
          <div>
            <p className="text-gray-600">Dni pozostało</p>
            <p className="font-semibold">{daysRemaining}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
