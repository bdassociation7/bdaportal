import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/app/providers/AuthProvider';

/**
 * Smart dashboard router qui redirige l'utilisateur vers son dashboard
 * spécifique selon son rôle
 */
export function DashboardRouter() {
  const { user, isLoading } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;

    if (!user?.profile) {
      navigate('/login', { replace: true });
      return;
    }

    // Rediriger vers le dashboard approprié selon le rôle
    const role = user.profile.role;
    let dashboardPath = '/';

    switch (role) {
      case 'individual':
        dashboardPath = '/individual/dashboard';
        break;
      case 'ecp':
        dashboardPath = '/ecp/dashboard';
        break;
      case 'pdp':
        dashboardPath = '/pdp/dashboard';
        break;
      case 'dual_partner':
        dashboardPath = '/workspace';
        break;
      case 'admin':
      case 'super_admin':
        dashboardPath = '/admin/dashboard';
        break;
      default:
        // Fallback pour rôles inconnus
        dashboardPath = '/individual/dashboard';
    }

    navigate(dashboardPath, { replace: true });
  }, [user, isLoading, navigate]);

  // Afficher un loader pendant la redirection
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
