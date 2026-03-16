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

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/document-generator" element={<DocumentGeneratorPage />} />
          <Route path="/risk-analysis" element={<RiskAnalysisPage />} />
          <Route path="/legal-summary" element={<LegalSummaryPage />} />
          <Route path="/hardware-auth" element={<HardwareAuthPage />} />
          <Route path="/crypto-signing" element={<CryptoSigningPage />} />
          <Route path="/network-registry" element={<NetworkRegistryPage />} />
          <Route path="/verification-report" element={<VerificationReportPage />} />
          <Route path="/bridge-monitor" element={<BridgeMonitorPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
