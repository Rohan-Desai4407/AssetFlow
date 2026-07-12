import React from 'react';
import { Bell, Search, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search assets, employees..." 
            className="form-input" 
            style={{ paddingLeft: '2.5rem', borderRadius: 'var(--radius-full)' }} 
          />
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', position: 'relative' }}>
          <Bell size={20} />
          <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', backgroundColor: 'var(--danger-color)', borderRadius: '50%' }}></span>
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-main)' }}>Jane Doe</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Asset Manager</div>
          </div>
          <button onClick={() => navigate('/login')} style={{ background: 'var(--primary-light)', color: 'var(--primary-color)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <User size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
