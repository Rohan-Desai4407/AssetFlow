import React, { useState } from 'react';
import { Plus, Check, X, Search } from 'lucide-react';

const OrganizationSetup = () => {
  const [activeTab, setActiveTab] = useState('Departments');
  const tabs = ['Departments', 'Categories', 'Employees'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Organization Setup</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage master data and roles.</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={18} />
          Add {activeTab.slice(0, -1)}
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
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

        <div style={{ padding: '1.5rem' }}>
          {activeTab === 'Departments' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0' }}>Department Name</th>
                  <th style={{ padding: '0.75rem 0' }}>Head</th>
                  <th style={{ padding: '0.75rem 0' }}>Parent Dept</th>
                  <th style={{ padding: '0.75rem 0' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Engineering', head: 'Aditi Rao', parent: '-', status: 'Active' },
                  { name: 'Facilities', head: 'Rahul Mehta', parent: '-', status: 'Active' },
                  { name: 'Field Ops (East)', head: 'Samir Iqbal', parent: 'Field Ops', status: 'Inactive' },
                ].map((dept, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem 0', fontWeight: '500' }}>{dept.name}</td>
                    <td style={{ padding: '1rem 0' }}>{dept.head}</td>
                    <td style={{ padding: '1rem 0', color: 'var(--text-muted)' }}>{dept.parent}</td>
                    <td style={{ padding: '1rem 0' }}>
                      <span className={`badge ${dept.status === 'Active' ? 'badge-success' : 'badge-secondary'}`}>
                        {dept.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
          {activeTab === 'Categories' && (
            <div style={{ color: 'var(--text-muted)' }}>Category management UI goes here.</div>
          )}

          {activeTab === 'Employees' && (
            <div style={{ color: 'var(--text-muted)' }}>Employee directory and role management goes here.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizationSetup;
