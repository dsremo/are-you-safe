import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';
import {
  signInWithGoogle,
  signOut as authSignOut,
  isAuthenticated as checkAuth,
  getCurrentUser,
} from '../services/authService';

interface User {
  userId: string;
  email: string;
  displayName: string;
  profilePicture?: string;
  onboardingComplete?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  signIn: async () => false,
  signOut: async () => {},
  setUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const authenticated = await checkAuth();
      if (authenticated) {
        const userData = await getCurrentUser();
        if (userData) {
          setUser({
            userId: userData.userId,
            email: userData.email,
            displayName: userData.displayName,
            profilePicture: userData.profilePicture,
            onboardingComplete: userData.onboardingComplete,
          });
        }
      }
    } catch (error) {
      console.log('Auth initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (): Promise<boolean> => {
    const result = await signInWithGoogle();
    if (result) {
      setUser({
        userId: result.userId,
        email: result.email,
        displayName: result.displayName,
        onboardingComplete: !result.isNewUser,
      });
      return true;
    }
    return false;
  };

  const signOut = async () => {
    await authSignOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signOut,
        setUser,
      }}>
      {children}
    </AuthContext.Provider>
  );
};
