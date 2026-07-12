import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, Plus } from 'lucide-react';
import BookResourceModal from '../components/BookResourceModal';

const ResourceBooking = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Resource Booking</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Book shared resources like meeting rooms and vehicles.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Book a Slot
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: '600' }}>Conference Room 2B - Floor 2, HQ</div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            <CalendarIcon size={16} />
            <span>Today, Oct 12</span>
          </div>
        </div>

        <div style={{ position: 'relative', borderLeft: '2px solid var(--border-color)', marginLeft: '3rem', paddingBottom: '2rem' }}>
          {['09:00', '10:00', '11:00', '12:00', '13:00'].map((time) => (
            <div key={time} style={{ position: 'relative', height: '60px' }}>
              <div style={{ position: 'absolute', left: '-3.5rem', top: '-0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{time}</div>
              <div style={{ borderBottom: '1px dashed var(--border-color)', height: '100%', width: '100%' }}></div>
            </div>
          ))}

          {/* Booked Slot */}
          <div style={{ 
            position: 'absolute', 
            top: '30px', /* 9:30 */
            height: '60px', /* 1 hour */
            left: '1rem', 
            right: '1rem', 
            backgroundColor: 'var(--primary-light)', 
            border: '1px solid var(--primary-color)',
            borderRadius: 'var(--radius-md)',
            padding: '0.5rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <div style={{ fontWeight: '500', color: 'var(--primary-color)', fontSize: '0.875rem' }}>Booked - Procurement Team</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Clock size={12} /> 9:30 AM - 10:30 AM
            </div>
          </div>
          
          {/* Conflicting Slot Attempt */}
          <div style={{ 
            position: 'absolute', 
            top: '60px', /* 10:00 */
            height: '60px', /* 1 hour */
            left: '1rem', 
            right: '1rem', 
            backgroundColor: 'var(--danger-color)', 
            opacity: 0.1,
            border: '2px dashed var(--danger-color)',
            borderRadius: 'var(--radius-md)',
          }}></div>
          <div style={{ 
            position: 'absolute', 
            top: '75px',
            left: '1rem', 
            right: '1rem', 
            textAlign: 'center',
            color: 'var(--danger-color)',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            Requested 10:00 to 11:00 - Conflict: Slot is unavailable
          </div>
        </div>
      </div>
      
      <BookResourceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => window.location.reload()} 
      />
    </div>
  );
};

export default ResourceBooking;
