import Link from 'next/link';
import { Ticket } from '@/lib/tickets';

interface TicketCardProps {
  ticket: Ticket;
}

export default function TicketCard({ ticket }: TicketCardProps) {
  let badgeClass = 'badge-low-risk';
  let bgColor = 'bg-yellow-50';
  let riskLabel = 'Niskie ryzyko';

  if (ticket.riskLevel === 'critical') {
    badgeClass = 'badge-critical';
    bgColor = 'bg-red-50';
    riskLabel = 'Krytyczne';
  } else if (ticket.riskLevel === 'high_risk') {
    badgeClass = 'badge-high-risk';
    bgColor = 'bg-orange-50';
    riskLabel = 'Wysokie ryzyko';
  }

  return (
    <Link href={`/groups/${ticket.groupId}`}>
      <div className={`${bgColor} border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer`}>
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-lg">{ticket.companyName}</h3>
            <p className="text-sm text-gray-600">{ticket.groupName}</p>
          </div>
          <span className={badgeClass}>{riskLabel}</span>
        </div>

        <p className="text-sm text-gray-700 mb-3">{ticket.description}</p>

        <div className="grid grid-cols-3 gap-3 text-sm">
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
        </div>
      </div>
    </Link>
  );
}
