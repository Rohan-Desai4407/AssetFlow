import React from 'react';
import { ArrowRightLeft, User, Box, Search, CheckCircle2, AlertCircle } from 'lucide-react';

const AssetAllocation = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Asset Allocation & Transfers</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage who holds what and track asset transfers.</p>
        </div>
        <button className="btn btn-primary">
          <ArrowRightLeft size={18} />
          New Allocation
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
        
        {/* Left Column: Quick Allocation Form */}
        <div className="card">
          <h2 style={{ fontSize: '1.125rem', marginBottom: '1.5rem' }}>Quick Allocation</h2>
          
          <div className="form-group">
            <label className="form-label">Asset</label>
            <div style={{ position: 'relative' }}>
              <Box size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" className="form-input" placeholder="Search by Asset Tag or Name" style={{ paddingLeft: '2.25rem' }} />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Assign To</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" className="form-input" placeholder="Search Employee or Department" style={{ paddingLeft: '2.25rem' }} />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Expected Return Date (Optional)</label>
            <input type="date" className="form-input" />
          </div>
          
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Notes</label>
            <textarea className="form-input" rows="3" placeholder="Condition notes, reason for allocation..."></textarea>
          </div>
          
          <button className="btn btn-primary" style={{ width: '100%' }}>Allocate Asset</button>
        </div>

        {/* Right Column: Pending Transfers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Pending Transfer Requests
              <span className="badge badge-warning">3</span>
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { asset: 'AF-0114 Dell XPS', from: 'Priya Sharma', to: 'Raj Patel', date: 'Requested Today' },
                { asset: 'AF-0089 iPad Pro', from: 'IT Dept', to: 'Marketing', date: 'Requested 2 days ago' },
              ].map((transfer, i) => (
                <div key={i} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>{transfer.asset}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{transfer.from}</span>
                      <ArrowRightLeft size={14} />
                      <span>{transfer.to}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{transfer.date}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" style={{ color: 'var(--danger-color)', padding: '0.5rem' }}>Reject</button>
                    <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Approve</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="card">
            <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Recent Allocations</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <tbody>
                {[
                  { asset: 'AF-0255 iPhone 14', user: 'Sarah Jenkins', date: 'Today, 09:30 AM', status: 'Allocated' },
                  { asset: 'AF-0199 Standing Desk', user: 'Mike Chen', date: 'Yesterday', status: 'Returned' },
                  { asset: 'AF-0033 Canon DSLR', user: 'Design Team', date: 'Oct 08, 2026', status: 'Allocated' },
                ].map((item, i) => (
                  <tr key={i} style={{ borderBottom: i !== 2 ? '1px solid var(--border-color)' : 'none' }}>
                    <td style={{ padding: '0.75rem 0' }}>
                      <div style={{ fontWeight: '500' }}>{item.asset}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.date}</div>
                    </td>
                    <td style={{ padding: '0.75rem 0' }}>{item.user}</td>
                    <td style={{ padding: '0.75rem 0', textAlign: 'right' }}>
                      {item.status === 'Allocated' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--secondary-color)', fontSize: '0.75rem', fontWeight: '500' }}>
                          <CheckCircle2 size={14} /> {item.status}
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '500' }}>
                          <ArrowRightLeft size={14} /> {item.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetAllocation;
