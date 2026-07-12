import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('admin@assetflow.local');
  const [password, setPassword] = useState('Admin@12345');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const emailValue = isLogin ? email : e.target.email.value;
    const passwordValue = isLogin ? password : e.target.password.value;
    
    try {
      if (isLogin) {
        await login(emailValue, passwordValue);
      } else {
        const name = e.target.name.value;
        const confirmPassword = e.target['confirm-password'].value;
        if (password !== confirmPassword) {
          setError("Passwords don't match");
          return;
        }
        await register(name, emailValue, passwordValue);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    }
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
          {error && (
            <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', fontSize: '0.875rem', textAlign: 'center' }}>
              {error}
            </div>
          )}
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
              value={isLogin ? email : undefined}
              onChange={isLogin ? (e) => setEmail(e.target.value) : undefined}
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
              value={isLogin ? password : undefined}
              onChange={isLogin ? (e) => setPassword(e.target.value) : undefined}
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
