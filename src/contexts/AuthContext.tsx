import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, User } from '../lib/api';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  loadCurrentUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in (token exists)
    loadCurrentUser();
  }, []);

  async function loadCurrentUser() {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const { user } = await api.getCurrentUser();
      setUser(user);
    } catch (error) {
      // Token might be invalid, clear it
      api.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function signUp(email: string, password: string, name: string, phone?: string) {
    const { user, token } = await api.register(email, password, name, phone);
    setUser(user);
  }

  async function signIn(email: string, password: string) {
    try {
      const { user } = await api.login(email, password);
      setUser(user);
    } catch (error) {
      setUser(null);
      throw error;
    }
  }

  async function signOut() {
    api.logout();
    setUser(null);
  }

  async function updateProfile(updates: Partial<User>) {
    if (!user) throw new Error('No user logged in');

    const { user: updatedUser } = await api.updateUserProfile(updates);
    setUser(updatedUser);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        signOut,
        updateProfile,
        loadCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
