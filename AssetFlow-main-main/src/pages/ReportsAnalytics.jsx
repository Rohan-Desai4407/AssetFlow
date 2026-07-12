import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, Download, Users, Package, Calendar } from 'lucide-react';
import { api } from '../services/api';

const ReportsAnalytics = () => {
  const [utilization, setUtilization] = useState([]);
  const [maintenance, setMaintenance] = useState({ byAsset: [], byCategory: [] });
  const [upcoming, setUpcoming] = useState({ nearingRetirement: [], dueForMaintenance: [] });
  const [deptAllocations, setDeptAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [utilRes, maintRes, upcomingRes, deptRes] = await Promise.all([
          api.get('/reports/utilization'),
          api.get('/reports/maintenance-frequency'),
          api.get('/reports/upcoming'),
          api.get('/reports/department-allocations')
        ]);
        setUtilization(utilRes.data || []);
        setMaintenance(maintRes.data || { byAsset: [], byCategory: [] });
        setUpcoming(upcomingRes.data || { nearingRetirement: [], dueForMaintenance: [] });
        setDeptAllocations(deptRes.data || []);
      } catch (err) {
        console.error('Failed to fetch reports', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'utilization', label: 'Utilization' },
    { id: 'maintenance', label: 'Maintenance' },
    { id: 'departments', label: 'Departments' }
  ];

  const topUtilized = utilization.slice(0, 8);
  const maxUsage = Math.max(...topUtilized.map(a => (a.allocation_count || 0) + (a.booking_count || 0)), 1);

  const topMaintenance = (maintenance.byAsset || []).filter(a => a.request_count > 0).slice(0, 6);
  const maxMaintCount = Math.max(...topMaintenance.map(a => a.request_count), 1);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Reports & Analytics</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading report data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Reports & Analytics</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Actionable operational insights from live data.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={20} color="var(--primary-color)" />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)' }}>{utilization.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Assets</div>
          </div>
        </div>
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} color="var(--secondary-color)" />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)' }}>{deptAllocations.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Departments</div>
          </div>
        </div>
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={20} color="var(--danger-color)" />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)' }}>{upcoming.dueForMaintenance?.length || 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Due for Maintenance</div>
          </div>
        </div>
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={20} color="var(--warning-color)" />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)' }}>{upcoming.nearingRetirement?.length || 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nearing Retirement</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.5rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem',
              fontWeight: activeTab === tab.id ? '600' : '400',
              color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary-color)' : '2px solid transparent',
              marginBottom: '-1px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {/* Utilization Chart */}
          <div className="card">
            <h2 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={18} /> Top Assets by Usage
            </h2>
            {topUtilized.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No utilization data yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {topUtilized.map(asset => {
                  const usage = (asset.allocation_count || 0) + (asset.booking_count || 0);
                  const pct = Math.round((usage / maxUsage) * 100);
                  return (
                    <div key={asset.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: '500' }}>{asset.asset_tag} {asset.name}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{usage} uses</span>
                      </div>
                      <div style={{ height: '6px', backgroundColor: 'var(--surface-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--primary-color)', borderRadius: '3px', transition: 'width 0.5s ease' }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Maintenance frequency by category */}
          <div className="card">
            <h2 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} /> Maintenance by Category
            </h2>
            {(maintenance.byCategory || []).filter(c => c.request_count > 0).length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No maintenance data yet.</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', height: '180px', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                {(maintenance.byCategory || []).filter(c => c.request_count > 0).slice(0, 6).map((cat, i) => {
                  const maxCat = Math.max(...(maintenance.byCategory || []).map(c => c.request_count), 1);
                  const pct = Math.round((cat.request_count / maxCat) * 100);
                  const colors = ['var(--primary-color)', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
                  return (
                    <div key={cat.category_id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: '600' }}>{cat.request_count}</span>
                      <div style={{ width: '100%', backgroundColor: colors[i % colors.length], height: `${pct}%`, borderRadius: '4px 4px 0 0', minHeight: '8px', transition: 'height 0.5s ease' }}></div>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {(maintenance.byCategory || []).filter(c => c.request_count > 0).slice(0, 6).map(cat => (
                <span key={cat.category_id} style={{ textAlign: 'center', maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.category_name}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Utilization Tab */}
      {activeTab === 'utilization' && (
        <div className="card">
          <h2 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={18} /> Asset Utilization Details
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 0' }}>Asset</th>
                <th style={{ padding: '0.75rem 0' }}>Status</th>
                <th style={{ padding: '0.75rem 0', textAlign: 'center' }}>Allocations</th>
                <th style={{ padding: '0.75rem 0', textAlign: 'center' }}>Bookings</th>
                <th style={{ padding: '0.75rem 0', textAlign: 'center' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {utilization.slice(0, 20).map(asset => (
                <tr key={asset.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 0' }}><span style={{ fontWeight: '500' }}>{asset.asset_tag}</span> {asset.name}</td>
                  <td style={{ padding: '0.75rem 0' }}><span className={`badge badge-${asset.status === 'AVAILABLE' ? 'success' : asset.status === 'ALLOCATED' ? 'info' : 'warning'}`} style={{ fontSize: '0.7rem' }}>{asset.status}</span></td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'center' }}>{asset.allocation_count}</td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'center' }}>{asset.booking_count}</td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'center', fontWeight: '600' }}>{asset.allocation_count + asset.booking_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Maintenance Tab */}
      {activeTab === 'maintenance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} /> Most Maintained Assets
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {topMaintenance.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No maintenance records yet.</div>
              ) : (
                topMaintenance.map(asset => {
                  const pct = Math.round((asset.request_count / maxMaintCount) * 100);
                  return (
                    <div key={asset.asset_id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: '500' }}>{asset.asset_tag} {asset.name}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{asset.request_count} requests · ${Number(asset.total_cost || 0).toLocaleString()} cost</span>
                      </div>
                      <div style={{ height: '6px', backgroundColor: 'var(--surface-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--danger-color)', borderRadius: '3px' }}></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Upcoming section */}
          <div className="card">
            <h2 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} color="var(--warning-color)" /> Assets Needing Attention
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(upcoming.dueForMaintenance || []).slice(0, 5).map(asset => (
                <div key={asset.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.875rem' }}><strong>{asset.asset_tag} {asset.name}</strong> — overdue for maintenance {asset.last_maintenance ? `(last: ${new Date(asset.last_maintenance).toLocaleDateString()})` : '(never maintained)'}</div>
                </div>
              ))}
              {(upcoming.nearingRetirement || []).slice(0, 5).map(asset => (
                <div key={asset.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#fffbeb', borderRadius: 'var(--radius-md)', border: '1px solid #fef08a' }}>
                  <div style={{ fontSize: '0.875rem' }}><strong>{asset.asset_tag} {asset.name}</strong> — condition: {asset.condition} {asset.acquisition_date ? `· acquired: ${new Date(asset.acquisition_date).toLocaleDateString()}` : ''}</div>
                </div>
              ))}
              {(upcoming.dueForMaintenance || []).length === 0 && (upcoming.nearingRetirement || []).length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>All assets are in good shape!</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Departments Tab */}
      {activeTab === 'departments' && (
        <div className="card">
          <h2 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} /> Department Allocation Summary
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 0' }}>Department</th>
                <th style={{ padding: '0.75rem 0', textAlign: 'center' }}>Assets Assigned</th>
                <th style={{ padding: '0.75rem 0', textAlign: 'center' }}>Active Allocations</th>
              </tr>
            </thead>
            <tbody>
              {deptAllocations.map(dept => (
                <tr key={dept.department_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 0', fontWeight: '500' }}>{dept.department_name}</td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'center' }}>{dept.assets_in_department}</td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'center' }}>
                    <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{dept.active_allocations}</span>
                  </td>
                </tr>
              ))}
              {deptAllocations.length === 0 && (
                <tr><td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No departments found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ReportsAnalytics;
