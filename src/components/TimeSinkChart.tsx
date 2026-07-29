'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ActivityLog } from '@/utils/dataProcessing';

export default function TimeSinkChart({ activities, onFilterClick }: { activities: ActivityLog[], onFilterClick: (type: 'dept'|'task', value: string) => void }) {
  const [viewBy, setViewBy] = useState<'taskCategory' | 'appUsed' | 'department'>('taskCategory');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 480);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const data = useMemo(() => {
    const agg: Record<string, number> = {};
    activities.forEach(a => {
      if (!a.isValid) return;
      const key = a[viewBy];
      agg[key] = (agg[key] || 0) + a.durationMinutes;
    });

    return Object.keys(agg).map(k => ({
      name: k,
      hours: Math.round(agg[k] / 60)
    })).sort((a, b) => b.hours - a.hours).slice(0, 10);
  }, [activities, viewBy]);

  return (
    <div>
      <div className="flex gap-4 mb-4">
        <button className="btn" style={{opacity: viewBy === 'taskCategory' ? 1 : 0.5}} onClick={() => setViewBy('taskCategory')}>By Task</button>
        <button className="btn" style={{opacity: viewBy === 'appUsed' ? 1 : 0.5}} onClick={() => setViewBy('appUsed')}>By App</button>
        <button className="btn" style={{opacity: viewBy === 'department' ? 1 : 0.5}} onClick={() => setViewBy('department')}>By Dept</button>
      </div>
      
      {isMobile ? (
        <div className="mobile-chart-list">
          {data.map((item, idx) => {
            const maxHours = data[0]?.hours || 1;
            const pct = (item.hours / maxHours) * 100;
            return (
              <div 
                key={item.name} 
                className="mobile-chart-item"
                onClick={() => {
                  if (viewBy === 'department') onFilterClick('dept', item.name);
                  if (viewBy === 'taskCategory') onFilterClick('task', item.name);
                }}
              >
                <div className="mobile-chart-item-header">
                  <span>{idx + 1}. {item.name}</span>
                  <span style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>{item.hours} hrs</span>
                </div>
                <div className="mobile-chart-item-bar-bg">
                  <div className="mobile-chart-item-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
              <XAxis type="number" stroke="var(--text-secondary)" />
              <YAxis dataKey="name" type="category" width={120} stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} interval={0} />
              <Tooltip contentStyle={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }} />
              <Bar dataKey="hours" fill="var(--accent-color)" cursor="pointer" onClick={(data) => {
                if (data && data.name) {
                  if (viewBy === 'department') onFilterClick('dept', data.name);
                  if (viewBy === 'taskCategory') onFilterClick('task', data.name);
                }
              }}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="var(--accent-color)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
