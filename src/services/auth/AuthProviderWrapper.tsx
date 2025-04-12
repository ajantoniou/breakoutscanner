import React, { ReactNode } from 'react';
import { AuthContext, AuthProvider } from './authService';

// Wrapper component that uses the AuthContext.Provider with JSX syntax
export const AuthProviderWrapper = ({ children }: { children: ReactNode }) => {
  const authValues = AuthProvider();
  
  return (
    <AuthContext.Provider value={authValues}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProviderWrapper; 