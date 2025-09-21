import React from 'react';
import { Navigate } from 'react-router-dom';
import { getAuthData } from '../../lib/utils';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const authData = getAuthData();
  
  if (!authData) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}
