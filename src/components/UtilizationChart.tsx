'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ForecastDataPoint } from '@/lib/forecast';

interface UtilizationChartProps {
  data: ForecastDataPoint[];
  title?: string;
}

export default function UtilizationChart({ data, title }: UtilizationChartProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {title && <h3 className="text-lg font-bold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
            interval={Math.floor(data.length / 10)}
          />
          <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value) => `${value}%`}
            labelFormatter={(label) => `Data: ${label}`}
          />
          <Legend />
          <ReferenceLine
            x={new Date().toISOString().split('T')[0]}
            stroke="#ef4444"
            strokeDasharray="5 5"
            label={{ value: 'Dziś', position: 'top', fill: '#ef4444', fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Rzeczywiste"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="expected"
            stroke="#10b981"
            strokeWidth={2}
            name="Oczekiwane"
            strokeDasharray="5 5"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="#f59e0b"
            strokeWidth={2}
            name="Prognoza"
            strokeDasharray="5 5"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
