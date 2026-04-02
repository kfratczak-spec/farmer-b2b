'use client';

import { SalespersonScore } from '@/lib/scoring';

interface ScoringCardProps {
  score: SalespersonScore;
}

export default function ScoringCard({ score }: ScoringCardProps) {
  const getScoreColor = (total: number) => {
    if (total >= 75) return 'text-green-600';
    if (total >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (total: number) => {
    if (total >= 75) return 'bg-green-50 border-green-200';
    if (total >= 50) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getProgressBarColor = (score: number) => {
    if (score >= 20) return 'bg-green-500';
    if (score >= 15) return 'bg-blue-500';
    if (score >= 10) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const ProgressBar = ({ label, value, max }: { label: string; value: number; max: number }) => (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-gray-700">{label}</span>
        <span className="text-xs font-semibold text-gray-800">{value}/{max}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${getProgressBarColor(value)}`}
          style={{ width: `${(value / max) * 100}%` }}
        ></div>
      </div>
    </div>
  );

  return (
    <div className={`rounded-lg border p-6 shadow-sm ${getScoreBgColor(score.totalScore)}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">{score.salesPersonName}</h3>
        <div className={`text-3xl font-bold ${getScoreColor(score.totalScore)}`}>
          {score.totalScore}
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        {score.totalActivities} aktywności • {score.ticketsHandled} ticketów
      </p>

      <div className="space-y-3">
        <ProgressBar label="Czas reakcji" value={score.reactionScore} max={25} />
        <ProgressBar label="Rozwiązane tickety" value={score.resolutionScore} max={25} />
        <ProgressBar label="Regularność" value={score.regularityScore} max={25} />
        <ProgressBar label="Upsell" value={score.upsellScore} max={25} />
      </div>

      <div className="mt-4 pt-4 border-t border-gray-300 text-xs text-gray-600">
        <p>Średni czas reakcji: <span className="font-semibold">{score.avgReactionDays.toFixed(1)} dni</span></p>
        <p>Rozwiązane: <span className="font-semibold">{score.resolvedTickets} z {score.ticketsHandled}</span></p>
      </div>
    </div>
  );
}
