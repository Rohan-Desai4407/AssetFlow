import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X } from 'lucide-react';

const TransferRequestModal = ({ isOpen, onClose, onSuccess }) => {
  const [allocations, setAllocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    assetId: '',
    assignType: 'USER', // 'USER' or 'DEPARTMENT'
    requestedToUserId: '',
    requestedToDepartmentId: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const [allocsRes, empRes, deptRes] = await Promise.all([
            api.get('/allocations?status=ACTIVE'),
            api.get('/employees'),
            api.get('/departments')
          ]);
          setAllocations(allocsRes.data || []);
          setEmployees(empRes.data || []);
          setDepartments(deptRes.data || []);
        } catch (err) {
          console.error('Failed to fetch transfer data', err);
        }
      };
      fetchData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const payload = {
      assetId: formData.assetId,
      reason: formData.reason || undefined,
      requestedToUserId: formData.assignType === 'USER' ? formData.requestedToUserId : undefined,
      requestedToDepartmentId: formData.assignType === 'DEPARTMENT' ? formData.requestedToDepartmentId : undefined
    };

    if (!payload.requestedToUserId && !payload.requestedToDepartmentId) {
      setError('Please select a user or department to transfer to');
      setLoading(false);
      return;
    }

    try {
      await api.post('/allocations/transfers', payload);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.error || err.message || 'Failed to request transfer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={20} color="var(--text-muted)" />
        </button>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Request Asset Transfer</h2>
        
        {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', borderRadius: '4px', fontSize: '0.875rem' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Currently Allocated Asset *</label>
            <select className="form-input" name="assetId" value={formData.assetId} onChange={handleChange} required>
              <option value="">Select Asset</option>
              {allocations.map(a => <option key={a.id} value={a.asset_id}>{a.asset_name} ({a.asset_tag})</option>)}
            </select>
          </div>
          
          <div className="form-group" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="radio" name="assignType" value="USER" checked={formData.assignType === 'USER'} onChange={handleChange} /> Transfer to User
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="radio" name="assignType" value="DEPARTMENT" checked={formData.assignType === 'DEPARTMENT'} onChange={handleChange} /> Transfer to Department
            </label>
          </div>
          
          {formData.assignType === 'USER' ? (
            <div className="form-group">
              <label className="form-label">Transfer To User *</label>
              <select className="form-input" name="requestedToUserId" value={formData.requestedToUserId} onChange={handleChange} required={formData.assignType === 'USER'}>
                <option value="">Select User</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.email})</option>)}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Transfer To Department *</label>
              <select className="form-input" name="requestedToDepartmentId" value={formData.requestedToDepartmentId} onChange={handleChange} required={formData.assignType === 'DEPARTMENT'}>
                <option value="">Select Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}
          
          <div className="form-group">
            <label className="form-label">Reason for Transfer</label>
            <textarea className="form-input" name="reason" value={formData.reason} onChange={handleChange} rows="3" placeholder="Why is this asset being transferred?"></textarea>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Requesting...' : 'Request Transfer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransferRequestModal;
