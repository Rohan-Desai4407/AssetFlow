import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X } from 'lucide-react';

const RegisterAssetModal = ({ isOpen, onClose, onSuccess }) => {
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    serialNumber: '',
    qrCode: '',
    acquisitionDate: '',
    acquisitionCost: '',
    condition: 'GOOD',
    location: '',
    departmentId: '',
    isBookable: false,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const catRes = await api.get('/categories');
          const depRes = await api.get('/departments');
          setCategories(catRes.data || []);
          setDepartments(depRes.data || []);
        } catch (err) {
          console.error('Failed to fetch modal data', err);
        }
      };
      fetchData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/assets', formData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to register asset');
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
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Register New Asset</h2>
        
        {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', borderRadius: '4px', fontSize: '0.875rem' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Asset Name *</label>
            <input type="text" className="form-input" name="name" value={formData.name} onChange={handleChange} required placeholder="e.g. MacBook Pro M2" />
          </div>
          
          <div className="form-group">
            <label className="form-label">Category *</label>
            <select className="form-input" name="categoryId" value={formData.categoryId} onChange={handleChange} required>
              <option value="">Select Category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Department</label>
            <select className="form-input" name="departmentId" value={formData.departmentId} onChange={handleChange}>
              <option value="">Select Department (Optional)</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Serial Number</label>
              <input type="text" className="form-input" name="serialNumber" value={formData.serialNumber} onChange={handleChange} placeholder="Optional" />
            </div>
            <div className="form-group">
              <label className="form-label">QR Code / Asset Tag</label>
              <input type="text" className="form-input" name="qrCode" value={formData.qrCode} onChange={handleChange} placeholder="Optional" />
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Acquisition Date</label>
              <input type="date" className="form-input" name="acquisitionDate" value={formData.acquisitionDate} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Cost</label>
              <input type="number" className="form-input" name="acquisitionCost" value={formData.acquisitionCost} onChange={handleChange} placeholder="0.00" min="0" step="0.01" />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Location</label>
            <input type="text" className="form-input" name="location" value={formData.location} onChange={handleChange} placeholder="e.g. IT Storage, Building A" />
          </div>
          
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', marginTop: '0.5rem' }}>
            <input type="checkbox" id="isBookable" name="isBookable" checked={formData.isBookable} onChange={handleChange} style={{ width: '1.125rem', height: '1.125rem' }} />
            <label htmlFor="isBookable" style={{ margin: 0, cursor: 'pointer', fontSize: '0.875rem' }}>Is this asset bookable by employees?</label>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Registering...' : 'Register Asset'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterAssetModal;
