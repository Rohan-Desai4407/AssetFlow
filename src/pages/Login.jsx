import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real app, this is where you'd call the backend API.
    // For this UI mockup, we'll just navigate to the dashboard.
    navigate('/dashboard');
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: 'var(--background-color)',
      padding: '1rem'
    }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem 2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            backgroundColor: 'var(--primary-color)', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'white',
            marginBottom: '1rem'
          }}>
            <Box size={24} />
          </div>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>
            {isLogin ? 'Welcome to AssetFlow' : 'Create an Account'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem', textAlign: 'center' }}>
            {isLogin ? 'Enterprise Asset & Resource Management System' : 'Join to start managing assets and resources'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label" htmlFor="name">Full Name</label>
              <input 
                type="text" 
                id="name" 
                className="form-input" 
                placeholder="Jane Doe" 
                required 
              />
            </div>
          )}
          
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email address</label>
            <input 
              type="email" 
              id="email" 
              className="form-input" 
              placeholder="name@company.com" 
              defaultValue={isLogin ? "jane.doe@company.com" : ""}
              required 
            />
          </div>
          
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" htmlFor="password" style={{ margin: 0 }}>Password</label>
              {isLogin && <a href="#" style={{ fontSize: '0.75rem' }} onClick={(e) => e.preventDefault()}>Forgot password?</a>}
            </div>
            <input 
              type="password" 
              id="password" 
              className="form-input" 
              placeholder="••••••••" 
              defaultValue={isLogin ? "password" : ""}
              style={{ marginTop: '0.5rem' }}
              required 
            />
          </div>

          {!isLogin && (
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" htmlFor="confirm-password" style={{ margin: 0 }}>Confirm Password</label>
              <input 
                type="password" 
                id="confirm-password" 
                className="form-input" 
                placeholder="••••••••" 
                style={{ marginTop: '0.5rem' }}
                required 
              />
            </div>
          )}
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {isLogin ? (
            <>Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(false); }}>Sign up</a></>
          ) : (
            <>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(true); }}>Sign in</a></>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
