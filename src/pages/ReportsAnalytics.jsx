import React from 'react';
import { BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';

const ReportsAnalytics = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Reports & Analytics</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Actionable operational insights.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <h2 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={18} /> Utilization by Department
          </h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', height: '150px', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ flex: 1, backgroundColor: 'var(--primary-color)', height: '100%', borderRadius: '4px 4px 0 0' }}></div>
            <div style={{ flex: 1, backgroundColor: 'var(--primary-light)', height: '70%', borderRadius: '4px 4px 0 0' }}></div>
            <div style={{ flex: 1, backgroundColor: 'var(--primary-light)', height: '85%', borderRadius: '4px 4px 0 0' }}></div>
            <div style={{ flex: 1, backgroundColor: 'var(--primary-light)', height: '40%', borderRadius: '4px 4px 0 0' }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Eng</span>
            <span>Sales</span>
            <span>HR</span>
            <span>Mktg</span>
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} /> Maintenance Frequency
          </h2>
          {/* Simple line chart mockup using borders/boxes */}
          <div style={{ height: '150px', position: 'relative', borderBottom: '1px solid var(--border-color)', borderLeft: '1px solid var(--border-color)' }}>
            <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
              <polyline points="0,40 20,35 40,45 60,20 80,25 100,10" fill="none" stroke="var(--danger-color)" strokeWidth="2" />
            </svg>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Jan</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Apr</span>
            <span>May</span>
            <span>Jun</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={18} color="var(--warning-color)" /> Assets due for maintenance / nearing retirement
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.875rem' }}><strong>Forklift AF-0098</strong> - service due in 3 days</div>
            <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Schedule</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.875rem' }}><strong>Laptop AF-2201</strong> - 4 years old - nearing retirement</div>
            <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Review</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsAnalytics;
