/**
 * Global API configuration for NyayaSahaya.
 * Uses environment variables with a fallback to localhost for development.
 */

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const API_BASE = `${BASE_URL}/api`;
export const RPI_BASE = import.meta.env.VITE_RPI_URL || 'http://localhost:8001';


// API Endpoints
export const ENDPOINTS = {
    DOCUMENTS: `${API_BASE}/api/documents`,
    STATS: `${API_BASE}/api/documents/stats`,
    DOWNLOAD: `${API_BASE}/api/download`,
    GENERATE: `${API_BASE}/api/generate-doc`,
    VERIFY_UPLOAD: `${API_BASE}/api/verify-upload`,
    ANALYZE: `${API_BASE}/api/analyze`,
    HARDWARE: {
        HEARTBEAT: `${API_BASE}/api/hardware/heartbeat`,
        AUTHENTICATE: `${API_BASE}/api/hardware/authenticate`,
        VERIFY_ON_CHAIN: `${API_BASE}/api/hardware/documents`, // Will need suffix /verify-on-chain
        CHAIN_STATUS: `${API_BASE}/api/hardware/documents`, // Will need suffix /chain-status
        WS: API_BASE.replace(/^http/, 'ws') + '/ws/hardware'
    }
};

export default {
    API_BASE,
    ENDPOINTS
};
