'use client';

import { Activity, ActivityType } from '@/lib/activities';

interface ActivityListProps {
  activities: Activity[];
}

export default function ActivityList({ activities }: ActivityListProps) {
  const getActivityBadge = (type: ActivityType) => {
    switch (type) {
      case 'phone':
        return {
          emoji: '📞',
          label: 'Telefon',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200',
        };
      case 'email':
        return {
          emoji: '📧',
          label: 'Email',
          bgColor: 'bg-purple-50',
          textColor: 'text-purple-700',
          borderColor: 'border-purple-200',
        };
      case 'meeting':
        return {
          emoji: '🤝',
          label: 'Spotkanie',
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          borderColor: 'border-green-200',
        };
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
      return 'Przed chwilą';
    } else if (diffMins < 60) {
      return `Przed ${diffMins} min`;
    } else if (diffHours < 24) {
      return `Przed ${diffHours} h`;
    } else if (diffDays < 7) {
      return `Przed ${diffDays}d`;
    } else {
      return date.toLocaleDateString('pl-PL');
    }
  };

  // Sort newest first
  const sortedActivities = [...activities].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (sortedActivities.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-600 text-sm">
        Brak aktywności
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedActivities.map((activity) => {
        const badge = getActivityBadge(activity.type);

        return (
          <div
            key={activity.id}
            className={`${badge.bgColor} border ${badge.borderColor} rounded-lg p-3`}
          >
            <div className="flex items-start gap-3">
              <div className="text-xl">{badge.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`${badge.textColor} text-sm font-medium`}>
                    {badge.label}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(activity.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{activity.note}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Dodane przez: {activity.createdBy}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
