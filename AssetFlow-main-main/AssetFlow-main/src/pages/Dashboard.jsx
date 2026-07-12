import React, { useState, useEffect } from 'react';
import { Box, Wrench, CalendarCheck, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import { api } from '../services/api';

const KPICard = ({ title, value, icon, colorClass, trend }) => (
  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{title}</h3>
        <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-main)' }}>{value}</div>
      </div>
      <div className={`badge ${colorClass}`} style={{ padding: '0.5rem', borderRadius: '0.5rem' }}>
        {icon}
      </div>
    </div>
    {trend && (
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <TrendingUp size={12} color="var(--secondary-color)" />
        <span style={{ color: 'var(--secondary-color)', fontWeight: '500' }}>+{trend}%</span> from last month
      </div>
    )}
  </div>
);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/dashboard');
        setData(response);
      } catch (error) {
        console.error('Failed to fetch dashboard', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <div>Loading dashboard...</div>;
  if (!data) return <div>Error loading dashboard.</div>;

  const { kpis, overdueReturns } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Welcome back! Here's a snapshot of your resources today.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary">Register Asset</button>
          <button className="btn btn-primary">Book Resource</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <KPICard title="Assets Available" value={kpis?.assetsAvailable || 0} icon={<CheckCircle2 size={20} />} colorClass="badge-success" />
        <KPICard title="Assets Allocated" value={kpis?.assetsAllocated || 0} icon={<Box size={20} />} colorClass="badge-info" />
        <KPICard title="Maintenance Today" value={kpis?.maintenanceToday || 0} icon={<Wrench size={20} />} colorClass="badge-warning" />
        <KPICard title="Active Bookings" value={kpis?.activeBookings || 0} icon={<CalendarCheck size={20} />} colorClass="badge-success" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div className="card">
          <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Overdue Returns</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 0', fontWeight: '500' }}>Asset</th>
                <th style={{ padding: '0.75rem 0', fontWeight: '500' }}>Assigned To</th>
                <th style={{ padding: '0.75rem 0', fontWeight: '500' }}>Expected Return</th>
                <th style={{ padding: '0.75rem 0', fontWeight: '500' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {overdueReturns?.length > 0 ? overdueReturns.map((item, i) => {
                const daysOverdue = Math.floor((new Date() - new Date(item.expected_return_date)) / (1000 * 60 * 60 * 24));
                return (
                  <tr key={item.id} style={{ borderBottom: i !== overdueReturns.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                    <td style={{ padding: '1rem 0' }}>
                      <div style={{ fontWeight: '500' }}>{item.asset_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.asset_tag}</div>
                    </td>
                    <td style={{ padding: '1rem 0' }}>{item.assigned_to || 'N/A'}</td>
                    <td style={{ padding: '1rem 0', color: 'var(--danger-color)' }}>
                      {new Date(item.expected_return_date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem 0' }}>
                      <span className="badge badge-danger">
                        <AlertTriangle size={12} style={{ marginRight: '4px' }} />
                        {daysOverdue} days overdue
                      </span>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="4" style={{ padding: '1rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No overdue returns.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '1rem' }}>
              <Box size={18} style={{ color: 'var(--primary-color)' }} />
              Register New Asset
            </button>
            <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '1rem' }}>
              <CalendarCheck size={18} style={{ color: 'var(--secondary-color)' }} />
              Book a Resource
            </button>
            <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '1rem' }}>
              <Wrench size={18} style={{ color: 'var(--warning-color)' }} />
              Raise Maintenance Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
