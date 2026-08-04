import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';

import { DashboardPage }      from './pages/DashboardPage';
import { ContractsListPage }  from './pages/ContractsListPage';
import { UploadPage }         from './pages/UploadPage';
import { AnalysisPage }       from './pages/AnalysisPage';
import { HistoryPage }        from './pages/HistoryPage';
import { SettingsPage }       from './pages/SettingsPage';
import { LoginPage }          from './pages/LoginPage';

const ProtectedLayout: React.FC = () => {
  const token = localStorage.getItem('contractclaw_token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-shell">
      <Sidebar userRole="admin" />
      <div className="main-viewport">
        <Header />
        <ErrorBoundary>
          <Routes>
            <Route path="/dashboard"             element={<DashboardPage />} />
            <Route path="/contracts"             element={<ContractsListPage />} />
            <Route path="/upload"                element={<UploadPage />} />
            <Route path="/analysis/:contractId"  element={<AnalysisPage />} />
            <Route path="/analysis"              element={<AnalysisPage />} />
            <Route path="/history"               element={<HistoryPage />} />
            <Route path="/settings"              element={<SettingsPage />} />
            <Route path="*"                      element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ErrorBoundary>
      </div>
    </div>
  );
};

export const App: React.FC = () => (
  <ThemeProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*"     element={<ProtectedLayout />} />
      </Routes>
    </BrowserRouter>
  </ThemeProvider>
);

export default App;
