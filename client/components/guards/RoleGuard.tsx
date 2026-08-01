import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/app/providers/AuthProvider';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

/**
 * Guard component qui vérifie que l'utilisateur a le bon rôle
 * pour accéder à une route.
 *
 * ecp has access to both ECP and PDP routes (ECP includes PDP Standard).
 * dual_partner is treated as ecp (legacy backward compatibility).
 */
export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, isLoading } = useAuthContext();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user?.profile) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  const userRole = user.profile.role;

  // ecp and dual_partner (legacy) can access any ECP or PDP route
  // because ECP now includes PDP Standard access
  const isECPLike = userRole === 'ecp' || userRole === 'dual_partner';

  const hasRequiredRole =
    allowedRoles.includes(userRole) ||
    (isECPLike && (allowedRoles.includes('ecp') || allowedRoles.includes('pdp') || allowedRoles.includes('dual_partner')));

  if (!hasRequiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
