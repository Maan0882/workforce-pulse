'use client';
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ActivityLog } from '@/utils/dataProcessing';

// Helper to get ISO week number
function getWeekNumber(d: Date) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
}

export default function WoWTrend({ activities }: { activities: ActivityLog[] }) {
  const data = useMemo(() => {
    const weeklyStats: Record<string, { totalMins: number, repMins: number }> = {};
    
    activities.forEach(a => {
      if (!a.isValid) return;
      
      const ts = new Date(a.timestamp);
      // Construct a string like "Wk 41"
      const week = `Wk ${getWeekNumber(ts)}`;
      
      if (!weeklyStats[week]) weeklyStats[week] = { totalMins: 0, repMins: 0 };
      
      weeklyStats[week].totalMins += a.durationMinutes;
      if (a.isRepetitive) weeklyStats[week].repMins += a.durationMinutes;
    });

    return Object.keys(weeklyStats).sort().map(week => {
      const s = weeklyStats[week];
      return {
        week,
        repShare: s.totalMins > 0 ? Math.round((s.repMins / s.totalMins) * 100) : 0
      };
    });
  }, [activities]);

  return (
    <div style={{ width: '100%', height: 250 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
          <XAxis dataKey="week" stroke="var(--text-secondary)" />
          <YAxis stroke="var(--text-secondary)" unit="%" />
          <Tooltip contentStyle={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }} />
          <Line type="monotone" dataKey="repShare" stroke="var(--warning-color)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
