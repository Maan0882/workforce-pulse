'use client';
import React, { useMemo } from 'react';
import { ActivityLog, JoinedData } from '@/utils/dataProcessing';
import { AlertTriangle } from 'lucide-react';

export default function AnomalyCallout({ activities, initialData }: { activities: ActivityLog[], initialData: JoinedData }) {
  const anomaly = useMemo(() => {
    // We will look for an employee outlier in repetitive time
    const empStats: Record<string, number> = {};
    
    activities.forEach(a => {
      if (!a.isValid || !a.isRepetitive) return;
      empStats[a.employeeId] = (empStats[a.employeeId] || 0) + a.durationMinutes;
    });

    const values = Object.values(empStats);
    if (values.length === 0) return null;
    
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    
    let maxId = '';
    let maxVal = 0;
    
    Object.entries(empStats).forEach(([id, val]) => {
      if (val > maxVal) {
        maxVal = val;
        maxId = id;
      }
    });

    // If the max is > 2x the mean, we flag it.
    if (maxVal > mean * 2 && maxId) {
      const emp = initialData.employees[maxId];
      return {
        type: 'employee',
        name: emp ? emp.name : maxId,
        val: Math.round(maxVal / 60),
        mean: Math.round(mean / 60)
      };
    }
    
    return null;
  }, [activities, initialData]);

  if (!anomaly) return (
    <div className="glass-panel" style={{ borderLeft: '4px solid var(--success-color)' }}>
      <h3 className="flex items-center gap-2 mb-2"><AlertTriangle size={18} /> No Critical Anomalies</h3>
      <p className="text-sm text-secondary">Repetitive work is evenly distributed right now.</p>
    </div>
  );

  return (
    <div className="glass-panel" style={{ borderLeft: '4px solid var(--danger-color)' }}>
      <h3 className="flex items-center gap-2 mb-2 text-danger"><AlertTriangle size={18} color="var(--danger-color)" /> Anomaly Detected</h3>
      <p className="text-sm">
        <strong>{anomaly.name}</strong> has logged <strong>{anomaly.val} hrs</strong> of repetitive tasks this period, which is significantly higher than the team average of {anomaly.mean} hrs.
      </p>
      <p className="text-sm text-secondary mt-2">
        * Flagged because individual repetitive load is &gt;2x the mean.
      </p>
    </div>
  );
}
