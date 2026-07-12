import React, { useState, useEffect, useRef } from 'react';
import { Bell, Search, User, X, CheckCheck, BellOff, ChevronDown, Monitor, ClipboardCheck, Wrench, ArrowRightLeft, BarChart3, CalendarCheck, Users, Building2, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

const Header = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const dropdownRef = useRef(null);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [forEveryoneOpen, setForEveryoneOpen] = useState(false);
  const featuresRef = useRef(null);
  const forEveryoneRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data || []);
      setUnreadCount(res.unread || 0);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
      if (featuresRef.current && !featuresRef.current.contains(e.target)) {
        setFeaturesOpen(false);
      }
      if (forEveryoneRef.current && !forEveryoneRef.current.contains(e.target)) {
        setForEveryoneOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const getTypeIcon = (type) => {
    const iconStyle = { width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
    switch (type) {
      case 'AUDIT_ASSIGNED':
        return <div style={{ ...iconStyle, backgroundColor: '#ede9fe' }}>📋</div>;
      case 'BOOKING_CONFIRMED':
        return <div style={{ ...iconStyle, backgroundColor: '#dcfce7' }}>📅</div>;
      case 'MAINTENANCE_UPDATE':
        return <div style={{ ...iconStyle, backgroundColor: '#fef3c7' }}>🔧</div>;
      case 'TRANSFER_REQUEST':
        return <div style={{ ...iconStyle, backgroundColor: '#dbeafe' }}>↔️</div>;
      default:
        return <div style={{ ...iconStyle, backgroundColor: 'var(--surface-hover)' }}>🔔</div>;
    }
  };

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
        
        {/* Features Dropdown */}
        <div style={{ position: 'relative' }} ref={featuresRef}>
          <button 
            onClick={() => { setFeaturesOpen(!featuresOpen); setForEveryoneOpen(false); }}
            style={{ background: featuresOpen ? 'var(--surface-hover)' : 'transparent', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-main)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.35rem', transition: 'background-color 0.2s' }}
          >
            <Zap size={14} /> Features <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: featuresOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
          </button>
          {featuresOpen && (
            <div className="card" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: '240px', zIndex: 1000, padding: '0.5rem', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
              {[
                { icon: <Monitor size={16} />, label: 'Asset Directory', desc: 'Browse & manage assets', path: '/assets' },
                { icon: <ClipboardCheck size={16} />, label: 'Asset Audit', desc: 'Verification cycles', path: '/audit' },
                { icon: <Wrench size={16} />, label: 'Maintenance', desc: 'Requests & tracking', path: '/maintenance' },
                { icon: <ArrowRightLeft size={16} />, label: 'Allocations', desc: 'Assign & transfer', path: '/allocation' },
                { icon: <BarChart3 size={16} />, label: 'Reports', desc: 'Analytics & insights', path: '/reports' },
              ].map(item => (
                <button key={item.path} onClick={() => { navigate(item.path); setFeaturesOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.6rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px', textAlign: 'left', transition: 'background-color 0.15s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <div style={{ color: 'var(--primary-color)' }}>{item.icon}</div>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: '500', color: 'var(--text-main)' }}>{item.label}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* For Everyone Dropdown */}
        <div style={{ position: 'relative' }} ref={forEveryoneRef}>
          <button 
            onClick={() => { setForEveryoneOpen(!forEveryoneOpen); setFeaturesOpen(false); }}
            style={{ background: forEveryoneOpen ? 'var(--surface-hover)' : 'transparent', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-main)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.35rem', transition: 'background-color 0.2s' }}
          >
            <Users size={14} /> For Everyone <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: forEveryoneOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
          </button>
          {forEveryoneOpen && (
            <div className="card" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: '260px', zIndex: 1000, padding: '0.5rem', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
              {[
                { icon: <CalendarCheck size={16} />, label: 'Book a Resource', desc: 'Reserve shared assets', path: '/booking' },
                { icon: <Wrench size={16} />, label: 'Raise Maintenance', desc: 'Report issues with assets', path: '/maintenance' },
                { icon: <Building2 size={16} />, label: 'Organization', desc: 'Departments & settings', path: '/organization' },
                { icon: <BarChart3 size={16} />, label: 'Activity Logs', desc: 'View recent activity', path: '/logs' },
              ].map(item => (
                <button key={item.path} onClick={() => { navigate(item.path); setForEveryoneOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.6rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px', textAlign: 'left', transition: 'background-color 0.15s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <div style={{ color: 'var(--secondary-color)' }}>{item.icon}</div>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: '500', color: 'var(--text-main)' }}>{item.label}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{ 
              background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', position: 'relative',
              padding: '0.5rem', borderRadius: '8px',
              backgroundColor: isDropdownOpen ? 'var(--surface-hover)' : 'transparent',
              transition: 'background-color 0.2s'
            }}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={{ 
                position: 'absolute', top: '2px', right: '2px', 
                minWidth: '16px', height: '16px', 
                backgroundColor: 'var(--danger-color)', borderRadius: '8px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6rem', fontWeight: '700', color: 'white',
                padding: '0 4px', lineHeight: 1,
                border: '2px solid var(--surface-color)'
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          
          {isDropdownOpen && (
            <div className="card" style={{ 
              position: 'absolute', top: 'calc(100% + 8px)', right: '-8px', 
              width: '380px', zIndex: 1000, padding: 0, 
              maxHeight: '480px', display: 'flex', flexDirection: 'column',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              border: '1px solid var(--border-color)'
            }}>
              {/* Header */}
              <div style={{ 
                padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                backgroundColor: 'var(--surface-color)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: '600' }}>Notifications</h3>
                  {unreadCount > 0 && (
                    <span style={{ 
                      backgroundColor: 'var(--primary-color)', color: 'white', 
                      fontSize: '0.65rem', fontWeight: '700', padding: '2px 6px', 
                      borderRadius: '10px' 
                    }}>
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead} 
                      title="Mark all as read"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
                    >
                      <CheckCheck size={16} color="var(--primary-color)" />
                    </button>
                  )}
                  <button 
                    onClick={() => setIsDropdownOpen(false)} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
                  >
                    <X size={16} color="var(--text-muted)" />
                  </button>
                </div>
              </div>

              {/* Filter tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0 1rem' }}>
                <button 
                  onClick={() => setFilter('all')}
                  style={{ 
                    padding: '0.5rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem',
                    fontWeight: filter === 'all' ? '600' : '400', color: filter === 'all' ? 'var(--primary-color)' : 'var(--text-muted)',
                    borderBottom: filter === 'all' ? '2px solid var(--primary-color)' : '2px solid transparent', marginBottom: '-1px'
                  }}
                >All</button>
                <button 
                  onClick={() => setFilter('unread')}
                  style={{ 
                    padding: '0.5rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem',
                    fontWeight: filter === 'unread' ? '600' : '400', color: filter === 'unread' ? 'var(--primary-color)' : 'var(--text-muted)',
                    borderBottom: filter === 'unread' ? '2px solid var(--primary-color)' : '2px solid transparent', marginBottom: '-1px'
                  }}
                >Unread</button>
              </div>

              {/* Notification items */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {filteredNotifications.length === 0 ? (
                  <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <BellOff size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                    <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                      {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                    </div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {filter === 'unread' ? 'You\'re all caught up!' : 'Notifications will appear here'}
                    </div>
                  </div>
                ) : (
                  filteredNotifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => { if (!n.is_read) markAsRead(n.id); }}
                      style={{ 
                        padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', 
                        cursor: n.is_read ? 'default' : 'pointer', 
                        backgroundColor: n.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.04)',
                        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                        transition: 'background-color 0.15s'
                      }}
                    >
                      {getTypeIcon(n.type)}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <div style={{ fontSize: '0.84rem', fontWeight: n.is_read ? '400' : '600', color: 'var(--text-main)', lineHeight: 1.3 }}>{n.title}</div>
                          {!n.is_read && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', flexShrink: 0, marginTop: '6px' }}></div>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.4 }}>{n.message}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem', opacity: 0.7 }}>{timeAgo(n.created_at)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-main)' }}>Rohan Desai</div>
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
