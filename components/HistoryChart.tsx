import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SessionData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface HistoryChartProps {
  sessions: SessionData[];
}

const HistoryChart: React.FC<HistoryChartProps> = ({ sessions }) => {
  const { t } = useLanguage();
  const data = sessions.map((s, i) => ({
    name: `S${i + 1}`,
    score: s.aiScore,
    date: new Date(s.timestamp).toLocaleDateString()
  }));

  if (sessions.length === 0) return <div className="text-slate-500 text-sm">{t('noHistory')}</div>;

  return (
    <div className="h-48 w-full mt-4">
      <h3 className="text-slate-300 text-sm font-semibold mb-2">{t('accuracyTrend')}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
          <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
            itemStyle={{ color: '#60a5fa' }}
          />
          <Line 
            type="monotone" 
            dataKey="score" 
            stroke="#3b82f6" 
            strokeWidth={2} 
            dot={{ fill: '#3b82f6' }} 
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HistoryChart;