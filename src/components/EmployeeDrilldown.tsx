'use client';
import React, { useState, useMemo } from 'react';
import { ActivityLog, JoinedData, Employee } from '@/utils/dataProcessing';

export default function EmployeeDrilldown({ activities, initialData, selectedTask }: { activities: ActivityLog[], initialData: JoinedData, selectedTask: string | null }) {
  const [selectedEmp, setSelectedEmp] = useState<string | null>(null);

  // If a task category is selected, we should perhaps highlight employees who do that task, or just sort them.
  // The requirement says: clicking a task category filters the employee list.

  const employeeStats = useMemo(() => {
    const stats: Record<string, { totalMins: number, repMins: number, taskMins: Record<string, number> }> = {};
    
    // Filter by task if selected, BUT wait - the requirement says "clicking a task category filters the employee list".
    // If we pass filtered `activities`, we might only see the stats for that task. So maybe the drilldown uses all activities but filters the dropdown list.
    
    // We'll calculate stats using the globally filtered `activities` (which respects dept and task filters).
    activities.forEach(a => {
      if (!a.isValid) return;
      if (!stats[a.employeeId]) {
        stats[a.employeeId] = { totalMins: 0, repMins: 0, taskMins: {} };
      }
      stats[a.employeeId].totalMins += a.durationMinutes;
      if (a.isRepetitive) stats[a.employeeId].repMins += a.durationMinutes;
      stats[a.employeeId].taskMins[a.taskCategory] = (stats[a.employeeId].taskMins[a.taskCategory] || 0) + a.durationMinutes;
    });

    return stats;
  }, [activities]);

  const employeesInView = Object.keys(employeeStats).map(id => initialData.employees[id]).filter(Boolean);

  const activeEmp = selectedEmp ? initialData.employees[selectedEmp] : null;
  const activeStats = selectedEmp ? employeeStats[selectedEmp] : null;

  // Peer comparison (same role)
  const peerComparison = useMemo(() => {
    if (!activeEmp) return null;
    const peers = Object.values(initialData.employees).filter(e => e.role === activeEmp.role && e.employeeId !== activeEmp.employeeId);
    if (peers.length === 0) return { peerAvgRepMins: 0, peerAvgTotalMins: 0, hasPeers: false };

    let totalPeerRep = 0;
    let totalPeerMins = 0;
    let validPeers = 0;

    peers.forEach(p => {
      // Need to find peer's activities from all initialData, not just filtered (to give true peer comparison)
      const pActs = initialData.activities.filter(a => a.employeeId === p.employeeId && a.isValid);
      if (pActs.length > 0) {
        validPeers++;
        pActs.forEach(a => {
          totalPeerMins += a.durationMinutes;
          if (a.isRepetitive) totalPeerRep += a.durationMinutes;
        });
      }
    });

    return {
      peerAvgRepMins: validPeers > 0 ? totalPeerRep / validPeers : 0,
      peerAvgTotalMins: validPeers > 0 ? totalPeerMins / validPeers : 0,
      hasPeers: validPeers > 0
    };
  }, [activeEmp, initialData]);


  return (
    <div>
      <div className="mb-4">
        <select 
          className="btn" 
          style={{ background: 'var(--panel-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', width: '100%' }}
          value={selectedEmp || ''} 
          onChange={e => setSelectedEmp(e.target.value)}
        >
          <option value="">Select Employee...</option>
          {employeesInView.map(e => (
            <option key={e.employeeId} value={e.employeeId}>{e.name} ({e.role})</option>
          ))}
        </select>
        {selectedTask && <p className="text-sm text-secondary mt-1">Showing employees who do: {selectedTask}</p>}
      </div>

      {activeEmp && activeStats && (
        <div className="p-4" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
          <h3 className="text-xl">{activeEmp.name}</h3>
          <p className="text-secondary text-sm mb-4">{activeEmp.role} · {activeEmp.department} · {activeEmp.status}</p>

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <div className="text-sm text-secondary">Repetitive Time</div>
              <div className="text-xl text-warning">{Math.round(activeStats.repMins / 60)} hrs</div>
            </div>
            <div>
              <div className="text-sm text-secondary">Total Time Logged</div>
              <div className="text-xl">{Math.round(activeStats.totalMins / 60)} hrs</div>
            </div>
          </div>

          <h4 className="text-sm text-secondary mb-2">Top Repetitive Tasks</h4>
          <ul className="text-sm mb-4">
            {Object.entries(activeStats.taskMins).sort((a,b) => b[1] - a[1]).slice(0,3).map(([task, mins]) => (
              <li key={task} className="flex justify-between border-b border-gray-800 py-1">
                <span>{task}</span>
                <span>{Math.round(mins / 60)}h</span>
              </li>
            ))}
          </ul>

          {peerComparison?.hasPeers && (
            <div style={{ padding: '0.75rem', background: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              <h4 className="text-sm mb-2">Peer Comparison ({activeEmp.role})</h4>
              <p className="text-sm">
                Peer avg repetitive time: <strong>{Math.round(peerComparison.peerAvgRepMins / 60)} hrs</strong>
              </p>
              <p className="text-sm text-secondary mt-1">
                {activeStats.repMins > peerComparison.peerAvgRepMins 
                  ? `${activeEmp.name} spends more time on repetitive tasks than peers.` 
                  : `${activeEmp.name} spends less time on repetitive tasks than peers.`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
