import React from 'react';
import { Search, AlertTriangle, CheckCircle2 } from 'lucide-react';

const AssetAudit = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Asset Audit</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Structured verification cycles & discrepancy reports.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Q3 Audit: Engineering Dept
              <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>1/12 pending</span>
            </h2>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Auditors: A. Rao, A. Iqbal</div>
          </div>
          <button className="btn btn-secondary">Close Audit Cycle</button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: '1rem 0' }}>Asset</th>
              <th style={{ padding: '1rem 0' }}>Expected Location</th>
              <th style={{ padding: '1rem 0', textAlign: 'center' }}>Verification</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '1rem 0', fontWeight: '500' }}>AF-0114 Dell laptop</td>
              <td style={{ padding: '1rem 0' }}>Desk A12</td>
              <td style={{ padding: '1rem 0', textAlign: 'center' }}>
                <span className="badge badge-success"><CheckCircle2 size={14} style={{ marginRight: '4px' }}/> Verified</span>
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '1rem 0', fontWeight: '500' }}>AF-0921 Office chair</td>
              <td style={{ padding: '1rem 0' }}>Desk B33</td>
              <td style={{ padding: '1rem 0', textAlign: 'center' }}>
                <span className="badge badge-danger"><AlertTriangle size={14} style={{ marginRight: '4px' }}/> Missing</span>
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '1rem 0', fontWeight: '500' }}>AF-0822 Monitor</td>
              <td style={{ padding: '1rem 0' }}>Desk A14</td>
              <td style={{ padding: '1rem 0', textAlign: 'center' }}>
                <span className="badge badge-warning"><AlertTriangle size={14} style={{ marginRight: '4px' }}/> Damaged</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertTriangle size={18} />
          <strong>2 Assets Flagged</strong> - Discrepancy report generated automatically.
        </div>
      </div>
    </div>
  );
};

export default AssetAudit;
