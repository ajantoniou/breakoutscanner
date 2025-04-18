import { createClient } from '@supabase/supabase-js';
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import React from 'react';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ttmeplqmrjhysyqzuaoh.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0bWVwbHFtcmpoeXN5cXp1YW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyMTU0NzAsImV4cCI6MjA1ODc5MTQ3MH0.38s2h7dvsOPYk_CmC8dS2h3VSCDClezIlQ4VgBFn2Ek';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define demo user credentials
export const DEMO_EMAIL = 'demo@breakoutscanner.com';
export const DEMO_PASSWORD = 'Demo123!';

// Define types
export type User = {
  id: string;
  email: string;
  username?: string;
  created_at: string;
  last_sign_in?: string;
  role?: string;
};

type AuthContextType = {
  user: User | null;
  session: any;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any, user: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  createDemoUser?: () => Promise<{ error: any, user: any }>;
};

// Create auth context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export function AuthProvider(props?: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get session from Supabase
    const getSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }
        
        setSession(data.session);
        setUser(data.session?.user ? mapUser(data.session.user) : null);
        setLoading(false);
      } catch (err) {
        console.error('Error in getSession:', err);
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ? mapUser(session.user) : null);
        setLoading(false);
      }
    );

    // Cleanup subscription
    return () => {
      if (data.subscription) {
        data.subscription.unsubscribe();
      }
    };
  }, []);

  // Map Supabase user to our User type
  const mapUser = (supabaseUser: any): User => {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      username: supabaseUser.user_metadata?.username || '',
      created_at: supabaseUser.created_at,
      last_sign_in: supabaseUser.last_sign_in_at,
      role: supabaseUser.user_metadata?.role || 'user'
    };
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      return { error };
    } catch (error) {
      console.error('Error signing in:', error);
      return { error };
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string, username: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            role: 'user',
          },
        },
      });
      
      return { error, user: data.user };
    } catch (error) {
      console.error('Error signing up:', error);
      return { error, user: null };
    }
  };

  // Create demo user
  const createDemoUser = async () => {
    try {
      // Try to sign in with demo credentials first
      const { error: signInError } = await signIn(DEMO_EMAIL, DEMO_PASSWORD);
      
      // If the user doesn't exist, create a new demo user
      if (signInError) {
        console.log('Demo user not found, creating new demo user...');
        return await signUp(DEMO_EMAIL, DEMO_PASSWORD, 'Demo User');
      }
      
      return { error: null, user: null };
    } catch (error) {
      console.error('Error creating demo user:', error);
      return { error, user: null };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      return { error };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { error };
    }
  };

  // Update password
  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });
      
      return { error };
    } catch (error) {
      console.error('Error updating password:', error);
      return { error };
    }
  };

  // Check if user is authenticated
  const isAuthenticated = !!user;
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  // Return the context values directly instead of using JSX
  return { 
    user, 
    session, 
    loading, 
    signIn, 
    signUp, 
    signOut, 
    resetPassword, 
    updatePassword, 
    isAuthenticated, 
    isAdmin,
    createDemoUser
  };
}

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth service for non-component usage
class AuthService {
  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const { data } = await supabase.auth.getSession();
      return !!data.session;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) return null;
      
      return {
        id: data.session.user.id,
        email: data.session.user.email || '',
        username: data.session.user.user_metadata?.username || '',
        created_at: data.session.user.created_at,
        last_sign_in: data.session.user.last_sign_in_at,
        role: data.session.user.user_metadata?.role || 'user'
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      return { error };
    } catch (error) {
      console.error('Error signing in:', error);
      return { error };
    }
  }

  // Create demo user with the credentials from documentation
  async createDemoUser(): Promise<{ error: any, user: any }> {
    try {
      // Check if demo user already exists by trying to sign in
      const { error: signInError } = await this.signIn(DEMO_EMAIL, DEMO_PASSWORD);
      
      // If login fails, create the demo user
      if (signInError) {
        console.log('Creating demo user account...');
        const { data, error } = await supabase.auth.signUp({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
          options: {
            data: {
              username: 'Demo User',
              role: 'user',
            },
          },
        });
        
        if (error) {
          console.error('Error creating demo user:', error);
          return { error, user: null };
        }
        
        console.log('Demo user created successfully');
        return { error: null, user: data.user };
      }
      
      console.log('Demo user already exists');
      return { error: null, user: null };
    } catch (error) {
      console.error('Error in createDemoUser:', error);
      return { error, user: null };
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }
}

export const authService = new AuthService();

// Create demo user on initial load (in production)
if (import.meta.env.PROD) {
  console.log('Production environment detected, ensuring demo user exists...');
  // Explicitly create the demo user right away to ensure it exists
  (async () => {
    try {
      console.log('Attempting to create demo user with credentials:', DEMO_EMAIL, DEMO_PASSWORD);
      
      // First try to sign in with demo credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
      
      // If sign-in fails, create the user
      if (signInError) {
        console.log('Demo user sign-in failed, creating new user:', signInError.message);
        const { data, error } = await supabase.auth.signUp({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
          options: {
            data: {
              username: 'Demo User',
              role: 'user',
            },
          },
        });
        
        if (error) {
          console.error('Error creating demo user:', error);
        } else {
          console.log('Demo user created successfully:', data.user?.email);
        }
      } else {
        console.log('Demo user already exists and credentials are valid');
      }
    } catch (err) {
      console.error('Error in demo user initialization:', err);
    }
  })();
}
