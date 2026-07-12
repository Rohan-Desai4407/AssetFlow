import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import AssetDirectory from './pages/AssetDirectory';
import AssetAllocation from './pages/AssetAllocation';
import OrganizationSetup from './pages/OrganizationSetup';
import ResourceBooking from './pages/ResourceBooking';
import MaintenanceManagement from './pages/MaintenanceManagement';
import AssetAudit from './pages/AssetAudit';
import ReportsAnalytics from './pages/ReportsAnalytics';
import ActivityLogs from './pages/ActivityLogs';
import './index.css';

// A simple layout component to wrap authenticated pages
const MainLayout = ({ children }) => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Authenticated Routes */}
        <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
        <Route path="/assets" element={<MainLayout><AssetDirectory /></MainLayout>} />
        <Route path="/allocations" element={<MainLayout><AssetAllocation /></MainLayout>} />
        <Route path="/settings" element={<MainLayout><OrganizationSetup /></MainLayout>} />
        <Route path="/bookings" element={<MainLayout><ResourceBooking /></MainLayout>} />
        <Route path="/maintenance" element={<MainLayout><MaintenanceManagement /></MainLayout>} />
        <Route path="/audit" element={<MainLayout><AssetAudit /></MainLayout>} />
        <Route path="/reports" element={<MainLayout><ReportsAnalytics /></MainLayout>} />
        <Route path="/notifications" element={<MainLayout><ActivityLogs /></MainLayout>} />
        
        {/* Default Route */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
