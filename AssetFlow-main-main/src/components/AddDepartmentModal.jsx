import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X } from 'lucide-react';

const AddDepartmentModal = ({ isOpen, onClose, onSuccess }) => {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    headUserId: '',
    parentId: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const deptRes = await api.get('/departments');
          const empRes = await api.get('/employees');
          setDepartments(deptRes.data || []);
          setEmployees(empRes.data || []);
        } catch (err) {
          console.error('Failed to fetch modal data', err);
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
    
    try {
      await api.post('/departments', formData);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.error || err.message || 'Failed to add department');
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
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Add Department</h2>
        
        {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', borderRadius: '4px', fontSize: '0.875rem' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Department Name *</label>
            <input type="text" className="form-input" name="name" value={formData.name} onChange={handleChange} required placeholder="e.g. Engineering" />
          </div>
          
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" name="description" value={formData.description} onChange={handleChange} rows="2" placeholder="Optional description..."></textarea>
          </div>
          
          <div className="form-group">
            <label className="form-label">Department Head</label>
            <select className="form-input" name="headUserId" value={formData.headUserId} onChange={handleChange}>
              <option value="">Select Department Head (Optional)</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.email})</option>)}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Parent Department</label>
            <select className="form-input" name="parentId" value={formData.parentId} onChange={handleChange}>
              <option value="">Select Parent Department (Optional)</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Adding...' : 'Add Department'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDepartmentModal;
