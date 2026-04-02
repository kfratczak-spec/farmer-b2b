'use client';

import { SalespersonScore } from '@/lib/scoring';

interface ScoringRankingProps {
  scores: SalespersonScore[];
  teamAverage: number;
}

export default function ScoringRanking({ scores, teamAverage }: ScoringRankingProps) {
  const getScoreBadgeColor = (score: number) => {
    if (score >= 75) return 'bg-green-100 text-green-800';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Ranking sprzedawców</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">#</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Imię i nazwisko</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Wynik</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Aktywności</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Rozwiązane</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {scores.map((score, index) => (
              <tr
                key={score.salesPersonName}
                className={index === 0 ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}
              >
                <td className="px-6 py-4 text-sm font-bold text-gray-900">
                  {index === 0 ? '🏆' : '#'}{index + 1}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {score.salesPersonName}
                </td>
                <td className="px-6 py-4 text-right">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getScoreBadgeColor(
                      score.totalScore
                    )}`}
                  >
                    {score.totalScore}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-600">
                  {score.totalActivities}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-600">
                  {score.resolvedTickets}/{score.ticketsHandled}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {scores.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-700">Średnia zespołu</span>
          <span className="text-lg font-bold text-blue-600">{teamAverage}</span>
        </div>
      )}

      {scores.length === 0 && (
        <div className="px-6 py-8 text-center text-gray-600">
          Brak danych do wyświetlenia
        </div>
      )}
    </div>
  );
}
