import React, { useState, useEffect } from 'react';
import { Search, AlertTriangle, CheckCircle2, Plus, Play, Lock, X, ClipboardCheck } from 'lucide-react';
import { api } from '../services/api';

const CreateAuditModal = ({ isOpen, onClose, onSuccess }) => {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    scopeDepartmentId: '',
    scopeLocation: '',
    startDate: '',
    endDate: '',
    auditorIds: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const [deptRes, empRes] = await Promise.all([
            api.get('/departments'),
            api.get('/employees')
          ]);
          setDepartments(deptRes.data || []);
          setEmployees(empRes.data || []);
        } catch (err) {
          console.error(err);
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

  const handleAuditorToggle = (id) => {
    setFormData(prev => ({
      ...prev,
      auditorIds: prev.auditorIds.includes(id)
        ? prev.auditorIds.filter(a => a !== id)
        : [...prev.auditorIds, id]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/audits', {
        name: formData.name,
        scopeDepartmentId: formData.scopeDepartmentId || undefined,
        scopeLocation: formData.scopeLocation || undefined,
        startDate: formData.startDate,
        endDate: formData.endDate,
        auditorIds: formData.auditorIds
      });
      onSuccess();
      onClose();
      setFormData({ name: '', scopeDepartmentId: '', scopeLocation: '', startDate: '', endDate: '', auditorIds: [] });
    } catch (err) {
      setError(err.error || err.message || 'Failed to create audit cycle');
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
      <div className="card" style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={20} color="var(--text-muted)" />
        </button>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Create Audit Cycle</h2>
        
        {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', borderRadius: '4px', fontSize: '0.875rem' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Audit Name *</label>
            <input type="text" className="form-input" name="name" value={formData.name} onChange={handleChange} required placeholder="e.g. Q3 Audit: Engineering" />
          </div>

          <div className="form-group">
            <label className="form-label">Scope: Department</label>
            <select className="form-input" name="scopeDepartmentId" value={formData.scopeDepartmentId} onChange={handleChange}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Scope: Location</label>
            <input type="text" className="form-input" name="scopeLocation" value={formData.scopeLocation} onChange={handleChange} placeholder="e.g. Building A (optional)" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Start Date *</label>
              <input type="date" className="form-input" name="startDate" value={formData.startDate} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">End Date *</label>
              <input type="date" className="form-input" name="endDate" value={formData.endDate} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Assign Auditors * (select at least one)</label>
            <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem' }}>
              {employees.map(emp => (
                <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.5rem', cursor: 'pointer', borderRadius: '4px' }}>
                  <input
                    type="checkbox"
                    checked={formData.auditorIds.includes(emp.id)}
                    onChange={() => handleAuditorToggle(emp.id)}
                    style={{ width: '1rem', height: '1rem' }}
                  />
                  <span style={{ fontSize: '0.875rem' }}>{emp.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({emp.email})</span></span>
                </label>
              ))}
              {employees.length === 0 && <div style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No employees found</div>}
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || formData.auditorIds.length === 0}>{loading ? 'Creating...' : 'Create Audit'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AssetAudit = () => {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(null);

  const fetchAudits = async () => {
    try {
      setLoading(true);
      const res = await api.get('/audits');
      setAudits(res.data || []);
    } catch (err) {
      console.error('Failed to fetch audits', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, []);

  const handleStart = async (id) => {
    try {
      await api.post(`/audits/${id}/start`);
      fetchAudits();
    } catch (err) {
      alert(err.error || err.message || 'Failed to start audit');
    }
  };

  const handleClose = async (id) => {
    const force = window.confirm('Close this audit cycle? Unverified items can be force-closed.');
    if (!force) return;
    try {
      await api.post(`/audits/${id}/close`, { force: true });
      fetchAudits();
      setSelectedAudit(null);
    } catch (err) {
      alert(err.error || err.message || 'Failed to close audit');
    }
  };

  const handleVerify = async (auditId, itemId, result) => {
    const notes = result !== 'VERIFIED' ? window.prompt(`Notes for ${result.toLowerCase()} item:`) : '';
    setVerifyLoading(itemId);
    try {
      const res = await api.post(`/audits/${auditId}/items/${itemId}/verify`, { result, notes: notes || undefined });
      // Refresh the selected audit
      setSelectedAudit(res.data);
      fetchAudits();
    } catch (err) {
      alert(err.error || err.message || 'Failed to verify item');
    } finally {
      setVerifyLoading(null);
    }
  };

  const handleResolveDiscrepancy = async (discrepancyId) => {
    const resolutionNotes = window.prompt('Resolution notes:');
    if (!resolutionNotes) return;
    try {
      await api.post(`/audits/discrepancies/${discrepancyId}/resolve`, { resolutionNotes });
      if (selectedAudit) {
        const res = await api.get(`/audits/${selectedAudit.id}`);
        setSelectedAudit(res.data);
      }
      fetchAudits();
    } catch (err) {
      alert(err.error || err.message || 'Failed to resolve discrepancy');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PLANNED': return <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>Planned</span>;
      case 'IN_PROGRESS': return <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>In Progress</span>;
      case 'CLOSED': return <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Closed</span>;
      default: return <span className="badge" style={{ fontSize: '0.7rem' }}>{status}</span>;
    }
  };

  const getItemBadge = (result) => {
    if (!result) return <span className="badge" style={{ fontSize: '0.7rem', backgroundColor: 'var(--surface-hover)', color: 'var(--text-muted)' }}>Pending</span>;
    switch (result) {
      case 'VERIFIED': return <span className="badge badge-success" style={{ fontSize: '0.7rem' }}><CheckCircle2 size={12} style={{ marginRight: '3px' }}/> Verified</span>;
      case 'MISSING': return <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}><AlertTriangle size={12} style={{ marginRight: '3px' }}/> Missing</span>;
      case 'DAMAGED': return <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}><AlertTriangle size={12} style={{ marginRight: '3px' }}/> Damaged</span>;
      default: return <span className="badge" style={{ fontSize: '0.7rem' }}>{result}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Asset Audit</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Structured verification cycles & discrepancy reports.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
          <Plus size={18} />
          New Audit Cycle
        </button>
      </div>

      {/* Audit Cycles List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading audits...</div>
      ) : audits.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <ClipboardCheck size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <p>No audit cycles yet. Create one to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {audits.map(audit => {
            const totalItems = audit.items?.length || 0;
            const verifiedItems = audit.items?.filter(i => i.result).length || 0;
            const flagged = audit.discrepancies?.length || 0;
            const progress = totalItems > 0 ? Math.round((verifiedItems / totalItems) * 100) : 0;

            return (
              <div key={audit.id} className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                      <h2 style={{ fontSize: '1.125rem', margin: 0 }}>{audit.name}</h2>
                      {getStatusBadge(audit.status)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {audit.start_date} → {audit.end_date}
                      {audit.auditors?.length > 0 && <span> · Auditors: {audit.auditors.map(a => a.name).join(', ')}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {audit.status === 'PLANNED' && (
                      <button className="btn btn-primary" onClick={() => handleStart(audit.id)} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                        <Play size={14} /> Start
                      </button>
                    )}
                    {audit.status === 'IN_PROGRESS' && (
                      <button className="btn btn-secondary" onClick={() => handleClose(audit.id)} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                        <Lock size={14} /> Close
                      </button>
                    )}
                    <button className="btn btn-secondary" onClick={() => setSelectedAudit(selectedAudit?.id === audit.id ? null : audit)} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                      {selectedAudit?.id === audit.id ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--surface-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', backgroundColor: progress === 100 ? 'var(--secondary-color)' : 'var(--primary-color)', transition: 'width 0.3s ease', borderRadius: '3px' }}></div>
                  </div>
                  <span>{verifiedItems}/{totalItems} verified</span>
                  {flagged > 0 && <span style={{ color: 'var(--danger-color)' }}>· {flagged} flagged</span>}
                </div>

                {/* Expanded detail view */}
                {selectedAudit?.id === audit.id && (
                  <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Audit Items</h3>
                    {audit.items?.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No assets in scope for this audit.</div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                            <th style={{ padding: '0.75rem 0' }}>Asset</th>
                            <th style={{ padding: '0.75rem 0', textAlign: 'center' }}>Status</th>
                            {audit.status === 'IN_PROGRESS' && <th style={{ padding: '0.75rem 0', textAlign: 'right' }}>Actions</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {audit.items?.map(item => (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '0.75rem 0' }}>
                                <span style={{ fontWeight: '500' }}>{item.asset_tag}</span> {item.asset_name}
                              </td>
                              <td style={{ padding: '0.75rem 0', textAlign: 'center' }}>{getItemBadge(item.result)}</td>
                              {audit.status === 'IN_PROGRESS' && (
                                <td style={{ padding: '0.75rem 0', textAlign: 'right' }}>
                                  {!item.result && (
                                    <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                                      <button disabled={verifyLoading === item.id} className="btn btn-primary" onClick={() => handleVerify(audit.id, item.id, 'VERIFIED')} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>✓ Verified</button>
                                      <button disabled={verifyLoading === item.id} className="btn btn-secondary" onClick={() => handleVerify(audit.id, item.id, 'DAMAGED')} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--warning-color)' }}>⚠ Damaged</button>
                                      <button disabled={verifyLoading === item.id} className="btn btn-secondary" onClick={() => handleVerify(audit.id, item.id, 'MISSING')} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger-color)' }}>✗ Missing</button>
                                    </div>
                                  )}
                                  {item.result && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Done</span>}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {/* Discrepancies section */}
                    {audit.discrepancies?.length > 0 && (
                      <div style={{ marginTop: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <AlertTriangle size={16} color="var(--danger-color)" /> Discrepancies
                          <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>{audit.discrepancies.filter(d => d.resolution_status === 'OPEN').length} open</span>
                        </h3>
                        {audit.discrepancies.map(disc => (
                          <div key={disc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: disc.resolution_status === 'OPEN' ? '#fef2f2' : 'var(--surface-hover)', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem', border: disc.resolution_status === 'OPEN' ? '1px solid #fecaca' : '1px solid var(--border-color)' }}>
                            <div>
                              <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>{disc.asset_tag} {disc.asset_name}</span>
                              <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: disc.type === 'MISSING' ? 'var(--danger-color)' : 'var(--warning-color)' }}>{disc.type}</span>
                              {disc.resolution_notes && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Resolution: {disc.resolution_notes}</div>}
                            </div>
                            {disc.resolution_status === 'OPEN' ? (
                              <button className="btn btn-secondary" onClick={() => handleResolveDiscrepancy(disc.id)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Resolve</button>
                            ) : (
                              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Resolved</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CreateAuditModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSuccess={fetchAudits} />
    </div>
  );
};

export default AssetAudit;
