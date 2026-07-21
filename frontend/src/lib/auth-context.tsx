'use client';

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
} from 'react';

import { api } from '@/lib/api';
import { AuthUser } from '@/types';

interface AuthContextType {
    user: AuthUser | null;
    login: (user: AuthUser) => void;
    updateUser: (updates: Partial<AuthUser>) => void;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    login: () => {},
    updateUser: () => {},
    logout: () => {},
    loading: true,
});

export function AuthProvider({
                                 children,
                             }: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    // Restore authenticated user from backend
    useEffect(() => {
        const restoreUser = async () => {
            const token = localStorage.getItem('token');

            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const res = await api.get<AuthUser>('/api/auth/me');

                if (res.success && res.data) {
                    const authUser: AuthUser = {
                        ...res.data,
                        token,
                    };

                    setUser(authUser);
                    localStorage.setItem('user', JSON.stringify(authUser));
                } else {
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    setUser(null);
                }
            } catch {
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        restoreUser();
    }, []);

    const login = useCallback((userData: AuthUser) => {
        setUser(userData);

        localStorage.setItem('token', userData.token);
        localStorage.setItem('user', JSON.stringify(userData));
    }, []);
    const updateUser = useCallback((updates: Partial<AuthUser>) => {
        setUser(current => {
            if (!current) return current;

            const updated = {
                ...current,
                ...updates,
            };

            localStorage.setItem(
                'user',
                JSON.stringify(updated)
            );

            return updated;
        });
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                login,
                updateUser,
                logout,
                loading,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);