import { Navigate, useParams } from 'react-router-dom';
import { authService } from '../services/auth.service';

export const PrivateRoute = ({ children, allowedRoles }) => {
  const { madrasahSlug } = useParams();
  const user = authService.getCurrentUser();
  const storedMadrasah = authService.getMadrasah();

  // Not authenticated
  if (!authService.isAuthenticated()) {
    return <Navigate to={`/${madrasahSlug}/login`} replace />;
  }

  // Wrong madrasah context - user is trying to access different madrasah
  if (storedMadrasah?.slug !== madrasahSlug) {
    authService.logout();
    return <Navigate to={`/${madrasahSlug}/login`} replace />;
  }

  // Role check
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to={`/${madrasahSlug}/unauthorized`} replace />;
  }

  return children;
};
