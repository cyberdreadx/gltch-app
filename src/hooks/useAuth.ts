import { useState, useEffect } from 'react';
import { restoreSession, getStoredSession, logout as logoutFromAtproto, type AuthSession } from '@/lib/atproto';

export const useAuth = () => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const restored = await restoreSession();
      if (restored) {
        setSession(getStoredSession());
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const refreshSession = () => {
    setSession(getStoredSession());
  };

  const logout = async () => {
    await logoutFromAtproto();
    setSession(null);
  };

  return {
    session,
    isAuthenticated: !!session,
    isLoading,
    refreshSession,
    logout,
  };
};