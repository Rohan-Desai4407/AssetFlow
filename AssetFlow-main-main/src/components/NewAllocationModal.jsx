import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X } from 'lucide-react';

const NewAllocationModal = ({ isOpen, onClose, onSuccess }) => {
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    assetId: '',
    assignType: 'USER', // 'USER' or 'DEPARTMENT'
    allocateToUserId: '',
    allocateToDepartmentId: '',
    expectedReturnDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const [assetsRes, empRes, deptRes] = await Promise.all([
            api.get('/assets?status=AVAILABLE'),
            api.get('/employees'),
            api.get('/departments')
          ]);
          setAssets(assetsRes.data || []);
          setEmployees(empRes.data || []);
          setDepartments(deptRes.data || []);
        } catch (err) {
          console.error('Failed to fetch allocation data', err);
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
      expectedReturnDate: formData.expectedReturnDate || undefined,
      allocateToUserId: formData.assignType === 'USER' ? formData.allocateToUserId : undefined,
      allocateToDepartmentId: formData.assignType === 'DEPARTMENT' ? formData.allocateToDepartmentId : undefined
    };

    if (!payload.allocateToUserId && !payload.allocateToDepartmentId) {
      setError('Please select a user or department');
      setLoading(false);
      return;
    }

    try {
      await api.post('/allocations', payload);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.error || err.message || 'Failed to create allocation');
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
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>New Allocation</h2>
        
        {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', borderRadius: '4px', fontSize: '0.875rem' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Asset *</label>
            <select className="form-input" name="assetId" value={formData.assetId} onChange={handleChange} required>
              <option value="">Select Available Asset</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>)}
            </select>
          </div>
          
          <div className="form-group" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="radio" name="assignType" value="USER" checked={formData.assignType === 'USER'} onChange={handleChange} /> User
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="radio" name="assignType" value="DEPARTMENT" checked={formData.assignType === 'DEPARTMENT'} onChange={handleChange} /> Department
            </label>
          </div>
          
          {formData.assignType === 'USER' ? (
            <div className="form-group">
              <label className="form-label">Assign To User *</label>
              <select className="form-input" name="allocateToUserId" value={formData.allocateToUserId} onChange={handleChange} required={formData.assignType === 'USER'}>
                <option value="">Select User</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.email})</option>)}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Assign To Department *</label>
              <select className="form-input" name="allocateToDepartmentId" value={formData.allocateToDepartmentId} onChange={handleChange} required={formData.assignType === 'DEPARTMENT'}>
                <option value="">Select Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}
          
          <div className="form-group">
            <label className="form-label">Expected Return Date</label>
            <input type="date" className="form-input" name="expectedReturnDate" value={formData.expectedReturnDate} onChange={handleChange} />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Allocating...' : 'Allocate Asset'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewAllocationModal;
