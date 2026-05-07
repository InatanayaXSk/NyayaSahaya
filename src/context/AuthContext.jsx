import React, { createContext, useState, useEffect, useContext } from 'react';
import { BASE_URL } from '../utils/api';


const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('lexnet_token') || null);
    const [loading, setLoading] = useState(true);



    useEffect(() => {
        if (token) {
            fetch(`${BASE_URL}/api/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => {
                if (res.ok) return res.json();
                throw new Error("Invalid token");
            })
            .then(data => {
                setUser({ username: data.username, role: data.role });
            })
            .catch(() => {
                logout();
            })
            .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [token]);

    const login = async (username, password) => {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const res = await fetch(`${BASE_URL}/api/users/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData,
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Invalid credentials");
        }
        const data = await res.json();
        
        setToken(data.access_token);
        localStorage.setItem('lexnet_token', data.access_token);
        setUser({ username, role: data.role });
        return data;
    };

    const register = async (username, password, role) => {
        const res = await fetch(`${BASE_URL}/api/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role })
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Registration failed");
        }
        
        return await login(username, password);
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('lexnet_token');
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
