import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X } from 'lucide-react';

const BookResourceModal = ({ isOpen, onClose, onSuccess }) => {
  const [assets, setAssets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    assetId: '',
    startTime: '',
    endTime: '',
    purpose: '',
    departmentId: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const assetsRes = await api.get('/assets?isBookable=true');
          const depRes = await api.get('/departments');
          setAssets(assetsRes.data || []);
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
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await api.post('/bookings', formData);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to book resource');
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
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Book a Resource</h2>
        
        {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', borderRadius: '4px', fontSize: '0.875rem' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Resource *</label>
            <select className="form-input" name="assetId" value={formData.assetId} onChange={handleChange} required>
              <option value="">Select Resource</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>)}
            </select>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Start Time *</label>
              <input type="datetime-local" className="form-input" name="startTime" value={formData.startTime} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">End Time *</label>
              <input type="datetime-local" className="form-input" name="endTime" value={formData.endTime} onChange={handleChange} required />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Purpose</label>
            <textarea className="form-input" name="purpose" value={formData.purpose} onChange={handleChange} rows="3" placeholder="Reason for booking..."></textarea>
          </div>
          
          <div className="form-group">
            <label className="form-label">Department</label>
            <select className="form-input" name="departmentId" value={formData.departmentId} onChange={handleChange}>
              <option value="">Select Department (Optional)</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Booking...' : 'Confirm Booking'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookResourceModal;
