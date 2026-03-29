import Link from 'next/link';
import { Group } from '@/lib/data';

interface GroupCardProps {
  group: Group;
}

export default function GroupCard({ group }: GroupCardProps) {
  const utilization = (group.usedMinutes / group.totalMinutes) * 100;
  const daysRemaining = Math.ceil(
    (new Date(group.endDate).getTime() - new Date('2026-03-29').getTime()) /
      (1000 * 60 * 60 * 24)
  );

  let bgColor = 'bg-red-50';
  let barColor = 'bg-red-500';

  if (utilization >= 80) {
    bgColor = 'bg-green-50';
    barColor = 'bg-green-500';
  } else if (utilization >= 60) {
    bgColor = 'bg-yellow-50';
    barColor = 'bg-yellow-500';
  } else if (utilization >= 40) {
    bgColor = 'bg-orange-50';
    barColor = 'bg-orange-500';
  }

  return (
    <Link href={`/groups/${group.id}`}>
      <div className={`${bgColor} border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer`}>
        <h3 className="font-bold text-lg mb-2">{group.companyName}</h3>
        <p className="text-sm text-gray-600 mb-3">{group.name}</p>

        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">Wykorzystanie</span>
            <span className="text-sm font-bold">{utilization.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`${barColor} h-2 rounded-full transition-all`}
              style={{ width: `${Math.min(utilization, 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-gray-600">Użyte minuty</p>
            <p className="font-semibold">{group.usedMinutes.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-600">Razem minut</p>
            <p className="font-semibold">{group.totalMinutes.toLocaleString()}</p>
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
