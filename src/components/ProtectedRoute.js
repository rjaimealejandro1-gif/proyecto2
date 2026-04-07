import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Loader.css';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, role, needsProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    const loaderText = "CARGANDO..";
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: '#111', zIndex: 9999
      }}>
        <div className="loader-wrapper">
          <div className="loader"></div>
          {loaderText.split('').map((char, index) => (
            <span key={index} className="loader-letter">{char}</span>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si necesita elegir rol y NO está ya en esa página, mandarlo allá
  if (needsProfile && location.pathname !== '/role-selection') {
    return <Navigate to="/role-selection" replace />;
  }

  /** 
   * ELIMINADA: Redirección automática al inicio si needsProfile era falso.
   * Esto causaba bucles infinitos durante la carga lenta de datos.
   * La lógica de redirección quedará ahora en la LandingPage o en el AuthContext.
   */

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
