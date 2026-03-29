interface StatsCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}

export default function StatsCard({
  label,
  value,
  change,
  changeType = 'neutral',
}: StatsCardProps) {
  let changeColor = 'text-gray-600';
  if (changeType === 'positive') changeColor = 'text-green-600';
  if (changeType === 'negative') changeColor = 'text-red-600';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <p className="text-gray-600 text-sm font-medium mb-2">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {change && (
        <p className={`text-sm mt-2 ${changeColor}`}>{change}</p>
      )}
    </div>
  );
}
