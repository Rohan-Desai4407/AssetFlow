import React, { useState } from 'react';
import { CheckCircle2, Clock, Wrench, Plus } from 'lucide-react';
import RaiseMaintenanceModal from '../components/RaiseMaintenanceModal';

const MaintenanceManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const columns = [
    { title: 'Pending', items: [{ id: 'AF-0062', name: 'Projector bulb not turning on', date: '2d ago' }] },
    { title: 'Approved', items: [{ id: 'AF-0113', name: 'AC Unit noisy compressor', date: '1d ago' }] },
    { title: 'Technician Assigned', items: [{ id: 'AF-0098', name: 'Forklift needs oil service', date: '4h ago' }] },
    { title: 'In Progress', items: [{ id: 'AF-0192', name: 'Printer jam parts ordered', date: '3d ago' }] },
    { title: 'Resolved', items: [{ id: 'AF-0221', name: 'Chair repair resolved', date: 'Just now' }] },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Maintenance Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Track and approve repair workflows.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Raise Request
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', flex: 1 }}>
        {columns.map(col => (
          <div key={col.title} style={{ minWidth: '280px', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-lg)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              {col.title}
              <span style={{ backgroundColor: 'var(--border-color)', color: 'var(--text-main)', padding: '0.1rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem' }}>
                {col.items.length}
              </span>
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {col.items.map((item, i) => (
                <div key={i} className="card" style={{ padding: '1rem', cursor: 'pointer' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: '600', marginBottom: '0.25rem' }}>{item.id}</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.75rem', lineHeight: 1.4 }}>{item.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} /> {item.date}</div>
                    {col.title === 'Resolved' && <CheckCircle2 size={14} color="var(--secondary-color)" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <RaiseMaintenanceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => window.location.reload()} 
      />
    </div>
  );
};

export default MaintenanceManagement;
