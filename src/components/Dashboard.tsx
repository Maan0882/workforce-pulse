'use client';

import React, { useState, useMemo } from 'react';
import { JoinedData } from '@/utils/dataProcessing';

import TimeSinkChart from './TimeSinkChart';
import AutomationRanking from './AutomationRanking';
import EmployeeDrilldown from './EmployeeDrilldown';
import WoWTrend from './WoWTrend';
import AnomalyCallout from './AnomalyCallout';
import AIAssistant from './AIAssistant';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function Dashboard({ initialData }: { initialData: JoinedData }) {
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  // Filter activities based on selection
  const filteredActivities = useMemo(() => {
    return initialData.activities.filter(a => {
      if (selectedDept && a.department !== selectedDept) return false;
      if (selectedTask && a.taskCategory !== selectedTask) return false;
      return true;
    });
  }, [initialData, selectedDept, selectedTask]);

  // Calculate Headline Numbers
  const { recoverableHours, recoverableINR, dateRange } = useMemo(() => {
    let hours = 0;
    let inr = 0;
    let minDate = new Date('2999-01-01');
    let maxDate = new Date('1970-01-01');

    filteredActivities.forEach(a => {
      if (a.isValid) {
        if (a.timestamp < minDate) minDate = a.timestamp;
        if (a.timestamp > maxDate) maxDate = a.timestamp;
        
        if (a.isRepetitive) {
          const recoverableMins = a.durationMinutes * 0.7;
          const recoverableHrs = recoverableMins / 60;
          hours += recoverableHrs;

          const emp = initialData.employees[a.employeeId];
          if (emp && emp.monthlySalaryINR > 0) {
            const hourlyRate = emp.monthlySalaryINR / 160;
            inr += recoverableHrs * hourlyRate;
          }
        }
      }
    });

    const rangeStr = minDate <= maxDate 
      ? `${minDate.toLocaleDateString('en-US')} to ${maxDate.toLocaleDateString('en-US')}`
      : 'No data';

    return { recoverableHours: Math.round(hours), recoverableINR: Math.round(inr), dateRange: rangeStr };
  }, [filteredActivities, initialData.employees]);

  const handleFilterClick = (type: 'dept' | 'task', value: string) => {
    if (type === 'dept') setSelectedDept(value === selectedDept ? null : value);
    if (type === 'task') setSelectedTask(value === selectedTask ? null : value);
  };

  const handleExportPDF = async () => {
    const summaryElement = document.getElementById('executive-summary');
    if (!summaryElement) return;

    summaryElement.style.display = 'block';
    
    try {
      const canvas = await html2canvas(summaryElement, { scale: 2, backgroundColor: '#0b1120' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('Workforce_Pulse_Executive_Summary.pdf');
    } finally {
      summaryElement.style.display = 'none';
    }
  };

  return (
    <div className="container no-print">
      <header className="header">
        <div>
          <h1 className="text-2xl">Workforce Pulse</h1>
          <p className="text-secondary">Automation Opportunity Dashboard</p>
        </div>
        <div className="flex gap-4">
          <button className="btn" onClick={handleExportPDF}>Download Summary (PDF)</button>
        </div>
      </header>

      {/* Filters */}
      {(selectedDept || selectedTask) && (
        <div className="flex gap-4 mb-6">
          {selectedDept && (
            <button className="btn" style={{background: 'var(--warning-color)'}} onClick={() => setSelectedDept(null)}>
              Clear Dept: {selectedDept}
            </button>
          )}
          {selectedTask && (
            <button className="btn" style={{background: 'var(--warning-color)'}} onClick={() => setSelectedTask(null)}>
              Clear Task: {selectedTask}
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-3" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel">
          <h3 className="text-secondary mb-4">Hours/Month Recoverable</h3>
          <div className="text-2xl text-glow" style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--success-color)' }}>
            {recoverableHours.toLocaleString()} <span className="text-sm">hrs</span>
          </div>
          <p className="text-sm text-secondary mt-2">
            Based on 70% automation potential of repetitive tasks.
          </p>
        </div>
        <div className="glass-panel">
          <h3 className="text-secondary mb-4">INR/Month Recoverable</h3>
          <div className="text-2xl text-glow" style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--success-color)' }}>
            ₹{recoverableINR.toLocaleString()}
          </div>
          <p className="text-sm text-secondary mt-2">
            Calculated via employee hourly rates * recoverable hours.
          </p>
        </div>
        
        <div className="glass-panel">
          <AnomalyCallout activities={filteredActivities} initialData={initialData} />
        </div>
      </div>

      <div className="grid grid-split" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel">
          <h2 className="mb-4">Time-sink Breakdown</h2>
          <TimeSinkChart activities={filteredActivities} onFilterClick={handleFilterClick} />
        </div>
        <div className="glass-panel">
          <h2 className="mb-4">WoW Repetitive Share</h2>
          <WoWTrend activities={filteredActivities} />
        </div>
      </div>

      <div className="grid grid-split" style={{ gap: '1.5rem' }}>
        <div className="glass-panel">
          <h2 className="mb-4">Automation Priority Ranking</h2>
          <AutomationRanking activities={filteredActivities} initialData={initialData} />
        </div>
        <div className="glass-panel">
          <h2 className="mb-4">Employee Drill-down</h2>
          <EmployeeDrilldown activities={filteredActivities} initialData={initialData} selectedTask={selectedTask} />
        </div>
      </div>
      
      {/* Hidden Executive Summary for PDF Export */}
      <div id="executive-summary" style={{ display: 'none', width: '800px', padding: '40px', background: '#ffffff', color: '#111827', fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '8px', color: '#111827', fontWeight: 'bold' }}>Workforce Pulse: Executive Summary</h1>
        <p style={{ color: '#4b5563', marginBottom: '32px', fontSize: '14px', borderBottom: '2px solid #e5e7eb', paddingBottom: '16px' }}>Date Range: {dateRange}</p>
        
        <div style={{ display: 'flex', gap: '24px', marginBottom: '40px' }}>
          <div style={{ flex: 1, padding: '24px', background: '#f3f4f6', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '14px', color: '#4b5563', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hours/Month Recoverable</h3>
            <div style={{ fontSize: '36px', color: '#059669', fontWeight: 'bold' }}>{recoverableHours.toLocaleString()} <span style={{fontSize: '16px', color: '#4b5563'}}>hrs</span></div>
          </div>
          <div style={{ flex: 1, padding: '24px', background: '#f3f4f6', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '14px', color: '#4b5563', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>INR/Month Recoverable</h3>
            <div style={{ fontSize: '36px', color: '#059669', fontWeight: 'bold' }}>₹{recoverableINR.toLocaleString()}</div>
          </div>
        </div>

        <h2 style={{ fontSize: '20px', marginBottom: '16px', color: '#111827', fontWeight: 'bold' }}>Top Automation Opportunities</h2>
        <div style={{ background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <AutomationRanking activities={filteredActivities} initialData={initialData} simpleMode={true} />
        </div>
        
        <div style={{ marginTop: '40px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', color: '#9ca3af', fontSize: '12px', textAlign: 'center' }}>
          Generated automatically from Workforce Pulse live data.
        </div>
      </div>

      <AIAssistant />
    </div>
  );
}
