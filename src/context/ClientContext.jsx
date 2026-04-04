import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';

const ClientContext = createContext();

export const useClient = () => useContext(ClientContext);

export const ClientProvider = ({ children }) => {
    const { user, token } = useAuth();
    const [clients, setClients] = useState([]);
    const [activeClient, setActiveClient] = useState(null);
    const [activeDocument, setActiveDocument] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Only fetch clients if the user is a lawyer
        if (user && user.role === 'lawyer' && token) {
            setLoading(true);
            fetch('http://localhost:8000/api/users/clients', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(res => {
                if (res.ok) return res.json();
                throw new Error("Failed to fetch clients");
            })
            .then(data => {
                setClients(data);
                if (data.length > 0 && !activeClient) {
                    setActiveClient(data[0]); // Default to first client
                }
            })
            .catch(err => console.error("Error fetching clients:", err))
            .finally(() => setLoading(false));
        } else {
            setClients([]);
            setActiveClient(null);
        }
    }, [user, token]);

    return (
        <ClientContext.Provider value={{ clients, activeClient, setActiveClient, activeDocument, setActiveDocument, loading }}>
            {children}
        </ClientContext.Provider>
    );
};
