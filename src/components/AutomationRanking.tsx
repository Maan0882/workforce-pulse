'use client';
import React, { useMemo } from 'react';
import { ActivityLog, JoinedData } from '@/utils/dataProcessing';

export default function AutomationRanking({ activities, initialData, simpleMode = false }: { activities: ActivityLog[], initialData: JoinedData, simpleMode?: boolean }) {
  const ranking = useMemo(() => {
    const stats: Record<string, {
      totalMins: number,
      repMins: number,
      emps: Set<string>,
      inrImpact: number
    }> = {};

    activities.forEach(a => {
      if (!a.isValid) return;
      if (!stats[a.taskCategory]) {
        stats[a.taskCategory] = { totalMins: 0, repMins: 0, emps: new Set(), inrImpact: 0 };
      }
      const s = stats[a.taskCategory];
      s.totalMins += a.durationMinutes;
      s.emps.add(a.employeeId);
      
      if (a.isRepetitive) {
        s.repMins += a.durationMinutes;
        const emp = initialData.employees[a.employeeId];
        if (emp) {
          const hourlyRate = emp.monthlySalaryINR / 160;
          s.inrImpact += (a.durationMinutes * 0.7 / 60) * hourlyRate; // 70% recoverable
        }
      }
    });

    // Calculate max values for normalization
    let maxVolume = 0;
    let maxEmps = 0;
    let maxInr = 0;
    
    Object.values(stats).forEach(s => {
      if (s.totalMins > maxVolume) maxVolume = s.totalMins;
      if (s.emps.size > maxEmps) maxEmps = s.emps.size;
      if (s.inrImpact > maxInr) maxInr = s.inrImpact;
    });

    const result = Object.keys(stats).map(category => {
      const s = stats[category];
      const volumeNorm = maxVolume > 0 ? s.totalMins / maxVolume : 0;
      const repRatio = s.totalMins > 0 ? s.repMins / s.totalMins : 0;
      const empNorm = maxEmps > 0 ? s.emps.size / maxEmps : 0;
      const inrNorm = maxInr > 0 ? s.inrImpact / maxInr : 0;
      
      // Score Formula: 20% Volume + 30% Repetitiveness + 20% Employee Concentration + 30% INR Impact
      const score = (volumeNorm * 20) + (repRatio * 30) + (empNorm * 20) + (inrNorm * 30);
      
      return {
        category,
        score: Math.round(score),
        hours: Math.round(s.totalMins / 60),
        inr: Math.round(s.inrImpact),
        repRatio: Math.round(repRatio * 100),
        emps: s.emps.size
      };
    }).sort((a, b) => b.score - a.score).slice(0, 5);

    return result;
  }, [activities, initialData]);

  if (simpleMode) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {ranking.map((r, i) => (
          <div key={r.category} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#111827' }}>{i + 1}. {r.category}</div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#059669', fontWeight: 'bold' }}>₹{r.inr.toLocaleString()} potential savings</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Score: {r.score}/100 | {r.repRatio}% Repetitive</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Score / 100</th>
              <th>Recoverable INR</th>
              <th>Repetitive %</th>
              <th>Team Spread</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((r, i) => (
              <tr key={r.category}>
                <td>{i + 1}. {r.category}</td>
                <td>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <div style={{width: '60px', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden'}}>
                      <div style={{width: `${r.score}%`, height: '100%', background: 'var(--success-color)'}}></div>
                    </div>
                    {r.score}
                  </div>
                </td>
                <td>₹{r.inr.toLocaleString()}</td>
                <td>{r.repRatio}%</td>
                <td>{r.emps} emps</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-secondary mt-4">
        * Score formula: 20% Volume + 30% Repetitiveness + 20% Employee Spread + 30% INR Impact (Normalized).
      </p>
    </div>
  );
}
