'use client';

import { useState } from 'react';
import { ActivityType } from '@/lib/activities';

interface ActivityFormProps {
  ticketId: string;
  groupId: string;
  onActivityAdded: () => void;
}

export default function ActivityForm({
  ticketId,
  groupId,
  onActivityAdded,
}: ActivityFormProps) {
  const [type, setType] = useState<ActivityType | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!type) {
      setError('Wybierz typ aktywności');
      return;
    }

    if (note.trim().length < 3) {
      setError('Notatka musi mieć co najmniej 3 znaki');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ticketId,
          groupId,
          type,
          note: note.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Błąd przy dodawaniu aktywności');
      }

      // Reset form
      setType(null);
      setNote('');
      setSuccess(true);

      // Hide success message after 2 seconds
      setTimeout(() => setSuccess(false), 2000);

      // Call parent callback to refresh activities
      onActivityAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd przy dodawaniu aktywności');
    } finally {
      setLoading(false);
    }
  };

  const typeButtons: { value: ActivityType; label: string; emoji: string }[] = [
    { value: 'phone', label: 'Telefon', emoji: '📞' },
    { value: 'email', label: 'Email', emoji: '📧' },
    { value: 'meeting', label: 'Spotkanie', emoji: '🤝' },
  ];

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
      <div className="space-y-3">
        {/* Type selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Typ aktywności
          </label>
          <div className="flex gap-2">
            {typeButtons.map((btn) => (
              <button
                key={btn.value}
                type="button"
                onClick={() => setType(btn.value)}
                className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
                  type === btn.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="mr-1">{btn.emoji}</span>
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Note input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notatka
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Opisz szczegóły aktywności..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            {note.length} / 500 znaków
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
            Aktywność dodana pomyślnie!
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !type || note.trim().length < 3}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Dodawanie...' : 'Dodaj aktywność'}
        </button>
      </div>
    </form>
  );
}
