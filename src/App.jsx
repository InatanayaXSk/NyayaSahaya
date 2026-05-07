import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import DocumentGeneratorPage from './pages/DocumentGeneratorPage';
import RiskAnalysisPage from './pages/RiskAnalysisPage';
import LegalSummaryPage from './pages/LegalSummaryPage';
import DocumentViewPage from './pages/DocumentViewPage';
import BridgeMonitorPage from './pages/BridgeMonitorPage';
import AuthPage from './pages/AuthPage';
import VerifyPage from './pages/VerifyPage';
import { AuthProvider } from './context/AuthContext';
import { ClientProvider } from './context/ClientContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <ClientProvider>
        <Router>
          <Layout>
            <Routes>
              {/* Public Routes */}
              <Route path="/auth" element={<AuthPage />} />
              
              {/* Protected Routes */}
              <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/document-generator" element={<ProtectedRoute><DocumentGeneratorPage /></ProtectedRoute>} />
              <Route path="/risk-analysis" element={<ProtectedRoute><RiskAnalysisPage /></ProtectedRoute>} />
              <Route path="/legal-summary" element={<ProtectedRoute><LegalSummaryPage /></ProtectedRoute>} />
              <Route path="/documents/:id" element={<ProtectedRoute><DocumentViewPage /></ProtectedRoute>} />
              <Route path="/bridge-monitor" element={<ProtectedRoute><BridgeMonitorPage /></ProtectedRoute>} />
              <Route path="/verify" element={<ProtectedRoute><VerifyPage /></ProtectedRoute>} />
            </Routes>
          </Layout>
        </Router>
      </ClientProvider>
    </AuthProvider>
  );
}

export default App;
