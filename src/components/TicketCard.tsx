import Link from 'next/link';
import { Ticket } from '@/lib/tickets';

interface TicketCardProps {
  ticket: Ticket;
  activityCount?: number;
}

export default function TicketCard({ ticket, activityCount = 0 }: TicketCardProps) {
  // Determine risk badge styling
  let riskBadgeClass = 'bg-yellow-100 text-yellow-800';
  let riskLabel = 'Niskie ryzyko';

  if (ticket.riskLevel === 'critical') {
    riskBadgeClass = 'bg-red-100 text-red-800';
    riskLabel = 'Krytyczne';
  } else if (ticket.riskLevel === 'high_risk') {
    riskBadgeClass = 'bg-orange-100 text-orange-800';
    riskLabel = 'Wysokie ryzyko';
  }

  // Determine type badge styling
  let typeBadgeClass = 'bg-gray-100 text-gray-800';
  if (ticket.type === 'onboarding') {
    typeBadgeClass = 'bg-blue-100 text-blue-800';
  } else if (ticket.type === 'activity') {
    typeBadgeClass = 'bg-red-100 text-red-800';
  } else if (ticket.type === 'upsell') {
    typeBadgeClass = 'bg-green-100 text-green-800';
  }

  // Determine card border color based on type
  let borderColorClass = 'border-l-4 border-gray-400';
  if (ticket.type === 'onboarding') {
    borderColorClass = 'border-l-4 border-blue-500';
  } else if (ticket.type === 'activity') {
    borderColorClass = 'border-l-4 border-red-500';
  } else if (ticket.type === 'upsell') {
    borderColorClass = 'border-l-4 border-green-500';
  }

  return (
    <Link href={`/groups/${ticket.groupId}`}>
      <div className={`${borderColorClass} border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer bg-white`}>
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-lg">{ticket.companyName}</h3>
            <p className="text-sm text-gray-600">{ticket.groupName}</p>
          </div>
          <div className="flex flex-col gap-1">
            <span className={`${typeBadgeClass} px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap`}>
              {ticket.typeLabel}
            </span>
            <span className={`${riskBadgeClass} px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap`}>
              {riskLabel}
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-700 mb-3">{ticket.description}</p>

        <div className="grid grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-gray-600">Wykorzystanie</p>
            <p className="font-semibold">{ticket.utilizationPercent}%</p>
          </div>
          <div>
            <p className="text-gray-600">Oczekiwane</p>
            <p className="font-semibold">{ticket.expectedUtilizationPercent}%</p>
          </div>
          <div>
            <p className="text-gray-600">Dni otwarte</p>
            <p className="font-semibold">{ticket.daysOpen}</p>
          </div>
          <div>
            <p className="text-gray-600">Aktywności</p>
            <p className="font-semibold">{activityCount}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
