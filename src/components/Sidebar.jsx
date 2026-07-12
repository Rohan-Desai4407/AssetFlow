import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Box, ArrowRightLeft, CalendarCheck, Wrench, Settings } from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Assets', path: '/assets', icon: <Box size={20} /> },
    { name: 'Allocations', path: '/allocations', icon: <ArrowRightLeft size={20} /> },
    { name: 'Bookings', path: '/bookings', icon: <CalendarCheck size={20} /> },
    { name: 'Maintenance', path: '/maintenance', icon: <Wrench size={20} /> },
    { name: 'Organization', path: '/settings', icon: <Settings size={20} /> },
  ];

  return (
    <aside className="sidebar">
      <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ width: '32px', height: '32px', backgroundColor: 'var(--primary-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
          AF
        </div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: 0, fontWeight: '700', color: 'var(--primary-color)' }}>AssetFlow</h2>
      </div>
      
      <nav style={{ flex: 1, padding: '1rem 0' }}>
        <ul style={{ listStyle: 'none' }}>
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink 
                to={item.path}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1.5rem',
                  color: isActive ? 'var(--primary-color)' : 'var(--text-muted)',
                  backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                  borderRight: isActive ? '3px solid var(--primary-color)' : '3px solid transparent',
                  fontWeight: isActive ? '600' : '500',
                  textDecoration: 'none',
                  transition: 'background-color var(--transition-fast)'
                })}
              >
                {item.icon}
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      
      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        © 2026 AssetFlow ERP
      </div>
    </aside>
  );
};

export default Sidebar;
