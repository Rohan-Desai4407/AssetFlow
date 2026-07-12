import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, User, Box, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import NewAllocationModal from '../components/NewAllocationModal';
import TransferRequestModal from '../components/TransferRequestModal';

const AssetAllocation = () => {
  const [allocations, setAllocations] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAllocModalOpen, setIsAllocModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [allocs, trans] = await Promise.all([
        api.get('/allocations'),
        api.get('/allocations/transfers/list')
      ]);
      setAllocations(allocs.data || []);
      setTransfers(trans.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDecision = async (id, decision) => {
    try {
      await api.post(`/allocations/transfers/${id}/decision`, { decision });
      fetchData();
    } catch (err) {
      alert(err.error || err.message || 'Failed to submit decision');
    }
  };

  const handleReturn = async (id) => {
    const returnCondition = window.prompt('Enter return condition (e.g. GOOD, FAIR, POOR):', 'GOOD');
    if (!returnCondition) return;
    try {
      await api.post(`/allocations/${id}/return`, { returnCondition });
      fetchData();
    } catch (err) {
      alert(err.error || err.message || 'Failed to return asset');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Asset Allocation & Transfers</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage who holds what and track asset transfers.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => setIsTransferModalOpen(true)}>
            <ArrowRightLeft size={18} />
            Request Transfer
          </button>
          <button className="btn btn-primary" onClick={() => setIsAllocModalOpen(true)}>
            <ArrowRightLeft size={18} />
            New Allocation
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>

        {/* Transfers and Allocations */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Pending Transfer Requests
              <span className="badge badge-warning">{transfers.filter(t => t.status === 'REQUESTED').length}</span>
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {transfers.filter(t => t.status === 'REQUESTED').length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No pending transfers.</div>
              ) : (
                transfers.filter(t => t.status === 'REQUESTED').map((transfer) => (
                  <div key={transfer.id} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>{transfer.asset_name} ({transfer.asset_tag})</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{new Date(transfer.created_at).toLocaleString()}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary" onClick={() => handleDecision(transfer.id, 'REJECTED')} style={{ color: 'var(--danger-color)', padding: '0.5rem' }}>Reject</button>
                      <button className="btn btn-primary" onClick={() => handleDecision(transfer.id, 'APPROVED')} style={{ padding: '0.5rem 1rem' }}>Approve</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="card">
            <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>All Allocations</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <tbody>
                {allocations.length === 0 ? (
                  <tr><td colSpan="3" style={{ padding: '2rem', textAlign: 'center' }}>No allocations.</td></tr>
                ) : (
                  allocations.slice(0, 5).map((item, i) => (
                    <tr key={item.id} style={{ borderBottom: i !== Math.min(allocations.length, 5) - 1 ? '1px solid var(--border-color)' : 'none' }}>
                      <td style={{ padding: '0.75rem 0' }}>
                        <div style={{ fontWeight: '500' }}>{item.asset_name} ({item.asset_tag})</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(item.allocated_at).toLocaleDateString()}</div>
                      </td>
                      <td style={{ padding: '0.75rem 0' }}>{item.allocated_to_name || item.allocated_to_department_name}</td>
                      <td style={{ padding: '0.75rem 0', textAlign: 'right' }}>
                        {item.status === 'ACTIVE' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--secondary-color)', fontSize: '0.75rem', fontWeight: '500' }}>
                              <CheckCircle2 size={14} /> Active
                            </span>
                            <button className="btn btn-secondary" onClick={() => handleReturn(item.id)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Return</button>
                          </div>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '500' }}>
                            <ArrowRightLeft size={14} /> {item.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <NewAllocationModal 
        isOpen={isAllocModalOpen} 
        onClose={() => setIsAllocModalOpen(false)} 
        onSuccess={fetchData} 
      />
      <TransferRequestModal 
        isOpen={isTransferModalOpen} 
        onClose={() => setIsTransferModalOpen(false)} 
        onSuccess={fetchData} 
      />
    </div>
  );
};

export default AssetAllocation;
