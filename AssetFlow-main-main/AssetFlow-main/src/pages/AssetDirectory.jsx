import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, MoreVertical, ShieldCheck, Monitor, MapPin } from 'lucide-react';
import { api } from '../services/api';

const AssetDirectory = () => {
  const [activeTab, setActiveTab] = useState('All');
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const tabs = ['All', 'Available', 'Allocated', 'Maintenance'];
  
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true);
        let endpoint = '/assets';
        if (activeTab !== 'All') {
          let statusFilter = '';
          if (activeTab === 'Available') statusFilter = 'AVAILABLE';
          else if (activeTab === 'Allocated') statusFilter = 'ALLOCATED';
          else if (activeTab === 'Maintenance') statusFilter = 'UNDER_MAINTENANCE';
          endpoint += `?status=${statusFilter}`;
        }
        
        const response = await api.get(endpoint);
        setAssets(response.data || []);
      } catch (error) {
        console.error('Failed to fetch assets', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssets();
  }, [activeTab]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AVAILABLE': return 'badge-success';
      case 'ALLOCATED': return 'badge-info';
      case 'UNDER_MAINTENANCE': return 'badge-warning';
      default: return 'badge-secondary';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Asset Directory</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage and track all company assets.</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={18} />
          Register Asset
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {tabs.map(tab => (
              <button 
                key={tab} 
                className={`btn ${activeTab === tab ? 'btn-secondary' : ''}`}
                style={{ 
                  background: activeTab === tab ? 'var(--surface-hover)' : 'transparent',
                  border: activeTab === tab ? '1px solid var(--border-color)' : '1px solid transparent',
                  color: activeTab === tab ? 'var(--text-main)' : 'var(--text-muted)'
                }}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search assets..." 
                className="form-input" 
                style={{ paddingLeft: '2.25rem', width: '250px' }} 
              />
            </div>
            <button className="btn btn-secondary" style={{ padding: '0.5rem' }}>
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '500' }}>Asset Tag & Name</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '500' }}>Category</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '500' }}>Status</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '500' }}>Department</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '500' }}>Location</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '500', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center' }}>Loading assets...</td></tr>
              ) : assets.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center' }}>No assets found.</td></tr>
              ) : (
                assets.map((asset, i) => (
                  <tr key={asset.id} style={{ borderBottom: i !== assets.length - 1 ? '1px solid var(--border-color)' : 'none', transition: 'background-color var(--transition-fast)' }} className="table-row-hover">
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {asset.category_name?.toLowerCase().includes('electronic') && <Monitor size={16} color="var(--text-muted)" />}
                        {asset.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{asset.asset_tag}</div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>{asset.category_name || '-'}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span className={`badge ${getStatusBadge(asset.status)}`}>
                        {asset.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>{asset.department_name || '-'}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}>
                        <MapPin size={14} />
                        {asset.location || '-'}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          <div>Showing {assets.length} assets</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" disabled>Previous</button>
            <button className="btn btn-secondary" disabled>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetDirectory;
