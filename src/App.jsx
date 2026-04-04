import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import DocumentGeneratorPage from './pages/DocumentGeneratorPage';
import RiskAnalysisPage from './pages/RiskAnalysisPage';
import LegalSummaryPage from './pages/LegalSummaryPage';
import HardwareAuthPage from './pages/HardwareAuthPage';
import CryptoSigningPage from './pages/CryptoSigningPage';
import NetworkRegistryPage from './pages/NetworkRegistryPage';
import VerificationReportPage from './pages/VerificationReportPage';
import BridgeMonitorPage from './pages/BridgeMonitorPage';
import AuthPage from './pages/AuthPage';
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
              <Route path="/hardware-auth" element={<ProtectedRoute><HardwareAuthPage /></ProtectedRoute>} />
              <Route path="/crypto-signing" element={<ProtectedRoute><CryptoSigningPage /></ProtectedRoute>} />
              <Route path="/network-registry" element={<NetworkRegistryPage />} />
              <Route path="/verification-report" element={<VerificationReportPage />} />
              <Route path="/bridge-monitor" element={<ProtectedRoute><BridgeMonitorPage /></ProtectedRoute>} />
            </Routes>
          </Layout>
        </Router>
      </ClientProvider>
    </AuthProvider>
  );
}

export default App;
