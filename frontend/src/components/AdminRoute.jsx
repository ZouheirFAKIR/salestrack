import { Navigate } from 'react-router-dom';

function AdminRoute({ children }) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user || (user.role !== 'admin' && !user.is_admin_access)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default AdminRoute;