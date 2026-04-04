import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * ProtectedRoute component - redirects unauthenticated users to /auth
 */
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        // Show a simple loading state while checking the token
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
                <div className="text-[#00f2ff] animate-pulse font-mono">
                    NEURAL LINK INITIALIZING...
                </div>
            </div>
        );
    }

    if (!user) {
        // Redirect to /auth but save the current location to redirect back after login
        return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    return children;
};

export default ProtectedRoute;
