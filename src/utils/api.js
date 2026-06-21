/**
 * Global API configuration for NyayaSahaya.
 * Uses environment variables with a fallback to localhost for development.
 */

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
export const API_BASE = `${BASE_URL}/api`;
export const RPI_BASE = import.meta.env.VITE_RPI_URL || 'http://127.0.0.1:8001';


// API Endpoints
export const ENDPOINTS = {
    DOCUMENTS: `${API_BASE}/documents`,
    STATS: `${API_BASE}/documents/stats`,
    DOWNLOAD: `${API_BASE}/download`,
    GENERATE: `${API_BASE}/generate-doc`,
    VERIFY_UPLOAD: `${API_BASE}/verify-upload`,
    ANALYZE: `${API_BASE}/analyze`,
    HARDWARE: {
        STATUS: `${API_BASE}/hardware/status`,
        AUTHENTICATE: `${API_BASE}/hardware/authenticate`,
        VERIFY_ON_CHAIN: `${API_BASE}/hardware/documents`, // Will need suffix /verify-on-chain
        CHAIN_STATUS: `${API_BASE}/hardware/documents`, // Will need suffix /chain-status
        WS: API_BASE.replace(/^http/, 'ws') + '/ws/hardware'
    }
};

/**
 * Build an authenticated download URL for a document public_id.
 * Appends ?token=<jwt> so browser <a href> and direct navigation work
 * without needing an Authorization header.
 */
export function getDownloadUrl(publicId) {
    const token = localStorage.getItem('lexnet_token') || '';
    return `${API_BASE}/download/${publicId}?token=${encodeURIComponent(token)}&raw=true`;
}

export default {
    API_BASE,
    ENDPOINTS,
    getDownloadUrl
};
