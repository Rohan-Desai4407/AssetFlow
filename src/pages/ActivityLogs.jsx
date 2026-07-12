import React from 'react';
import { Bell, AlertTriangle, CheckCircle2, ArrowRightLeft, CalendarCheck } from 'lucide-react';

const ActivityLogs = () => {
  const logs = [
    { type: 'assignment', text: 'Laptop AF-0114 assigned to Priya Shah', time: '3m ago', icon: <CheckCircle2 size={16} color="var(--primary-color)" /> },
    { type: 'maintenance', text: 'Maintenance request AF-0055 approved', time: '15m ago', icon: <CheckCircle2 size={16} color="var(--secondary-color)" /> },
    { type: 'booking', text: 'Booking confirmed: Room B2 : 2:00 to 3:00 PM', time: '1h ago', icon: <CalendarCheck size={16} color="var(--primary-color)" /> },
    { type: 'transfer', text: 'Transfer approved: AF-0089 to Facilities dept', time: '3h ago', icon: <ArrowRightLeft size={16} color="var(--primary-color)" /> },
    { type: 'alert', text: 'Overdue return: AF-0021 was due 3 days ago', time: '1d ago', icon: <AlertTriangle size={16} color="var(--danger-color)" /> },
    { type: 'alert', text: 'Audit discrepancy flagged: AF-0099 damaged', time: '2d ago', icon: <AlertTriangle size={16} color="var(--warning-color)" /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Activity Logs & Notifications</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Keep every role informed without digging for updates.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" style={{ background: 'var(--surface-hover)' }}>All</button>
          <button className="btn btn-secondary">Alerts</button>
          <button className="btn btn-secondary">Approvals</button>
          <button className="btn btn-secondary">Bookings</button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {logs.map((log, i) => (
            <div key={i} style={{ 
              padding: '1.25rem 1.5rem', 
              borderBottom: i !== logs.length - 1 ? '1px solid var(--border-color)' : 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: log.type === 'alert' ? '#fff1f2' : 'transparent',
              transition: 'background-color var(--transition-fast)'
            }} className="table-row-hover">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ 
                  width: '32px', height: '32px', 
                  borderRadius: '50%', 
                  backgroundColor: 'var(--surface-color)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  {log.icon}
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: '500', color: log.type === 'alert' ? 'var(--danger-color)' : 'var(--text-main)' }}>
                  {log.text}
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActivityLogs;
