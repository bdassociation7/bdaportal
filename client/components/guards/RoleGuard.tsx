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
 * dual_partner has access to both ECP and PDP routes.
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

  // dual_partner can access any ECP or PDP route
  const effectiveRoles =
    userRole === 'dual_partner'
      ? [...allowedRoles, 'dual_partner', 'ecp', 'pdp']
      : allowedRoles;

  const hasRequiredRole =
    effectiveRoles.includes(userRole) ||
    (userRole === 'dual_partner' &&
      (allowedRoles.includes('ecp') || allowedRoles.includes('pdp')));

  if (!hasRequiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
