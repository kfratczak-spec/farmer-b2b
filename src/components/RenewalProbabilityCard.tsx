'use client';

interface RenewalProbabilityCardProps {
  probability: number;
  classification: string;
}

export default function RenewalProbabilityCard({
  probability,
  classification,
}: RenewalProbabilityCardProps) {
  // Determine color based on probability
  let bgColor = 'bg-red-50';
  let borderColor = 'border-red-200';
  let textColor = 'text-red-700';
  let headingColor = 'text-red-600';

  if (probability >= 80) {
    bgColor = 'bg-green-50';
    borderColor = 'border-green-200';
    textColor = 'text-green-700';
    headingColor = 'text-green-600';
  } else if (probability >= 60) {
    bgColor = 'bg-blue-50';
    borderColor = 'border-blue-200';
    textColor = 'text-blue-700';
    headingColor = 'text-blue-600';
  } else if (probability >= 40) {
    bgColor = 'bg-yellow-50';
    borderColor = 'border-yellow-200';
    textColor = 'text-yellow-700';
    headingColor = 'text-yellow-600';
  } else if (probability >= 20) {
    bgColor = 'bg-orange-50';
    borderColor = 'border-orange-200';
    textColor = 'text-orange-700';
    headingColor = 'text-orange-600';
  }

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-8 shadow-sm col-span-1 md:col-span-4`}>
      <div className="text-center">
        <p className="text-gray-600 text-sm font-medium mb-3">Prawdopodobieństwo Wznowienia Umowy</p>

        <div className="flex justify-center items-baseline gap-4 mb-4">
          <p className={`${headingColor} text-6xl font-bold`}>
            {probability}%
          </p>
          <div className="text-left">
            <p className={`${textColor} font-semibold text-lg`}>
              {classification}
            </p>
            {probability >= 80 && (
              <p className="text-sm text-green-600">Szansa bardzo wysoka</p>
            )}
            {probability >= 60 && probability < 80 && (
              <p className="text-sm text-blue-600">Szansa wysoka</p>
            )}
            {probability >= 40 && probability < 60 && (
              <p className="text-sm text-yellow-600">Szansa średnia</p>
            )}
            {probability >= 20 && probability < 40 && (
              <p className="text-sm text-orange-600">Szansa niska</p>
            )}
            {probability < 20 && (
              <p className="text-sm text-red-600">Szansa bardzo niska</p>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-600 mt-4">
          Wyliczone na podstawie wykorzystania, trendu i czasu pozostałego
        </p>
      </div>
    </div>
  );
}
