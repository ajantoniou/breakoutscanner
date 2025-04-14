import React, { ReactNode } from 'react';
import { AuthContext, AuthProvider } from './authService';

// Create a proper AuthProvider component with JSX in a TSX file
export const AuthProviderComponent = ({ children }: { children: ReactNode }) => {
  const authValues = AuthProvider();
  
  return (
    <AuthContext.Provider value={authValues}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProviderComponent; 